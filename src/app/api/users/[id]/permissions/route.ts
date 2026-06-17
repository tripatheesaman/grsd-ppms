import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "users.permissions.manage");
    const { id } = await context.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
    const permissions = await prisma.permission.findMany({ orderBy: { key: "asc" } });
    const overrides = await prisma.userPermission.findMany({ where: { userId: id } });
    const rolePerms = await prisma.rolePermission.findMany({ where: { role: user.role } });
    return jsonOk({
      permissions: permissions.map((p) => {
        const override = overrides.find((o) => o.permissionId === p.id);
        const rolePerm = rolePerms.find((r) => r.permissionId === p.id);
        return {
          id: p.id,
          key: p.key,
          name: p.name,
          allowed: override?.allowed ?? rolePerm?.allowed ?? false,
        };
      }),
    });
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "users.permissions.manage");
    const { id } = await context.params;
    const body = z
      .array(z.object({ permissionId: z.string(), allowed: z.boolean() }))
      .parse(await request.json());

    for (const item of body) {
      await prisma.userPermission.upsert({
        where: { userId_permissionId: { userId: id, permissionId: item.permissionId } },
        update: { allowed: item.allowed },
        create: { userId: id, permissionId: item.permissionId, allowed: item.allowed },
      });
    }
    return jsonOk({ success: true });
  });
}
