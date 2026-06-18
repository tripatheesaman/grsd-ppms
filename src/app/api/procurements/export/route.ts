import { NextRequest, NextResponse } from "next/server";
import { handleRoute } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";
import { buildProcurementWorkbook } from "@/lib/export/procurement-excel";
import { loadProcurementsForExport } from "@/lib/export/procurement-export-load";
import {
  buildProcurementListWhere,
  buildProcurementOrderBy,
  parseExportMode,
  parseProcurementListFilters,
} from "@/lib/procurement/list-filters";
import { requirePermission } from "@/lib/security/auth-guard";

const EXPORT_MAX_ROWS = 10000;

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requirePermission(request, "procurement.export");
    const searchParams = request.nextUrl.searchParams;
    const filters = parseProcurementListFilters(searchParams);
    const exportMode = parseExportMode(searchParams);
    const pagination = parsePagination(searchParams);

    const where = buildProcurementListWhere(filters, { exportMode });
    const orderBy = buildProcurementOrderBy(filters);

    const records = await loadProcurementsForExport(where, orderBy, {
      skip: exportMode === "page" ? pagination.skip : undefined,
      take: exportMode === "page" ? pagination.take : EXPORT_MAX_ROWS,
    });

    const buffer = await buildProcurementWorkbook(records);

    const suffix =
      exportMode === "page"
        ? `page-${pagination.page}`
        : exportMode === "all"
          ? "all"
          : "filtered";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="procurements-${suffix}-${Date.now()}.xlsx"`,
      },
    });
  });
}
