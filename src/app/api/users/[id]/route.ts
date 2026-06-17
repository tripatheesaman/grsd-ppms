import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "users.manage");
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "User not found");
    if (existing.role === Role.SUPERADMIN && body.role && body.role !== Role.SUPERADMIN) {
      throw new ApiError(400, "VALIDATION_ERROR", "Cannot change superadmin role");
    }
    const data: Record<string, unknown> = { ...body };
    if (body.password) data.passwordHash = await hash(body.password, 12);
    delete data.password;
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });
    return jsonOk(user);
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    const actor = await requirePermission(request, "users.manage");
    const { id } = await context.params;

    if (actor.id === id) {
      throw new ApiError(400, "VALIDATION_ERROR", "You cannot delete your own account");
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "User not found");
    if (existing.role === Role.SUPERADMIN) {
      throw new ApiError(400, "VALIDATION_ERROR", "Superadmin account cannot be deleted");
    }

    await prisma.userPermission.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    return jsonOk({ success: true });
  });
}
