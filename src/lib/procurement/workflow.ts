import { ProcurementStatus } from "@prisma/client";

export const WORKFLOW_TRANSITIONS: Record<ProcurementStatus, ProcurementStatus[]> = {
  DRAFT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PREBID_OPEN", "CANCELLED"],
  PREBID_OPEN: ["BID_OPEN_DAY"],
  BID_OPEN_DAY: ["BID_CLOSED"],
  BID_CLOSED: ["BIDDERS_ENTERED", "NO_BIDDERS"],
  NO_BIDDERS: ["DRAFT"],
  BIDDERS_ENTERED: ["TECHNICAL_EVAL"],
  TECHNICAL_EVAL: ["TECHNICAL_DONE"],
  TECHNICAL_DONE: ["LETTERS_SENT"],
  LETTERS_SENT: ["PRICE_BID_OPEN"],
  PRICE_BID_SCHEDULED: ["PRICE_BID_OPEN"],
  PRICE_BID_OPEN: ["WITH_FINANCE"],
  WITH_FINANCE: ["WINNER_SELECTED"],
  WINNER_SELECTED: ["LOI_ISSUED"],
  LOI_ISSUED: ["LOA_ISSUED"],
  LOA_ISSUED: ["CONTRACT_SIGNED"],
  CONTRACT_SIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["PDI_PHASE", "COMPLETED"],
  PDI_PHASE: ["IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: ProcurementStatus, to: ProcurementStatus): boolean {
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Record<ProcurementStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PREBID_OPEN: "Pre-bid Open",
  BID_OPEN_DAY: "Bid Open",
  BID_CLOSED: "Bid Closed",
  BIDDERS_ENTERED: "Bidders Entered",
  NO_BIDDERS: "No Bidders",
  TECHNICAL_EVAL: "Technical Evaluation",
  TECHNICAL_DONE: "Technical Done",
  LETTERS_SENT: "Letters Sent",
  PRICE_BID_SCHEDULED: "Price Bid Scheduled",
  PRICE_BID_OPEN: "Price Bid Open",
  WITH_FINANCE: "With Evaluation Committee",
  WINNER_SELECTED: "Winner Selected",
  LOI_ISSUED: "LOI Issued",
  LOA_ISSUED: "LOA Issued",
  CONTRACT_SIGNED: "Contract Signed",
  PDI_PHASE: "PDI Phase",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
