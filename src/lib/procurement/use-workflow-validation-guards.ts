"use client";

import { useMemo } from "react";
import type { ProcurementStatus } from "@prisma/client";

import {
  validateBidderEntry,
  validateBidderFinalize,
  validateCommitteeDecision,
  validateWorkflowTransition,
  type WorkflowValidationProcurement,
} from "@/lib/procurement/workflow-date-validation";

function toValidationProcurement(
  proc: Record<string, unknown>,
  status: ProcurementStatus,
): WorkflowValidationProcurement {
  return {
    status,
    prebidDate: (proc.prebidDate as string | null | undefined) ?? null,
    bidOpenDate: (proc.bidOpenDate as string | null | undefined) ?? null,
    bidFeeSubmissionDate: (proc.bidFeeSubmissionDate as string | null | undefined) ?? null,
    priceBidOpenDate: (proc.priceBidOpenDate as string | null | undefined) ?? null,
    loiIssuedDate: (proc.loiIssuedDate as string | null | undefined) ?? null,
    loaIssuedDate: (proc.loaIssuedDate as string | null | undefined) ?? null,
    loaDocumentDate: (proc.loaDocumentDate as string | null | undefined) ?? null,
    scheduledCompletionDate: (proc.scheduledCompletionDate as string | null | undefined) ?? null,
    poIssueDate: (proc.poIssueDate as string | null | undefined) ?? null,
    pdiDate: (proc.pdiDate as string | null | undefined) ?? null,
    noticeDate: (proc.noticeDate as string | null | undefined) ?? null,
  };
}

export function useWorkflowValidationGuards(
  proc: Record<string, unknown> | undefined,
  status: ProcurementStatus | undefined,
  enabled: boolean,
) {
  const validationProc = useMemo(() => {
    if (!proc || !status) return null;
    return toValidationProcurement(proc, status);
  }, [proc, status]);

  function guardTransition(
    toStatus: ProcurementStatus,
    payload?: Record<string, unknown>,
  ): string | null {
    if (!enabled || !validationProc) return null;
    const result = validateWorkflowTransition(validationProc, toStatus, { payload });
    return result.allowed ? null : result.message;
  }

  function guardBidderEntry(): string | null {
    if (!enabled || !validationProc) return null;
    const result = validateBidderEntry(validationProc);
    return result.allowed ? null : result.message;
  }

  function guardBidderFinalize(): string | null {
    if (!enabled || !validationProc) return null;
    const result = validateBidderFinalize(validationProc);
    return result.allowed ? null : result.message;
  }

  function guardCommitteeDecision(): string | null {
    if (!enabled || !validationProc) return null;
    const result = validateCommitteeDecision(validationProc);
    return result.allowed ? null : result.message;
  }

  return {
    guardTransition,
    guardBidderEntry,
    guardBidderFinalize,
    guardCommitteeDecision,
  };
}
