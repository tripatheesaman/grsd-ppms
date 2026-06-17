import { NextRequest } from "next/server";

import { DocumentTemplateType } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { generateBidderLetterForProcurement } from "@/lib/documents/generate-bidder-letter";
import { generateDocxFromTemplate } from "@/lib/documents/generator";
import { buildProcurementDocData } from "@/lib/documents/procurement-doc-data";
import { serializeProcurement } from "@/lib/procurement/service";
import { requirePermission } from "@/lib/security/auth-guard";
import { loadProcurementSettings } from "@/lib/procurement/settings-snapshot";
import {
  recordGeneratedDocument,
  resolveDocumentTemplateForProcurement,
} from "@/lib/procurement/snapshot-resolve";
import { UPLOADS_BASE_URL } from "@/lib/config/app-config";

const typeMap: Record<string, DocumentTemplateType> = {
  notice: "NOTICE",
  "loi-pass": "LOI_PASS",
  "loi-fail": "LOI_FAIL",
  "loi-winner": "LOI_WINNER",
  loa: "LOA",
  contract: "CONTRACT",
};

const BIDDER_LETTER_TYPES = new Set<DocumentTemplateType>([
  "LOI_PASS",
  "LOI_FAIL",
  "LOI_WINNER",
]);

type RouteContext = { params: Promise<{ id: string; type: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.transition");
    const { id, type } = await context.params;
    const templateType = typeMap[type];
    if (!templateType) throw new ApiError(400, "VALIDATION_ERROR", "Invalid document type");

    const proc = await serializeProcurement(id);
    if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
    if (
      templateType === "CONTRACT" &&
      (!proc.cinNumber ||
        !proc.supplierWitnessName ||
        !proc.supplierWitnessDesignation ||
        !proc.supplierSigningAuthorityName ||
        !proc.supplierSigningAuthorityDesignation)
    ) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Enter CIN, supplier witness, and supplier signing authority details before generating contract",
      );
    }

    const bidderId = request.nextUrl.searchParams.get("bidderId");
    if (BIDDER_LETTER_TYPES.has(templateType) && !bidderId) {
      throw new ApiError(400, "VALIDATION_ERROR", "bidderId is required for this document type");
    }

    let filePath: string;
    if (bidderId) {
      const result = await generateBidderLetterForProcurement(id, proc, templateType, bidderId);
      filePath = result.filePath;
    } else {
      const template = await resolveDocumentTemplateForProcurement(
        id,
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
      const settings = await loadProcurementSettings(id);
      const docData = await buildProcurementDocData(id, proc);
      filePath = await generateDocxFromTemplate(template.filePath, docData, settings);
      await recordGeneratedDocument({ procurementId: id, template, filePath });
    }

    return jsonOk({
      filePath,
      downloadUrl: `${UPLOADS_BASE_URL}/${filePath}`,
    });
  });
}
