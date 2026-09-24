import { supabase } from "./supabaseClient";

// Real messaging access, on top of `conversations`/`conversation_participants`/
// `messages` (supabase/migrations/0001_init.sql, 0002_rls.sql) — replaces
// mockMessages.ts's STAFF_CONVERSATIONS/STUDENT_CONVERSATIONS once a page is
// wired to it. Not yet wired into any page (see docs/PLAN.md); this is the
// data-access layer only.

export interface ConversationSummary {
  id: string;
  otherParticipantNames: string[];
  lastMessagePreview: string;
  lastMessageAt: string | null;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

interface ParticipantRow {
  conversation_id: string;
  user_id: string;
  profiles: { full_name: string } | null;
}

interface LatestMessageRow {
  conversation_id: string;
  body: string;
  created_at: string;
}

/** For the current user, every conversation they participate in (RLS: "a
 *  participant sees their own conversations"), each with the other
 *  participant(s)' names and the latest message preview. Two queries
 *  (participants, then latest messages) rather than one nested select,
 *  since "the single latest message per conversation" isn't expressible as
 *  a plain PostgREST embed. */
export async function fetchMyConversations(): Promise<ConversationSummary[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData?.user?.id;
  if (!myId) return [];

  const { data: participants, error: participantsError } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id, profiles(full_name)");
  if (participantsError || !participants) return [];

  const rows = participants as unknown as ParticipantRow[];
  const myConversationIds = Array.from(
    new Set(rows.filter((r) => r.user_id === myId).map((r) => r.conversation_id)),
  );
  if (myConversationIds.length === 0) return [];

  const othersByConversation = new Map<string, string[]>();
  for (const row of rows) {
    if (row.user_id === myId || !myConversationIds.includes(row.conversation_id)) continue;
    const list = othersByConversation.get(row.conversation_id) ?? [];
    list.push(row.profiles?.full_name ?? "Unknown user");
    othersByConversation.set(row.conversation_id, list);
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, body, created_at")
    .in("conversation_id", myConversationIds)
    .order("created_at", { ascending: false });
  const latestByConversation = new Map<string, LatestMessageRow>();
  for (const row of (messages ?? []) as LatestMessageRow[]) {
    if (!latestByConversation.has(row.conversation_id)) latestByConversation.set(row.conversation_id, row);
  }

  return myConversationIds
    .map((id) => {
      const latest = latestByConversation.get(id);
      return {
        id,
        otherParticipantNames: othersByConversation.get(id) ?? [],
        lastMessagePreview: latest?.body ?? "",
        lastMessageAt: latest?.created_at ?? null,
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
}

/** A participant reads messages in their own conversations per RLS; a
 *  non-participant gets an empty result rather than an error. */
export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }));
}

/** RLS ("a participant sends messages as themselves") requires sender_id =
 *  auth.uid() and the caller to already be a participant. */
export async function sendMessage(conversationId: string, body: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: userData } = await supabase.auth.getUser();
  const senderId = userData?.user?.id;
  if (!senderId) return false;
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  return !error;
}

/** Finds an existing 1:1 conversation between the current user and
 *  `otherUserId`, or creates one. `conversations`/`conversation_participants`
 *  have no INSERT policy in 0002_rls.sql (their RLS is read-only — a broad
 *  "any signed-in user can insert participants" policy would let a user add
 *  themselves to *any* conversation, not just one they're starting), so this
 *  calls the `start_conversation_with` SECURITY DEFINER RPC added in
 *  supabase/migrations/0014_messaging_rpc.sql instead of inserting directly.
 *  The RPC serializes concurrent calls for the same pair with
 *  pg_advisory_xact_lock so two simultaneous calls can't create duplicate
 *  conversations — this is the "transaction-like" race protection the task
 *  asked for, done server-side rather than via sequential client inserts. */
export async function startConversationWith(otherUserId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("start_conversation_with", { other_user_id: otherUserId });
  if (error || !data) return null;
  return data as string;
}
