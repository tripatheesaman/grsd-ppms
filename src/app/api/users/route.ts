import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { parsePagination, paginationMeta } from "@/lib/api/pagination";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  role: z.nativeEnum(Role).refine((r) => r !== Role.SUPERADMIN, "Cannot create superadmin"),
});

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "users.view");
    const params = parsePagination(request.nextUrl.searchParams);
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const where = search
      ? {
          OR: [{ email: { contains: search } }, { fullName: { contains: search } }],
        }
      : {};
    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);
    return jsonOk({ data: rows, meta: paginationMeta(total, params) });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "users.manage");
    const body = createSchema.parse(await request.json());
    const passwordHash = await hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        fullName: body.fullName,
        passwordHash,
        role: body.role,
      },
      select: { id: true, email: true, fullName: true, role: true, isActive: true },
    });
    return jsonOk(user, 201);
  });
}
