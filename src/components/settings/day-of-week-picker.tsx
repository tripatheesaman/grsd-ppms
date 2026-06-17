"use client";

const DAYS = [
  { d: 0, l: "Sun", short: "S" },
  { d: 1, l: "Mon", short: "M" },
  { d: 2, l: "Tue", short: "T" },
  { d: 3, l: "Wed", short: "W" },
  { d: 4, l: "Thu", short: "T" },
  { d: 5, l: "Fri", short: "F" },
  { d: 6, l: "Sat", short: "S" },
] as const;

export function DayOfWeekPicker({
  selected,
  onChange,
  label,
  description,
}: {
  selected: number[];
  onChange: (days: number[]) => void;
  label?: string;
  description?: string;
}) {
  function toggle(day: number) {
    onChange(
      selected.includes(day)
        ? selected.filter((d) => d !== day).sort((a, b) => a - b)
        : [...selected, day].sort((a, b) => a - b),
    );
  }

  return (
    <div>
      {label && (
        <p className="text-sm font-semibold text-[var(--color-text)]">{label}</p>
      )}
      {description && (
        <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">{description}</p>
      )}
      <div
        className="mt-2 grid grid-cols-7 gap-1.5 sm:flex sm:flex-wrap sm:gap-2"
        role="group"
        aria-label={label ?? "Days of week"}
      >
        {DAYS.map((x) => {
          const active = selected.includes(x.d);
          return (
            <button
              key={x.d}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(x.d)}
              className={`flex h-10 flex-col items-center justify-center rounded-xl border text-xs font-semibold transition sm:h-auto sm:min-w-[3rem] sm:px-3 sm:py-2 ${
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-soft)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)]"
              }`}
            >
              <span className="hidden sm:inline">{x.l}</span>
              <span className="sm:hidden">{x.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
