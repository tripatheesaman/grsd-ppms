import { parseDateOnly } from "@/lib/dates";
import type { ProcurementDocData } from "@/lib/documents/placeholders";
import { STATUS_LABELS } from "@/lib/procurement/workflow";
import { resolveProcurementCalculationContext } from "@/lib/procurement/settings-snapshot";
import type { ProcurementStatus } from "@prisma/client";

type SerializedProcurement = {
  title: string;
  itemName: string;
  dtssrNumber: string | null;
  status: ProcurementStatus;
  costEstimate: number;
  bidFee: number | null;
  bidSecurity: number | null;
  grandTotalWithVat: number | null;
  bsfPercent: number;
  totalQuantity: number | null;
  bidValidityDays: number | null;
  noticeDate: string | null;
  bidFeeSubmissionDate: string | null;
  bidOpenDate: string | null;
  prebidDate: string | null;
  bidValidityDate: string | null;
  bidSecurityValidityDate: string | null;
  scheduledInitiationDate: string | null;
  scheduledCompletionDate: string | null;
  priceBidOpenDate: string | null;
  technicalEvalSentDate: string | null;
  loiIssuedDate: string | null;
  loaIssuedDate: string | null;
  loaDocumentDate: string | null;
  contractSignedDate: string | null;
  contractAgreementDate: string | null;
  cinNumber: string | null;
  supplierWitnessName: string | null;
  supplierWitnessDesignation: string | null;
  supplierSigningAuthorityName: string | null;
  supplierSigningAuthorityDesignation: string | null;
  evaluationCommitteeSentDate: string | null;
  pgValidityDate: string | null;
  pgAmount: number | null;
  warrantyDays: number | null;
  pdiDate: string | null;
  deliveryReceivedDate: string | null;
  winnerBidder?: {
    bidAmountWithVat: number | null;
    bidAmountWithoutVat: number | null;
    bidCurrencyCode?: string | null;
    bidCurrencyName?: string | null;
    bidCurrencySymbol?: string | null;
    paymentConditionCode?: string | null;
    paymentConditionName?: string | null;
  } | null;
  prebidAcknowledgedAt: string | null;
  bidOpenAcknowledgedAt: string | null;
  periodBegunAt: string | Date | null;
  prebidTime: string;
  bidSubmissionTime: string;
  bidOpenTime: string;
  references: Array<{ type: string; code: string; number: string }>;
  workDays: Array<{ categoryName: string; days: number }>;
  bidType?: { name: string; defaultBidDays: number } | null;
  mediaOfBid?: { name: string } | null;
  sbd?: { name: string } | null;
  contractType?: { name: string } | null;
  unit?: { name: string; symbol?: string | null } | null;
};

function toDocDate(value: string | null): Date | null {
  if (!value) return null;
  return parseDateOnly(value);
}

function toDocDateTime(value: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const dateOnly = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return parseDateOnly(dateOnly);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function buildProcurementDocData(
  procurementId: string,
  proc: SerializedProcurement,
): Promise<ProcurementDocData> {
  const { bidDays } = await resolveProcurementCalculationContext(
    procurementId,
    proc.bidType?.defaultBidDays ?? 0,
  );

  return {
    title: proc.title,
    itemName: proc.itemName,
    dtssrNumber: proc.dtssrNumber,
    status: proc.status,
    statusLabel: STATUS_LABELS[proc.status] ?? proc.status,
    costEstimate: proc.costEstimate,
    bidFee: proc.bidFee,
    bidSecurity: proc.bidSecurity,
    grandTotalWithVat: proc.grandTotalWithVat,
    bsfPercent: proc.bsfPercent,
    totalQuantity: proc.totalQuantity,
    bidValidityDays: proc.bidValidityDays,
    bidDays,
    bidTypeDefaultDays: proc.bidType?.defaultBidDays ?? 0,
    noticeDate: toDocDate(proc.noticeDate),
    bidFeeSubmissionDate: toDocDate(proc.bidFeeSubmissionDate),
    bidOpenDate: toDocDate(proc.bidOpenDate),
    prebidDate: toDocDate(proc.prebidDate),
    bidValidityDate: toDocDate(proc.bidValidityDate),
    bidSecurityValidityDate: toDocDate(proc.bidSecurityValidityDate),
    scheduledInitiationDate: toDocDate(proc.scheduledInitiationDate),
    scheduledCompletionDate: toDocDate(proc.scheduledCompletionDate),
    priceBidOpenDate: toDocDate(proc.priceBidOpenDate),
    technicalEvalSentDate: toDocDate(proc.technicalEvalSentDate),
    loiIssuedDate: toDocDate(proc.loiIssuedDate),
    loaIssuedDate: toDocDate(proc.loaIssuedDate),
    loaDocumentDate: toDocDate(proc.loaDocumentDate),
    contractSignedDate: toDocDate(proc.contractSignedDate),
    contractAgreementDate: toDocDate(proc.contractAgreementDate),
    cinNumber: proc.cinNumber ?? null,
    supplierWitnessName: proc.supplierWitnessName ?? null,
    supplierWitnessDesignation: proc.supplierWitnessDesignation ?? null,
    supplierSigningAuthorityName: proc.supplierSigningAuthorityName ?? null,
    supplierSigningAuthorityDesignation: proc.supplierSigningAuthorityDesignation ?? null,
    evaluationCommitteeSentDate: toDocDate(proc.evaluationCommitteeSentDate),
    pgValidityDate: toDocDate(proc.pgValidityDate),
    pgAmount: proc.pgAmount,
    warrantyDays: proc.warrantyDays,
    pdiDate: toDocDate(proc.pdiDate),
    winnerBidAmountWithVat: proc.winnerBidder?.bidAmountWithVat ?? null,
    winnerBidAmountWithoutVat: proc.winnerBidder?.bidAmountWithoutVat ?? null,
    winnerBidCurrencyCode: proc.winnerBidder?.bidCurrencyCode ?? null,
    winnerBidCurrencyName: proc.winnerBidder?.bidCurrencyName ?? null,
    winnerBidCurrencySymbol: proc.winnerBidder?.bidCurrencySymbol ?? null,
    paymentConditionCode: proc.winnerBidder?.paymentConditionCode ?? null,
    paymentConditionName: proc.winnerBidder?.paymentConditionName ?? null,
    deliveryReceivedDate: toDocDate(proc.deliveryReceivedDate),
    prebidAcknowledgedAt: toDocDate(proc.prebidAcknowledgedAt),
    bidOpenAcknowledgedAt: toDocDate(proc.bidOpenAcknowledgedAt),
    periodBegunAt: toDocDateTime(proc.periodBegunAt),
    prebidTime: proc.prebidTime,
    bidSubmissionTime: proc.bidSubmissionTime,
    bidOpenTime: proc.bidOpenTime,
    references: proc.references,
    workDays: proc.workDays,
    bidTypeName: proc.bidType?.name,
    mediaName: proc.mediaOfBid?.name,
    sbdName: proc.sbd?.name,
    contractTypeName: proc.contractType?.name,
    unitName: proc.unit?.name,
    unitSymbol: proc.unit?.symbol ?? undefined,
  };
}
