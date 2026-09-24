import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { listConversations, startDirect, subscribeToInbox, type ChatContact, type ConversationSummary } from "../../lib/chatApi";
import { useAuth } from "../../lib/AuthProvider";
import { useToast } from "../../lib/ToastProvider";
import { EmptyState } from "../kit";
import { monitorRealtime } from "./chatExtras";
import { ContactPicker } from "./NewChatPanel";
import { ConversationList } from "./ConversationList";
import { Thread } from "./Thread";

// WhatsApp-like tokens, scoped to the chat screen so nothing else changes.
const CSS = `
.wa{--wa-green:#00a884;--wa-green-text:#008069;--wa-out:#d9fdd3;--wa-in:#ffffff;--wa-header:#f0f2f5;--wa-chip:rgba(255,255,255,.92);--wa-wall:#efeae2}
html[data-theme="dark"] .wa{--wa-green:#00a884;--wa-green-text:#53bdb0;--wa-out:#005c4b;--wa-in:#202c33;--wa-header:#202c33;--wa-chip:#182229;--wa-wall:#0b141a}
.wa-wallpaper{background-color:var(--wa-wall);background-image:radial-gradient(circle at 1px 1px,rgba(128,128,128,.13) 1px,transparent 0);background-size:22px 22px}
.wa-tail-out::before,.wa-tail-in::before{content:"";position:absolute;top:0;width:8px;height:13px;background:inherit}
.wa-tail-out::before{right:-8px;clip-path:polygon(0 0,0 100%,100% 0)}
.wa-tail-in::before{left:-8px;clip-path:polygon(100% 0,100% 100%,0 0)}
`;

export function ChatPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const activeId = params.get("c");

  const [convs, setConvs] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const [starting, setStarting] = useState(false);
  const [realtimeOk, setRealtimeOk] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    try {
      const list = await listConversations();
      setConvs(list);
      setLoadedOnce(true);
      return list;
    } catch {
      if (!silent) setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(true), 300);
  }, [load]);

  useEffect(() => {
    void load();
    const off = subscribeToInbox(refresh);
    const offHealth = monitorRealtime(setRealtimeOk);
    return () => {
      off();
      offHealth();
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load, refresh]);

  // Polling fallback when Realtime is unavailable (the open thread polls itself).
  useEffect(() => {
    if (realtimeOk) return;
    const id = setInterval(() => void load(true), 10000);
    return () => clearInterval(id);
  }, [realtimeOk, load]);

  function open(id: string) {
    setNewChat(false);
    navigate({ search: `?c=${id}` }, { state: { fromList: true } });
  }

  function back() {
    if ((location.state as { fromList?: boolean } | null)?.fromList) navigate(-1);
    else setParams({}, { replace: true });
  }

  async function pick(contact: ChatContact) {
    setStarting(true);
    const id = await startDirect(contact.userId);
    if (!id) {
      setStarting(false);
      showToast("You are not allowed to message this person.", "error");
      return;
    }
    await load(true);
    setStarting(false);
    open(id);
  }

  const active = convs.find((c) => c.id === activeId) ?? null;
  const meName = profile?.fullName ?? "";

  return (
    <div className="wa relative -mx-2 flex h-[calc(100dvh-8rem)] min-h-[440px] overflow-hidden rounded-none border border-(--color-line) bg-(--color-paper) md:mx-0 md:rounded-2xl">
      <style>{CSS}</style>
      <section aria-label="Chat list" className={`relative min-h-0 w-full flex-col border-r border-(--color-line) md:flex md:w-[360px] md:shrink-0 ${activeId ? "hidden" : "flex"}`}>
        {!realtimeOk && <p role="status" className="shrink-0 bg-(--color-amber-soft) px-4 py-2 text-xs text-(--color-ink-soft)">Live updates are unavailable. Checking for new messages every 10 seconds.</p>}
        <div className="min-h-0 flex-1">
          <ConversationList meName={meName} conversations={convs} loading={loading} error={error} onRetry={() => void load()} activeId={activeId} onSelect={open} onNewChat={() => setNewChat(true)} />
        </div>
        {newChat && (
          <div className="absolute inset-0 z-20">
            <ContactPicker busy={starting} onPick={(c) => void pick(c)} onClose={() => setNewChat(false)} />
          </div>
        )}
      </section>

      <section aria-label="Conversation" className={`min-h-0 min-w-0 flex-1 flex-col md:flex ${activeId ? "flex" : "hidden"}`}>
        {activeId && active && profile ? (
          <Thread key={active.id} conv={active} meId={profile.id} meName={meName} polling={!realtimeOk} onBack={back} onInboxChange={refresh} />
        ) : activeId && loadedOnce && !loading ? (
          <div className="flex h-full flex-col">
            <div className="p-6">
              <EmptyState title="This chat is not available" body="It may have been removed, or you may no longer be in it." action={<button type="button" onClick={back} className="min-h-11 rounded-full bg-(--wa-green) px-5 text-sm font-semibold text-white">Back to chats</button>} />
            </div>
          </div>
        ) : (
          <div className="wa-wallpaper flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="font-display text-2xl font-semibold text-(--color-ink)">{activeId ? "Loading..." : "Select a chat"}</p>
            {!activeId && <p className="max-w-xs text-sm text-(--color-slate)">Choose a conversation from the list, or start a new chat.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
