import { useRef } from "react";

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

const TOOLBAR: { label: string; ariaLabel: string; wrap: [string, string] }[] = [
  { label: "B", ariaLabel: "Bold", wrap: ["**", "**"] },
  { label: "I", ariaLabel: "Italic", wrap: ["*", "*"] },
];

/**
 * A markdown-authoring textarea with a small formatting toolbar — not a
 * WYSIWYG editor. Storing plain markdown (rendered via lib/markdown.ts on
 * the viewing side) keeps this a frontend-only addition with no new content
 * model: `bodyText` stays a plain string everywhere else in the app.
 */
export function RichTextEditor({ id, value, onChange, rows = 5, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const selected = value.slice(selectionStart, selectionEnd);
    const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart + before.length, selectionEnd + before.length);
    });
  }

  function toggleListPrefix() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEndRaw = value.indexOf("\n", selectionEnd);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const alreadyList = lines.every((l) => /^\s*[-*]\s+/.test(l) || l.trim() === "");
    const nextLines = lines.map((l) => {
      if (l.trim() === "") return l;
      return alreadyList ? l.replace(/^\s*[-*]\s+/, "") : `- ${l}`;
    });
    const next = value.slice(0, lineStart) + nextLines.join("\n") + value.slice(lineEnd);
    onChange(next);
    requestAnimationFrame(() => el.focus());
  }

  return (
    <div className="overflow-hidden rounded-xl border border-(--color-line)">
      <div className="flex items-center gap-1 border-b border-(--color-line) bg-(--color-cloud) px-2 py-1.5">
        {TOOLBAR.map(({ label, ariaLabel, wrap }) => (
          <button
            key={ariaLabel}
            type="button"
            aria-label={ariaLabel}
            onClick={() => wrapSelection(wrap[0], wrap[1])}
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold text-(--color-ink-soft) transition-colors hover:bg-(--color-line) hover:text-(--color-ink)"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-label="Bullet list"
          onClick={toggleListPrefix}
          className="flex h-7 items-center justify-center rounded-md px-2 text-xs font-semibold text-(--color-ink-soft) transition-colors hover:bg-(--color-line) hover:text-(--color-ink)"
        >
          • List
        </button>
      </div>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none bg-(--color-paper) px-3.5 py-2.5 text-sm text-(--color-ink) outline-none placeholder:text-(--color-mist)"
      />
    </div>
  );
}
