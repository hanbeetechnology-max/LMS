"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./chat.module.css";
import { Send, Search } from "lucide-react";
import {
  fetchChatContacts,
  fetchChatConversations,
  fetchChatMessages,
  markChatRead,
  sendChatMessage,
  startDirectConversation,
  type ChatContact,
  type ChatConversation,
  type ChatMessage,
} from "../../../lib/messagingApi";
import { readStoredSession } from "../../../lib/supabaseAuth";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

export default function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const reloadConversations = useCallback(async () => setConversations(await fetchChatConversations()), []);

  useEffect(() => {
    let active = true;
    setCurrentUserId(readStoredSession()?.user.id ?? "");
    Promise.all([fetchChatConversations(), fetchChatContacts()])
      .then(([rows, directory]) => {
        if (!active) return;
        setConversations(rows);
        setContacts(directory);
        const requestedId = new URLSearchParams(window.location.search).get("conversation");
        const requestedConversation = requestedId ? rows.find((row) => row.id === requestedId) : undefined;
        if (requestedConversation) setActiveConversationId(requestedConversation.id);
        else if (rows[0]) setActiveConversationId(rows[0].id);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load your conversations."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!activeConversationId) { setMessages([]); return () => { active = false; }; }
    Promise.all([fetchChatMessages(activeConversationId), markChatRead(activeConversationId)])
      .then(([rows]) => {
        if (!active) return;
        setMessages(rows);
        void reloadConversations().catch(() => undefined);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load this conversation."); });
    return () => { active = false; };
  }, [activeConversationId, reloadConversations]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
  const activeContact = contacts.find((contact) => contact.user_id === activeConversation?.other_user_id);
  const title = activeConversation?.kind === "direct"
    ? activeConversation.other_full_name ?? "Conversation"
    : activeConversation?.title ?? "Hanbee chat";
  const visibleConversations = conversations.filter((conversation) =>
    (conversation.title ?? conversation.other_full_name ?? "Group chat").toLowerCase().includes(search.toLowerCase()),
  );
  const visibleContacts = contacts.filter((contact) => contact.full_name.toLowerCase().includes(search.toLowerCase()));

  async function openContact(contact: ChatContact) {
    setBusy(true);
    setError("");
    try {
      const conversationId = await startDirectConversation(contact.user_id);
      await reloadConversations();
      setActiveConversationId(conversationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "You can't start a conversation with this person.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    const body = inputValue.trim();
    if (!body || !activeConversationId || busy) return;
    setBusy(true);
    setError("");
    try {
      await sendChatMessage(activeConversationId, body);
      setInputValue("");
      const rows = await fetchChatMessages(activeConversationId);
      setMessages(rows);
      await reloadConversations();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't send your message.");
    } finally {
      setBusy(false);
    }
  }

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
          {loading && <p role="status">Loading conversations…</p>}
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
          {visibleContacts.map((contact) => (
            <button key={contact.user_id} type="button" className={styles.contactItem} onClick={() => void openContact(contact)} disabled={busy}>
              <div className={styles.contactAvatar}>{initials(contact.full_name)}</div>
              <div className={styles.contactInfo}>
                <div className={styles.contactName}>{contact.full_name}</div>
                <div className={styles.contactPreview}>{contact.relation.replaceAll("_", " ")}{contact.org_name ? ` · ${contact.org_name}` : ""}</div>
              </div>
            </button>
          ))}
          {!loading && visibleConversations.length === 0 && visibleContacts.length === 0 && <p>No conversations or contacts found.</p>}
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
              {messages.map((message) => {
                const mine = message.sender_id === activeContact?.user_id ? false : message.sender_id === (currentUserId);
                return <div key={message.id} className={`${styles.messageWrapper} ${mine ? styles.me : styles.other}`}>
                  <div className={`${styles.message} ${mine ? styles.me : styles.other}`}>{message.body}</div>
                  <time className={styles.timestamp} dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                </div>;
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className={styles.inputArea}>
              <div className={styles.inputWrapper}>
                <input type="text" className={styles.input} maxLength={4000} placeholder={`Message ${title}…`} value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} />
                <button className={styles.sendBtn} onClick={() => void handleSend()} disabled={!inputValue.trim() || busy} aria-label="Send message"><Send size={18} /></button>
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
