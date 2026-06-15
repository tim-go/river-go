import type { PoolClient } from "pg";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export interface ApiMemberSkill {
  id: string;
  category: string;
  name: string;
  detail: string | null;
  attainedOn: string | null;
  expiresOn: string | null;
  selfDeclared: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MemberSkillRow {
  id: string;
  category: string;
  name: string;
  detail: string | null;
  attained_on: Date | string | null;
  expires_on: Date | string | null;
  self_declared: boolean;
  created_at: Date;
  updated_at: Date;
}

const MEMBER_SKILL_COLUMNS = `
  id, category, name, detail, attained_on, expires_on, self_declared,
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

function mapMemberSkillRow(row: MemberSkillRow): ApiMemberSkill {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    detail: row.detail,
    attainedOn: toDateString(row.attained_on),
    expiresOn: toDateString(row.expires_on),
    selfDeclared: row.self_declared,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface MemberSkillInput {
  category: string;
  name: string;
  detail: string | null;
  attainedOn: string | null;
  expiresOn: string | null;
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

export function parseMemberSkillInput(body: unknown): MemberSkillInput {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Skill details are required.");
  }

  const record = body as Record<string, unknown>;
  const category = readString(record.category);
  const name = readString(record.name);

  if (!category) {
    throw new HttpError(400, "A skill category is required.");
  }
  if (!name) {
    throw new HttpError(400, "A skill name is required.");
  }

  return {
    category,
    name,
    detail: readOptionalString(record.detail),
    attainedOn: readOptionalDate(record.attainedOn),
    expiresOn: readOptionalDate(record.expiresOn),
  };
}

export async function createMemberSkill(
  memberId: string,
  input: MemberSkillInput,
  client: PoolClient | typeof pool = pool,
): Promise<ApiMemberSkill> {
  const result = await client.query<MemberSkillRow>(
    `INSERT INTO member_skills (
      member_id, category, name, detail, attained_on, expires_on
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING ${MEMBER_SKILL_COLUMNS}`,
    [
      memberId,
      input.category,
      input.name,
      input.detail,
      input.attainedOn,
      input.expiresOn,
    ],
  );

  return mapMemberSkillRow(result.rows[0]);
}

export async function listMemberSkills(
  memberId: string,
  client: PoolClient | typeof pool = pool,
): Promise<ApiMemberSkill[]> {
  const result = await client.query<MemberSkillRow>(
    `SELECT ${MEMBER_SKILL_COLUMNS}
     FROM member_skills
     WHERE member_id = $1
     ORDER BY category ASC, name ASC`,
    [memberId],
  );

  return result.rows.map(mapMemberSkillRow);
}

export async function deleteMemberSkill(
  memberId: string,
  id: string,
  client: PoolClient | typeof pool = pool,
): Promise<void> {
  const result = await client.query(
    `DELETE FROM member_skills WHERE id = $1 AND member_id = $2`,
    [id, memberId],
  );

  if (!result.rowCount) {
    throw new HttpError(404, "Skill not found.");
  }
}
