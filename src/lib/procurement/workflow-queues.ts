import type { ProcurementStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardCheck,
  Factory,
  FileStack,
  FileWarning,
  Gavel,
  Mail,
  PauseCircle,
  Scale,
  Send,
} from "lucide-react";import { differenceInCalendarDays, startOfDay } from "date-fns";
import { dateFromDb, parseDateOnly } from "@/lib/dates";

export type WorkflowQueueKey =
  | "all"
  | "technical-committee"
  | "technical-letters-pending"
  | "price-bid-opening"
  | "financial-committee"
  | "loi-pending-loa"
  | "loa-pending-contract"
  | "fabrication"
  | "pdi"
  | "completed";

export type BidderCountMode = "all" | "pending-tech" | "passed-tech";

export type WorkflowQueueConfig = {
  key: WorkflowQueueKey;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  icon: LucideIcon;
  statuses: ProcurementStatus[] | null;
  requiresPoIssued?: boolean;
  showBidderCount: boolean;
  bidderCountMode?: BidderCountMode;
  stageDateField?: keyof StageDateFields;
  stageStatusForEvent?: ProcurementStatus;
  showDaysInStage: boolean;
  showCountdown: boolean;
  accent: "primary" | "accent" | "success" | "warning";
  /** Show live count badge in sidebar navigation */
  showSidebarCount: boolean;
};

type StageDateFields = {
  technicalEvalSentDate: Date | null;
  evaluationCommitteeSentDate: Date | null;
  priceBidOpenDate: Date | null;
  loiIssuedDate: Date | null;
  loaIssuedDate: Date | null;
  poIssueDate: Date | null;
  updatedAt: Date;
};

export const WORKFLOW_QUEUES: WorkflowQueueConfig[] = [
  {
    key: "all",
    label: "All procurements",
    shortLabel: "All",
    description: "Complete procurement register",
    href: "/procurements",
    icon: FileStack,
    statuses: null,
    showBidderCount: false,
    showDaysInStage: false,
    showCountdown: true,
    accent: "primary",
    showSidebarCount: false,
  },
  {
    key: "technical-committee",
    label: "Technical evaluation committee",
    shortLabel: "Tech committee",
    description: "Bids under technical evaluation with active bidder counts",
    href: "/procurements/technical-committee",
    icon: ClipboardCheck,
    statuses: ["TECHNICAL_EVAL"],
    showBidderCount: true,
    bidderCountMode: "pending-tech",
    stageDateField: "technicalEvalSentDate",
    stageStatusForEvent: "TECHNICAL_EVAL",
    showDaysInStage: true,
    showCountdown: false,
    accent: "primary",
    showSidebarCount: true,
  },
  {
    key: "technical-letters-pending",
    label: "Technical letters pending",
    shortLabel: "Tech letters",
    description: "Technical evaluation complete; letters not yet sent",
    href: "/procurements/technical-letters-pending",
    icon: Send,
    statuses: ["TECHNICAL_DONE"],
    showBidderCount: true,
    bidderCountMode: "passed-tech",
    stageStatusForEvent: "TECHNICAL_DONE",
    showDaysInStage: true,
    showCountdown: false,
    accent: "primary",
    showSidebarCount: true,
  },
  {
    key: "price-bid-opening",
    label: "Price bid opening",
    shortLabel: "Price bid",
    description: "Awaiting or conducting price bid opening",
    href: "/procurements/price-bid-opening",
    icon: Gavel,
    statuses: ["LETTERS_SENT", "PRICE_BID_OPEN", "PRICE_BID_SCHEDULED"],
    showBidderCount: true,
    bidderCountMode: "passed-tech",
    stageDateField: "priceBidOpenDate",
    showDaysInStage: true,
    showCountdown: false,
    accent: "accent",
    showSidebarCount: true,
  },
  {
    key: "financial-committee",
    label: "Financial evaluation committee",
    shortLabel: "Fin committee",
    description: "With evaluation committee / winner selection",
    href: "/procurements/financial-committee",
    icon: Scale,
    statuses: ["WITH_FINANCE", "WINNER_SELECTED"],
    showBidderCount: true,
    bidderCountMode: "passed-tech",
    stageDateField: "evaluationCommitteeSentDate",
    stageStatusForEvent: "WITH_FINANCE",
    showDaysInStage: true,
    showCountdown: false,
    accent: "accent",
    showSidebarCount: true,
  },
  {
    key: "loi-pending-loa",
    label: "LOI issued — LOA pending",
    shortLabel: "LOA pending",
    description: "LOI issued; LOA not yet issued",
    href: "/procurements/loi-pending-loa",
    icon: Mail,
    statuses: ["LOI_ISSUED"],
    showBidderCount: false,
    stageDateField: "loiIssuedDate",
    showDaysInStage: true,
    showCountdown: false,
    accent: "warning",
    showSidebarCount: true,
  },
  {
    key: "loa-pending-contract",
    label: "LOA issued — contract pending",
    shortLabel: "Contract pending",
    description: "LOA issued; contract not yet signed",
    href: "/procurements/loa-pending-contract",
    icon: FileWarning,
    statuses: ["LOA_ISSUED"],
    showBidderCount: false,
    stageDateField: "loaIssuedDate",
    showDaysInStage: true,
    showCountdown: false,
    accent: "warning",
    showSidebarCount: true,
  },
  {
    key: "fabrication",
    label: "Fabrication in progress",
    shortLabel: "Fabrication",
    description: "PO issued — work execution and delivery tracking",
    href: "/procurements/fabrication",
    icon: Factory,
    statuses: ["IN_PROGRESS", "PDI_PHASE"],
    requiresPoIssued: true,
    showBidderCount: false,
    stageDateField: "poIssueDate",
    showDaysInStage: true,
    showCountdown: true,
    accent: "success",
    showSidebarCount: false,
  },
  {
    key: "pdi",
    label: "PDI",
    shortLabel: "PDI",
    description: "Pre-delivery inspection in progress",
    href: "/procurements/pdi",
    icon: PauseCircle,
    statuses: ["PDI_PHASE"],
    showBidderCount: false,
    showDaysInStage: false,
    showCountdown: false,
    accent: "warning",
    showSidebarCount: true,
  },
  {
    key: "completed",
    label: "Completed",
    shortLabel: "Completed",
    description: "Procurements successfully completed and closed",
    href: "/procurements/completed",
    icon: CheckCircle2,
    statuses: ["COMPLETED"],
    showBidderCount: false,
    showDaysInStage: false,
    showCountdown: false,
    accent: "success",
    showSidebarCount: false,
  },
];

/** @deprecated use WORKFLOW_QUEUES — kept for backward-compatible imports */
export const PROCUREMENT_STAGES = WORKFLOW_QUEUES;

export type ProcurementStageKey = WorkflowQueueKey;

export function getWorkflowQueue(key: WorkflowQueueKey): WorkflowQueueConfig {
  return WORKFLOW_QUEUES.find((q) => q.key === key) ?? WORKFLOW_QUEUES[0]!;
}

export function getProcurementStage(key: WorkflowQueueKey): WorkflowQueueConfig {
  return getWorkflowQueue(key);
}

export function statusesForQueue(key: WorkflowQueueKey): ProcurementStatus[] | null {
  return getWorkflowQueue(key).statuses;
}

export function statusesForStage(key: WorkflowQueueKey): ProcurementStatus[] | null {
  return statusesForQueue(key);
}

export function buildQueueWhere(key: WorkflowQueueKey): Prisma.ProcurementWhereInput {
  const queue = getWorkflowQueue(key);
  const where: Prisma.ProcurementWhereInput = {};
  if (queue.statuses?.length) {
    where.status = { in: queue.statuses };
  }
  if (queue.requiresPoIssued) {
    where.poIssueDate = { not: null };
  }
  return where;
}

export const SIDEBAR_COUNT_QUEUES = WORKFLOW_QUEUES.filter((q) => q.showSidebarCount);

export function countActiveBidders(
  bidders: Array<{ passedTech: boolean | null }>,
  mode: BidderCountMode,
): number {
  if (mode === "all") return bidders.length;
  if (mode === "pending-tech") return bidders.filter((b) => b.passedTech === null).length;
  return bidders.filter((b) => b.passedTech === true).length;
}

export function computeDaysInStage(
  proc: Partial<StageDateFields>,
  queue: WorkflowQueueConfig,
  stageEnteredAt?: Date | null,
): number | null {
  if (!queue.showDaysInStage) return null;

  const today = startOfDay(new Date());
  let anchor: Date | null = null;

  if (queue.stageDateField && proc[queue.stageDateField]) {
    const str = dateFromDb(proc[queue.stageDateField] as Date | null);
    if (str) anchor = parseDateOnly(str);
  } else if (stageEnteredAt) {
    anchor = startOfDay(stageEnteredAt);
  } else if (proc.updatedAt) {
    anchor = startOfDay(proc.updatedAt);
  }

  if (!anchor) return null;
  return Math.max(0, differenceInCalendarDays(today, anchor));
}
