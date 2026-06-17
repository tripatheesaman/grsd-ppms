import { addDays, differenceInCalendarDays } from "date-fns";

import {
  addWorkingDays,
  fromDateOnlyString,
  isWorkingDay,
  toDateOnlyString,
  type CalendarContext,
} from "@/lib/calendar/working-days";

export type WorkCountdownInput = {
  poIssueDate: string | null;
  pdiStartDate: string | null;
  pdiEndDate: string | null;
  totalWorkDays: number;
  status: string;
  frozenElapsedDays: number | null;
};

export type WorkCountdownState = {
  elapsedDays: number;
  remainingDays: number;
  totalDays: number;
  dueDate: string | null;
  isPaused: boolean;
};

function parseDate(value: string): Date {
  return fromDateOnlyString(value.slice(0, 10));
}

/** Count working days from start through end (inclusive). */
export function countWorkingDaysInclusive(
  start: Date,
  end: Date,
  calendar: CalendarContext,
): number {
  if (end < start) return 0;
  let count = 0;
  let current = start;
  while (current <= end) {
    if (isWorkingDay(current, calendar)) count += 1;
    current = addDays(current, 1);
  }
  return count;
}

function isWithinPdi(date: Date, pdiStart: Date | null, pdiEnd: Date | null): boolean {
  if (!pdiStart || !pdiEnd) return false;
  return date >= pdiStart && date <= pdiEnd;
}

/**
 * Elapsed contract work days from PO issue through asOf, excluding any day inside the PDI window.
 */
export function calculateElapsedWorkDays(
  poIssueDate: string,
  asOfDate: string,
  calendar: CalendarContext,
  pdiStartDate?: string | null,
  pdiEndDate?: string | null,
): number {
  const start = parseDate(poIssueDate);
  const end = parseDate(asOfDate);
  const pdiStart = pdiStartDate ? parseDate(pdiStartDate) : null;
  const pdiEnd = pdiEndDate ? parseDate(pdiEndDate) : null;

  if (end < start) return 0;

  let count = 0;
  let current = start;
  while (current <= end) {
    if (isWorkingDay(current, calendar) && !isWithinPdi(current, pdiStart, pdiEnd)) {
      count += 1;
    }
    current = addDays(current, 1);
  }
  return count;
}

function pdiCalendarExtensionDays(pdiStartDate: string | null, pdiEndDate: string | null): number {
  if (!pdiStartDate || !pdiEndDate) return 0;
  const start = parseDate(pdiStartDate);
  const end = parseDate(pdiEndDate);
  if (end < start) return 0;
  return differenceInCalendarDays(end, start) + 1;
}

export function calculateWorkCountdownDueDate(
  poIssueDate: string,
  totalWorkDays: number,
  calendar: CalendarContext,
  pdiStartDate?: string | null,
  pdiEndDate?: string | null,
): string {
  const baseDue = addWorkingDays(parseDate(poIssueDate), totalWorkDays, calendar);
  const extension = pdiCalendarExtensionDays(pdiStartDate ?? null, pdiEndDate ?? null);
  return toDateOnlyString(addDays(baseDue, extension));
}

export function calculateWorkCountdown(
  input: WorkCountdownInput,
  calendar: CalendarContext,
  asOfDate: string = new Date().toISOString().slice(0, 10),
): WorkCountdownState | null {
  const total = input.totalWorkDays;
  if (!input.poIssueDate || total <= 0) return null;

  const isPaused = input.status === "PDI_PHASE";
  const elapsed = isPaused
    ? (input.frozenElapsedDays ?? 0)
    : calculateElapsedWorkDays(
        input.poIssueDate,
        asOfDate,
        calendar,
        input.pdiStartDate,
        input.pdiEndDate,
      );

  const remainingDays = Math.max(0, total - elapsed);
  const dueDate = calculateWorkCountdownDueDate(
    input.poIssueDate,
    total,
    calendar,
    input.pdiStartDate,
    input.pdiEndDate,
  );

  return {
    elapsedDays: elapsed,
    remainingDays,
    totalDays: total,
    dueDate,
    isPaused,
  };
}
