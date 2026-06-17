import { addDays, format, getDate, getDay, getMonth, getYear } from "date-fns";
import { formatDateOnly, parseDateOnly } from "@/lib/dates";

export type WeeklyOffRule = {
  year: number;
  month: number;
  dayFrom: number;
  dayTo: number;
  offDays: number[];
};

export type PublicHoliday = {
  year: number;
  month: number;
  day: number;
};

export type CalendarContext = {
  weeklyOffRules: WeeklyOffRule[];
  publicHolidays: PublicHoliday[];
  defaultOffDays: number[];
};

function matchesWeeklyOff(date: Date, context: CalendarContext): boolean {
  const year = getYear(date);
  const month = getMonth(date) + 1;
  const day = getDate(date);
  const weekday = getDay(date);
  let matchedMonthRule = false;

  for (const rule of context.weeklyOffRules) {
    if (rule.year !== year || rule.month !== month) continue;
    matchedMonthRule = true;
    if (day < rule.dayFrom || day > rule.dayTo) continue;
    if (rule.offDays.includes(weekday)) return true;
  }
  if (!matchedMonthRule && context.defaultOffDays.includes(weekday)) {
    return true;
  }
  return false;
}

function isPublicHoliday(date: Date, holidays: PublicHoliday[]): boolean {
  const year = getYear(date);
  const month = getMonth(date) + 1;
  const day = getDate(date);
  return holidays.some((h) => h.year === year && h.month === month && h.day === day);
}

export function isWorkingDay(date: Date, context: CalendarContext): boolean {
  if (matchesWeeklyOff(date, context)) return false;
  if (isPublicHoliday(date, context.publicHolidays)) return false;
  return true;
}

export function nextWorkingDay(date: Date, context: CalendarContext): Date {
  let current = date;
  while (!isWorkingDay(current, context)) {
    current = addDays(current, 1);
  }
  return current;
}

export function previousWorkingDay(date: Date, context: CalendarContext): Date {
  let current = date;
  while (!isWorkingDay(current, context)) {
    current = addDays(current, -1);
  }
  return current;
}

export function addWorkingDays(start: Date, days: number, context: CalendarContext): Date {
  if (days === 0) return nextWorkingDay(start, context);
  const landing = addDays(start, days);
  return nextWorkingDay(landing, context);
}

export function subtractWorkingDays(end: Date, days: number, context: CalendarContext): Date {
  if (days === 0) return nextWorkingDay(end, context);
  const landing = addDays(end, -days);
  return previousWorkingDay(landing, context);
}

export function assertWorkingDay(date: Date, context: CalendarContext): void {
  if (!isWorkingDay(date, context)) {
    throw new Error(`Date ${format(date, "yyyy-MM-dd")} is not a working day`);
  }
}

export function toDateOnlyString(date: Date): string {
  return formatDateOnly(date);
}

export function fromDateOnlyString(value: string): Date {
  return parseDateOnly(value);
}
