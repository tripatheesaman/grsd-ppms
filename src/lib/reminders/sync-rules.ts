import { prisma } from "@/lib/prisma";
import { MILESTONE_CATALOG } from "@/lib/reminders/milestones";

const DEFAULT_REMIND_DAYS = [14, 7, 3, 1, 0];

function parseRemindDaysBefore(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0);
      }
    } catch {
      return DEFAULT_REMIND_DAYS;
    }
  }
  return DEFAULT_REMIND_DAYS;
}

/** Ensure every catalog milestone has a DB rule (idempotent). */
export async function ensureReminderRulesFromCatalog() {
  for (let i = 0; i < MILESTONE_CATALOG.length; i++) {
    const item = MILESTONE_CATALOG[i]!;
    await prisma.reminderRule.upsert({
      where: { milestoneKey: item.milestoneKey },
      update: {
        label: item.label,
        dateField: item.dateField ?? null,
        milestoneType: item.milestoneType,
        anchorDateField: item.anchorDateField ?? null,
        sortOrder: i,
      },
      create: {
        milestoneKey: item.milestoneKey,
        label: item.label,
        enabled: ["prebidDate", "bidFeeSubmissionDate", "bidOpenDate", "loaDueAfterLoi"].includes(
          item.milestoneKey,
        ),
        upcomingDays: 7,
        almostDueDays: 3,
        criticalDays: 1,
        remindDaysBefore: DEFAULT_REMIND_DAYS,
        repeatEveryDays: 0,
        notifyInApp: true,
        sendEmail: true,
        dateField: item.dateField ?? null,
        milestoneType: item.milestoneType,
        anchorDateField: item.anchorDateField ?? null,
        sortOrder: i,
      },
    });
  }
}

export function serializeReminderRule(row: {
  id: string;
  milestoneKey: string;
  label: string;
  enabled: boolean;
  upcomingDays: number;
  almostDueDays: number;
  criticalDays: number;
  remindDaysBefore: unknown;
  repeatEveryDays: number;
  notifyInApp: boolean;
  sendEmail: boolean;
  dateField: string | null;
  milestoneType: string;
  anchorDateField: string | null;
  offsetWorkingDays: number | null;
  sortOrder: number;
}) {
  return {
    ...row,
    remindDaysBefore: parseRemindDaysBefore(row.remindDaysBefore),
  };
}
