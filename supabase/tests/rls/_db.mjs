import fs from "fs";
import pg from "pg";

// Connects to the live database through the Supabase session pooler.
// Uses SUPABASE_DB_URL when set; otherwise the restricted `hanbee_test` login
// saved in supabase/tests/.env.test by create-test-role.mjs. Never commit either.
// Every test runs inside a transaction that is rolled back.
function urlFromEnvFile() {
  try {
    const raw = fs.readFileSync(new URL("../.env.test", import.meta.url), "utf8");
    return raw.match(/^SUPABASE_DB_URL=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

export async function connect() {
  const url = process.env.SUPABASE_DB_URL ?? urlFromEnvFile();
  if (!url) throw new Error("Set SUPABASE_DB_URL, or run create-test-role.mjs to create supabase/tests/.env.test.");
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  return c;
}
