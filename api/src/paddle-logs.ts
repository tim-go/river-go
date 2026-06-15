import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export type PaddleLogVisibility = "private" | "friends" | "public";

export interface ApiPaddleLog {
  id: string;
  riverId: string | null;
  sectionId: string | null;
  venue: string | null;
  title: string;
  paddledOn: string;
  levelNote: string | null;
  craftType: string | null;
  companions: string | null;
  notes: string | null;
  visibility: PaddleLogVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface PaddleStats {
  totalPaddles: number;
  distinctRivers: number;
  thisYearPaddles: number;
  thisYearNewRivers: number;
  nations: number;
  mostPaddled: { riverId: string | null; title: string; count: number } | null;
}

interface PaddleLogRow {
  id: string;
  river_id: string | null;
  section_id: string | null;
  venue: string | null;
  title: string;
  paddled_on: Date | string;
  level_note: string | null;
  craft_type: string | null;
  companions: string | null;
  notes: string | null;
  visibility: PaddleLogVisibility;
  created_at: Date;
  updated_at: Date;
}

const PADDLE_LOG_COLUMNS = `
  id, river_id, section_id, venue, title, paddled_on, level_note,
  craft_type, companions, notes, visibility, created_at, updated_at`;

function toDateString(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function mapPaddleLogRow(row: PaddleLogRow): ApiPaddleLog {
  return {
    id: row.id,
    riverId: row.river_id,
    sectionId: row.section_id,
    venue: row.venue,
    title: row.title,
    paddledOn: toDateString(row.paddled_on),
    levelNote: row.level_note,
    craftType: row.craft_type,
    companions: row.companions,
    notes: row.notes,
    visibility: row.visibility,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface PaddleLogInput {
  riverId: string | null;
  sectionId: string | null;
  venue: string | null;
  title: string;
  paddledOn: string;
  levelNote: string | null;
  craftType: string | null;
  companions: string | null;
  notes: string | null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null {
  const text = readString(value);
  return text ? text : null;
}

export function parsePaddleLogInput(body: unknown): PaddleLogInput {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Paddle log details are required.");
  }

  const record = body as Record<string, unknown>;
  const title = readString(record.title);
  const paddledOn = readString(record.paddledOn);

  if (!title) {
    throw new HttpError(400, "A river or venue name is required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(paddledOn)) {
    throw new HttpError(400, "A valid paddle date (YYYY-MM-DD) is required.");
  }

  return {
    riverId: readOptionalString(record.riverId),
    sectionId: readOptionalString(record.sectionId),
    venue: readOptionalString(record.venue),
    title,
    paddledOn,
    levelNote: readOptionalString(record.levelNote),
    craftType: readOptionalString(record.craftType),
    companions: readOptionalString(record.companions),
    notes: readOptionalString(record.notes),
  };
}

export async function createPaddleLog(
  memberId: string,
  input: PaddleLogInput,
  client: PoolClient | typeof pool = pool,
): Promise<ApiPaddleLog> {
  const result = await client.query<PaddleLogRow>(
    `INSERT INTO paddle_logs (
      member_id, river_id, section_id, venue, title, paddled_on,
      level_note, craft_type, companions, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING ${PADDLE_LOG_COLUMNS}`,
    [
      memberId,
      input.riverId,
      input.sectionId,
      input.venue,
      input.title,
      input.paddledOn,
      input.levelNote,
      input.craftType,
      input.companions,
      input.notes,
    ],
  );

  return mapPaddleLogRow(result.rows[0]);
}

export async function listPaddleLogs(
  memberId: string,
  options: { riverId?: string | null } = {},
  client: PoolClient | typeof pool = pool,
): Promise<ApiPaddleLog[]> {
  const params: string[] = [memberId];
  let filter = "member_id = $1";

  if (options.riverId) {
    params.push(options.riverId);
    filter += ` AND river_id = $2`;
  }

  const result = await client.query<PaddleLogRow>(
    `SELECT ${PADDLE_LOG_COLUMNS}
     FROM paddle_logs
     WHERE ${filter}
     ORDER BY paddled_on DESC, created_at DESC`,
    params,
  );

  return result.rows.map(mapPaddleLogRow);
}

export async function deletePaddleLog(
  memberId: string,
  id: string,
  client: PoolClient | typeof pool = pool,
): Promise<void> {
  const result = await client.query(
    `DELETE FROM paddle_logs WHERE id = $1 AND member_id = $2`,
    [id, memberId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Paddle log not found.");
  }
}

export async function getPaddleStats(
  memberId: string,
  client: PoolClient | typeof pool = pool,
): Promise<PaddleStats> {
  const totals = await client.query<{
    total_paddles: string;
    distinct_rivers: string;
    this_year_paddles: string;
    nations: string;
  }>(
    `SELECT
      count(*) AS total_paddles,
      count(DISTINCT pl.river_id) FILTER (WHERE pl.river_id IS NOT NULL) AS distinct_rivers,
      count(*) FILTER (
        WHERE extract(year FROM pl.paddled_on) = extract(year FROM now())
      ) AS this_year_paddles,
      count(DISTINCT cr.payload->>'nation')
        FILTER (WHERE cr.payload->>'nation' IS NOT NULL) AS nations
     FROM paddle_logs pl
     LEFT JOIN canonical_rivers cr ON cr.id = pl.river_id
     WHERE pl.member_id = $1`,
    [memberId],
  );

  const newRivers = await client.query<{ this_year_new_rivers: string }>(
    `SELECT count(*) AS this_year_new_rivers
     FROM (
       SELECT river_id, min(paddled_on) AS first_paddled
       FROM paddle_logs
       WHERE member_id = $1 AND river_id IS NOT NULL
       GROUP BY river_id
     ) firsts
     WHERE extract(year FROM first_paddled) = extract(year FROM now())`,
    [memberId],
  );

  const mostPaddled = await client.query<{
    river_id: string | null;
    title: string;
    count: string;
  }>(
    `SELECT pl.river_id,
            coalesce(cr.display_name, pl.title) AS title,
            count(*) AS count
     FROM paddle_logs pl
     LEFT JOIN canonical_rivers cr ON cr.id = pl.river_id
     WHERE pl.member_id = $1 AND pl.river_id IS NOT NULL
     GROUP BY pl.river_id, coalesce(cr.display_name, pl.title)
     ORDER BY count DESC, title ASC
     LIMIT 1`,
    [memberId],
  );

  const totalsRow = totals.rows[0];
  const mostRow = mostPaddled.rows[0];

  return {
    totalPaddles: Number(totalsRow?.total_paddles ?? 0),
    distinctRivers: Number(totalsRow?.distinct_rivers ?? 0),
    thisYearPaddles: Number(totalsRow?.this_year_paddles ?? 0),
    thisYearNewRivers: Number(newRivers.rows[0]?.this_year_new_rivers ?? 0),
    nations: Number(totalsRow?.nations ?? 0),
    mostPaddled: mostRow
      ? {
          riverId: mostRow.river_id,
          title: mostRow.title,
          count: Number(mostRow.count),
        }
      : null,
  };
}
