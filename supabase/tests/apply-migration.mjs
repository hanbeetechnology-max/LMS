// Applies one migration file to the database in SUPABASE_DB_URL as a single
// transaction (all or nothing). Usage:
//   SUPABASE_DB_URL=... node apply-migration.mjs ../migrations/0031_example.sql
import fs from "fs";
import { connect } from "./rls/_db.mjs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node apply-migration.mjs <path-to-migration.sql>");
const c = await connect();
try {
  await c.query(fs.readFileSync(file, "utf8"));
  console.log("applied", file);
} finally {
  await c.end();
}
