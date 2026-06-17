"use client";

import { formatDualDate } from "@/lib/dates/display";

type Props = {
  value: string | undefined;
};

export function DateBsHint({ value }: Props) {
  if (!value) return null;
  return (
    <p className="mt-1 text-xs text-[var(--color-text-soft)]" aria-live="polite">
      {formatDualDate(value)}
    </p>
  );
}
