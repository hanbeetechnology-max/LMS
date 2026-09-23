import { Seo } from "../../lib/Seo";
import { Reveal } from "../../components/ui/Reveal";

function SparklesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

/**
 * Placeholder, not a broken feature — the previous version of this page
 * called a FastAPI service (http://localhost:8000/ai/stream) that was never
 * actually deployed anywhere, so it just hung. The real build (a Supabase
 * Edge Function calling a real AI provider) is scoped and ready to start;
 * it just needs a provider decision (Anthropic vs OpenAI) and an API key,
 * neither of which is settled yet — see docs/PLAN.md.
 */
export function StudentAiPage() {
  return (
    <>
      <Seo title="AI Assistant" description="Ask about your courses." path="/student/ai" />
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <Reveal>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--color-violet-soft) text-(--color-violet)">
            <SparklesIcon />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-(--color-ink)">
            AI Assistant is coming soon
          </h1>
          <p className="mt-3 max-w-sm text-[15px] text-(--color-slate)">
            A real course-aware assistant is on the way. It isn't connected to anything yet, so there's nothing to
            ask it today.
          </p>
        </Reveal>
      </div>
    </>
  );
}
