import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.transition");
    const { id } = await context.params;
    const body = z.object({ bidderId: z.string() }).parse(await request.json());

    const bidder = await prisma.bidder.findFirst({
      where: { id: body.bidderId, procurementId: id, passedTech: true },
    });
    if (!bidder) throw new ApiError(400, "VALIDATION_ERROR", "Invalid winner bidder");

    await prisma.bidder.updateMany({
      where: { procurementId: id },
      data: { isWinner: false },
    });
    await prisma.bidder.update({
      where: { id: body.bidderId },
      data: { isWinner: true },
    });
    await prisma.procurement.update({
      where: { id },
      data: { status: "WINNER_SELECTED" },
    });

    return jsonOk({ success: true });
  });
}
