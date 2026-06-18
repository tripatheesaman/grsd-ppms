import { BS_CALENDAR_DATA } from "@/lib/calendar/bs-calendar-data";

const ANCHOR_AD = new Date(1944, 3, 13);
const ANCHOR_BS = { year: 2001, month: 1, day: 1 };

const BS_DATA = BS_CALENDAR_DATA;

function parseAdParts(adStr: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(adStr.trim());
  if (!match) throw new Error("Invalid AD date");
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function adFromParts(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function compareAd(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

function daysInBsMonth(year: number, month: number): number {
  const days = BS_DATA[year]?.[month - 1];
  if (!days) throw new Error("BS year out of range");
  return days;
}

function incrementBs(y: number, m: number, d: number): { y: number; m: number; d: number } {
  let bsY = y;
  let bsM = m;
  let bsD = d + 1;
  if (bsD > daysInBsMonth(bsY, bsM)) {
    bsD = 1;
    bsM++;
    if (bsM > 12) {
      bsM = 1;
      bsY++;
    }
  }
  return { y: bsY, m: bsM, d: bsD };
}

function decrementBs(y: number, m: number, d: number): { y: number; m: number; d: number } {
  let bsY = y;
  let bsM = m;
  let bsD = d - 1;
  if (bsD < 1) {
    bsM--;
    if (bsM < 1) {
      bsM = 12;
      bsY--;
    }
    if (!BS_DATA[bsY]) throw new Error("BS year out of range");
    bsD = daysInBsMonth(bsY, bsM);
  }
  return { y: bsY, m: bsM, d: bsD };
}

function formatBs(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function adToBs(adStr: string): string {
  const { y, m, d } = parseAdParts(adStr);
  const target = adFromParts(y, m, d);
  if (isNaN(target.getTime())) throw new Error("Invalid AD date");

  let bsY = ANCHOR_BS.year;
  let bsM = ANCHOR_BS.month;
  let bsD = ANCHOR_BS.day;
  const currentAD = new Date(ANCHOR_AD);

  if (compareAd(target, currentAD) < 0) {
    while (compareAd(currentAD, target) > 0) {
      ({ y: bsY, m: bsM, d: bsD } = decrementBs(bsY, bsM, bsD));
      currentAD.setDate(currentAD.getDate() - 1);
    }
    return formatBs(bsY, bsM, bsD);
  }

  while (compareAd(currentAD, target) < 0) {
    ({ y: bsY, m: bsM, d: bsD } = incrementBs(bsY, bsM, bsD));
    currentAD.setDate(currentAD.getDate() + 1);
  }

  return formatBs(bsY, bsM, bsD);
}

export function bsToAd(bsStr: string): string {
  const parts = bsStr.split("-").map(Number);
  if (parts.length !== 3) throw new Error("Invalid BS date");
  const [bsY, bsM, bsD] = parts;
  if (!BS_DATA[bsY] || bsM < 1 || bsM > 12 || bsD < 1 || bsD > BS_DATA[bsY][bsM - 1]) {
    throw new Error("Invalid BS date");
  }

  let y = ANCHOR_BS.year;
  let m = ANCHOR_BS.month;
  let d = ANCHOR_BS.day;
  const ad = new Date(ANCHOR_AD);

  while (y < bsY || (y === bsY && m < bsM) || (y === bsY && m === bsM && d < bsD)) {
    ({ y, m, d } = incrementBs(y, m, d));
    ad.setDate(ad.getDate() + 1);
  }

  return `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, "0")}-${String(ad.getDate()).padStart(2, "0")}`;
}

export function getDaysInBsMonth(bsYear: number, bsMonth: number): number {
  return daysInBsMonth(bsYear, bsMonth);
}

export function shiftBsMonth(
  bsYear: number,
  bsMonth: number,
  delta: number,
): { year: number; month: number } {
  let year = bsYear;
  let month = bsMonth + delta;
  while (month < 1) {
    month += 12;
    year--;
  }
  while (month > 12) {
    month -= 12;
    year++;
  }
  if (!BS_DATA[year]) throw new Error("BS year out of range");
  return { year, month };
}

export type BsMonthDay = {
  bsDay: number;
  adDate: string;
  weekday: number;
};

export function listBsMonthDays(bsYear: number, bsMonth: number): BsMonthDay[] {
  const count = daysInBsMonth(bsYear, bsMonth);
  const days: BsMonthDay[] = [];
  for (let bsDay = 1; bsDay <= count; bsDay++) {
    const adDate = bsToAd(formatBs(bsYear, bsMonth, bsDay));
    const { y, m, d } = parseAdParts(adDate);
    const weekday = adFromParts(y, m, d).getDay();
    days.push({ bsDay, adDate, weekday });
  }
  return days;
}

export function adToBsYearMonth(adStr: string): { year: number; month: number } {
  const bs = adToBs(adStr);
  const [year, month] = bs.split("-").map(Number);
  return { year, month };
}

export function todayBsYearMonth(): { year: number; month: number } {
  const today = new Date();
  const ad = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return adToBsYearMonth(ad);
}

export function bsMonthAdRange(bsYear: number, bsMonth: number): {
  start: string;
  end: string;
} {
  const start = bsToAd(formatBs(bsYear, bsMonth, 1));
  const end = bsToAd(formatBs(bsYear, bsMonth, daysInBsMonth(bsYear, bsMonth)));
  return { start, end };
}

export function holidayMatchesBsMonth(
  holiday: { year: number; month: number; day: number },
  bsYear: number,
  bsMonth: number,
): boolean {
  const ad = `${holiday.year}-${String(holiday.month).padStart(2, "0")}-${String(holiday.day).padStart(2, "0")}`;
  try {
    const bs = adToBs(ad);
    const [y, m] = bs.split("-").map(Number);
    return y === bsYear && m === bsMonth;
  } catch {
    return false;
  }
}

export function bsDayToAdParts(bsYear: number, bsMonth: number, bsDay: number): {
  year: number;
  month: number;
  day: number;
} {
  const ad = bsToAd(formatBs(bsYear, bsMonth, bsDay));
  const { y, m, d } = parseAdParts(ad);
  return { year: y, month: m, day: d };
}
