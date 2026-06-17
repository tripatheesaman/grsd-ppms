import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const schema = z.object({
  host: z.string().min(1),
  port: z.number().int(),
  secure: z.boolean(),
  username: z.string(),
  password: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
});

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.view");
    const row = await prisma.smtpSetting.findFirst({ where: { isActive: true } });
    if (!row) return jsonOk(null);
    return jsonOk({ ...row, password: "********" });
  });
}

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "settings.manage");
    const body = schema.parse(await request.json());
    const current = await prisma.smtpSetting.findFirst({ where: { isActive: true } });
    const password = body.password?.trim() ? body.password : current?.password;
    if (!password) {
      throw new ApiError(400, "VALIDATION_ERROR", "SMTP password is required");
    }
    await prisma.smtpSetting.updateMany({ data: { isActive: false } });
    const row = await prisma.smtpSetting.create({
      data: {
        host: body.host,
        port: body.port,
        secure: body.secure,
        username: body.username,
        password,
        fromEmail: body.fromEmail,
        fromName: body.fromName,
        isActive: true,
      },
    });
    return jsonOk({ ...row, password: "********" });
  });
}
