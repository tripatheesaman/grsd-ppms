"use client";

export function TabList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
        active
          ? "bg-[var(--color-primary)] text-white shadow-sm"
          : "text-[var(--color-text-soft)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}
