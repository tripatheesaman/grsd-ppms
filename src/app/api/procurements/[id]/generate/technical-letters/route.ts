import { NextRequest } from "next/server";
import { DocumentTemplateType } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { UPLOADS_BASE_URL } from "@/lib/config/app-config";
import { generateBidderLetterForProcurement } from "@/lib/documents/generate-bidder-letter";
import {
  countTechnicalLetterGenerations,
  planTechnicalLetterGenerations,
} from "@/lib/documents/technical-letters";
import { safeArchiveName, zipUploadFiles } from "@/lib/documents/zip-uploads";
import { serializeProcurement } from "@/lib/procurement/service";
import { requirePermission } from "@/lib/security/auth-guard";

const JOB_TYPE_MAP: Record<"loi-pass" | "loi-fail", DocumentTemplateType> = {
  "loi-pass": "LOI_PASS",
  "loi-fail": "LOI_FAIL",
};

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.transition");

    const { id } = await context.params;
    const proc = await serializeProcurement(id);
    if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");

    const technicalBidders = proc.bidders.map((b) => ({
      id: String(b.id),
      passedTech: b.passedTech,
    }));
    const jobs = planTechnicalLetterGenerations(technicalBidders);
    const counts = countTechnicalLetterGenerations(technicalBidders);

    if (jobs.length === 0) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Set technical pass/fail results for every bidder before generating letters",
      );
    }

    const bidderById = new Map(proc.bidders.map((b) => [String(b.id), b]));
    const zipEntries: { filePath: string; archiveName: string }[] = [];

    for (const job of jobs) {
      const bidder = bidderById.get(job.bidderId);
      const safeName = safeArchiveName(bidder?.name ?? job.bidderId);
      const prefix = job.documentType === "loi-pass" ? "LOI-pass" : "Rejection";
      const templateType = JOB_TYPE_MAP[job.documentType];

      const { filePath } = await generateBidderLetterForProcurement(
        id,
        proc,
        templateType,
        job.bidderId,
      );

      zipEntries.push({
        filePath,
        archiveName: `${prefix}-${safeName}.docx`,
      });
    }

    const zipPath = await zipUploadFiles(zipEntries);

    return jsonOk({
      filePath: zipPath,
      downloadUrl: `${UPLOADS_BASE_URL}/${zipPath}`,
      counts,
    });
  });
}
