import type { DocumentTemplate, DocumentTemplateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Prefer bid-type template, then optional default (bidTypeId null). */
export async function resolveActiveDocumentTemplate(
  type: DocumentTemplateType,
  bidTypeId: string | null,
): Promise<DocumentTemplate | null> {
  if (bidTypeId) {
    const specific = await prisma.documentTemplate.findFirst({
      where: { type, bidTypeId, isActive: true },
      orderBy: { version: "desc" },
    });
    if (specific) return specific;
  }

  return prisma.documentTemplate.findFirst({
    where: { type, bidTypeId: null, isActive: true },
    orderBy: { version: "desc" },
  });
}
