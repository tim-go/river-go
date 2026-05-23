import { getWhat3WordsApiKey } from "./config.js";
import { closePool, pool } from "./db.js";
import { lookupWhat3WordsForCoordinates } from "./what3words.js";

interface ContributionLocationRow {
  id: string;
  lat: number;
  lng: number;
}

interface Options {
  dryRun: boolean;
  limit: number;
}

const DEFAULT_LIMIT = 500;
const REQUEST_DELAY_MS = 260;

async function backfillWhat3Words(options: Options) {
  const apiKey = getWhat3WordsApiKey();
  if (!apiKey) {
    throw new Error("WHAT3WORDS_API_KEY is required for backfill.");
  }

  const rows = await findMissingWhat3Words(options.limit);
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Found ${rows.length} point contribution(s) missing what3words.`);

  for (const row of rows) {
    try {
      const result = await lookupWhat3WordsForCoordinates(row.lat, row.lng);

      if (!result.words) {
        skipped += 1;
        console.log(`Skipped ${row.id}: no what3words result`);
        continue;
      }

      if (options.dryRun) {
        updated += 1;
        console.log(`Would update ${row.id}: ${result.words}`);
      } else {
        await saveWhat3WordsAddress(row.id, result.words);
        updated += 1;
        console.log(`Updated ${row.id}: ${result.words}`);
      }
    } catch (error) {
      failed += 1;
      console.error(
        `Failed ${row.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    await delay(REQUEST_DELAY_MS);
  }

  console.log(
    JSON.stringify(
      {
        found: rows.length,
        updated,
        skipped,
        failed,
        dryRun: options.dryRun,
      },
      null,
      2,
    ),
  );
}

async function findMissingWhat3Words(
  limit: number,
): Promise<ContributionLocationRow[]> {
  const result = await pool.query<ContributionLocationRow>(
    `SELECT
      id::text,
      ST_Y(geometry::geometry) AS lat,
      ST_X(geometry::geometry) AS lng
    FROM contributions
    WHERE geometry IS NOT NULL
      AND GeometryType(geometry) = 'POINT'
      AND moderation_status NOT IN ('hidden', 'rejected')
      AND (
        payload->>'what3wordsAddress' IS NULL
        OR btrim(payload->>'what3wordsAddress') = ''
      )
    ORDER BY created_at ASC
    LIMIT $1`,
    [limit],
  );

  return result.rows;
}

async function saveWhat3WordsAddress(contributionId: string, words: string) {
  await pool.query(
    `UPDATE contributions
    SET payload = jsonb_set(
        payload,
        '{what3wordsAddress}',
        to_jsonb($2::text),
        true
      ),
      updated_at = now(),
      revision = revision + 1
    WHERE id = $1
      AND (
        payload->>'what3wordsAddress' IS NULL
        OR btrim(payload->>'what3wordsAddress') = ''
      )`,
    [contributionId, words],
  );
}

function parseOptions(): Options {
  const args = new Set(process.argv.slice(2));
  const limitArg = process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--limit="));
  const limit = limitArg
    ? Number.parseInt(limitArg.replace("--limit=", ""), 10)
    : DEFAULT_LIMIT;

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("--limit must be a positive number.");
  }

  return {
    dryRun: args.has("--dry-run"),
    limit,
  };
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

backfillWhat3Words(parseOptions())
  .then(() => closePool())
  .catch(async (error: unknown) => {
    console.error(error);
    await closePool();
    process.exit(1);
  });
