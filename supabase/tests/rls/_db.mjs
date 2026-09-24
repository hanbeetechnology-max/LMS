import pg from "pg";

// Connects to the live database through the Supabase session pooler.
// Set SUPABASE_DB_URL, e.g.
//   postgresql://postgres.<project-ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
// Never commit the URL. Every test runs inside a transaction that is rolled back.
export async function connect() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Set SUPABASE_DB_URL (session pooler connection string) before running these tests.");
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  return c;
}
