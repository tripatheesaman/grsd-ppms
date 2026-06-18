import { describe, expect, it } from "vitest";
import {
  buildProcurementListWhere,
  parseProcurementListFilters,
} from "@/lib/procurement/list-filters";

describe("parseProcurementListFilters", () => {
  it("parses lookup and date filters", () => {
    const filters = parseProcurementListFilters(
      new URLSearchParams(
        "search=test&bidTypeId=bt1&mediaOfBidId=m1&dateFrom=2025-01-01&nepaliFy=2081&queue=completed",
      ),
    );
    expect(filters.search).toBe("test");
    expect(filters.bidTypeId).toBe("bt1");
    expect(filters.mediaOfBidId).toBe("m1");
    expect(filters.dateFrom).toBe("2025-01-01");
    expect(filters.nepaliFy).toBe("2081");
    expect(filters.queueKey).toBe("completed");
  });
});

describe("buildProcurementListWhere", () => {
  it("export all keeps only queue scope", () => {
    const where = buildProcurementListWhere(
      {
        queueKey: "completed",
        search: "ignored",
        bidTypeId: "ignored",
        sort: "createdAt",
        order: "desc",
      },
      { exportMode: "all" },
    );
    expect(where.OR).toBeUndefined();
    expect(where.bidTypeId).toBeUndefined();
    expect(where.status).toEqual({ in: ["COMPLETED"] });
  });
});
