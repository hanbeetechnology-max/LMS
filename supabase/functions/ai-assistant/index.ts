// Supabase Edge Function (Deno runtime) — HanbeeLms AI Assistant.
//
// Calls Google Gemini's free tier on behalf of an authenticated student.
// This is the ONLY server-side piece of the AI Assistant feature — there is
// deliberately no other backend involved (the earlier FastAPI/microservices
// direction was fully abandoned and ripped out; do not revive it).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200, origin: string | null = null, allowedOrigins: string[] = []) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, x-client-info, apikey, content-type";
    headers["Access-Control-Allow-Methods"] = "POST, GET, DELETE, OPTIONS";
  }
  return new Response(JSON.stringify(body), {
    status,
    headers,
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
  const origin = req.headers.get("Origin");
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const normalizedOrigin = origin?.replace(/\/$/, "") ?? null;
  const respond = (body: unknown, status = 200) => json(body, status, normalizedOrigin, allowedOrigins);

  if (allowedOrigins.length === 0) {
    return respond({ error: "AI Assistant isn't configured yet." }, 500);
  }
  if (normalizedOrigin && !allowedOrigins.includes(normalizedOrigin)) {
    return respond({ error: "This origin is not allowed." }, 403);
  }

  if (req.method === "OPTIONS") {
    const headers = new Headers({ Vary: "Origin" });
    if (normalizedOrigin) {
      headers.set("Access-Control-Allow-Origin", normalizedOrigin);
      headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
      headers.set("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
    }
    return new Response("ok", { headers });
  }

  if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
    return respond({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond({ error: "AI Assistant isn't configured yet." }, 500);
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
    return respond({ error: "You must be signed in to use the AI Assistant." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // GET returns the caller's own saved history (so a reload can resume the
  // conversation); DELETE clears it ("start a new conversation").
  if (req.method === "GET") {
    const { data: rows, error: historyError } = await adminClient
      .from("ai_chat_messages")
      .select("role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY_TURNS * 2);
    if (historyError) {
      return respond({ error: "Something went wrong loading your history. Please try again." }, 500);
    }
    return respond({ history: rows ?? [] });
  }
  if (req.method === "DELETE") {
    const { error: deleteError } = await adminClient.from("ai_chat_messages").delete().eq("user_id", user.id);
    if (deleteError) {
      return respond({ error: "Something went wrong clearing your history. Please try again." }, 500);
    }
    return respond({ ok: true });
  }

  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid request body." }, 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : [];
  if (!message) {
    return respond({ error: "Message is required." }, 400);
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return respond({ error: `Please keep your message under ${MAX_MESSAGE_CHARS} characters.` }, 400);
  }

  // 2. Per-user rate limiting, using the service-role key (bypasses RLS —
  // this table has no client-facing policies at all, by design). A single
  // atomic RPC — not a separate read then a separate write — so two
  // requests from the same user arriving close together can't both read
  // the same pre-increment count and both slip through the limit.
  const { data: hourlyUsage, error: hourlyError } = await adminClient.rpc(
    "reserve_ai_user_hourly_capacity",
    { p_user: user.id, p_limit: RATE_LIMIT_PER_HOUR, p_window_seconds: WINDOW_MS / 1000 },
  );
  if (hourlyError) {
    return respond({ error: "Something went wrong checking your usage. Please try again." }, 500);
  }
  const hourlyRow = Array.isArray(hourlyUsage) ? hourlyUsage[0] : hourlyUsage;
  if (!hourlyRow?.allowed) {
    return respond(
      { error: "You've reached the hourly limit for the AI assistant. Try again in a bit." },
      429,
    );
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return respond({ error: "AI Assistant isn't configured yet." }, 500);
  }

  const dailyLimit = Number(Deno.env.get("GEMINI_DAILY_REQUEST_LIMIT") ?? "100");
  if (!Number.isSafeInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 100000) {
    return respond({ error: "AI Assistant daily capacity is not configured correctly." }, 500);
  }
  const { data: dailyCapacity, error: dailyCapacityError } = await adminClient.rpc(
    "reserve_ai_daily_capacity",
    { p_daily_limit: dailyLimit },
  );
  if (dailyCapacityError) {
    return respond({ error: "Something went wrong checking AI capacity. Please try again." }, 500);
  }
  const capacityRow = Array.isArray(dailyCapacity) ? dailyCapacity[0] : dailyCapacity;
  if (!capacityRow?.allowed) {
    return respond({ error: "The AI assistant has reached today's shared limit. Please try again tomorrow." }, 429);
  }

  // 3. Call Gemini.
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
      .filter((m) => m && (m.role === "user" || m.role === "model") && typeof m.content === "string" && m.content.length <= MAX_MESSAGE_CHARS)
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
      return respond({ error: "The AI assistant has reached its daily capacity. Please try again later." }, 429);
    }
    if (!geminiResponse.ok) {
      return respond({ error: "The AI assistant is temporarily unavailable. Please try again shortly." }, 502);
    }

    const geminiData = await geminiResponse.json();
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof reply !== "string" || !reply.trim()) {
      return respond({ error: "The AI assistant didn't return a response. Please try again." }, 502);
    }

    const trimmedReply = reply.trim();
    // Best-effort: a failed save shouldn't fail the reply the user already got.
    await adminClient.from("ai_chat_messages").insert([
      { user_id: user.id, role: "user", content: message },
      { user_id: user.id, role: "model", content: trimmedReply.slice(0, MAX_MESSAGE_CHARS) },
    ]);

    return respond({ reply: trimmedReply });
  } catch {
    return respond({ error: "Couldn't reach the AI assistant. Please try again shortly." }, 502);
  }
});
