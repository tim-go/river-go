import { pool } from "./db.js";

export interface Amenity {
  id: string;
  // The amenity's id in the shared `pois` index (`amenity:<source_id>`) — the
  // key contributions/photos target and the shared detail surface uses.
  poiId: string;
  category: string;
  name: string | null;
  lat: number;
  lng: number;
  // Nearest featured river (canonical_rivers.id), pre-derived (§5). Lets the map
  // scope amenities to a focused river. Null if none in range.
  riverId: string | null;
  // Whether a published photo is attached (via a contribution keyed on poiId) —
  // drives the map marker's photo badge.
  hasPhotos: boolean;
}

export async function listAmenities(): Promise<Amenity[]> {
  const result = await pool.query(
    `SELECT a.id, 'amenity:' || a.source_id AS poi_id, a.category, a.name,
            a.river_id, ST_Y(a.geometry) AS lat, ST_X(a.geometry) AS lng,
            EXISTS (
              SELECT 1 FROM contributions c
              JOIN contribution_photos pp ON pp.contribution_id = c.id
                AND pp.moderation_status NOT IN ('hidden', 'rejected')
              WHERE c.poi_id = 'amenity:' || a.source_id
                AND c.visibility = 'published'
            ) AS has_photos
     FROM amenities a
     WHERE a.source = 'osm_amenity'
     ORDER BY a.category, a.name NULLS LAST`,
  );

  return result.rows.map((row) => ({
    id: row.id as string,
    poiId: row.poi_id as string,
    category: row.category as string,
    name: (row.name as string | null) ?? null,
    lat: Number(row.lat),
    lng: Number(row.lng),
    riverId: (row.river_id as string | null) ?? null,
    hasPhotos: (row.has_photos as boolean) ?? false,
  }));
}
