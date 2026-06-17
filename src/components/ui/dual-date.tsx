"use client";

import { formatDualDate } from "@/lib/dates/display";

type Props = {
  value: string | null | undefined;
  className?: string;
};

export function DualDate({ value, className }: Props) {
  const text = formatDualDate(value);
  return <span className={className}>{text}</span>;
}
