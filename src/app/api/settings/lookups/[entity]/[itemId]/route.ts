import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const entities: Record<string, keyof typeof prisma> = {
  "reference-types": "referenceType",
  "media-of-bid": "mediaOfBid",
  "bid-types": "bidType",
  sbd: "sbd",
  "contract-types": "contractType",
  units: "unit",
  currencies: "currency",
  "payment-conditions": "paymentCondition",
  "work-day-categories": "workDayCategory",
  "bidder-fields": "bidderFieldDefinition",
};

type RouteContext = { params: Promise<{ entity: string; itemId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { entity, itemId } = await context.params;
    const model = entities[entity];
    if (!model) throw new ApiError(404, "NOT_FOUND", "Unknown entity");
    const body = await request.json();
    const delegate = prisma[model as keyof typeof prisma] as {
      update: (args: unknown) => Promise<unknown>;
    };
    const row = await delegate.update({ where: { id: itemId }, data: body });
    return jsonOk(row);
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { entity, itemId } = await context.params;
    const model = entities[entity];
    if (!model) throw new ApiError(404, "NOT_FOUND", "Unknown entity");
    const delegate = prisma[model as keyof typeof prisma] as {
      delete: (args: unknown) => Promise<unknown>;
    };
    await delegate.delete({ where: { id: itemId } });
    return jsonOk({ success: true });
  });
}
