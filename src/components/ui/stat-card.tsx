import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  accent?: "primary" | "accent" | "success";
  className?: string;
}) {
  const accentColors = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    accent: "bg-[var(--color-accent)]/10 text-[var(--color-accent)]",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  };

  return (
    <Card className={`relative overflow-hidden ${className}`} padding="default">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-soft)]">{label}</p>
          <p
            className={`mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl ${
              accent === "accent"
                ? "text-[var(--color-accent)]"
                : accent === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-[var(--color-primary)]"
            }`}
          >
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentColors[accent]}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
    </Card>
  );
}
