import { NextRequest } from "next/server";
import { ProcurementStatus } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { dateOnlyToDb } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  assertWorkflowDateRules,
  validateBidderEntry,
  validateBidderFinalize,
} from "@/lib/procurement/workflow-date-validation";
import { requirePermission } from "@/lib/security/auth-guard";

const BIDDER_ENTRY_STATUSES: ProcurementStatus[] = [
  ProcurementStatus.BID_OPEN_DAY,
  ProcurementStatus.BID_CLOSED,
  ProcurementStatus.BIDDERS_ENTERED,
];

const schema = z.object({
  bidders: z.array(
    z.object({
      name: z.string().min(1),
      address: z.string().min(1),
      phone: z.string().optional().nullable(),
      bidResponseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid bid response date"),
      fieldValues: z.array(z.object({ fieldId: z.string(), value: z.string() })).optional(),
    }),
  ),
  finalize: z.boolean().optional(),
  replaceAll: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.transition");
    const { id } = await context.params;
    const proc = await prisma.procurement.findUnique({ where: { id } });
    if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");

    if (!BIDDER_ENTRY_STATUSES.includes(proc.status)) {
      throw new ApiError(
        400,
        "INVALID_STATE",
        "Bidders can only be recorded after the bid is opened or closed",
      );
    }

    const body = schema.parse(await request.json());
    if (body.bidders.length === 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "At least one bidder is required");
    }

    await assertWorkflowDateRules(proc, validateBidderEntry(proc));

    if (body.replaceAll) {
      await prisma.bidder.deleteMany({ where: { procurementId: id } });
    }

    for (const bidder of body.bidders) {
      const created = await prisma.bidder.create({
        data: {
          procurementId: id,
          name: bidder.name,
          address: bidder.address,
          phone: bidder.phone,
          bidResponseDate: dateOnlyToDb(bidder.bidResponseDate),
        },
      });
      if (bidder.fieldValues?.length) {
        const fieldIds = bidder.fieldValues.map((fv) => fv.fieldId);
        const definitions = await prisma.bidderFieldDefinition.findMany({
          where: { id: { in: fieldIds } },
          select: { id: true, key: true, label: true },
        });
        const defMap = new Map(definitions.map((d) => [d.id, d]));
        await prisma.bidderFieldValue.createMany({
          data: bidder.fieldValues.map((fv) => {
            const def = defMap.get(fv.fieldId);
            return {
              bidderId: created.id,
              fieldId: fv.fieldId,
              fieldKey: def?.key ?? fv.fieldId,
              fieldLabel: def?.label ?? "Field",
              value: fv.value,
            };
          }),
        });
      }
    }

    const bidderCount = await prisma.bidder.count({ where: { procurementId: id } });
    let nextStatus = proc.status;
    if (body.finalize) {
      if (bidderCount === 0) {
        throw new ApiError(400, "VALIDATION_ERROR", "Add at least one bidder before finishing");
      }
      await assertWorkflowDateRules(proc, validateBidderFinalize(proc));
      nextStatus = ProcurementStatus.BIDDERS_ENTERED;
    } else if (proc.status === ProcurementStatus.BID_OPEN_DAY) {
      nextStatus = ProcurementStatus.BID_CLOSED;
    }

    await prisma.procurement.update({
      where: { id },
      data: { status: nextStatus },
    });

    return jsonOk({ success: true, status: nextStatus, bidderCount });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.transition");
    const { id } = await context.params;
    const proc = await prisma.procurement.findUnique({ where: { id } });
    if (!proc) throw new ApiError(404, "NOT_FOUND", "Procurement not found");
    if (proc.status !== ProcurementStatus.TECHNICAL_EVAL) {
      throw new ApiError(
        400,
        "INVALID_STATE",
        "Technical results can only be recorded during technical evaluation",
      );
    }

    const body = z
      .object({
        results: z
          .array(z.object({ bidderId: z.string(), passed: z.boolean() }))
          .min(1),
      })
      .parse(await request.json());

    const bidderIds = await prisma.bidder.findMany({
      where: { procurementId: id },
      select: { id: true },
    });
    const validIds = new Set(bidderIds.map((b) => b.id));
    if (body.results.length !== bidderIds.length) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Pass or fail must be set for every bidder",
      );
    }
    for (const r of body.results) {
      if (!validIds.has(r.bidderId)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid bidder in technical results");
      }
    }

    for (const r of body.results) {
      await prisma.bidder.update({
        where: { id: r.bidderId },
        data: { passedTech: r.passed },
      });
    }

    await prisma.procurement.update({
      where: { id },
      data: { status: "TECHNICAL_DONE" },
    });

    return jsonOk({ success: true });
  });
}
