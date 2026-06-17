import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { saveProcurementPreContractDetails } from "@/lib/procurement/service";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.object({
  cinNumber: z.string().trim().min(1, "CIN number is required"),
  supplierWitnessName: z.string().trim().min(1, "Supplier witness name is required"),
  supplierWitnessDesignation: z.string().trim().min(1, "Supplier witness designation is required"),
  supplierSigningAuthorityName: z.string().trim().min(1, "Supplier signing authority name is required"),
  supplierSigningAuthorityDesignation: z
    .string()
    .trim()
    .min(1, "Supplier signing authority designation is required"),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const user = await requirePermission(request, "procurement.transition");
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const result = await saveProcurementPreContractDetails(id, body, user.id);
    return jsonOk(result);
  });
}
