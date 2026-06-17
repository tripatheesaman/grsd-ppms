import { DocumentTemplateType } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { buildBidderLetterPlaceholders } from "@/lib/documents/bidder-letter-placeholders";
import { generateDocxFromTemplate } from "@/lib/documents/generator";
import { buildProcurementDocData } from "@/lib/documents/procurement-doc-data";
import type { serializeProcurement } from "@/lib/procurement/service";
import {
  loadLetterDefaultCcLines,
  loadProcurementSettings,
} from "@/lib/procurement/settings-snapshot";
import {
  recordGeneratedDocument,
  resolveDocumentTemplateForProcurement,
} from "@/lib/procurement/snapshot-resolve";

const CC_LETTER_TYPES = new Set<DocumentTemplateType>(["LOI_PASS", "LOI_FAIL", "LOI_WINNER"]);

export type SerializedProcurement = NonNullable<Awaited<ReturnType<typeof serializeProcurement>>>;

export async function generateBidderLetterForProcurement(
  procurementId: string,
  proc: SerializedProcurement,
  templateType: DocumentTemplateType,
  bidderId: string,
): Promise<{ filePath: string; templateId: string | null }> {
  const template = await resolveDocumentTemplateForProcurement(
    procurementId,
    templateType,
    proc.bidTypeId,
  );
  if (!template) {
    throw new ApiError(
      404,
      "NOT_FOUND",
      `No ${templateType} template found for this procurement (check saved snapshot or upload a template)`,
    );
  }

  const settings = await loadProcurementSettings(procurementId);
  const defaultCcLines = await loadLetterDefaultCcLines(procurementId);
  const docData = await buildProcurementDocData(procurementId, proc);

  const withCc = CC_LETTER_TYPES.has(templateType);
  type BidderRow = {
    id: string;
    name: string;
    address: string;
    phone?: string | null;
    passedTech?: boolean | null;
  };
  const allBidders = proc.bidders as BidderRow[];
  const ccSource =
    templateType === "LOI_WINNER"
      ? allBidders.filter((b) => b.passedTech === true)
      : allBidders;
  const extra = buildBidderLetterPlaceholders(ccSource, bidderId, {
    withCc,
    defaultCcLines,
  });

  if (!extra.bidder_name) {
    throw new ApiError(404, "NOT_FOUND", "Bidder not found on this procurement");
  }

  const filePath = await generateDocxFromTemplate(template.filePath, docData, settings, extra);

  await recordGeneratedDocument({ procurementId, template, filePath });

  return { filePath, templateId: template.id };
}
