// Creates persistent DEMO data on the live project so the portal screens have
// something real to show and test against. Uses only the public API (the anon
// key in frontend/.env.local), so every account goes through the real signup
// rules. Safe to run repeatedly: existing accounts and rows are reused.
//
// DELETE THIS DEMO DATA BEFORE REAL USERS ARRIVE (see docs/MULTI_SCHOOL_PLATFORM.md,
// launch checklist). All demo accounts end in @hanbee.test and share one password.
//
//   node seed-demo.mjs
import fs from "fs";

const env = fs.readFileSync(new URL("../../frontend/.env.local", import.meta.url), "utf8");
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const anon = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
export const DEMO_PASSWORD = "Demo#12345";

async function api(path, { method = "GET", body, token, prefer } = {}) {
  const res = await fetch(url + path, {
    method,
    headers: {
      apikey: anon,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, json };
}

const signup = (email, data) => api("/auth/v1/signup", { method: "POST", body: { email, password: DEMO_PASSWORD, data } });
async function login(email, password = DEMO_PASSWORD) {
  const r = await api("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  if (!r.json?.access_token) throw new Error(`login failed for ${email}: ${JSON.stringify(r.json)}`);
  return r.json.access_token;
}
const rpc = (name, args, token) => api(`/rest/v1/rpc/${name}`, { method: "POST", body: args, token });
const select = (path, token) => api(`/rest/v1/${path}`, { token });
const say = (m) => console.log(m);

const jamie = await login("jamie@hanbeelms.edu", "staff123");

async function ensureSchool({ ownerEmail, ownerName, school, regNo, students }) {
  await signup(ownerEmail, {
    role: "school_staff", full_name: ownerName, school_name: school, registration_no: regNo,
    official_email: `office@${school.toLowerCase().replace(/\W+/g, "")}.hanbee.test`, guardian_consent: "true",
  });
  const owner = await login(ownerEmail);
  const org = (await select("organizations?select=id,status,join_token", owner)).json[0];
  if (org.status === "pending") {
    const v = await rpc("verify_school", { p_org: org.id }, jamie);
    say(`verified ${school}: ${JSON.stringify(v.json)}`);
  }
  const emails = students.map((s) => s.email);
  await rpc("invite_students", { p_org: org.id, p_emails: emails }, owner);
  for (const s of students) await signup(s.email, { join_token: org.join_token, full_name: s.name });
  say(`school ready: ${school} (${students.length} students)`);
  return { org, owner };
}

const alpha = await ensureSchool({
  ownerEmail: "demo.owner1@hanbee.test", ownerName: "Anita Rao", school: "Demo Public School", regNo: "DPS-001",
  students: [
    { email: "demo.s1@hanbee.test", name: "Aarav Kumar" }, { email: "demo.s2@hanbee.test", name: "Diya Menon" },
    { email: "demo.s3@hanbee.test", name: "Kabir Shah" }, { email: "demo.s4@hanbee.test", name: "Meera Iyer" },
  ],
});
const beta = await ensureSchool({
  ownerEmail: "demo.owner2@hanbee.test", ownerName: "Rahul Verma", school: "Sample Academy", regNo: "SA-002",
  students: [{ email: "demo.t1@hanbee.test", name: "Ishaan Patel" }, { email: "demo.t2@hanbee.test", name: "Tara Nair" }],
});

// A co-teacher for the first school (owner invites; teacher joins with a personal token).
{
  const email = "demo.teacher1@hanbee.test";
  await rpc("invite_school_staff", { p_org: alpha.org.id, p_email: email }, alpha.owner);
  const tok = (await select(`invitations?email=eq.${encodeURIComponent(email)}&accepted=eq.false&revoked_at=is.null&select=token`, alpha.owner)).json?.[0]?.token;
  if (tok) await signup(email, { invite_token: tok, full_name: "Neha Joshi" });
  say("co-teacher ready");
}

// A solo student (Hanbee staff invite with no school).
{
  const email = "demo.solo@hanbee.test";
  // Only invite when the account does not exist yet, so reruns add nothing.
  const exists = ((await select(`profiles?email=eq.${encodeURIComponent(email)}&select=id`, jamie)).json ?? []).length > 0;
  if (!exists) {
    const made = await api("/rest/v1/invitations", { method: "POST", token: jamie, prefer: "return=representation", body: { email, role: "student" } });
    const tok = made.json?.[0]?.token;
    if (tok) await signup(email, { invite_token: tok, full_name: "Sana Khan" });
  }
  say("solo student ready");
}

// A tournament, two teams, one verified, one result.
let tournament = (await select("tournaments?title=eq.Hanbee%20RC%20Cup%202026&select=id", jamie)).json?.[0]?.id;
if (!tournament) {
  const start = new Date(Date.now() + 21 * 86400000).toISOString();
  const end = new Date(Date.now() + 22 * 86400000).toISOString();
  tournament = (await rpc("create_tournament", {
    p_title: "Hanbee RC Cup 2026", p_description: "The first inter-school RC F1 tournament.", p_starts_at: start, p_ends_at: end, p_venue: "Hanbee Track, Chennai",
  }, jamie)).json;
  say("tournament created");
}
const studentId = async (email, token) => (await select(`profiles?email=eq.${encodeURIComponent(email)}&select=id`, token)).json?.[0]?.id;
async function ensureTeam(owner, name, memberEmails) {
  const existing = (await select(`tournament_teams?tournament_id=eq.${tournament}&name=eq.${encodeURIComponent(name)}&select=id`, owner)).json?.[0]?.id;
  if (existing) return existing;
  const team = (await rpc("create_team", { p_tournament: tournament, p_name: name }, owner)).json;
  for (const e of memberEmails) await rpc("add_team_member", { p_team: team, p_student: await studentId(e, owner) }, owner);
  await rpc("apply_team", { p_team: team, p_payment_declared: true }, owner);
  return team;
}
const teamA = await ensureTeam(alpha.owner, "Alpha Racers", ["demo.s1@hanbee.test", "demo.s2@hanbee.test"]);
const teamB = await ensureTeam(beta.owner, "Sample Speed", ["demo.t1@hanbee.test", "demo.t2@hanbee.test"]);
await rpc("decide_team", { p_team: teamA, p_decision: "verified" }, jamie);
await rpc("set_result", { p_tournament: tournament, p_team: teamA, p_rank: 1, p_points: 25, p_notes: "Demo result" }, jamie);
say("teams and result ready");

// Enroll some students in an existing course section (Hanbee staff action).
const section = (await select("sections?select=id,courses(title)&limit=1", jamie)).json?.[0]?.id;
if (section) {
  for (const e of ["demo.s1@hanbee.test", "demo.s2@hanbee.test", "demo.t1@hanbee.test", "demo.solo@hanbee.test"]) {
    await rpc("enroll_student", { p_student: await studentId(e, jamie), p_section: section }, jamie);
  }
  say("students enrolled");
}

// Announcements: one site-wide, one for the first school only.
const has = async (title, token) => ((await select(`announcements?title=eq.${encodeURIComponent(title)}&select=id`, token)).json ?? []).length > 0;
if (!(await has("Welcome to HANBEE (demo)", jamie))) {
  const me = await studentId("jamie@hanbeelms.edu", jamie);
  await api("/rest/v1/announcements", { method: "POST", token: jamie, body: { author_id: me, title: "Welcome to HANBEE (demo)", body: "Registrations for the RC Cup are open.", audience: "all" } });
}
if (!(await has("Practice day (demo)", alpha.owner))) {
  const me = await studentId("demo.owner1@hanbee.test", alpha.owner);
  await api("/rest/v1/announcements", { method: "POST", token: alpha.owner, body: { author_id: me, org_id: alpha.org.id, title: "Practice day (demo)", body: "Bring your team kits on Friday.", audience: "all" } });
}
say("announcements ready");
say(`\nDemo logins (password ${DEMO_PASSWORD}): demo.owner1@hanbee.test, demo.owner2@hanbee.test, demo.teacher1@hanbee.test, demo.s1..s4@hanbee.test, demo.t1/t2@hanbee.test, demo.solo@hanbee.test`);
say("Hanbee staff: jamie@hanbeelms.edu / staff123    Manager: morgan@hanbeelms.edu / manager123    Student: ava@student.edu / student123");
