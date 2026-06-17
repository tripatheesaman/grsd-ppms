import ExcelJS from "exceljs";
import { formatCurrency } from "@/lib/currency";
import { STATUS_LABELS } from "@/lib/procurement/workflow";
import { dateFromDb } from "@/lib/dates";
import { formatDualDateShort } from "@/lib/dates/display";
import type { ProcurementStatus } from "@prisma/client";

export type ProcurementExportRow = {
  id: string;
  title: string;
  itemName: string;
  status: ProcurementStatus;
  costEstimate: number;
  noticeDate: Date | null;
  bidOpenDate: Date | null;
  bidType?: { name: string } | null;
};

export async function buildProcurementWorkbook(rows: ProcurementExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Procurements");
  sheet.columns = [
    { header: "ID", key: "id", width: 28 },
    { header: "Title", key: "title", width: 40 },
    { header: "Item", key: "itemName", width: 30 },
    { header: "Status", key: "status", width: 22 },
    { header: "Bid Type", key: "bidType", width: 20 },
    { header: "Cost Estimate", key: "costEstimate", width: 18 },
    { header: "Notice Date (AD · BS)", key: "noticeDate", width: 28 },
    { header: "Bid Open Date (AD · BS)", key: "bidOpenDate", width: 28 },
  ];
  for (const row of rows) {
    sheet.addRow({
      id: row.id,
      title: row.title,
      itemName: row.itemName,
      status: STATUS_LABELS[row.status],
      bidType: row.bidType?.name ?? "",
      costEstimate: formatCurrency(Number(row.costEstimate)),
      noticeDate: formatDualDateShort(dateFromDb(row.noticeDate)),
      bidOpenDate: formatDualDateShort(dateFromDb(row.bidOpenDate)),
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
