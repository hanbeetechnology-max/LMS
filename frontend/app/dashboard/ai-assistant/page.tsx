"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./chat.module.css";
import { Bot, Send, User } from "lucide-react";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
};

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Hello! I'm your Hanbee AI Mentor. I can help you analyze your lap times, suggest training modules, or answer questions about RC mechanics. How can I assist you today?",
      timestamp: "10:00 AM",
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "Explain my last lap time",
    "Suggest a training routine",
    "How do I tune my suspension?",
    "What are the best tires for carpet?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (content: string = inputValue) => {
    const prompt = content.trim();
    if (!prompt || isTyping) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const history = messages
      .filter((message) => message.id !== "1")
      .map((message) => ({ role: message.role === "ai" ? "model" as const : "user" as const, content: message.content }));
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    setIsTyping(true);
    setError("");
    try {
      const result = await authenticatedSupabaseFetch<{ reply: string }>("/functions/v1/ai-assistant", {
        method: "POST",
        body: JSON.stringify({ message: prompt, history }),
      });
      const newAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, newAiMsg]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The AI assistant couldn't respond. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <div className={styles.avatar}>
          <Bot size={24} />
        </div>
        <div className={styles.headerInfo}>
          <h2>Hanbee AI Mentor</h2>
          <p>Always here to help you learn beyond the obvious</p>
        </div>
      </header>

      <div className={styles.chatHistory}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.messageWrapper} ${styles[msg.role]}`}>
            <div className={`${styles.message} ${styles[msg.role]}`}>
              {msg.content}
            </div>
            <div className={styles.timestamp}>
              {msg.timestamp}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className={`${styles.messageWrapper} ${styles.ai}`}>
            <div className={`${styles.message} ${styles.ai}`}>
              <div className={styles.typingIndicator}>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <p role="alert" style={{ padding: "8px 20px" }}>{error}</p>}

      <div className={styles.suggestedPrompts}>
        {suggestedPrompts.map((prompt, idx) => (
          <button 
            key={idx} 
            className={styles.promptChip}
            onClick={() => void handleSend(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <input 
            type="text" 
            className={styles.input} 
            maxLength={2000}
            placeholder="Ask your mentor anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void handleSend())}
          />
          <button 
            className={styles.sendBtn}
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isTyping}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
