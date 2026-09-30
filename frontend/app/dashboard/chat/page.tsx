"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./chat.module.css";
import { Send, Search } from "lucide-react";
import {
  fetchChatContacts,
  fetchChatConversations,
  fetchChatMessages,
  markChatRead,
  sendChatMessage,
  startDirectConversation,
  CHAT_MESSAGE_PAGE_SIZE,
  type ChatContact,
} from "../../../lib/messagingApi";
import { readStoredSession } from "../../../lib/supabaseAuth";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

export default function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [activeConversationId, setActiveConversationId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => { setCurrentUserId(readStoredSession()?.user.id ?? ""); }, []);

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: fetchChatConversations,
  });
  const { data: contacts } = useQuery({ queryKey: ["chat-contacts"], queryFn: fetchChatContacts });

  // Pick the conversation named in the URL (?conversation=...) or the first
  // one, once the list has actually loaded - only runs until a choice is made.
  useEffect(() => {
    if (activeConversationId || !conversations) return;
    const requestedId = new URLSearchParams(window.location.search).get("conversation");
    const requested = requestedId ? conversations.find((row) => row.id === requestedId) : undefined;
    setActiveConversationId(requested?.id ?? conversations[0]?.id ?? "");
  }, [conversations, activeConversationId]);

  const messagesQuery = useInfiniteQuery({
    queryKey: ["chat-messages", activeConversationId],
    queryFn: ({ pageParam }: { pageParam?: string }) => fetchChatMessages(activeConversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.length === CHAT_MESSAGE_PAGE_SIZE ? lastPage[0].created_at : undefined),
    enabled: Boolean(activeConversationId),
  });
  // Pages arrive newest-page-first (page 0 = latest 50); each page is itself
  // oldest-to-newest, so reverse the page order and flatten for chronological
  // display: [...oldest page ... newest page].
  const messages = [...(messagesQuery.data?.pages ?? [])].reverse().flat();

  const markRead = useMutation({
    mutationFn: markChatRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-conversations"] }),
  });
  useEffect(() => {
    if (activeConversationId) markRead.mutate(activeConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  // Auto-scroll to the newest message only when the LATEST page grows (a new
  // message arrived or was sent) - not when an older page was just loaded in
  // response to "Load earlier messages", which would otherwise yank the
  // person's scroll position away from what they just asked to see.
  const latestPageLength = messagesQuery.data?.pages[0]?.length ?? 0;
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeConversationId, latestPageLength]);

  const openContact = useMutation({
    mutationFn: startDirectConversation,
    onSuccess: async (conversationId) => {
      await queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      setActiveConversationId(conversationId);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "You can't start a conversation with this person."),
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) => sendChatMessage(activeConversationId, body),
    onSuccess: () => {
      setInputValue("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "We couldn't send your message."),
  });

  function handleSend() {
    const body = inputValue.trim();
    if (!body || !activeConversationId || sendMessage.isPending) return;
    setError("");
    sendMessage.mutate(body);
  }

  const conversationList = conversations ?? [];
  const contactList = contacts ?? [];
  const activeConversation = conversationList.find((conversation) => conversation.id === activeConversationId);
  const activeContact = contactList.find((contact) => contact.user_id === activeConversation?.other_user_id);
  const title = activeConversation?.kind === "direct"
    ? activeConversation.other_full_name ?? "Conversation"
    : activeConversation?.title ?? "Hanbee chat";
  const visibleConversations = conversationList.filter((conversation) =>
    (conversation.title ?? conversation.other_full_name ?? "Group chat").toLowerCase().includes(search.toLowerCase()),
  );
  const visibleContacts = contactList.filter((contact) => contact.full_name.toLowerCase().includes(search.toLowerCase()));

  const formatTime = (value: string | null) => value ? new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "";

  return (
    <div className={styles.layout}>
      <div className={styles.contactsSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Messages</h2>
          <div className={styles.inputWrapper}>
            <Search size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input type="search" className={styles.searchInput} placeholder="Search conversations and contacts…" value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 40 }} />
          </div>
        </div>
        <div className={styles.contactsList}>
          {conversationsLoading && <p role="status">Loading conversations…</p>}
          {visibleConversations.map((conversation) => {
            const contactName = conversation.kind === "direct" ? conversation.other_full_name ?? "Hanbee user" : conversation.title ?? "Group chat";
            return (
              <button key={conversation.id} type="button" className={`${styles.contactItem} ${activeConversationId === conversation.id ? styles.active : ""}`} onClick={() => setActiveConversationId(conversation.id)}>
                <div className={styles.contactAvatar}>{initials(contactName)}</div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>{contactName}</div>
                  <div className={styles.contactPreview}>{conversation.last_body ?? "No messages yet"}</div>
                </div>
                {conversation.unread_count > 0 && <span aria-label={`${conversation.unread_count} unread messages`}>{conversation.unread_count}</span>}
              </button>
            );
          })}
          {visibleContacts.length > 0 && <h3 style={{ padding: "12px 16px 4px" }}>Start a conversation</h3>}
          {visibleContacts.map((contact: ChatContact) => (
            <button key={contact.user_id} type="button" className={styles.contactItem} onClick={() => openContact.mutate(contact.user_id)} disabled={openContact.isPending}>
              <div className={styles.contactAvatar}>{initials(contact.full_name)}</div>
              <div className={styles.contactInfo}>
                <div className={styles.contactName}>{contact.full_name}</div>
                <div className={styles.contactPreview}>{contact.relation.replaceAll("_", " ")}{contact.org_name ? ` · ${contact.org_name}` : ""}</div>
              </div>
            </button>
          ))}
          {!conversationsLoading && visibleConversations.length === 0 && visibleContacts.length === 0 && <p>No conversations or contacts found.</p>}
        </div>
      </div>

      <div className={styles.mainChat}>
        {activeConversation ? (
          <>
            <header className={styles.chatHeader}>
              <div className={styles.contactAvatar}>{initials(title)}</div>
              <div className={styles.chatHeaderInfo}><h2>{title}</h2><p>{activeConversation.kind === "direct" ? activeContact?.relation.replaceAll("_", " ") ?? activeConversation.other_role : `${activeConversation.participant_count} participants`}</p></div>
            </header>
            {error && <p role="alert" style={{ padding: "8px 16px" }}>{error}</p>}
            <div className={styles.chatHistory}>
              {messagesQuery.hasNextPage && (
                <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                  <button type="button" className={styles.contactItem} style={{ display: "inline-flex", width: "auto", padding: "6px 16px" }} disabled={messagesQuery.isFetchingNextPage} onClick={() => messagesQuery.fetchNextPage()}>
                    {messagesQuery.isFetchingNextPage ? "Loading…" : "Load earlier messages"}
                  </button>
                </div>
              )}
              {messages.map((message) => {
                const mine = message.sender_id === activeContact?.user_id ? false : message.sender_id === currentUserId;
                return <div key={message.id} className={`${styles.messageWrapper} ${mine ? styles.me : styles.other}`}>
                  <div className={`${styles.message} ${mine ? styles.me : styles.other}`}>{message.body}</div>
                  <time className={styles.timestamp} dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                </div>;
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className={styles.inputArea}>
              <div className={styles.inputWrapper}>
                <input type="text" className={styles.input} maxLength={4000} placeholder={`Message ${title}…`} value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(); } }} />
                <button className={styles.sendBtn} onClick={handleSend} disabled={!inputValue.trim() || sendMessage.isPending} aria-label="Send message"><Send size={18} /></button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            {error || "Select a conversation or contact to start chatting."}
          </div>
        )}
      </div>
    </div>
  );
}
