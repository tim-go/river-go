import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export interface ApiKitItem {
  id: string;
  category: string;
  name: string;
  notes: string | null;
  purchasedOn: string | null;
  replaceOn: string | null;
  serial: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KitItemRow {
  id: string;
  category: string;
  name: string;
  notes: string | null;
  purchased_on: Date | string | null;
  replace_on: Date | string | null;
  serial: string | null;
  created_at: Date;
  updated_at: Date;
}

const KIT_ITEM_COLUMNS = `
  id, category, name, notes, purchased_on, replace_on, serial,
  created_at, updated_at`;

function toDateString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function mapKitItemRow(row: KitItemRow): ApiKitItem {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    notes: row.notes,
    purchasedOn: toDateString(row.purchased_on),
    replaceOn: toDateString(row.replace_on),
    serial: row.serial,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface KitItemInput {
  category: string;
  name: string;
  notes: string | null;
  purchasedOn: string | null;
  replaceOn: string | null;
  serial: string | null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null {
  const text = readString(value);
  return text ? text : null;
}

function readOptionalDate(value: unknown): string | null {
  const text = readString(value);
  if (!text) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new HttpError(400, "Dates must be in YYYY-MM-DD format.");
  }
  return text;
}

export function parseKitItemInput(body: unknown): KitItemInput {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Kit details are required.");
  }

  const record = body as Record<string, unknown>;
  const category = readString(record.category);
  const name = readString(record.name);

  if (!category) {
    throw new HttpError(400, "A kit category is required.");
  }
  if (!name) {
    throw new HttpError(400, "A kit name is required.");
  }

  return {
    category,
    name,
    notes: readOptionalString(record.notes),
    purchasedOn: readOptionalDate(record.purchasedOn),
    replaceOn: readOptionalDate(record.replaceOn),
    serial: readOptionalString(record.serial),
  };
}

export async function createKitItem(
  memberId: string,
  input: KitItemInput,
  client: PoolClient | typeof pool = pool,
): Promise<ApiKitItem> {
  const result = await client.query<KitItemRow>(
    `INSERT INTO kit_items (
      member_id, category, name, notes, purchased_on, replace_on, serial
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${KIT_ITEM_COLUMNS}`,
    [
      memberId,
      input.category,
      input.name,
      input.notes,
      input.purchasedOn,
      input.replaceOn,
      input.serial,
    ],
  );

  return mapKitItemRow(result.rows[0]);
}

export async function listKitItems(
  memberId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiKitItem[]> {
  const result = await client.query<KitItemRow>(
    `SELECT ${KIT_ITEM_COLUMNS}
     FROM kit_items
     WHERE member_id = $1
     ORDER BY category ASC, name ASC`,
    [memberId],
  );

  return result.rows.map(mapKitItemRow);
}

export async function deleteKitItem(
  memberId: string,
  id: string,
  client: PoolClient | typeof pool = pool,
): Promise<void> {
  const result = await client.query(
    `DELETE FROM kit_items WHERE id = $1 AND member_id = $2`,
    [id, memberId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Kit item not found.");
  }
}
