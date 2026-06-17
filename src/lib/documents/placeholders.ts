import { amountToWords } from "@/lib/documents/amount-words";
import {
  PLACEHOLDER_CATALOG,
  PLACEHOLDER_CATALOG_BY_CATEGORY,
  formatPlaceholderGuide,
} from "@/lib/documents/placeholder-catalog";
import { formatCurrencyForDocuments } from "@/lib/currency";
import { dateFromDb } from "@/lib/dates";
import { adToBsDateOnly, formatDualDate, formatDualDateShort } from "@/lib/dates/display";
import type { AppSettings } from "@/lib/settings";

export { PLACEHOLDER_CATALOG, PLACEHOLDER_CATALOG_BY_CATEGORY, formatPlaceholderGuide };

export type ProcurementReference = {
  type: string;
  code: string;
  number: string;
};

export type WorkDayRow = {
  categoryName: string;
  days: number;
};

export type ProcurementDocData = {
  title: string;
  itemName: string;
  dtssrNumber: string | null;
  status: string;
  statusLabel: string;
  costEstimate: number;
  bidFee: number | null;
  bidSecurity: number | null;
  grandTotalWithVat: number | null;
  bsfPercent: number;
  totalQuantity: number | null;
  bidValidityDays: number | null;
  bidDays: number;
  bidTypeDefaultDays: number;
  noticeDate: Date | null;
  bidFeeSubmissionDate: Date | null;
  bidOpenDate: Date | null;
  prebidDate: Date | null;
  bidValidityDate: Date | null;
  bidSecurityValidityDate: Date | null;
  scheduledInitiationDate: Date | null;
  scheduledCompletionDate: Date | null;
  priceBidOpenDate: Date | null;
  technicalEvalSentDate: Date | null;
  loiIssuedDate: Date | null;
  loaIssuedDate: Date | null;
  loaDocumentDate: Date | null;
  contractSignedDate: Date | null;
  contractAgreementDate: Date | null;
  cinNumber: string | null;
  supplierWitnessName: string | null;
  supplierWitnessDesignation: string | null;
  supplierSigningAuthorityName: string | null;
  supplierSigningAuthorityDesignation: string | null;
  evaluationCommitteeSentDate: Date | null;
  pgValidityDate: Date | null;
  pgAmount: number | null;
  warrantyDays: number | null;
  pdiDate: Date | null;
  winnerBidAmountWithVat: number | null;
  winnerBidAmountWithoutVat: number | null;
  winnerBidCurrencyCode: string | null;
  winnerBidCurrencyName: string | null;
  winnerBidCurrencySymbol: string | null;
  paymentConditionCode: string | null;
  paymentConditionName: string | null;
  deliveryReceivedDate: Date | null;
  prebidAcknowledgedAt: Date | null;
  bidOpenAcknowledgedAt: Date | null;
  periodBegunAt: Date | null;
  prebidTime: string;
  bidSubmissionTime: string;
  bidOpenTime: string;
  references: ProcurementReference[];
  workDays: WorkDayRow[];
  bidTypeName?: string;
  mediaName?: string;
  sbdName?: string;
  contractTypeName?: string;
  unitName?: string;
  unitSymbol?: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function docDatePlaceholders(dbDate: Date | null): Record<string, string> {
  const ad = dateFromDb(dbDate) ?? "";
  const bs = ad ? (adToBsDateOnly(ad) ?? "") : "";
  const dual = ad ? formatDualDateShort(ad) : "";
  const long = ad ? formatDualDate(ad) : "";
  return { ad, bs, dual, long };
}

function spreadDatePrefix(prefix: string, dbDate: Date | null): Record<string, string> {
  const { ad, bs, dual, long } = docDatePlaceholders(dbDate);
  return {
    [`${prefix}_date`]: ad,
    [`${prefix}_date_bs`]: bs,
    [`${prefix}_date_dual`]: dual,
    [`${prefix}_date_long`]: long,
  };
}

function referencePlaceholders(references: ProcurementReference[]): Record<string, string> {
  const map: Record<string, string> = {
    references: references.map((r) => `${r.type}: ${r.number}`).join(", "),
    references_lines: references.map((r) => `${r.type}: ${r.number}`).join("\n"),
  };

  for (const ref of references) {
    const code = ref.code.trim().toLowerCase();
    if (!code) continue;
    map[`${code}_number`] = ref.number;
    map[`ref_${code}`] = ref.number;
    map[`ref_${code}_number`] = ref.number;
    map[`reference_${code}`] = ref.number;
  }

  return map;
}

function workDayPlaceholders(workDays: WorkDayRow[]): Record<string, string> {
  const lines = workDays.map((w) => `${w.categoryName}: ${w.days} days`);
  const total = workDays.reduce((sum, w) => sum + w.days, 0);
  const map: Record<string, string> = {
    work_days_list: lines.join("\n"),
    work_days_total: String(total),
  };

  for (const row of workDays) {
    const slug = slugify(row.categoryName);
    if (!slug) continue;
    map[`work_day_${slug}_days`] = String(row.days);
    map[`work_day_${slug}`] = String(row.days);
  }

  return map;
}

export function buildPlaceholderMap(
  data: ProcurementDocData,
  settings: AppSettings,
  extra?: Record<string, string>,
): Record<string, string> {
  const grandTotal = data.grandTotalWithVat;
  const today = new Date();

  return {
    title: data.title,
    item_name: data.itemName,
    itemName: data.itemName,
    dtssr_number: data.dtssrNumber ?? "",
    dtssrNumber: data.dtssrNumber ?? "",
    status: data.status,
    status_label: data.statusLabel,
    statusLabel: data.statusLabel,

    media_of_bid: data.mediaName ?? "",
    media: data.mediaName ?? "",
    mediaOfBid: data.mediaName ?? "",

    bid_type: data.bidTypeName ?? "",
    bidType: data.bidTypeName ?? "",
    bid_type_default_days: String(data.bidTypeDefaultDays),
    bidTypeDefaultDays: String(data.bidTypeDefaultDays),
    bid_days: String(data.bidDays),
    bidDays: String(data.bidDays),

    sbd: data.sbdName ?? "",
    sbd_name: data.sbdName ?? "",
    sbdName: data.sbdName ?? "",

    contract_type: data.contractTypeName ?? "",
    contractType: data.contractTypeName ?? "",
    unit: data.unitName ?? "",
    unit_symbol: data.unitSymbol ?? "",
    unitSymbol: data.unitSymbol ?? "",

    cost_estimate: formatCurrencyForDocuments(data.costEstimate),
    costEstimate: formatCurrencyForDocuments(data.costEstimate),
    cost_estimate_words: amountToWords(data.costEstimate),
    costEstimateWords: amountToWords(data.costEstimate),

    bid_fee: formatCurrencyForDocuments(data.bidFee),
    bidFee: formatCurrencyForDocuments(data.bidFee),
    bid_fee_words: data.bidFee != null ? amountToWords(data.bidFee) : "",
    bidFeeWords: data.bidFee != null ? amountToWords(data.bidFee) : "",

    bid_security: formatCurrencyForDocuments(data.bidSecurity),
    bidSecurity: formatCurrencyForDocuments(data.bidSecurity),
    bid_security_words: data.bidSecurity != null ? amountToWords(data.bidSecurity) : "",
    bidSecurityWords: data.bidSecurity != null ? amountToWords(data.bidSecurity) : "",

    grand_total_with_vat: formatCurrencyForDocuments(grandTotal),
    grandTotalWithVat: formatCurrencyForDocuments(grandTotal),
    grand_total_with_vat_words: grandTotal != null ? amountToWords(grandTotal) : "",
    grandTotalWithVatWords: grandTotal != null ? amountToWords(grandTotal) : "",

    bsf_percent: String(data.bsfPercent),
    bsfPercent: String(data.bsfPercent),
    total_quantity: data.totalQuantity != null ? String(data.totalQuantity) : "",
    totalQuantity: data.totalQuantity != null ? String(data.totalQuantity) : "",
    bid_validity_days: data.bidValidityDays != null ? String(data.bidValidityDays) : "",
    bidValidityDays: data.bidValidityDays != null ? String(data.bidValidityDays) : "",

    vat_percent: String(settings.vatPercent),
    vatPercent: String(settings.vatPercent),
    bsf_min_percent: String(settings.bsfMinPercent),
    bsfMinPercent: String(settings.bsfMinPercent),
    bsf_max_percent: String(settings.bsfMaxPercent),
    bsfMaxPercent: String(settings.bsfMaxPercent),
    bsf_default_percent: String(settings.bsfDefaultPercent),
    bsfDefaultPercent: String(settings.bsfDefaultPercent),
    prebid_offset_days: String(settings.prebidOffsetDays),
    prebidOffsetDays: String(settings.prebidOffsetDays),
    completion_buffer_days: String(settings.completionBufferDays),
    completionBufferDays: String(settings.completionBufferDays),
    loa_delay_days: String(settings.loaDelayDays),
    loaDelayDays: String(settings.loaDelayDays),

    prebid_time: data.prebidTime,
    prebidTime: data.prebidTime,
    bid_submission_time: data.bidSubmissionTime,
    bidSubmissionTime: data.bidSubmissionTime,
    bid_open_time: data.bidOpenTime,
    bidOpenTime: data.bidOpenTime,

    ...spreadDatePrefix("notice", data.noticeDate),
    ...spreadDatePrefix("bid_fee_submission", data.bidFeeSubmissionDate),
    ...spreadDatePrefix("bid_open", data.bidOpenDate),
    ...spreadDatePrefix("prebid", data.prebidDate),
    ...spreadDatePrefix("bid_validity", data.bidValidityDate),
    ...spreadDatePrefix("bid_security_validity", data.bidSecurityValidityDate),
    ...spreadDatePrefix("scheduled_initiation", data.scheduledInitiationDate),
    ...spreadDatePrefix("scheduled_completion", data.scheduledCompletionDate),
    ...spreadDatePrefix("price_bid_open", data.priceBidOpenDate),
    ...spreadDatePrefix("technical_eval_sent", data.technicalEvalSentDate),
    ...spreadDatePrefix("loi_issued", data.loiIssuedDate),
    ...spreadDatePrefix("loa_issued", data.loaIssuedDate),
    ...spreadDatePrefix("loa_document", data.loaDocumentDate),
    ...spreadDatePrefix("contract_signed", data.contractSignedDate),
    ...spreadDatePrefix("contract_agreement", data.contractAgreementDate),
    ...spreadDatePrefix("evaluation_committee_sent", data.evaluationCommitteeSentDate),
    ...spreadDatePrefix("pg_validity", data.pgValidityDate),
    ...spreadDatePrefix("pdi", data.pdiDate),

    pg_amount: formatCurrencyForDocuments(data.pgAmount),
    pgAmount: formatCurrencyForDocuments(data.pgAmount),
    pg_amount_words: data.pgAmount != null ? amountToWords(data.pgAmount) : "",
    pgAmountWords: data.pgAmount != null ? amountToWords(data.pgAmount) : "",

    warranty_days: data.warrantyDays != null ? String(data.warrantyDays) : "",
    warrantyDays: data.warrantyDays != null ? String(data.warrantyDays) : "",
    cin_number: data.cinNumber ?? "",
    cinNumber: data.cinNumber ?? "",
    supplier_witness_name: data.supplierWitnessName ?? "",
    supplierWitnessName: data.supplierWitnessName ?? "",
    supplier_witness_designation: data.supplierWitnessDesignation ?? "",
    supplierWitnessDesignation: data.supplierWitnessDesignation ?? "",
    supplier_signing_authority_name: data.supplierSigningAuthorityName ?? "",
    supplierSigningAuthorityName: data.supplierSigningAuthorityName ?? "",
    supplier_signing_authority_designation: data.supplierSigningAuthorityDesignation ?? "",
    supplierSigningAuthorityDesignation: data.supplierSigningAuthorityDesignation ?? "",
    department_witness_name:
      settings.departmentWitnesses[0]?.name ?? settings.departmentWitnessName ?? "",
    departmentWitnessName:
      settings.departmentWitnesses[0]?.name ?? settings.departmentWitnessName ?? "",
    department_witness_designation:
      settings.departmentWitnesses[0]?.designation ?? settings.departmentWitnessDesignation ?? "",
    departmentWitnessDesignation:
      settings.departmentWitnesses[0]?.designation ?? settings.departmentWitnessDesignation ?? "",
    department_signing_authority_name:
      settings.departmentSigningAuthorities[0]?.name ??
      settings.departmentSigningAuthorityName ??
      "",
    departmentSigningAuthorityName:
      settings.departmentSigningAuthorities[0]?.name ??
      settings.departmentSigningAuthorityName ??
      "",
    department_signing_authority_designation:
      settings.departmentSigningAuthorities[0]?.designation ??
      settings.departmentSigningAuthorityDesignation ??
      "",
    departmentSigningAuthorityDesignation:
      settings.departmentSigningAuthorities[0]?.designation ??
      settings.departmentSigningAuthorityDesignation ??
      "",
    department_witnesses_lines: settings.departmentWitnesses
      .map((row) => `${row.name} - ${row.designation}`)
      .join("\n"),
    department_signing_authorities_lines: settings.departmentSigningAuthorities
      .map((row) => `${row.name} - ${row.designation}`)
      .join("\n"),

    bid_currency_code: data.winnerBidCurrencyCode ?? "",
    bidCurrencyCode: data.winnerBidCurrencyCode ?? "",
    bid_currency_name: data.winnerBidCurrencyName ?? "",
    bidCurrencyName: data.winnerBidCurrencyName ?? "",
    bid_currency_symbol: data.winnerBidCurrencySymbol ?? "",
    bidCurrencySymbol: data.winnerBidCurrencySymbol ?? "",
    payment_condition_code: data.paymentConditionCode ?? "",
    paymentConditionCode: data.paymentConditionCode ?? "",
    payment_condition_name: data.paymentConditionName ?? "",
    paymentConditionName: data.paymentConditionName ?? "",

    bid_amount_with_vat: formatCurrencyForDocuments(
      data.winnerBidAmountWithVat,
      data.winnerBidCurrencyCode,
    ),
    bidAmountWithVat: formatCurrencyForDocuments(
      data.winnerBidAmountWithVat,
      data.winnerBidCurrencyCode,
    ),
    bid_amount_without_vat: formatCurrencyForDocuments(
      data.winnerBidAmountWithoutVat,
      data.winnerBidCurrencyCode,
    ),
    bidAmountWithoutVat: formatCurrencyForDocuments(
      data.winnerBidAmountWithoutVat,
      data.winnerBidCurrencyCode,
    ),
    bid_amount_with_vat_words:
      data.winnerBidAmountWithVat != null ? amountToWords(data.winnerBidAmountWithVat) : "",
    bid_amount_without_vat_words:
      data.winnerBidAmountWithoutVat != null ? amountToWords(data.winnerBidAmountWithoutVat) : "",
    ...spreadDatePrefix("delivery_received", data.deliveryReceivedDate),
    ...spreadDatePrefix("prebid_acknowledged", data.prebidAcknowledgedAt),
    ...spreadDatePrefix("bid_open_acknowledged", data.bidOpenAcknowledgedAt),
    ...spreadDatePrefix("period_begun", data.periodBegunAt),
    ...spreadDatePrefix("today", today),

    ...referencePlaceholders(data.references),
    ...workDayPlaceholders(data.workDays),

    ...extra,
  };
}
