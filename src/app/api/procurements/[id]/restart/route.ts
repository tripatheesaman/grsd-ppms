import { NextRequest } from "next/server";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { restartProcurement } from "@/lib/procurement/service";
import { requirePermission } from "@/lib/security/auth-guard";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.transition");
    const { id } = await context.params;
    const result = await restartProcurement(id, user.id);
    return jsonOk(result, 201);
  });
}
