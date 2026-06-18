import { BS_CALENDAR_DATA } from "@/lib/calendar/bs-calendar-data";
import { bsMonthAdRange, todayBsYearMonth } from "@/lib/calendar/bs-calendar";

export const MIN_NEPALI_FY_START = 2081;

/** Nepali fiscal year runs Shrawan 1 (month 4) through Ashad end (month 3 of next BS year). */
export function nepaliFyAdRange(fyStartYear: number): { start: string; end: string } {
  const start = bsMonthAdRange(fyStartYear, 4).start;
  const end = bsMonthAdRange(fyStartYear + 1, 3).end;
  return { start, end };
}

export function formatNepaliFyLabel(fyStartYear: number): string {
  const endSuffix = String(fyStartYear + 1).slice(-2);
  return `${fyStartYear}/${endSuffix}`;
}

export function currentNepaliFyStartYear(): number {
  const { year, month } = todayBsYearMonth();
  return month >= 4 ? year : year - 1;
}

export function maxNepaliFyStartYear(): number {
  const bsYears = Object.keys(BS_CALENDAR_DATA).map(Number);
  const maxBsYear = Math.max(...bsYears);
  // FY needs month 3 of the following BS year to exist.
  return BS_CALENDAR_DATA[maxBsYear + 1] ? maxBsYear : maxBsYear - 1;
}

export function listNepaliFyOptions(): Array<{ value: string; label: string }> {
  const minYear = MIN_NEPALI_FY_START;
  const maxYear = Math.max(maxNepaliFyStartYear(), currentNepaliFyStartYear() + 1);
  const options: Array<{ value: string; label: string }> = [];
  for (let y = maxYear; y >= minYear; y--) {
    options.push({ value: String(y), label: formatNepaliFyLabel(y) });
  }
  return options;
}
