import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Since Phase 1 of docs/PLAN.md §10.44, StudentLessonViewerPage reads real
// lesson_completions rows for ava@student.edu instead of resetting on every
// fresh browser context (sessionStorage, before this round) — so, unlike
// every other mock-data page in this app, her course progress now survives
// between separate test runs and would make a "still locked" assertion
// flaky the second time any lesson-progress test runs. This resets her real
// progress for the seeded "Intro to Design" course directly via the REST
// API before each test that depends on a clean starting state — the same
// "no reset mechanism yet" gap StudentLessonViewerPage's own comment used
// to flag before this migration.
function readEnvLocal(): { url: string; anonKey: string } {
  const raw = readFileSync(path.join(__dirname, "../../.env.local"), "utf8");
  const url = raw.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
  const anonKey = raw.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
  if (!url || !anonKey) throw new Error("VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY not found in .env.local");
  return { url, anonKey };
}

export async function resetAvaLessonProgress(): Promise<void> {
  const { url, anonKey } = readEnvLocal();

  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ava@student.edu", password: "student123" }),
  });
  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
  if (!accessToken) return; // account unreachable — the test itself will fail loudly if this mattered

  const authHeaders = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };

  const enrollmentsRes = await fetch(`${url}/rest/v1/enrollments?select=id`, { headers: authHeaders });
  const enrollments = (await enrollmentsRes.json()) as Array<{ id: string }>;
  if (!Array.isArray(enrollments) || enrollments.length === 0) return;

  await Promise.all(
    enrollments.map((e) =>
      fetch(`${url}/rest/v1/lesson_completions?enrollment_id=eq.${e.id}`, { method: "DELETE", headers: authHeaders }),
    ),
  );
}
