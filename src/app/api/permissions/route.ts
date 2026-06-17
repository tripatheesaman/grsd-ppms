import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "users.manage");
    return jsonOk(await prisma.permission.findMany({ orderBy: { key: "asc" } }));
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "users.manage");
    const body = z
      .object({
        role: z.nativeEnum(Role),
        permissions: z.array(z.object({ permissionId: z.string(), allowed: z.boolean() })),
      })
      .parse(await request.json());

    for (const item of body.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: { role: body.role, permissionId: item.permissionId },
        },
        update: { allowed: item.allowed },
        create: { role: body.role, permissionId: item.permissionId, allowed: item.allowed },
      });
    }
    return jsonOk({ success: true });
  });
}
