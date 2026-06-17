"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  bsMonthAdRange,
  listBsMonthDays,
  shiftBsMonth,
} from "@/lib/calendar/bs-calendar";
import {
  BS_MONTH_NAMES,
  formatAdDate,
  formatBsMonthYear,
} from "@/lib/dates/display";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  bsYear: number;
  bsMonth: number;
  selectedDays: number[];
  onToggleDay: (bsDay: number) => void;
  onMonthChange: (bsYear: number, bsMonth: number) => void;
};

export function MonthHolidayCalendar({
  bsYear,
  bsMonth,
  selectedDays,
  onToggleDay,
  onMonthChange,
}: Props) {
  const monthDays = listBsMonthDays(bsYear, bsMonth);
  const leadingEmpty = monthDays[0]?.weekday ?? 0;
  const selectedSet = new Set(selectedDays);
  const { start, end } = bsMonthAdRange(bsYear, bsMonth);
  const headerBs = formatBsMonthYear(bsYear, bsMonth);
  const headerAd = `${formatAdDate(start)} – ${formatAdDate(end)}`;

  function shiftMonth(delta: number) {
    const next = shiftBsMonth(bsYear, bsMonth, delta);
    onMonthChange(next.year, next.month);
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Previous Nepali month"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 text-center">
          <div className="font-display text-base font-bold tracking-tight text-[var(--color-text)] sm:text-lg">
            {headerBs}
          </div>
          <div className="text-xs text-[var(--color-text-soft)]">
            {headerAd} · tap BS days to toggle holidays
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Next Nepali month"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-soft)] sm:gap-1.5 sm:text-xs">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-1">
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1 sm:mt-2 sm:gap-1.5">
        {Array.from({ length: leadingEmpty }).map((_, index) => (
          <div key={`pad-${index}`} aria-hidden />
        ))}
        {monthDays.map(({ bsDay, adDate }) => {
          const isSelected = selectedSet.has(bsDay);
          const [, , adD] = adDate.split("-").map(Number);
          const monthName = BS_MONTH_NAMES[bsMonth - 1]?.slice(0, 3) ?? "";
          const cellTitle = `${bsDay} ${monthName} ${bsYear} · ${formatAdDate(adDate)}`;

          return (
            <button
              key={bsDay}
              type="button"
              title={cellTitle}
              onClick={() => onToggleDay(bsDay)}
              className={`flex min-h-[2.75rem] flex-col items-center justify-center rounded-lg border text-xs font-semibold transition sm:min-h-[3.25rem] sm:rounded-xl sm:text-sm ${
                isSelected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:shadow-sm"
              }`}
            >
              <span className="text-sm font-bold sm:text-base">{bsDay}</span>
              <span
                className={`mt-0.5 text-[9px] font-normal leading-none sm:text-[10px] ${
                  isSelected ? "text-white/90" : "text-[var(--color-text-soft)]"
                }`}
              >
                {adD}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-sm text-[var(--color-text-soft)] sm:text-left">
        <span className="font-semibold text-[var(--color-text)]">{selectedDays.length}</span>{" "}
        holiday{selectedDays.length === 1 ? "" : "s"} selected in {headerBs}
      </p>
    </div>
  );
}
