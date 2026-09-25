// Applies one migration file to the database in SUPABASE_DB_URL as a single
// transaction (all or nothing). Usage:
//   SUPABASE_DB_URL=... node apply-migration.mjs ../migrations/0031_example.sql
import fs from "fs";
import pg from "pg";

const file = process.argv[2];
if (!file) throw new Error("Usage: node apply-migration.mjs <path-to-migration.sql>");
// Migrations need the owner login (the restricted test login cannot change the schema).
const url = process.env.SUPABASE_OWNER_DB_URL ?? process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Set SUPABASE_OWNER_DB_URL (owner connection string).");
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query(fs.readFileSync(file, "utf8"));
  console.log("applied", file);
} finally {
  await c.end();
}
