import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Same "read .env.local, auth with the anon key + a real password grant,
// then hit PostgREST directly" pattern _realStudentProgress.ts already
// established for test setup/arrange steps — RLS itself (not a service-role
// bypass) is what authorizes these calls: staff/manager accounts have real
// INSERT/UPDATE policies on assessments/assessment_submissions, so the
// already-seeded jamie@hanbeelms.edu staff account is enough to arrange
// fixture data and to backdate a submission's auto_unlock_at to simulate
// the 10-minute SLA, with no separate service-role secret needed.
function readEnvLocal(): { url: string; anonKey: string } {
  const raw = readFileSync(path.join(__dirname, "../../.env.local"), "utf8");
  const url = raw.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
  const anonKey = raw.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
  if (!url || !anonKey) throw new Error("VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY not found in .env.local");
  return { url, anonKey };
}

async function signIn(email: string, password: string) {
  const { url, anonKey } = readEnvLocal();
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await tokenRes.json()) as { access_token?: string; user?: { id: string } };
  if (!body.access_token || !body.user) throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(body)}`);
  return { url, anonKey, accessToken: body.access_token, userId: body.user.id };
}

function headers(anonKey: string, accessToken: string) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

/**
 * Ensures the seeded "Color Theory" video lesson (the same lesson
 * lesson-lock-certificate.spec.ts navigates to) has a one-question knowledge
 * check attached, creating it via real staff-authorized REST calls if it
 * doesn't exist yet (idempotent — safe to call every test run).
 * Returns the assessment id, the correct option id, and Ava's enrollment id.
 */
export async function ensureColorTheoryAssessment(): Promise<{
  assessmentId: string;
  correctOptionId: string;
  wrongOptionId: string;
  enrollmentId: string;
}> {
  const staff = await signIn("jamie@hanbeelms.edu", "staff123");
  const h = headers(staff.anonKey, staff.accessToken);

  const lessonRes = await fetch(
    `${staff.url}/rest/v1/lessons?title=eq.Color Theory&select=id`,
    { headers: h },
  );
  const lessons = (await lessonRes.json()) as Array<{ id: string }>;
  if (!lessons.length) throw new Error('Seeded "Color Theory" lesson not found — has supabase/seed.mjs been run?');
  const lessonId = lessons[0].id;

  let assessmentId: string;
  const existingRes = await fetch(`${staff.url}/rest/v1/assessments?lesson_id=eq.${lessonId}&select=id`, { headers: h });
  const existing = (await existingRes.json()) as Array<{ id: string }>;

  let correctOptionId: string;
  let wrongOptionId: string;

  if (existing.length) {
    assessmentId = existing[0].id;
    const qRes = await fetch(`${staff.url}/rest/v1/assessment_questions?assessment_id=eq.${assessmentId}&select=id`, { headers: h });
    const questions = (await qRes.json()) as Array<{ id: string }>;
    const oRes = await fetch(`${staff.url}/rest/v1/assessment_options?question_id=eq.${questions[0].id}&select=id,is_correct`, { headers: h });
    const options = (await oRes.json()) as Array<{ id: string; is_correct: boolean }>;
    correctOptionId = options.find((o) => o.is_correct)!.id;
    wrongOptionId = options.find((o) => !o.is_correct)!.id;
  } else {
    const aRes = await fetch(`${staff.url}/rest/v1/assessments`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ lesson_id: lessonId, title: "Color Theory check", created_by: staff.userId }),
    });
    const [assessment] = (await aRes.json()) as Array<{ id: string }>;
    assessmentId = assessment.id;

    const qRes = await fetch(`${staff.url}/rest/v1/assessment_questions`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ assessment_id: assessmentId, prompt: "Which color is a primary color?", sort_order: 0 }),
    });
    const [question] = (await qRes.json()) as Array<{ id: string }>;

    const oRes = await fetch(`${staff.url}/rest/v1/assessment_options`, {
      method: "POST",
      headers: h,
      body: JSON.stringify([
        { question_id: question.id, label: "Red", is_correct: true, sort_order: 0 },
        { question_id: question.id, label: "Brown", is_correct: false, sort_order: 1 },
      ]),
    });
    const options = (await oRes.json()) as Array<{ id: string; is_correct: boolean }>;
    correctOptionId = options.find((o) => o.is_correct)!.id;
    wrongOptionId = options.find((o) => !o.is_correct)!.id;
  }

  const enrollRes = await fetch(`${staff.url}/rest/v1/enrollments?student_id=eq.${await avaId(staff)}&select=id`, { headers: h });
  const enrollments = (await enrollRes.json()) as Array<{ id: string }>;
  if (!enrollments.length) throw new Error("ava@student.edu has no real enrollment — has supabase/seed.mjs been run?");

  return { assessmentId, correctOptionId, wrongOptionId, enrollmentId: enrollments[0].id };
}

async function avaId(staff: { url: string; anonKey: string; accessToken: string }): Promise<string> {
  const res = await fetch(`${staff.url}/rest/v1/profiles?full_name=eq.Ava Chen&select=id`, { headers: headers(staff.anonKey, staff.accessToken) });
  const [row] = (await res.json()) as Array<{ id: string }>;
  return row.id;
}

/**
 * Resets an existing submission row back to a fresh "just submitted, still
 * pending" state via a staff-authorized UPDATE (staff/manager has a real,
 * unrestricted UPDATE policy on assessment_submissions — there is no INSERT
 * or DELETE policy for anyone but the security-definer submit_assessment
 * RPC, so this is the legitimate way to re-stage a row for a second
 * scenario without violating the unique (assessment_id, enrollment_id)
 * constraint). Only ever used to ARRANGE a starting state between test
 * scenarios — the actual behavior under test (submit, verify, auto-unlock)
 * is always driven through the real UI/RPC path, never this helper.
 */
export async function resetSubmissionToPending(assessmentId: string, enrollmentId: string): Promise<void> {
  const staff = await signIn("jamie@hanbeelms.edu", "staff123");
  const res = await fetch(
    `${staff.url}/rest/v1/assessment_submissions?assessment_id=eq.${assessmentId}&enrollment_id=eq.${enrollmentId}`,
    {
      method: "PATCH",
      headers: headers(staff.anonKey, staff.accessToken),
      body: JSON.stringify({ status: "pending", verified_at: null, auto_unlock_at: new Date(Date.now() + 10 * 60_000).toISOString() }),
    },
  );
  if (!res.ok) throw new Error(`Failed to reset submission to pending: ${res.status} ${await res.text()}`);
}

/**
 * Backdates a submission's auto_unlock_at to simulate the 10-minute SLA
 * having already elapsed — this repo's established pglite technique
 * ("backdate a timestamp"), adapted here for a live Supabase test via a
 * real staff-authorized REST PATCH (staff has an UPDATE policy on
 * assessment_submissions) instead of waiting 10 real minutes.
 */
export async function backdateAutoUnlock(assessmentId: string, enrollmentId: string, minutesAgo: number): Promise<void> {
  const staff = await signIn("jamie@hanbeelms.edu", "staff123");
  const pastIso = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const res = await fetch(
    `${staff.url}/rest/v1/assessment_submissions?assessment_id=eq.${assessmentId}&enrollment_id=eq.${enrollmentId}`,
    { method: "PATCH", headers: headers(staff.anonKey, staff.accessToken), body: JSON.stringify({ auto_unlock_at: pastIso }) },
  );
  if (!res.ok) throw new Error(`Failed to backdate auto_unlock_at: ${res.status} ${await res.text()}`);
}
