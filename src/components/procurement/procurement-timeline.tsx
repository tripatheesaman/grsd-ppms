"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildScheduledEntries,
  buildTimelineEntries,
  type DateEntry,
} from "@/lib/procurement/detail-display";

type Props = {
  procurement: Record<string, unknown>;
};

function DateList({ entries, emptyMessage }: { entries: DateEntry[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--color-text-soft)]">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-0 text-sm">
      {entries.map((entry) => (
        <li
          key={entry.label}
          className="flex flex-col gap-0.5 border-b border-[var(--color-border)]/50 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="font-medium text-[var(--color-text-soft)]">{entry.label}</span>
          <span className="text-[var(--color-text)] sm:text-right">{entry.displayDate}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProcurementTimeline({ procurement }: Props) {
  const timeline = buildTimelineEntries(procurement);
  const scheduled = buildScheduledEntries(procurement);

  return (
    <Card>
      <CardHeader className="mb-0">
        <div>
          <CardTitle>Timeline dates</CardTitle>
          <CardDescription>Calculated and actual milestones, sorted by date</CardDescription>
        </div>
      </CardHeader>
      <div className="mt-4">
        <DateList entries={timeline} emptyMessage="No timeline dates set." />
      </div>
      <div className="mt-6 border-t border-[var(--color-border)] pt-4">
        <h3 className="font-display text-sm font-bold text-[var(--color-text)]">Scheduled work</h3>
        <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">
          Planned initiation and completion (not bid milestones)
        </p>
        <div className="mt-3">
          <DateList entries={scheduled} emptyMessage="No scheduled work dates." />
        </div>
      </div>
    </Card>
  );
}
