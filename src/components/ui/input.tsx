import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }
>(function Input({ label, error, hint, className = "", id, ...props }, ref) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      {label && (
        <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm transition placeholder:text-[var(--color-text-soft)]/60 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60 ${error ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20" : ""} ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-[var(--color-text-soft)]">{hint}</span>}
      {error && <span className="text-xs font-medium text-[var(--color-danger)]">{error}</span>}
    </label>
  );
});

export function Select({
  label,
  error,
  hint,
  children,
  className = "",
  id,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <label className="block space-y-1.5" htmlFor={selectId}>
      {label && (
        <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60 ${error ? "border-[var(--color-danger)]" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <span className="text-xs text-[var(--color-text-soft)]">{hint}</span>}
      {error && <span className="text-xs font-medium text-[var(--color-danger)]">{error}</span>}
    </label>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
      )}
      <textarea
        className={`min-h-[100px] w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm transition focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-[var(--color-text-soft)]">{hint}</span>}
      {error && <span className="text-xs font-medium text-[var(--color-danger)]">{error}</span>}
    </label>
  );
}
