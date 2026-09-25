import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

// Chat v2 data-access layer on top of supabase/migrations/0026_chat_v2.sql.
// Replaces messagingApi.ts functionally (that file is left in place). Who may
// message whom, group membership, read state and rate limits are all enforced
// in the database; this module only calls the RPCs and tables RLS allows.
// Not yet wired into any page.

export type ConversationKind = "direct" | "group" | "support";
export type ChatMemberRole = "admin" | "member";
export type MessageKind = "text" | "system";
export type ChatUserRole = "student" | "staff" | "manager" | "school_staff";
export type ContactRelation =
  | "school_staff"
  | "instructor"
  | "student"
  | "colleague"
  | "hanbee_staff"
  | "school_owner"
  | "manager";

export interface ConversationSummary {
  id: string;
  kind: ConversationKind;
  title: string | null;
  orgId: string | null;
  /** The other person, for direct chats only. */
  otherUserId: string | null;
  otherFullName: string | null;
  otherRole: ChatUserRole | null;
  lastBody: string | null;
  lastKind: MessageKind | null;
  lastAt: string | null;
  lastSenderName: string | null;
  unreadCount: number;
  participantCount: number;
  myMemberRole: ChatMemberRole;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  kind: MessageKind;
  createdAt: string;
}

export interface ChatContact {
  userId: string;
  fullName: string;
  role: ChatUserRole;
  relation: ContactRelation;
  orgName: string | null;
}

export interface ChatMember {
  userId: string;
  fullName: string;
  role: ChatUserRole;
  memberRole: ChatMemberRole;
  joinedAt: string;
  canAdd: boolean;
  canRemove: boolean;
}

export interface PresenceUser {
  userId: string;
  name: string;
}

export interface FetchMessagesOptions {
  /** ISO timestamp: only messages older than this (for paging back). */
  before?: string;
  /** Default 50, max 200. */
  limit?: number;
}

interface ConversationRpcRow {
  id: string;
  kind: ConversationKind;
  title: string | null;
  org_id: string | null;
  other_user_id: string | null;
  other_full_name: string | null;
  other_role: ChatUserRole | null;
  last_body: string | null;
  last_kind: MessageKind | null;
  last_at: string | null;
  last_sender_name: string | null;
  unread_count: number;
  participant_count: number;
  my_member_role: ChatMemberRole;
  created_at: string;
}

interface MessageDbRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  kind: MessageKind;
  created_at: string;
}

const MESSAGE_COLUMNS = "id, conversation_id, sender_id, body, kind, created_at";

function toMessage(row: MessageDbRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    kind: row.kind,
    createdAt: row.created_at,
  };
}

/** Every conversation the caller is in, most recent activity first
 *  (conversations with no messages last), with unread counts. */
export async function listConversations(): Promise<ConversationSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("chat_conversations");
  if (error || !data) return [];
  return (data as ConversationRpcRow[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    orgId: r.org_id,
    otherUserId: r.other_user_id,
    otherFullName: r.other_full_name,
    otherRole: r.other_role,
    lastBody: r.last_body,
    lastKind: r.last_kind,
    lastAt: r.last_at,
    lastSenderName: r.last_sender_name,
    unreadCount: r.unread_count,
    participantCount: r.participant_count,
    myMemberRole: r.my_member_role,
    createdAt: r.created_at,
  }));
}

/** Pages newest-first from the database, returned oldest-first for display.
 *  To load older messages pass `before` = the createdAt of the oldest one shown. */
export async function fetchMessages(conversationId: string, options: FetchMessagesOptions = {}): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  let query = supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options.before) query = query.lt("created_at", options.before);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as MessageDbRow[]).map(toMessage).reverse();
}

/** Returns the inserted row, or null when refused (not a member, rate limited,
 *  suspended account, empty or over-long body). The server forces kind 'text'
 *  and the real sender regardless of what is sent. */
export async function sendMessage(conversationId: string, body: string): Promise<ChatMessage | null> {
  if (!supabase) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const senderId = sessionData.session?.user.id;
  if (!senderId) return null;
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error || !data) return null;
  return toMessage(data as MessageDbRow);
}

export async function markRead(conversationId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("chat_mark_read", { p_conversation_id: conversationId });
  return !error && data === true;
}

/** People the caller may start a chat with (the database decides). */
export async function listContacts(): Promise<ChatContact[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("chat_contacts");
  if (error || !data) return [];
  return (
    data as { user_id: string; full_name: string; role: ChatUserRole; relation: ContactRelation; org_name: string | null }[]
  ).map((r) => ({ userId: r.user_id, fullName: r.full_name, role: r.role, relation: r.relation, orgName: r.org_name }));
}

/** Finds or creates the 1:1 chat. Null when the contact rules refuse it. */
export async function startDirect(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("start_conversation_with", { other_user_id: userId });
  if (error || !data) return null;
  return data as string;
}

export async function listMembers(conversationId: string): Promise<ChatMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("chat_members", { p_conversation_id: conversationId });
  if (error || !data) return [];
  return (
    data as {
      user_id: string;
      full_name: string;
      role: ChatUserRole;
      member_role: ChatMemberRole;
      joined_at: string;
      can_add: boolean;
      can_remove: boolean;
    }[]
  ).map((r) => ({
    userId: r.user_id,
    fullName: r.full_name,
    role: r.role,
    memberRole: r.member_role,
    joinedAt: r.joined_at,
    canAdd: r.can_add,
    canRemove: r.can_remove,
  }));
}

/** Group admins only (school staff of that school, Hanbee staff, managers). */
export async function addMember(conversationId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("chat_add_member", { p_conversation_id: conversationId, p_user_id: userId });
  return !error;
}

export async function removeMember(conversationId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc("chat_remove_member", { p_conversation_id: conversationId, p_user_id: userId });
  return !error;
}

// ---------------------------------------------------------------------------
// Realtime. postgres_changes respects RLS, so a subscriber only ever receives
// rows of conversations they are in.
// ---------------------------------------------------------------------------

/** New messages in one conversation. Returns an unsubscribe function. */
export function subscribeToConversation(conversationId: string, onMessage: (message: ChatMessage) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`chat-messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(toMessage(payload.new as MessageDbRow)),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

/** Any new message or membership change visible to the caller: refresh the
 *  inbox (listConversations) when this fires. Returns an unsubscribe function. */
export function subscribeToInbox(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`chat-inbox:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants" }, () => onChange())
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Presence and typing (Realtime presence/broadcast only, nothing is stored).
// ---------------------------------------------------------------------------

export interface PresenceHandle {
  /** Broadcasts "typing" (call on keystrokes; throttle in the UI). */
  sendTyping: () => void;
  leave: () => void;
}

/** Joins the conversation's presence channel. `onSync` receives everyone
 *  currently online in it and the ids of people who are typing right now. */
export function joinPresence(
  conversationId: string,
  user: PresenceUser,
  onSync: (online: PresenceUser[], typingUserIds: string[]) => void,
): PresenceHandle {
  if (!supabase) return { sendTyping: () => {}, leave: () => {} };
  const client = supabase;
  const typing = new Map<string, ReturnType<typeof setTimeout>>();
  let online: PresenceUser[] = [];
  const emit = () => onSync(online, Array.from(typing.keys()));

  const channel: RealtimeChannel = client.channel(`chat-presence:${conversationId}`, {
    config: { private: true, presence: { key: user.userId }, broadcast: { self: false } },
  });
  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ name?: string }>();
      online = Object.keys(state).map((key) => ({ userId: key, name: state[key]?.[0]?.name ?? "" }));
      emit();
    })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      const id = (payload as { userId?: string } | undefined)?.userId;
      if (!id || id === user.userId) return;
      const existing = typing.get(id);
      if (existing) clearTimeout(existing);
      typing.set(
        id,
        setTimeout(() => {
          typing.delete(id);
          emit();
        }, 3000),
      );
      emit();
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ name: user.name });
    });

  return {
    sendTyping: () => {
      void channel.send({ type: "broadcast", event: "typing", payload: { userId: user.userId } });
    },
    leave: () => {
      typing.forEach((t) => clearTimeout(t));
      typing.clear();
      void client.removeChannel(channel);
    },
  };
}

/** Convenience: broadcast typing on an existing handle. */
export function sendTyping(handle: PresenceHandle): void {
  handle.sendTyping();
}
