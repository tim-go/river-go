import pg from "pg";
import { getDatabaseUrl } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
});

export async function closePool(): Promise<void> {
  await pool.end();
}
