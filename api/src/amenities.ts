import { pool } from "./db.js";

export interface Amenity {
  id: string;
  category: string;
  name: string | null;
  lat: number;
  lng: number;
  // Nearest featured river (canonical_rivers.id), pre-derived (§5). Lets the map
  // scope amenities to a focused river. Null if none in range.
  riverId: string | null;
}

export async function listAmenities(): Promise<Amenity[]> {
  const result = await pool.query(
    `SELECT id, category, name, river_id, ST_Y(geometry) AS lat, ST_X(geometry) AS lng
     FROM amenities
     WHERE source = 'osm_amenity'
     ORDER BY category, name NULLS LAST`,
  );

  return result.rows.map((row) => ({
    id: row.id as string,
    category: row.category as string,
    name: (row.name as string | null) ?? null,
    lat: Number(row.lat),
    lng: Number(row.lng),
    riverId: (row.river_id as string | null) ?? null,
  }));
}
