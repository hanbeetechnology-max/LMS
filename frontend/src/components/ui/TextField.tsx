import { forwardRef, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, name, className = "", ...props },
  ref,
) {
  const inputId = id ?? name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-(--color-ink-soft)">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`rounded-xl border bg-(--color-paper) px-4 py-2.5 text-[15px] text-(--color-ink) outline-none transition-colors duration-200 placeholder:text-(--color-mist) ${
          error
            ? "border-(--color-error) focus:border-(--color-error)"
            : "border-(--color-line) focus:border-(--color-violet)"
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-(--color-error)">
          {error}
        </p>
      )}
    </div>
  );
});
