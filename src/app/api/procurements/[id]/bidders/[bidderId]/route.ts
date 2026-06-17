import { NextRequest } from "next/server";
import { ProcurementStatus } from "@prisma/client";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { dateOnlyToDb } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/security/auth-guard";

const BIDDER_ENTRY_STATUSES: ProcurementStatus[] = [
  ProcurementStatus.BID_OPEN_DAY,
  ProcurementStatus.BID_CLOSED,
  ProcurementStatus.BIDDERS_ENTERED,
];

const updateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().optional().nullable(),
  bidResponseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid bid response date"),
});

type RouteContext = { params: Promise<{ id: string; bidderId: string }> };

async function assertBidderEditable(procurementId: string, bidderId: string) {
  const proc = await prisma.procurement.findUnique({ where: { id: procurementId } });
  if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
  if (!BIDDER_ENTRY_STATUSES.includes(proc.status)) {
    throw new ApiError(
      400,
      "INVALID_STATE",
      "Bidders can only be changed before technical evaluation begins",
    );
  }

  const bidder = await prisma.bidder.findFirst({
    where: { id: bidderId, procurementId },
  });
  if (!bidder) throw new ApiError(404, "NOT_FOUND", "Bidder not found");

  return { proc, bidder };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.transition");
    const { id, bidderId } = await context.params;
    await assertBidderEditable(id, bidderId);
    const body = updateSchema.parse(await request.json());

    const updated = await prisma.bidder.update({
      where: { id: bidderId },
      data: {
        name: body.name.trim(),
        address: body.address.trim(),
        phone: body.phone?.trim() || null,
        bidResponseDate: dateOnlyToDb(body.bidResponseDate),
      },
    });

    return jsonOk({
      id: updated.id,
      name: updated.name,
      address: updated.address,
      phone: updated.phone,
      bidResponseDate: body.bidResponseDate,
    });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.transition");
    const { id, bidderId } = await context.params;
    await assertBidderEditable(id, bidderId);

    await prisma.bidder.delete({ where: { id: bidderId } });

    const bidderCount = await prisma.bidder.count({ where: { procurementId: id } });
    if (bidderCount === 0 && (await prisma.procurement.findUnique({ where: { id } }))?.status === ProcurementStatus.BIDDERS_ENTERED) {
      await prisma.procurement.update({
        where: { id },
        data: { status: ProcurementStatus.BID_CLOSED },
      });
    }

    return jsonOk({ success: true, bidderCount });
  });
}
