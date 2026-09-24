import { type FormEvent, useEffect, useRef, useState } from "react";
import { Seo } from "../../lib/Seo";
import { Reveal } from "../../components/ui/Reveal";
import { askAssistant, type AiChatMessage } from "../../lib/aiApi";

const HISTORY_LIMIT = 10;

interface DisplayMessage {
  id: string;
  role: "user" | "model" | "system";
  text: string;
}

function SparklesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-mist) [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-mist) [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-mist)" />
    </span>
  );
}

export function StudentAiPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "greeting",
      role: "model",
      text: "Hi! I'm the HanbeeLms AI Assistant. Ask me about your courses, RC racing basics, or how to use the platform.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    const userMessage: DisplayMessage = { id: crypto.randomUUID(), role: "user", text };
    const history: AiChatMessage[] = messages
      .filter((m) => m.role === "user" || m.role === "model")
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role as "user" | "model", content: m.text }));

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setSending(true);

    const result = await askAssistant(text, history);

    setMessages((prev) => [
      ...prev,
      result.error
        ? { id: crypto.randomUUID(), role: "system", text: result.error }
        : { id: crypto.randomUUID(), role: "model", text: result.reply ?? "I didn't get a response — please try again." },
    ]);
    setSending(false);
  }

  return (
    <>
      <Seo
        title="AI Assistant"
        description="Chat with the HanbeeLms AI Assistant about your courses, RC racing basics, and how to use the platform."
        path="/student/ai"
      />
      <div className="flex flex-col gap-6">
        <Reveal className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-violet-soft) text-(--color-violet)">
            <SparklesIcon />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-(--color-ink)">AI Assistant</h1>
            <p className="text-sm text-(--color-slate)">Ask about your courses, RC racing, or the platform.</p>
          </div>
        </Reveal>

        <div className="flex h-[calc(100vh-16rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-(--color-line)">
          <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-5">
            {messages.map((m) => {
              if (m.role === "system") {
                return (
                  <div key={m.id} className="mx-auto max-w-[85%] rounded-xl border border-(--color-line) bg-(--color-cloud) px-3.5 py-2.5 text-center text-xs text-(--color-slate)">
                    {m.text}
                  </div>
                );
              }
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex max-w-[75%] flex-col gap-1 ${isUser ? "ml-auto items-end" : "items-start"}`}>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                      isUser
                        ? "rounded-br-sm bg-(--color-ink) text-(--color-paper)"
                        : "rounded-bl-sm bg-(--color-cloud) text-(--color-ink-soft)"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex max-w-[75%] flex-col items-start gap-1">
                <div className="rounded-2xl rounded-bl-sm bg-(--color-cloud) px-3.5 py-2.5 text-sm text-(--color-ink-soft)">
                  <ThinkingDots />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-(--color-line) p-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask the AI Assistant…"
              disabled={sending}
              className="flex-1 rounded-full border border-(--color-line) bg-(--color-paper) px-4 py-2.5 text-sm text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) focus:border-(--color-violet) disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-ink) text-(--color-paper) transition-transform duration-300 hover:scale-[1.05] disabled:opacity-50 disabled:hover:scale-100"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
