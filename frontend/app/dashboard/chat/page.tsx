"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./chat.module.css";
import { Send, Search } from "lucide-react";

type Message = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
};

type Contact = {
  id: string;
  name: string;
  role: string;
  initials: string;
  online: boolean;
  lastMessage: string;
};

const CONTACTS: Contact[] = [
  { id: "1", name: "Instructor Sarah", role: "Lead Engineer", initials: "IS", online: true, lastMessage: "Don't forget to check the aerodynamics module." },
  { id: "2", name: "Coach Marcus", role: "Race Strategist", initials: "CM", online: false, lastMessage: "Your lap times are improving." },
  { id: "3", name: "Mentor David", role: "Technical Director", initials: "MD", online: true, lastMessage: "Let's discuss your final project design." },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "m1", senderId: "1", content: "Hi! Have you reviewed the latest aerodynamics module?", timestamp: "09:00 AM" },
    { id: "m2", senderId: "me", content: "Yes, I was just looking at the wing angles.", timestamp: "09:05 AM" },
    { id: "m3", senderId: "1", content: "Great. Don't forget to check the aerodynamics module summary video.", timestamp: "09:10 AM" },
  ],
  "2": [
    { id: "m1", senderId: "2", content: "I've reviewed your telemetry from yesterday.", timestamp: "Yesterday" },
    { id: "m2", senderId: "me", content: "Did you find where I'm losing time?", timestamp: "Yesterday" },
    { id: "m3", senderId: "2", content: "Your lap times are improving. We just need to work on sector 3.", timestamp: "Yesterday" },
  ],
  "3": [
    { id: "m1", senderId: "3", content: "When are you free to meet this week?", timestamp: "10:30 AM" },
    { id: "m2", senderId: "3", content: "Let's discuss your final project design.", timestamp: "10:31 AM" },
  ]
};

export default function ChatPage() {
  const [activeContactId, setActiveContactId] = useState<string>("1");
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeContact = CONTACTS.find(c => c.id === activeContactId);
  const activeMessages = messages[activeContactId] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages]);

  const handleSend = () => {
    if (!inputValue.trim() || !activeContact) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      senderId: "me",
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMsg]
    }));
    
    setInputValue("");
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar / Contacts */}
      <div className={styles.contactsSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Messages</h2>
          <div className={styles.inputWrapper}>
            <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className={styles.searchInput} 
              placeholder="Search contacts..." 
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
        
        <div className={styles.contactsList}>
          {CONTACTS.map(contact => (
            <div 
              key={contact.id} 
              className={`${styles.contactItem} ${activeContactId === contact.id ? styles.active : ''}`}
              onClick={() => setActiveContactId(contact.id)}
            >
              <div className={styles.contactAvatar}>
                {contact.initials}
                <div className={`${styles.statusIndicator} ${!contact.online ? styles.offline : ''}`} />
              </div>
              <div className={styles.contactInfo}>
                <div className={styles.contactName}>{contact.name}</div>
                <div className={styles.contactPreview}>{contact.lastMessage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.mainChat}>
        {activeContact ? (
          <>
            <header className={styles.chatHeader}>
              <div className={styles.contactAvatar}>
                {activeContact.initials}
              </div>
              <div className={styles.chatHeaderInfo}>
                <h2>{activeContact.name}</h2>
                <p>{activeContact.role} • {activeContact.online ? 'Online' : 'Offline'}</p>
              </div>
            </header>

            <div className={styles.chatHistory}>
              {activeMessages.map((msg) => {
                const isMe = msg.senderId === "me";
                return (
                  <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.me : styles.other}`}>
                    <div className={`${styles.message} ${isMe ? styles.me : styles.other}`}>
                      {msg.content}
                    </div>
                    <div className={styles.timestamp}>
                      {msg.timestamp}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <div className={styles.inputWrapper}>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder={`Message ${activeContact.name}...`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
