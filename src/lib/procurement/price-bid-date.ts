import {
  addWorkingDays,
  fromDateOnlyString,
  isWorkingDay,
  toDateOnlyString,
  type CalendarContext,
} from "@/lib/calendar/working-days";

/** First working day that is `workingDaysAfter` working days after `fromDate`. */
export function calculatePriceBidOpenDate(
  fromDate: string,
  workingDaysAfter: number,
  calendar: CalendarContext,
): string {
  const start = fromDateOnlyString(fromDate);
  const openDate = addWorkingDays(start, workingDaysAfter, calendar);
  return toDateOnlyString(openDate);
}

export function isPriceBidWorkingDay(dateStr: string, calendar: CalendarContext): boolean {
  return isWorkingDay(fromDateOnlyString(dateStr), calendar);
}

export function priceBidWorkingDayError(dateStr: string): string {
  return `Price bid opening date (${dateStr}) must be a working day — not a weekend or public holiday`;
}
