const tones: Record<string, string> = {
  UPCOMING:
    "bg-blue-500/15 text-blue-800 ring-1 ring-blue-500/25 dark:text-blue-200",
  ALMOST_DUE:
    "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-200",
  CRITICAL:
    "bg-red-500/15 text-red-800 ring-1 ring-red-500/25 dark:text-red-200",
  success:
    "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-200",
  default:
    "bg-[var(--color-surface-strong)] text-[var(--color-text)] ring-1 ring-[var(--color-border)]",
  primary:
    "bg-[var(--color-primary)]/15 text-[var(--color-primary-dark)] ring-1 ring-[var(--color-primary)]/30 dark:text-[var(--color-primary-light)]",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone] ?? tones.default} ${className}`}
    >
      {children}
    </span>
  );
}
