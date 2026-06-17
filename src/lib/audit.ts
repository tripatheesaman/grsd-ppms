import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function writeAudit(params: {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before as object | undefined,
      after: params.after as object | undefined,
      ipAddress: params.ipAddress,
    },
  });
}
