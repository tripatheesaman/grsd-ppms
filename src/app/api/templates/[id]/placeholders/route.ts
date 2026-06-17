import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.array(
  z.object({
    token: z.string(),
    resolverKey: z.string(),
    sortOrder: z.number().int(),
  }),
);

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "templates.manage");
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    await prisma.templatePlaceholder.deleteMany({ where: { templateId: id } });
    await prisma.templatePlaceholder.createMany({
      data: body.map((p) => ({ templateId: id, ...p })),
    });
    return jsonOk({ success: true });
  });
}
