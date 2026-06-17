import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import {
  createOrUpdateProcurement,
  deleteProcurement,
  serializeProcurement,
} from "@/lib/procurement/service";
import { requirePermission } from "@/lib/security/auth-guard";

const optionalId = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const updateSchema = z.object({
  title: z.string().min(1),
  itemName: z.string().min(1),
  dtssrNumber: z.union([z.string(), z.null()]).optional().transform((v) => v?.trim() || null),
  mediaOfBidId: optionalId,
  bidTypeId: z.string().min(1),
  sbdId: optionalId,
  contractTypeId: optionalId,
  unitId: optionalId,
  costEstimate: z.coerce.number().positive(),
  bsfPercent: z.coerce.number().min(0).max(100),
  totalQuantity: z.coerce.number().optional().nullable(),
  noticeDate: z.string(),
  scheduledInitiationDate: z.string().optional().nullable(),
  prebidTime: z.string().optional(),
  bidSubmissionTime: z.string().optional(),
  bidOpenTime: z.string().optional(),
  references: z
    .array(z.object({ referenceTypeId: z.string(), number: z.string() }))
    .min(1),
  workDays: z
    .array(z.object({ workDayCategoryId: z.string(), days: z.number().int().min(0) }))
    .optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.view");
    const { id } = await context.params;
    const result = await serializeProcurement(id);
    if (!result) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
    return jsonOk(result);
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.edit");
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const result = await createOrUpdateProcurement(body, user.id, id);
    return jsonOk(result);
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.delete");
    const { id } = await context.params;
    return jsonOk(await deleteProcurement(id, user.id));
  });
}
