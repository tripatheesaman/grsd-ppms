import {
  addWorkingDays,
  fromDateOnlyString,
  isWorkingDay,
  toDateOnlyString,
  type CalendarContext,
} from "@/lib/calendar/working-days";

export function calculatePgValidityDate(
  loaDate: string,
  workDaysTotal: number,
  warrantyDays: number,
  extensionDays: number,
  calendar: CalendarContext,
): string {
  const totalDays = workDaysTotal + warrantyDays + extensionDays;
  const end = addWorkingDays(fromDateOnlyString(loaDate), totalDays, calendar);
  return toDateOnlyString(end);
}

export function snapToWorkingDay(dateStr: string, calendar: CalendarContext): string {
  let current = fromDateOnlyString(dateStr);
  while (!isWorkingDay(current, calendar)) {
    current = addWorkingDays(current, 1, calendar);
  }
  return toDateOnlyString(current);
}
