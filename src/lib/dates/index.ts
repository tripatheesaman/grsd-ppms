const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function parseParts(value: string): { y: number; m: number; d: number } {
  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

export function parseDateOnly(value: string): Date {
  const { y, m, d } = parseParts(value);
  return new Date(y, m - 1, d);
}

export function dateOnlyToDb(value: string): Date {
  const { y, m, d } = parseParts(value);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function dateFromDb(value: Date | null | undefined): string | null {
  if (!value) return null;
  const y = value.getUTCFullYear();
  const m = value.getUTCMonth() + 1;
  const d = value.getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function toDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return DATE_ONLY_RE.test(value) ? value.slice(0, 10) : dateFromDb(new Date(value));
  }
  return formatDateOnly(value);
}
