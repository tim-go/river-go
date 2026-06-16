import { pool } from "./db.js";
import { repromotePilotCandidates } from "./canonical-rivers.js";

async function main() {
  const result = await repromotePilotCandidates();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
