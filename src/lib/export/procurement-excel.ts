import ExcelJS from "exceljs";
import { formatCurrency } from "@/lib/currency";
import { dateFromDb } from "@/lib/dates";
import { formatDualDateShort } from "@/lib/dates/display";
import type { ProcurementExportRecord } from "@/lib/export/procurement-export-load";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS } from "@/lib/procurement/workflow";
import type { ProcurementStatus } from "@prisma/client";

type WorkDayColumn = { id: string; name: string; sortOrder: number };

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const normalized = typeof value === "string" ? value : dateFromDb(value);
  return formatDualDateShort(normalized);
}

function fmtMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return formatCurrency(value);
}

function fmtBool(value: boolean | null | undefined): string {
  if (value == null) return "";
  return value ? "Yes" : "No";
}

function fmtTech(value: boolean | null | undefined): string {
  if (value == null) return "Pending";
  return value ? "Passed" : "Failed";
}

function joinParts(parts: Array<string | null | undefined>, sep = "; "): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(sep);
}

function workDayColumnKey(id: string): string {
  return `workDay_${id}`;
}

function formatBidAmountLines(
  lines: ProcurementExportRecord["bidders"][number]["bidAmountLines"],
): string {
  return lines
    .map((line) => {
      const forex =
        line.forexRate != null && Number(line.forexRate) !== 1
          ? ` @ ${line.forexRate}`
          : "";
      return `${line.amountKind}: ${line.currencyCode} ${Number(line.amount)}${forex} = NPR ${Number(line.nprAmount)}`;
    })
    .join("; ");
}

function formatPdiMembers(members: ProcurementExportRecord["pdiMembers"]): string {
  return members.map((m) => `${m.name} (${m.designation})`).join("; ");
}

function formatReferences(refs: ProcurementExportRecord["references"]): string {
  return refs
    .map((r) => `${r.referenceType?.code ?? r.typeCode}: ${r.number}`)
    .join("; ");
}

function formatBidders(bidders: ProcurementExportRecord["bidders"]): string {
  return bidders
    .map((bidder, index) => {
      const parts = [
        `Name: ${bidder.name}`,
        `Address: ${bidder.address}`,
        bidder.phone ? `Phone: ${bidder.phone}` : null,
        bidder.bidResponseDate ? `Bid response: ${fmtDate(bidder.bidResponseDate)}` : null,
        `Technical: ${fmtTech(bidder.passedTech)}`,
        `Winner: ${fmtBool(bidder.isWinner)}`,
        bidder.bidCurrencyCode || bidder.bidCurrencyName
          ? `Currency: ${bidder.bidCurrencyCode ?? bidder.bidCurrencyName}`
          : null,
        bidder.paymentConditionName || bidder.paymentConditionCode
          ? `Payment: ${bidder.paymentConditionName ?? bidder.paymentConditionCode}`
          : null,
        bidder.bidAmountWithoutVat != null
          ? `Bid without VAT: ${fmtMoney(Number(bidder.bidAmountWithoutVat))}`
          : null,
        bidder.bidAmountWithVat != null
          ? `Bid with VAT: ${fmtMoney(Number(bidder.bidAmountWithVat))}`
          : null,
        bidder.bidAmountLines.length > 0
          ? `Bid lines: ${formatBidAmountLines(bidder.bidAmountLines)}`
          : null,
        bidder.fieldValues.length > 0
          ? `Custom fields: ${bidder.fieldValues.map((f) => `${f.fieldLabel}: ${f.value}`).join(", ")}`
          : null,
      ];
      return `Bidder ${index + 1}: ${joinParts(parts)}`;
    })
    .join(" || ");
}

function formatAllBidAmountLines(bidders: ProcurementExportRecord["bidders"]): string {
  return bidders
    .flatMap((bidder) =>
      bidder.bidAmountLines.map(
        (line) =>
          `${bidder.name} — ${line.amountKind}: ${line.currencyCode} ${Number(line.amount)}` +
          (line.forexRate != null && Number(line.forexRate) !== 1 ? ` @ ${line.forexRate}` : "") +
          ` = NPR ${Number(line.nprAmount)}`,
      ),
    )
    .join("; ");
}

function formatWorkflowFields(fields: ProcurementExportRecord["workflowFieldValues"]): string {
  return fields
    .map((field) => `${field.field.stageKey} / ${field.field.label}: ${field.value}`)
    .join("; ");
}

function formatGeneratedDocuments(docs: ProcurementExportRecord["generatedDocuments"]): string {
  return docs
    .map(
      (doc) =>
        `${doc.templateType ?? "Document"}${doc.templateName ? ` (${doc.templateName})` : ""}: ${doc.filePath} [${doc.createdAt.toISOString().slice(0, 10)}]`,
    )
    .join("; ");
}

function winnerSummary(proc: ProcurementExportRecord) {
  const winner = proc.bidders.find((b) => b.isWinner);
  if (!winner) {
    return {
      winnerName: "",
      winnerCurrency: "",
      winnerPaymentCondition: "",
      winnerBidWithoutVat: "",
      winnerBidWithVat: "",
      winnerBidLines: "",
    };
  }
  return {
    winnerName: winner.name,
    winnerCurrency: winner.bidCurrencyCode ?? winner.bidCurrencyName ?? "",
    winnerPaymentCondition: winner.paymentConditionName ?? winner.paymentConditionCode ?? "",
    winnerBidWithoutVat: fmtMoney(
      winner.bidAmountWithoutVat != null ? Number(winner.bidAmountWithoutVat) : null,
    ),
    winnerBidWithVat: fmtMoney(
      winner.bidAmountWithVat != null ? Number(winner.bidAmountWithVat) : null,
    ),
    winnerBidLines: formatBidAmountLines(winner.bidAmountLines),
  };
}

function workDayEntryKey(
  entry: ProcurementExportRecord["workDayCategories"][number],
): string {
  return entry.workDayCategoryId ?? `name:${entry.categoryName}`;
}

function workDayValues(
  columns: WorkDayColumn[],
  procWorkDays: ProcurementExportRecord["workDayCategories"],
): Record<string, string> {
  const byCategoryId = new Map(
    procWorkDays.map((entry) => [workDayEntryKey(entry), String(entry.days)]),
  );
  const values: Record<string, string> = {};
  for (const column of columns) {
    values[workDayColumnKey(column.id)] = byCategoryId.get(column.id) ?? "";
  }
  return values;
}

async function resolveWorkDayColumns(records: ProcurementExportRecord[]): Promise<WorkDayColumn[]> {
  const fromDb = await prisma.workDayCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sortOrder: true },
  });

  const byId = new Map(fromDb.map((category) => [category.id, category]));

  for (const proc of records) {
    for (const entry of proc.workDayCategories) {
      const id = workDayEntryKey(entry);
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: entry.workDayCategory?.name ?? entry.categoryName,
          sortOrder: entry.workDayCategory?.sortOrder ?? 999,
        });
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function buildRow(proc: ProcurementExportRecord, workDayColumns: WorkDayColumn[]) {
  const winner = winnerSummary(proc);
  return {
    id: proc.id,
    title: proc.title,
    itemName: proc.itemName,
    dtssrNumber: proc.dtssrNumber ?? "",
    status: STATUS_LABELS[proc.status as ProcurementStatus],
    mediaOfBid: proc.mediaOfBid?.name ?? "",
    bidType: proc.bidType?.name ?? "",
    sbd: proc.sbd?.name ?? "",
    contractType: proc.contractType?.name ?? "",
    unit: proc.unit ? joinParts([proc.unit.name, proc.unit.symbol ? `(${proc.unit.symbol})` : ""]) : "",
    references: formatReferences(proc.references),
    costEstimate: fmtMoney(Number(proc.costEstimate)),
    bsfPercent: proc.bsfPercent != null ? String(Number(proc.bsfPercent)) : "",
    bidFee: fmtMoney(proc.bidFee != null ? Number(proc.bidFee) : null),
    bidSecurity: fmtMoney(proc.bidSecurity != null ? Number(proc.bidSecurity) : null),
    grandTotalWithVat: fmtMoney(
      proc.grandTotalWithVat != null ? Number(proc.grandTotalWithVat) : null,
    ),
    totalQuantity: proc.totalQuantity != null ? String(Number(proc.totalQuantity)) : "",
    noticeDate: fmtDate(proc.noticeDate),
    prebidDate: fmtDate(proc.prebidDate),
    prebidTime: proc.prebidTime,
    bidFeeSubmissionDate: fmtDate(proc.bidFeeSubmissionDate),
    bidOpenDate: fmtDate(proc.bidOpenDate),
    bidSubmissionTime: proc.bidSubmissionTime,
    bidOpenTime: proc.bidOpenTime,
    bidValidityDays: proc.bidValidityDays != null ? String(proc.bidValidityDays) : "",
    bidValidityDate: fmtDate(proc.bidValidityDate),
    bidSecurityValidityDate: fmtDate(proc.bidSecurityValidityDate),
    scheduledInitiationDate: fmtDate(proc.scheduledInitiationDate),
    scheduledCompletionDate: fmtDate(proc.scheduledCompletionDate),
    prebidAcknowledgedAt: fmtDate(proc.prebidAcknowledgedAt),
    bidOpenAcknowledgedAt: fmtDate(proc.bidOpenAcknowledgedAt),
    priceBidOpenDate: fmtDate(proc.priceBidOpenDate),
    priceBidAcknowledgedAt: fmtDate(proc.priceBidAcknowledgedAt),
    technicalEvalSentDate: fmtDate(proc.technicalEvalSentDate),
    evaluationCommitteeSentDate: fmtDate(proc.evaluationCommitteeSentDate),
    loiIssuedDate: fmtDate(proc.loiIssuedDate),
    loaDocumentDate: fmtDate(proc.loaDocumentDate),
    loaIssuedDate: fmtDate(proc.loaIssuedDate),
    pgAmount: fmtMoney(proc.pgAmount != null ? Number(proc.pgAmount) : null),
    pgValidityDate: fmtDate(proc.pgValidityDate),
    warrantyDays: proc.warrantyDays != null ? String(proc.warrantyDays) : "",
    cinNumber: proc.cinNumber ?? "",
    supplierWitnessName: proc.supplierWitnessName ?? "",
    supplierWitnessDesignation: proc.supplierWitnessDesignation ?? "",
    supplierSigningAuthorityName: proc.supplierSigningAuthorityName ?? "",
    supplierSigningAuthorityDesignation: proc.supplierSigningAuthorityDesignation ?? "",
    contractAgreementDate: fmtDate(proc.contractAgreementDate),
    contractSignedDate: fmtDate(proc.contractSignedDate),
    poIssueDate: fmtDate(proc.poIssueDate),
    pdiDate: fmtDate(proc.pdiDate),
    pdiEndDate: fmtDate(proc.pdiEndDate),
    pdiMembers: formatPdiMembers(proc.pdiMembers),
    ...workDayValues(workDayColumns, proc.workDayCategories),
    workCountdownTotalDays:
      proc.workCountdownTotalDays != null ? String(proc.workCountdownTotalDays) : "",
    contractElapsedDays: String(proc.contractElapsedDays ?? 0),
    deliveryReceivedDate: fmtDate(proc.deliveryReceivedDate),
    periodBegunAt: fmtDate(proc.periodBegunAt),
    bidderCount: String(proc.bidders.length),
    activeBidderCount: String(proc.bidders.filter((b) => b.passedTech !== false).length),
    bidders: formatBidders(proc.bidders),
    bidAmountLines: formatAllBidAmountLines(proc.bidders),
    customWorkflowFields: formatWorkflowFields(proc.workflowFieldValues),
    generatedDocuments: formatGeneratedDocuments(proc.generatedDocuments),
    ...winner,
    sourceProcurementId: proc.sourceProcurementId ?? "",
    settingsSnapshotAt: proc.settingsSnapshotAt?.toISOString().slice(0, 10) ?? "",
    createdAt: proc.createdAt.toISOString().slice(0, 10),
    updatedAt: proc.updatedAt.toISOString().slice(0, 10),
  };
}

const BASE_COLUMNS: Array<{ header: string; key: string; width?: number }> = [
  { header: "ID", key: "id", width: 28 },
  { header: "Title", key: "title", width: 34 },
  { header: "Item", key: "itemName", width: 28 },
  { header: "DTSSR", key: "dtssrNumber", width: 14 },
  { header: "Status", key: "status", width: 24 },
  { header: "Media of bid", key: "mediaOfBid", width: 18 },
  { header: "Bid type", key: "bidType", width: 18 },
  { header: "SBD", key: "sbd", width: 14 },
  { header: "Contract type", key: "contractType", width: 18 },
  { header: "Unit", key: "unit", width: 14 },
  { header: "References", key: "references", width: 30 },
  { header: "Cost estimate", key: "costEstimate", width: 16 },
  { header: "BSF %", key: "bsfPercent", width: 10 },
  { header: "Bid fee", key: "bidFee", width: 14 },
  { header: "Bid security", key: "bidSecurity", width: 14 },
  { header: "Grand total with VAT", key: "grandTotalWithVat", width: 18 },
  { header: "Total quantity", key: "totalQuantity", width: 14 },
  { header: "Notice date", key: "noticeDate", width: 22 },
  { header: "Pre-bid date", key: "prebidDate", width: 22 },
  { header: "Pre-bid time", key: "prebidTime", width: 12 },
  { header: "Bid fee submission", key: "bidFeeSubmissionDate", width: 22 },
  { header: "Bid open date", key: "bidOpenDate", width: 22 },
  { header: "Bid submission time", key: "bidSubmissionTime", width: 14 },
  { header: "Bid open time", key: "bidOpenTime", width: 12 },
  { header: "Bid validity days", key: "bidValidityDays", width: 14 },
  { header: "Bid validity date", key: "bidValidityDate", width: 22 },
  { header: "Bid security validity", key: "bidSecurityValidityDate", width: 22 },
  { header: "Scheduled initiation", key: "scheduledInitiationDate", width: 22 },
  { header: "Scheduled completion", key: "scheduledCompletionDate", width: 22 },
  { header: "Pre-bid held (recorded)", key: "prebidAcknowledgedAt", width: 22 },
  { header: "Bid opened (recorded)", key: "bidOpenAcknowledgedAt", width: 22 },
  { header: "Price bid open", key: "priceBidOpenDate", width: 22 },
  { header: "Price bid opened (recorded)", key: "priceBidAcknowledgedAt", width: 22 },
  { header: "Technical eval sent", key: "technicalEvalSentDate", width: 22 },
  { header: "Committee eval sent", key: "evaluationCommitteeSentDate", width: 22 },
  { header: "LOI issued", key: "loiIssuedDate", width: 22 },
  { header: "LOA document date", key: "loaDocumentDate", width: 22 },
  { header: "LOA issued", key: "loaIssuedDate", width: 22 },
  { header: "PG amount", key: "pgAmount", width: 14 },
  { header: "PG validity", key: "pgValidityDate", width: 22 },
  { header: "Warranty days", key: "warrantyDays", width: 12 },
  { header: "CIN number", key: "cinNumber", width: 16 },
  { header: "Supplier witness", key: "supplierWitnessName", width: 20 },
  { header: "Supplier witness designation", key: "supplierWitnessDesignation", width: 22 },
  { header: "Supplier signing authority", key: "supplierSigningAuthorityName", width: 22 },
  { header: "Supplier signing designation", key: "supplierSigningAuthorityDesignation", width: 24 },
  { header: "Contract agreement date", key: "contractAgreementDate", width: 22 },
  { header: "Contract signed", key: "contractSignedDate", width: 22 },
  { header: "PO issue date", key: "poIssueDate", width: 22 },
  { header: "PDI start", key: "pdiDate", width: 22 },
  { header: "PDI end", key: "pdiEndDate", width: 22 },
  { header: "PDI members", key: "pdiMembers", width: 30 },
];

const AFTER_WORK_DAY_COLUMNS: Array<{ header: string; key: string; width?: number }> = [
  { header: "Work countdown total days", key: "workCountdownTotalDays", width: 18 },
  { header: "Contract elapsed days", key: "contractElapsedDays", width: 18 },
  { header: "Delivery received", key: "deliveryReceivedDate", width: 22 },
  { header: "Period begun", key: "periodBegunAt", width: 22 },
  { header: "Bidder count", key: "bidderCount", width: 12 },
  { header: "Active bidder count", key: "activeBidderCount", width: 16 },
  { header: "Bidders", key: "bidders", width: 50 },
  { header: "Bid amount lines", key: "bidAmountLines", width: 50 },
  { header: "Custom workflow fields", key: "customWorkflowFields", width: 40 },
  { header: "Generated documents", key: "generatedDocuments", width: 40 },
  { header: "Winner", key: "winnerName", width: 24 },
  { header: "Winner currency", key: "winnerCurrency", width: 14 },
  { header: "Winner payment condition", key: "winnerPaymentCondition", width: 22 },
  { header: "Winner bid without VAT", key: "winnerBidWithoutVat", width: 18 },
  { header: "Winner bid with VAT", key: "winnerBidWithVat", width: 18 },
  { header: "Winner bid lines", key: "winnerBidLines", width: 40 },
  { header: "Source procurement ID", key: "sourceProcurementId", width: 28 },
  { header: "Settings snapshot at", key: "settingsSnapshotAt", width: 18 },
  { header: "Created at", key: "createdAt", width: 14 },
  { header: "Updated at", key: "updatedAt", width: 14 },
];

function buildColumns(workDayColumns: WorkDayColumn[]) {
  const workDaySheetColumns = workDayColumns.map((category) => ({
    header: `${category.name} (days)`,
    key: workDayColumnKey(category.id),
    width: 14,
  }));
  return [...BASE_COLUMNS, ...workDaySheetColumns, ...AFTER_WORK_DAY_COLUMNS];
}

export async function buildProcurementWorkbook(records: ProcurementExportRecord[]): Promise<Buffer> {
  const workDayColumns = await resolveWorkDayColumns(records);
  const columns = buildColumns(workDayColumns);
  const rows = records.map((proc) => buildRow(proc, workDayColumns));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GRSD PPMS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Procurements");
  sheet.columns = columns;
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  for (const row of rows) sheet.addRow(row);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
