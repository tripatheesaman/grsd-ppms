import { differenceInCalendarDays, startOfDay } from "date-fns";
import { ProcurementStatus } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import type { CalendarContext } from "@/lib/calendar/working-days";
import { addWorkingDays, fromDateOnlyString } from "@/lib/calendar/working-days";
import { dateFromDb, parseDateOnly } from "@/lib/dates";
import { getMilestoneDate } from "@/lib/reminders/milestones";
import { prisma } from "@/lib/prisma";

export const WORKFLOW_DATE_VALIDATION_SETTING_KEY = "workflowDateValidationEnabled";

export type WorkflowValidationProcurement = {
  status: ProcurementStatus;
  prebidDate?: Date | string | null;
  bidOpenDate?: Date | string | null;
  bidFeeSubmissionDate?: Date | string | null;
  priceBidOpenDate?: Date | string | null;
  loiIssuedDate?: Date | string | null;
  loaIssuedDate?: Date | string | null;
  loaDocumentDate?: Date | string | null;
  scheduledCompletionDate?: Date | string | null;
  poIssueDate?: Date | string | null;
  pdiDate?: Date | string | null;
  noticeDate?: Date | string | null;
};

export type WorkflowValidationOptions = {
  procurementId?: string;
  payload?: Record<string, unknown>;
  loaDelayDays?: number;
  calendar?: CalendarContext;
  today?: Date;
};

export type WorkflowValidationResult =
  | { allowed: true }
  | { allowed: false; message: string };

function todayStart(options?: WorkflowValidationOptions): Date {
  return startOfDay(options?.today ?? new Date());
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return dateFromDb(value);
}

function payloadDate(payload: Record<string, unknown> | undefined, ...keys: string[]): string | null {
  if (!payload) return null;
  for (const key of keys) {
    const raw = payload[key];
    if (typeof raw === "string" && raw.trim()) return raw.slice(0, 10);
  }
  return null;
}

export function compareDateOnly(a: string, b: string): number {
  return differenceInCalendarDays(parseDateOnly(a), parseDateOnly(b));
}

export function isDateOnOrBeforeToday(
  dateStr: string | null | undefined,
  options?: WorkflowValidationOptions,
): boolean {
  if (!dateStr) return false;
  return compareDateOnly(dateStr, formatToday(options)) <= 0;
}

export function formatToday(options?: WorkflowValidationOptions): string {
  const today = todayStart(options);
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function requireDateReached(
  dateStr: string | null | undefined,
  label: string,
  options?: WorkflowValidationOptions,
): WorkflowValidationResult {
  if (!dateStr) {
    return {
      allowed: false,
      message: `${label} is not scheduled on this procurement`,
    };
  }
  if (!isDateOnOrBeforeToday(dateStr, options)) {
    return {
      allowed: false,
      message: `${label} (${dateStr}) has not been reached yet`,
    };
  }
  return { allowed: true };
}

function requireAckDate(
  scheduled: string | null,
  ack: string | null,
  scheduledLabel: string,
  ackLabel: string,
  options?: WorkflowValidationOptions,
): WorkflowValidationResult {
  if (!ack) {
    return { allowed: false, message: `${ackLabel} is required` };
  }
  if (compareDateOnly(ack, formatToday(options)) > 0) {
    return { allowed: false, message: `${ackLabel} cannot be in the future` };
  }
  if (scheduled && compareDateOnly(ack, scheduled) < 0) {
    return {
      allowed: false,
      message: `${ackLabel} cannot be before scheduled ${scheduledLabel} (${scheduled})`,
    };
  }
  return { allowed: true };
}

export async function isWorkflowDateValidationEnabled(): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: WORKFLOW_DATE_VALIDATION_SETTING_KEY },
  });
  if (row?.value === false) return false;
  return true;
}

export async function setWorkflowDateValidationEnabled(enabled: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: WORKFLOW_DATE_VALIDATION_SETTING_KEY },
    update: { value: enabled },
    create: { key: WORKFLOW_DATE_VALIDATION_SETTING_KEY, value: enabled },
  });
}

export function validateWorkflowTransition(
  proc: WorkflowValidationProcurement,
  toStatus: ProcurementStatus,
  options?: WorkflowValidationOptions,
): WorkflowValidationResult {
  const from = proc.status;
  const payload = options?.payload;

  if (from === ProcurementStatus.ACTIVE && toStatus === ProcurementStatus.PREBID_OPEN) {
    const scheduled = toDateOnly(proc.prebidDate);
    const reached = requireDateReached(scheduled, "Pre-bid date", options);
    if (!reached.allowed) return reached;
    const ack = payloadDate(payload, "prebidAcknowledgedAt", "prebidAcknowledgedDate") ?? scheduled;
    return requireAckDate(scheduled, ack, "pre-bid date", "Pre-bid acknowledgement date", options);
  }

  if (from === ProcurementStatus.PREBID_OPEN && toStatus === ProcurementStatus.BID_OPEN_DAY) {
    const scheduled = toDateOnly(proc.bidOpenDate);
    const reached = requireDateReached(scheduled, "Bid open date", options);
    if (!reached.allowed) return reached;
    const ack = payloadDate(payload, "bidOpenAcknowledgedAt", "bidOpenAcknowledgedDate") ?? scheduled;
    return requireAckDate(scheduled, ack, "bid open date", "Bid open acknowledgement date", options);
  }

  if (from === ProcurementStatus.BID_OPEN_DAY && toStatus === ProcurementStatus.BID_CLOSED) {
    return requireDateReached(toDateOnly(proc.bidOpenDate), "Bid open date", options);
  }

  if (from === ProcurementStatus.BID_CLOSED && toStatus === ProcurementStatus.BIDDERS_ENTERED) {
    const gate = toDateOnly(proc.bidFeeSubmissionDate) ?? toDateOnly(proc.bidOpenDate);
    return requireDateReached(
      gate,
      toDateOnly(proc.bidFeeSubmissionDate) ? "Bid fee submission date" : "Bid open date",
      options,
    );
  }

  if (from === ProcurementStatus.BIDDERS_ENTERED && toStatus === ProcurementStatus.TECHNICAL_EVAL) {
    return requireDateReached(toDateOnly(proc.bidOpenDate), "Bid open date", options);
  }

  if (from === ProcurementStatus.LETTERS_SENT && toStatus === ProcurementStatus.PRICE_BID_OPEN) {
    const openDate =
      payloadDate(payload, "priceBidOpenDate") ?? toDateOnly(proc.priceBidOpenDate);
    return requireDateReached(openDate, "Price bid opening date", options);
  }

  if (from === ProcurementStatus.PRICE_BID_OPEN && toStatus === ProcurementStatus.WITH_FINANCE) {
    return requireDateReached(toDateOnly(proc.priceBidOpenDate), "Price bid opening date", options);
  }

  if (from === ProcurementStatus.WINNER_SELECTED && toStatus === ProcurementStatus.LOI_ISSUED) {
    return requireDateReached(toDateOnly(proc.priceBidOpenDate), "Price bid opening date", options);
  }

  if (from === ProcurementStatus.LOI_ISSUED && toStatus === ProcurementStatus.LOA_ISSUED) {
    const loi = toDateOnly(proc.loiIssuedDate);
    if (!loi) {
      return { allowed: false, message: "LOI must be issued before LOA" };
    }
    if (options?.calendar && options.loaDelayDays != null) {
      const loiDate =
        proc.loiIssuedDate instanceof Date
          ? proc.loiIssuedDate
          : loi
            ? parseDateOnly(loi)
            : null;
      const due = getMilestoneDate(
        { status: proc.status, loiIssuedDate: loiDate, loaIssuedDate: null },
        "loaDueAfterLoi",
        { loaDelayDays: options.loaDelayDays, calendar: options.calendar },
      );
      const dueStr = toDateOnly(due);
      if (dueStr) {
        const reached = requireDateReached(dueStr, "LOA due date", options);
        if (!reached.allowed) return reached;
      }
    } else if (!isDateOnOrBeforeToday(loi, options)) {
      return { allowed: false, message: "LOI issue date has not been reached yet" };
    }
    const loaDoc = payloadDate(payload, "loaDocumentDate");
    if (loaDoc && compareDateOnly(loaDoc, loi) < 0) {
      return { allowed: false, message: "LOA document date cannot be before LOI issue date" };
    }
    return { allowed: true };
  }

  if (from === ProcurementStatus.LOA_ISSUED && toStatus === ProcurementStatus.CONTRACT_SIGNED) {
    const loa = toDateOnly(proc.loaIssuedDate) ?? toDateOnly(proc.loaDocumentDate);
    const reached = requireDateReached(loa, "LOA issue date", options);
    if (!reached.allowed) return reached;
    const agreement = payloadDate(payload, "contractAgreementDate");
    if (agreement && loa && compareDateOnly(agreement, loa) < 0) {
      return { allowed: false, message: "Contract agreement date cannot be before LOA issue date" };
    }
    return { allowed: true };
  }

  if (from === ProcurementStatus.CONTRACT_SIGNED && toStatus === ProcurementStatus.IN_PROGRESS) {
    const poDate = payloadDate(payload, "poIssueDate");
    const reached = requireDateReached(poDate, "PO issue date", options);
    if (!reached.allowed) return reached;
    return requireAckDate(poDate, poDate, "PO issue date", "PO issue date", options);
  }

  if (from === ProcurementStatus.IN_PROGRESS && toStatus === ProcurementStatus.PDI_PHASE) {
    const pdiStart = payloadDate(payload, "pdiDate");
    const reached = requireDateReached(pdiStart, "PDI start date", options);
    if (!reached.allowed) return reached;
    const po = toDateOnly(proc.poIssueDate);
    if (po && pdiStart && compareDateOnly(pdiStart, po) < 0) {
      return { allowed: false, message: "PDI start date cannot be before PO issue date" };
    }
    return requireAckDate(pdiStart, pdiStart, "PDI start date", "PDI start date", options);
  }

  if (from === ProcurementStatus.IN_PROGRESS && toStatus === ProcurementStatus.COMPLETED) {
    const delivery = payloadDate(payload, "deliveryReceivedDate");
    const reached = requireDateReached(delivery, "Delivery received date", options);
    if (!reached.allowed) return reached;
    const scheduled = toDateOnly(proc.scheduledCompletionDate);
    if (scheduled && delivery && compareDateOnly(delivery, scheduled) < 0) {
      // Allow early delivery; only block if delivery is in the future (handled above).
    }
    return { allowed: true };
  }

  if (from === ProcurementStatus.PDI_PHASE && toStatus === ProcurementStatus.IN_PROGRESS) {
    const pdiEnd = payloadDate(payload, "pdiEndDate");
    const reached = requireDateReached(pdiEnd, "PDI end date", options);
    if (!reached.allowed) return reached;
    const pdiStart = toDateOnly(proc.pdiDate);
    if (pdiStart && pdiEnd && compareDateOnly(pdiEnd, pdiStart) < 0) {
      return { allowed: false, message: "PDI end date cannot be before PDI start date" };
    }
    return requireAckDate(pdiEnd, pdiEnd, "PDI end date", "PDI end date", options);
  }

  if (from === ProcurementStatus.DRAFT && toStatus === ProcurementStatus.ACTIVE) {
    const notice = toDateOnly(proc.noticeDate);
    if (notice) {
      return requireDateReached(notice, "Notice date", options);
    }
  }

  return { allowed: true };
}

export function validateBidderEntry(proc: WorkflowValidationProcurement): WorkflowValidationResult {
  return requireDateReached(toDateOnly(proc.bidOpenDate), "Bid open date");
}

export function validateBidderFinalize(proc: WorkflowValidationProcurement): WorkflowValidationResult {
  const gate = toDateOnly(proc.bidFeeSubmissionDate) ?? toDateOnly(proc.bidOpenDate);
  return requireDateReached(
    gate,
    toDateOnly(proc.bidFeeSubmissionDate) ? "Bid fee submission date" : "Bid open date",
  );
}

export function validateCommitteeDecision(proc: WorkflowValidationProcurement): WorkflowValidationResult {
  return requireDateReached(toDateOnly(proc.priceBidOpenDate), "Price bid opening date");
}

export async function assertWorkflowDateRules(
  proc: WorkflowValidationProcurement,
  check: WorkflowValidationResult,
): Promise<void> {
  if (!(await isWorkflowDateValidationEnabled())) return;
  if (!check.allowed) {
    throw new ApiError(400, "WORKFLOW_DATE_BLOCKED", check.message);
  }
}

export async function assertWorkflowTransition(
  proc: WorkflowValidationProcurement,
  toStatus: ProcurementStatus,
  options?: WorkflowValidationOptions,
): Promise<void> {
  if (!(await isWorkflowDateValidationEnabled())) return;

  let resolvedOptions = options;
  if (
    proc.status === ProcurementStatus.LOI_ISSUED &&
    toStatus === ProcurementStatus.LOA_ISSUED &&
  options?.procurementId &&
    (options.loaDelayDays == null || !options.calendar)
  ) {
    const { loadProcurementSettings } = await import("@/lib/procurement/settings-snapshot");
    const { resolveProcurementCalculationContext } = await import(
      "@/lib/procurement/settings-snapshot"
    );
    const settings = await loadProcurementSettings(options.procurementId);
    const ctx = await resolveProcurementCalculationContext(options.procurementId, 0);
    resolvedOptions = {
      ...options,
      loaDelayDays: settings.loaDelayDays,
      calendar: ctx.calendar,
    };
  }

  const result = validateWorkflowTransition(proc, toStatus, resolvedOptions);
  await assertWorkflowDateRules(proc, result);
}
