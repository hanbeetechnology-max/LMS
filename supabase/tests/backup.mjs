// Manual data backup of every table in the public schema (accounts' passwords are
// NOT included: those live in Supabase's auth system, see docs/RECOVERY.md).
//
//   node backup.mjs export            writes backups/<timestamp>/<table>.ndjson + manifest.json
//   node backup.mjs verify [folder]   re-reads a backup, checks its fingerprints, and compares
//                                     the row counts with the live database (newest folder if omitted)
//
// Uses the restricted test login from .env.test (or SUPABASE_DB_URL). The backups
// folder is git-ignored: it contains personal data, so store copies somewhere safe.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { connect } from "./rls/_db.mjs";

const ROOT = new URL("./backups/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const mode = process.argv[2];
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");

async function tables(c) {
  return (await c.query("select tablename from pg_tables where schemaname = 'public' order by 1")).rows.map((r) => r.tablename);
}

const c = await connect();
try {
  if (mode === "export") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.join(ROOT, stamp);
    fs.mkdirSync(dir, { recursive: true });
    const manifest = { createdAt: new Date().toISOString(), tables: {} };
    for (const t of await tables(c)) {
      const rows = (await c.query(`select to_jsonb(x) as j from public."${t}" x`)).rows;
      const text = rows.map((r) => JSON.stringify(r.j)).join("\n") + (rows.length ? "\n" : "");
      fs.writeFileSync(path.join(dir, `${t}.ndjson`), text);
      manifest.tables[t] = { rows: rows.length, sha256: sha(text) };
    }
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    const total = Object.values(manifest.tables).reduce((n, t) => n + t.rows, 0);
    console.log(`Backup written: ${dir}\n${Object.keys(manifest.tables).length} tables, ${total} rows.`);
  } else if (mode === "verify") {
    let dir = process.argv[3];
    if (!dir) {
      const all = fs.existsSync(ROOT) ? fs.readdirSync(ROOT).sort() : [];
      if (!all.length) throw new Error("No backups found. Run: node backup.mjs export");
      dir = path.join(ROOT, all[all.length - 1]);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    let bad = 0;
    for (const [t, info] of Object.entries(manifest.tables)) {
      const text = fs.readFileSync(path.join(dir, `${t}.ndjson`), "utf8");
      const lines = text ? text.trim().split("\n").length : 0;
      const live = Number((await c.query(`select count(*) n from public."${t}"`)).rows[0].n);
      const fileOk = sha(text) === info.sha256 && lines === info.rows;
      const liveNote = live === info.rows ? "matches live" : `live now has ${live}`;
      if (!fileOk) bad++;
      console.log(`${fileOk ? "OK  " : "BAD "} ${t.padEnd(32)} ${String(info.rows).padStart(6)} rows, ${liveNote}`);
    }
    const missing = (await tables(c)).filter((t) => !(t in manifest.tables));
    if (missing.length) console.log("Tables created since this backup:", missing.join(", "));
    console.log(bad ? `${bad} table file(s) are damaged.` : "Backup files are intact.");
    process.exitCode = bad ? 1 : 0;
  } else {
    console.log("Usage: node backup.mjs export | node backup.mjs verify [folder]");
  }
} finally {
  await c.end();
}
