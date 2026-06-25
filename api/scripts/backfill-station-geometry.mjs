// Backfill observation_stations.geometry from provider station metadata.
// EA: flood-monitoring (lat/long, WGS84). SEPA: KiWIS getStationList (lat/long).
// NRW: station page exposes OS National Grid x/y (EPSG:27700) → ST_Transform to 4326.
// Run: node api/scripts/backfill-station-geometry.mjs   (DATABASE_URL overrides the local default)
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://river_go_admin:river_go@127.0.0.1:5440/river_go",
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function eaCoords(id) {
  const r = await fetch(
    `https://environment.data.gov.uk/flood-monitoring/id/stations?stationReference=${encodeURIComponent(id)}`,
    { signal: AbortSignal.timeout(25000) },
  );
  const j = await r.json();
  const it = (j.items || [])[0];
  return it && it.lat != null && it.long != null
    ? { lat: Number(it.lat), lng: Number(it.long) }
    : null;
}

async function sepaCoords(id) {
  const r = await fetch(
    `https://timeseries.sepa.org.uk/KiWIS/KiWIS?service=kisters&type=queryServices&datasource=0&request=getStationList&format=json&station_no=${encodeURIComponent(id)}&returnfields=station_no,station_latitude,station_longitude`,
    { signal: AbortSignal.timeout(25000) },
  );
  const j = await r.json();
  const row = (Array.isArray(j) ? j : []).slice(1)[0];
  if (!row) return null;
  const lat = Number(row[row.length - 2]);
  const lng = Number(row[row.length - 1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

async function nrwGrid(id) {
  const r = await fetch(
    `https://rivers-and-seas.naturalresources.wales/Station/${encodeURIComponent(id)}?lang=en`,
    { signal: AbortSignal.timeout(25000) },
  );
  const html = await r.text();
  const m = html.match(/"x":(\d+),"y":(\d+)/);
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  // sanity: plausible British National Grid metres
  return x > 0 && x < 800000 && y > 0 && y < 1300000 ? { x, y } : null;
}

const { rows } = await pool.query(
  "SELECT id, provider, provider_station_id, name FROM observation_stations WHERE geometry IS NULL OR ST_IsEmpty(geometry)",
);
console.log(`stations missing geometry: ${rows.length}`);
const tally = {};
const bump = (p, ok) => {
  tally[p] = tally[p] || { ok: 0, fail: 0 };
  tally[p][ok ? "ok" : "fail"] += 1;
};

for (const s of rows) {
  try {
    if (s.provider === "environment-agency") {
      const c = await eaCoords(s.provider_station_id);
      if (c) {
        await pool.query(
          "UPDATE observation_stations SET geometry=ST_SetSRID(ST_MakePoint($1,$2),4326), updated_at=now() WHERE id=$3",
          [c.lng, c.lat, s.id],
        );
        bump(s.provider, true);
      } else bump(s.provider, false);
    } else if (s.provider === "sepa") {
      const c = await sepaCoords(s.provider_station_id);
      if (c) {
        await pool.query(
          "UPDATE observation_stations SET geometry=ST_SetSRID(ST_MakePoint($1,$2),4326), updated_at=now() WHERE id=$3",
          [c.lng, c.lat, s.id],
        );
        bump(s.provider, true);
      } else bump(s.provider, false);
    } else if (s.provider === "natural-resources-wales") {
      const c = await nrwGrid(s.provider_station_id);
      if (c) {
        await pool.query(
          "UPDATE observation_stations SET geometry=ST_Transform(ST_SetSRID(ST_MakePoint($1,$2),27700),4326), updated_at=now() WHERE id=$3",
          [c.x, c.y, s.id],
        );
        bump(s.provider, true);
      } else bump(s.provider, false);
    }
  } catch (e) {
    bump(s.provider, false);
    console.error(`  ${s.provider} ${s.provider_station_id}: ${e.message}`);
  }
  await sleep(250);
}

console.log("results:", JSON.stringify(tally));
await pool.end();
