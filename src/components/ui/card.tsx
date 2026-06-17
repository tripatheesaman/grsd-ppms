import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = "default",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "default" | "lg";
}) {
  const pad =
    padding === "none" ? "" : padding === "lg" ? "p-6 sm:p-8" : "p-5 sm:p-6";
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] ${pad} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={`font-display text-lg font-bold tracking-tight text-[var(--color-text)] sm:text-xl ${className}`}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-sm text-[var(--color-text-soft)] ${className}`}>{children}</p>
  );
}
