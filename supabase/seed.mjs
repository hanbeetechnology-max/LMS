// HanbeeLms — Supabase seed script.
// Run once, after the migrations in supabase/migrations/ have been applied,
// against a fresh project: `node supabase/seed.mjs`.
//
// Needs two env vars (never commit these):
//   SUPABASE_URL              — Project Settings → API → Project URL
//   SUPABASE_SERVICE_ROLE_KEY — Project Settings → API → service_role key
//                                (NOT the anon key — this script needs to
//                                create auth users and bypass RLS to seed).
//
// This recreates the same demo accounts and a working slice of the mock
// data every frontend/src/lib/mock*.ts file currently hardcodes, so the app
// behaves familiarly once wired to real Supabase calls.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Every Supabase write below is wrapped so a failure is loud and the script
// stops immediately, rather than silently leaving partial seed data behind —
// the .insert() calls further down would otherwise swallow their own errors.
async function insert(table, rows) {
  const { data, error } = await admin.from(table).insert(rows).select();
  if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
  return data;
}

async function upsertAuthUser(email, password, fullName, role) {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === email);
  if (found) return found.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  console.log("Creating demo accounts...");
  const staffId = await upsertAuthUser("jamie@hanbeelms.edu", "staff123", "Jamie Rivera", "staff");
  const studentId = await upsertAuthUser("ava@student.edu", "student123", "Ava Chen", "student");
  const managerId = await upsertAuthUser("morgan@hanbeelms.edu", "manager123", "Morgan Ellis", "manager");
  // The handle_new_user trigger creates the profiles row automatically.

  console.log("Seeding course content...");
  const { data: course } = await admin
    .from("courses")
    .insert({ title: "Intro to Design", description: "A foundational course covering design principles, color, and typography.", status: "published", owner_id: staffId })
    .select()
    .single();

  const { data: section } = await admin
    .from("sections")
    .insert({ course_id: course.id, name: "Intro to Design — Section B", capacity: 50, start_date: "2025-08-12", end_date: "2025-09-23" })
    .select()
    .single();

  const { data: mod1 } = await admin.from("modules").insert({ course_id: course.id, title: "Module 1: Foundations", sort_order: 0 }).select().single();
  const { data: mod2 } = await admin.from("modules").insert({ course_id: course.id, title: "Module 2: Typography", sort_order: 1 }).select().single();

  // Every object below lists every column explicitly (even when empty/null) —
  // PostgREST builds one bulk INSERT from the union of all objects' keys, so
  // a row missing a key gets an explicit NULL for it (bypassing the column's
  // DEFAULT), which then fails any NOT NULL constraint on that column.
  const emptyLesson = { body_text: "", external_url: "", youtube_id: null };
  await insert("lessons", [
    { ...emptyLesson, module_id: mod1.id, title: "Welcome & syllabus", content_type: "text", published: true, sort_order: 0, body_text: "Welcome to Intro to Design! Over the next 6 weeks we'll cover color theory, typography, and layout fundamentals." },
    { ...emptyLesson, module_id: mod1.id, title: "Color Theory", content_type: "video", published: true, sort_order: 1, youtube_id: "_2LLXnUdUIc" },
    { ...emptyLesson, module_id: mod1.id, title: "Reading: principles of design", content_type: "document", published: false, sort_order: 2 },
    { ...emptyLesson, module_id: mod2.id, title: "Type pairing", content_type: "slides", published: true, sort_order: 0 },
    { ...emptyLesson, module_id: mod2.id, title: "Further reading", content_type: "link", published: false, sort_order: 1, external_url: "https://www.interaction-design.org/literature/topics/typography" },
  ]);

  console.log("Enrolling the demo student...");
  await insert("enrollments", {
    section_id: section.id,
    student_id: studentId,
    status: "active",
    roll_no: "STU-2026-001",
    age: 21,
    institution: "Brookfield College",
    phone: "(555) 301-7742",
  });

  console.log("Seeding a holiday and an announcement...");
  await insert("holidays", { name: "Founders' Day", holiday_date: "2026-09-25", scope: "center" });
  await insert("announcements", {
    author_id: staffId,
    title: "Welcome to the course",
    body: "Excited to have you all this term — check the syllabus for the full schedule and grading breakdown.",
    audience: "all",
  });

  console.log("Done. Demo accounts: jamie@hanbeelms.edu / staff123, ava@student.edu / student123, morgan@hanbeelms.edu / manager123");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
