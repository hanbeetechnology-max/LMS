import { authenticatedSupabaseFetch } from "./supabaseAuth";

export interface ChatConversation {
  id: string;
  kind: "direct" | "group" | "support";
  title: string | null;
  org_id: string | null;
  other_user_id: string | null;
  other_full_name: string | null;
  other_role: string | null;
  last_body: string | null;
  last_kind: "text" | "system" | null;
  last_at: string | null;
  last_sender_name: string | null;
  unread_count: number;
  participant_count: number;
  my_member_role: "admin" | "member";
  created_at: string;
}

export interface ChatContact {
  user_id: string;
  full_name: string;
  role: string;
  relation: string;
  org_name: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  kind: "text" | "system";
  created_at: string;
}

async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export const fetchChatConversations = () => rpc<ChatConversation[]>("chat_conversations");
export const fetchChatContacts = () => rpc<ChatContact[]>("chat_contacts");
export const markChatRead = (conversationId: string) => rpc<boolean>("chat_mark_read", { p_conversation_id: conversationId });

const MESSAGE_PAGE_SIZE = 50;

/**
 * One page of a conversation's history, newest-first at the database level
 * (cheapest way to get "the latest N") but returned in ascending (oldest
 * first) order, ready to render or prepend directly.
 *
 * `before`, when given, is the created_at of the oldest message already
 * loaded — pass it back to fetch the next older page ("load more" at the
 * top of the thread). Without it, fetches the most recent page.
 */
export async function fetchChatMessages(conversationId: string, before?: string) {
  const query = new URLSearchParams({
    select: "id,conversation_id,sender_id,body,kind,created_at",
    conversation_id: `eq.${conversationId}`,
    order: "created_at.desc",
    limit: String(MESSAGE_PAGE_SIZE),
  });
  if (before) query.set("created_at", `lt.${before}`);
  const rows = await authenticatedSupabaseFetch<ChatMessage[]>(`/rest/v1/messages?${query.toString()}`);
  return rows.reverse();
}

export const CHAT_MESSAGE_PAGE_SIZE = MESSAGE_PAGE_SIZE;

export async function startDirectConversation(otherUserId: string) {
  return rpc<string>("start_conversation_with", { other_user_id: otherUserId });
}

export async function sendChatMessage(conversationId: string, body: string) {
  return authenticatedSupabaseFetch<unknown>("/rest/v1/messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ conversation_id: conversationId, body: body.trim() }),
  });
}
