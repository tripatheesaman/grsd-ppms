import { NextRequest } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/security/auth-guard";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireAuth(request);
    const body = schema.parse(await request.json());
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new ApiError(404, "NOT_FOUND", "User not found");
    const valid = await compare(body.currentPassword, dbUser.passwordHash);
    if (!valid) throw new ApiError(400, "VALIDATION_ERROR", "Current password is incorrect");
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(body.newPassword, 12) },
    });
    return jsonOk({ success: true });
  });
}
