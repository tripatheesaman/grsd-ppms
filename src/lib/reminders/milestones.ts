import { differenceInCalendarDays, startOfDay } from "date-fns";
import { ProcurementStatus, ReminderSeverity } from "@prisma/client";
import { dateFromDb, parseDateOnly } from "@/lib/dates";
import { addWorkingDays, fromDateOnlyString } from "@/lib/calendar/working-days";
import type { CalendarContext } from "@/lib/calendar/working-days";

const STATUS_PIPELINE: ProcurementStatus[] = [
  "DRAFT",
  "ACTIVE",
  "PREBID_OPEN",
  "BID_OPEN_DAY",
  "BID_CLOSED",
  "BIDDERS_ENTERED",
  "NO_BIDDERS",
  "TECHNICAL_EVAL",
  "TECHNICAL_DONE",
  "LETTERS_SENT",
  "PRICE_BID_SCHEDULED",
  "PRICE_BID_OPEN",
  "WITH_FINANCE",
  "WINNER_SELECTED",
  "LOI_ISSUED",
  "LOA_ISSUED",
  "CONTRACT_SIGNED",
  "PDI_PHASE",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function statusRank(status: ProcurementStatus): number {
  const index = STATUS_PIPELINE.indexOf(status);
  return index === -1 ? 0 : index;
}

export function statusAtLeast(current: ProcurementStatus, minimum: ProcurementStatus): boolean {
  return statusRank(current) >= statusRank(minimum);
}

/** Fixed procurement date columns used as reminder targets */
export const MILESTONE_DATE_FIELDS = {
  prebidDate: "prebidDate",
  bidFeeSubmissionDate: "bidFeeSubmissionDate",
  bidOpenDate: "bidOpenDate",
  priceBidOpenDate: "priceBidOpenDate",
  bidValidityDate: "bidValidityDate",
  scheduledInitiationDate: "scheduledInitiationDate",
  scheduledCompletionDate: "scheduledCompletionDate",
} as const;

export type FixedMilestoneKey = keyof typeof MILESTONE_DATE_FIELDS;

/** Special computed milestone keys (not direct DB columns) */
export const COMPUTED_MILESTONE_KEYS = {
  loaDueAfterLoi: "loaDueAfterLoi",
} as const;

export type ComputedMilestoneKey = keyof typeof COMPUTED_MILESTONE_KEYS;

export type MilestoneKey = FixedMilestoneKey | ComputedMilestoneKey;

export type MilestoneProcurement = {
  status: ProcurementStatus;
  prebidAcknowledgedAt?: Date | string | null;
  bidOpenAcknowledgedAt?: Date | string | null;
  prebidDate?: Date | null;
  bidFeeSubmissionDate?: Date | null;
  bidOpenDate?: Date | null;
  priceBidOpenDate?: Date | null;
  bidValidityDate?: Date | null;
  scheduledInitiationDate?: Date | null;
  scheduledCompletionDate?: Date | null;
  loiIssuedDate?: Date | null;
  loaIssuedDate?: Date | null;
};

export type ReminderRuleConfig = {
  milestoneKey: string;
  milestoneType?: string;
  dateField?: string | null;
  anchorDateField?: string | null;
  offsetWorkingDays?: number | null;
  upcomingDays: number;
  almostDueDays: number;
  criticalDays: number;
  remindDaysBefore?: number[] | unknown;
};

const MILESTONE_COMPLETE_AT_STATUS: Record<string, ProcurementStatus> = {
  prebidDate: "PREBID_OPEN",
  bidFeeSubmissionDate: "BID_OPEN_DAY",
  bidOpenDate: "BID_OPEN_DAY",
  priceBidOpenDate: "WITH_FINANCE",
  bidValidityDate: "WINNER_SELECTED",
  scheduledInitiationDate: "IN_PROGRESS",
  scheduledCompletionDate: "COMPLETED",
  loaDueAfterLoi: "LOA_ISSUED",
};

export function parseRemindDaysBefore(rule: ReminderRuleConfig): number[] {
  const raw = rule.remindDaysBefore;
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0))].sort(
      (a, b) => b - a,
    );
  }
  return [rule.upcomingDays, rule.almostDueDays, rule.criticalDays, 0]
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .sort((a, b) => b - a);
}

export function isMilestoneWorkflowComplete(
  proc: MilestoneProcurement,
  milestoneKey: string,
): boolean {
  const threshold = MILESTONE_COMPLETE_AT_STATUS[milestoneKey];
  if (!threshold) return false;

  if (milestoneKey === "prebidDate" && proc.prebidAcknowledgedAt) {
    return true;
  }
  if (
    (milestoneKey === "bidOpenDate" || milestoneKey === "bidFeeSubmissionDate") &&
    proc.bidOpenAcknowledgedAt
  ) {
    return true;
  }
  if (milestoneKey === "loaDueAfterLoi" && proc.loaIssuedDate) {
    return true;
  }

  return statusAtLeast(proc.status, threshold);
}

export function getMilestoneDate(
  proc: MilestoneProcurement,
  milestoneKey: string,
  options?: { loaDelayDays?: number; calendar?: CalendarContext },
): Date | null {
  if (milestoneKey === "loaDueAfterLoi") {
    const loi = proc.loiIssuedDate;
    if (!loi || proc.loaIssuedDate) return null;
    const loiStr = dateFromDb(loi);
    if (!loiStr || !options?.calendar) return null;
    const offset = options.loaDelayDays ?? 7;
    return addWorkingDays(fromDateOnlyString(loiStr), offset, options.calendar);
  }

  const field =
    milestoneKey in MILESTONE_DATE_FIELDS
      ? MILESTONE_DATE_FIELDS[milestoneKey as FixedMilestoneKey]
      : null;
  if (!field) return null;
  return proc[field] ?? null;
}

export type ReminderRuleThresholds = {
  upcomingDays: number;
  almostDueDays: number;
  criticalDays: number;
};

export function severityForDays(
  daysUntil: number,
  rule: ReminderRuleThresholds,
): ReminderSeverity | null {
  if (daysUntil < 0) return ReminderSeverity.CRITICAL;
  if (daysUntil <= rule.criticalDays) return ReminderSeverity.CRITICAL;
  if (daysUntil <= rule.almostDueDays) return ReminderSeverity.ALMOST_DUE;
  if (daysUntil <= rule.upcomingDays) return ReminderSeverity.UPCOMING;
  return null;
}

export function shouldFireReminderToday(
  daysUntil: number,
  rule: ReminderRuleConfig,
): { fire: boolean; severity: ReminderSeverity | null } {
  const remindDays = parseRemindDaysBefore(rule);
  const maxWindow = remindDays.length ? Math.max(...remindDays) : rule.upcomingDays;

  if (remindDays.includes(daysUntil)) {
    const severity = severityForDays(daysUntil, rule) ?? ReminderSeverity.UPCOMING;
    return { fire: true, severity };
  }

  if (daysUntil < 0) {
    return { fire: true, severity: ReminderSeverity.CRITICAL };
  }

  if (daysUntil <= maxWindow && severityForDays(daysUntil, rule)) {
    return { fire: true, severity: severityForDays(daysUntil, rule) };
  }

  return { fire: false, severity: null };
}

export function evaluateMilestoneReminder(
  proc: MilestoneProcurement,
  milestoneKey: string,
  rule: ReminderRuleConfig,
  today: Date = startOfDay(new Date()),
  options?: { loaDelayDays?: number; calendar?: CalendarContext },
): { daysUntil: number; severity: ReminderSeverity; targetDate: string } | null {
  if (isMilestoneWorkflowComplete(proc, milestoneKey)) {
    return null;
  }

  const raw = getMilestoneDate(proc, milestoneKey, options);
  const dateStr = dateFromDb(raw);
  if (!dateStr) return null;

  const daysUntil = differenceInCalendarDays(parseDateOnly(dateStr), today);
  const { fire, severity } = shouldFireReminderToday(daysUntil, rule);
  if (!fire || !severity) return null;

  return { daysUntil, severity, targetDate: dateStr };
}

export const MILESTONE_CATALOG: Array<{
  milestoneKey: MilestoneKey;
  label: string;
  milestoneType: "FIXED_DATE" | "OFFSET_FROM_ANCHOR";
  dateField?: string;
  anchorDateField?: string;
  description: string;
}> = [
  {
    milestoneKey: "prebidDate",
    label: "Pre-bid meeting",
    milestoneType: "FIXED_DATE",
    dateField: "prebidDate",
    description: "Scheduled pre-bid conference date",
  },
  {
    milestoneKey: "bidFeeSubmissionDate",
    label: "Bid fee submission deadline",
    milestoneType: "FIXED_DATE",
    dateField: "bidFeeSubmissionDate",
    description: "Last date to submit bid fee / documents after pre-bid",
  },
  {
    milestoneKey: "bidOpenDate",
    label: "Bid opening",
    milestoneType: "FIXED_DATE",
    dateField: "bidOpenDate",
    description: "Public bid opening date",
  },
  {
    milestoneKey: "priceBidOpenDate",
    label: "Price bid opening",
    milestoneType: "FIXED_DATE",
    dateField: "priceBidOpenDate",
    description: "Scheduled financial / price bid opening",
  },
  {
    milestoneKey: "loaDueAfterLoi",
    label: "LOA issuance (after LOI)",
    milestoneType: "OFFSET_FROM_ANCHOR",
    anchorDateField: "loiIssuedDate",
    description: "LOA due date based on LOI issue + configured working days",
  },
  {
    milestoneKey: "bidValidityDate",
    label: "Bid validity expiry",
    milestoneType: "FIXED_DATE",
    dateField: "bidValidityDate",
    description: "Bid validity end date",
  },
  {
    milestoneKey: "scheduledInitiationDate",
    label: "Work initiation",
    milestoneType: "FIXED_DATE",
    dateField: "scheduledInitiationDate",
    description: "Planned work start date",
  },
  {
    milestoneKey: "scheduledCompletionDate",
    label: "Work completion",
    milestoneType: "FIXED_DATE",
    dateField: "scheduledCompletionDate",
    description: "Planned work completion date",
  },
];

export function isKnownMilestoneKey(key: string): boolean {
  return key in MILESTONE_DATE_FIELDS || key in COMPUTED_MILESTONE_KEYS;
}
