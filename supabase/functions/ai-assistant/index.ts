// Supabase Edge Function (Deno runtime) — HanbeeLms AI Assistant.
//
// Calls Google Gemini's free tier on behalf of an authenticated student.
// This is the ONLY server-side piece of the AI Assistant feature — there is
// deliberately no other backend involved (the earlier FastAPI/microservices
// direction was fully abandoned and ripped out; do not revive it).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const RATE_LIMIT_PER_HOUR = 20;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_TURNS = 10;

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : [];
  if (!message) {
    return json({ error: "Message is required." }, 400);
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return json({ error: `Please keep your message under ${MAX_MESSAGE_CHARS} characters.` }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "AI Assistant isn't configured yet." }, 500);
  }

  // 1. Authenticate the caller using their forwarded JWT — a real check.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return json({ error: "You must be signed in to use the AI Assistant." }, 401);
  }

  // 2. Per-user rate limiting, using the service-role key (bypasses RLS —
  // this table has no client-facing policies at all, by design).
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: usage, error: usageError } = await adminClient
    .from("ai_chat_usage")
    .select("request_count, window_started_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (usageError) {
    return json({ error: "Something went wrong checking your usage. Please try again." }, 500);
  }

  const now = Date.now();
  const windowStartedAt = usage ? new Date(usage.window_started_at).getTime() : 0;
  const windowExpired = !usage || now - windowStartedAt > WINDOW_MS;

  if (windowExpired) {
    const { error: upsertError } = await adminClient
      .from("ai_chat_usage")
      .upsert({ user_id: user.id, request_count: 1, window_started_at: new Date(now).toISOString() });
    if (upsertError) {
      return json({ error: "Something went wrong tracking your usage. Please try again." }, 500);
    }
  } else {
    const nextCount = usage.request_count + 1;
    if (nextCount > RATE_LIMIT_PER_HOUR) {
      return json(
        { error: "You've reached the hourly limit for the AI assistant. Try again in a bit." },
        429,
      );
    }
    const { error: updateError } = await adminClient
      .from("ai_chat_usage")
      .update({ request_count: nextCount })
      .eq("user_id", user.id);
    if (updateError) {
      return json({ error: "Something went wrong tracking your usage. Please try again." }, 500);
    }
  }

  // 3. Call Gemini.
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return json({ error: "AI Assistant isn't configured yet." }, 500);
  }

  const systemInstruction = {
    parts: [
      {
        text:
          "You are the AI Assistant inside HanbeeLms, a small learning management system that also runs an " +
          "RC (radio-control) F1 racing tournament. You help students with questions about their course " +
          "content, RC racing basics (setup, rules, technique), and how to use the HanbeeLms platform " +
          "(courses, lessons, assessments, tournament registration, etc). Keep answers concise — a few " +
          "sentences, not essays. Stay strictly on-topic for HanbeeLms, its courses, and RC racing. Politely " +
          "decline requests unrelated to that scope (e.g. writing unrelated code, or anything harmful).",
      },
    ],
  };

  const contents = [
    ...history
      .filter((m) => m && (m.role === "user" || m.role === "model") && typeof m.content === "string")
      .map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  const primaryModel = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-lite-latest";
  const fallbackModel = Deno.env.get("GEMINI_FALLBACK_MODEL") ?? "gemini-flash-latest";

  const callGemini = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiApiKey },
      body: JSON.stringify({ contents, systemInstruction }),
    });

  try {
    let geminiResponse = await callGemini(primaryModel);
    // Free-tier models return 503 under load and 429 at quota; one retry on
    // the fallback model keeps the assistant usable through both.
    if ((geminiResponse.status === 503 || geminiResponse.status === 429) && fallbackModel !== primaryModel) {
      geminiResponse = await callGemini(fallbackModel);
    }

    if (geminiResponse.status === 429) {
      return json({ error: "The AI assistant has reached its daily capacity. Please try again later." }, 429);
    }
    if (!geminiResponse.ok) {
      return json({ error: "The AI assistant is temporarily unavailable. Please try again shortly." }, 502);
    }

    const geminiData = await geminiResponse.json();
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof reply !== "string" || !reply.trim()) {
      return json({ error: "The AI assistant didn't return a response. Please try again." }, 502);
    }

    return json({ reply: reply.trim() });
  } catch {
    return json({ error: "Couldn't reach the AI assistant. Please try again shortly." }, 502);
  }
});
