import pg from "pg";
import { getDatabaseConfig } from "./config.js";

const { Pool } = pg;

export const pool = new Pool(getDatabaseConfig());

export async function closePool(): Promise<void> {
  await pool.end();
}
