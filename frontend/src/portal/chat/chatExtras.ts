import { supabase } from "../../lib/supabaseClient";
import type { ChatMessage, MessageKind } from "../../lib/chatApi";

// Small helpers that sit next to lib/chatApi.ts (which is read-only for this
// screen). They exist because chatApi returns only booleans/nulls, so the UI
// could not tell a rate limit from a contact-rule refusal, and it exposes no
// read state. Every rule is still enforced by the database.

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; reason: "rate" | "contact" | "other" };

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  kind: MessageKind;
  created_at: string;
}

const COLUMNS = "id, conversation_id, sender_id, body, kind, created_at";

function toMessage(r: MessageRow): ChatMessage {
  return { id: r.id, conversationId: r.conversation_id, senderId: r.sender_id, body: r.body, kind: r.kind, createdAt: r.created_at };
}

export async function sendMessageDetailed(conversationId: string, body: string): Promise<SendResult> {
  if (!supabase) return { ok: false, reason: "other" };
  const { data: session } = await supabase.auth.getSession();
  const senderId = session.session?.user.id;
  if (!senderId) return { ok: false, reason: "other" };
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select(COLUMNS)
    .single();
  if (error || !data) {
    const text = (error?.message ?? "").toLowerCase();
    if (text.includes("too fast")) return { ok: false, reason: "rate" };
    if (text.includes("not allowed to message")) return { ok: false, reason: "contact" };
    return { ok: false, reason: "other" };
  }
  return { ok: true, message: toMessage(data as MessageRow) };
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function memberRpc(fn: "chat_add_member" | "chat_remove_member", conversationId: string, userId: string): Promise<ActionResult> {
  if (!supabase) return { ok: false, message: "Chat is not available right now." };
  const { error } = await supabase.rpc(fn, { p_conversation_id: conversationId, p_user_id: userId });
  if (!error) return { ok: true, message: "" };
  const text = error.message || "";
  // The server's own sentence is plain language; show it, with a safe fallback.
  return { ok: false, message: text && text.length < 140 ? text.charAt(0).toUpperCase() + text.slice(1) + (text.endsWith(".") ? "" : ".") : "That did not work. Please try again." };
}

export const addMemberDetailed = (conversationId: string, userId: string) => memberRpc("chat_add_member", conversationId, userId);
export const removeMemberDetailed = (conversationId: string, userId: string) => memberRpc("chat_remove_member", conversationId, userId);

/** userId -> last_read_at for every participant (participants can read this list). */
export async function fetchReadState(conversationId: string): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("conversation_participants").select("user_id, last_read_at").eq("conversation_id", conversationId);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data as { user_id: string; last_read_at: string }[]) out[row.user_id] = row.last_read_at;
  return out;
}

/** Fires when anyone's read marker in this conversation changes. */
export function subscribeToReadState(conversationId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`chat-reads:${conversationId}:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${conversationId}` }, () => onChange())
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

/** Reports whether Realtime is working. Callers fall back to polling when not. */
export function monitorRealtime(onStatus: (ok: boolean) => void): () => void {
  if (!supabase) {
    onStatus(false);
    return () => {};
  }
  const client = supabase;
  const timer = setTimeout(() => onStatus(false), 8000);
  const channel = client.channel(`chat-health:${Math.random().toString(36).slice(2)}`).subscribe((status) => {
    if (status === "SUBSCRIBED") {
      clearTimeout(timer);
      onStatus(true);
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      clearTimeout(timer);
      onStatus(false);
    }
  });
  return () => {
    clearTimeout(timer);
    void client.removeChannel(channel);
  };
}
