import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.object({
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  label: z.string().min(1).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const row = await prisma.publicHoliday.update({
      where: { id },
      data: body,
    });
    return jsonOk(row);
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const { id } = await context.params;
    await prisma.publicHoliday.delete({ where: { id } });
    return jsonOk({ success: true });
  });
}
