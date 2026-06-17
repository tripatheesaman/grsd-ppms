import { NextRequest } from "next/server";
import { ProcurementStatus } from "@prisma/client";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { transitionProcurement } from "@/lib/procurement/service";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.object({
  status: z.nativeEnum(ProcurementStatus),
  payload: z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.transition");
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const result = await transitionProcurement(id, body.status, user.id, body.payload);
    return jsonOk(result);
  });
}
