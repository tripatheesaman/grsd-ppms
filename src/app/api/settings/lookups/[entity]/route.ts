import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission } from "@/lib/security/auth-guard";

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

type RouteContext = { params: Promise<{ entity: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requireAnyPermission(request, [
      "settings.view",
      "procurement.view",
      "procurement.create",
      "procurement.edit",
    ]);
    const { entity } = await context.params;
    const model = entities[entity];
    if (!model) throw new ApiError(404, "NOT_FOUND", "Unknown entity");
    const delegate = prisma[model as keyof typeof prisma] as {
      findMany: (args: unknown) => Promise<unknown[]>;
    };
    const rows = await delegate.findMany({ orderBy: { sortOrder: "asc" } });
    return jsonOk(rows);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { entity } = await context.params;
    const model = entities[entity];
    if (!model) throw new ApiError(404, "NOT_FOUND", "Unknown entity");
    const body = await request.json();
    const delegate = prisma[model as keyof typeof prisma] as {
      create: (args: unknown) => Promise<unknown>;
    };
    const row = await delegate.create({ data: body });
    return jsonOk(row, 201);
  });
}
