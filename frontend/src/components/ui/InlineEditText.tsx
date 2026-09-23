import { useState } from "react";

interface InlineEditTextProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  type?: "text" | "tel" | "number";
}

/**
 * Renders as plain styled text until clicked, then becomes an editable
 * field, committing on blur/Enter — used only on the Manager-role
 * Verification/Holidays screens (see docs/HANBEE_LMS_DESIGN_PLAN.md §4.6),
 * not retrofitted onto existing pages' save-button forms.
 */
export function InlineEditText({ value, onChange, label, placeholder, type = "text" }: InlineEditTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    onChange(draft.trim());
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="group flex flex-col items-start gap-0.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-(--color-cloud)"
      >
        <span className="text-xs text-(--color-mist)">{label}</span>
        <span className="text-sm text-(--color-ink-soft) group-hover:text-(--color-ink)">
          {value || <span className="text-(--color-mist)">{placeholder ?? "Not set"}</span>}
        </span>
      </button>
    );
  }

  return (
    <label className="flex flex-col gap-0.5 px-1.5 py-1">
      <span className="text-xs text-(--color-mist)">{label}</span>
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder={placeholder}
        className="rounded-lg border border-(--color-violet) bg-(--color-paper) px-2 py-1 text-sm text-(--color-ink) outline-none"
      />
    </label>
  );
}
