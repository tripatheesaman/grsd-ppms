import { describe, expect, it } from "vitest";
import {
  formatNepaliFyLabel,
  listNepaliFyOptions,
  MIN_NEPALI_FY_START,
  nepaliFyAdRange,
} from "@/lib/calendar/nepali-fy";

describe("nepaliFyAdRange", () => {
  it("maps FY 2081/82 to Shrawan 1 2081 through Ashad end 2082", () => {
    const range = nepaliFyAdRange(2081);
    expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.start < range.end).toBe(true);
  });
});

describe("formatNepaliFyLabel", () => {
  it("formats fiscal year labels", () => {
    expect(formatNepaliFyLabel(2081)).toBe("2081/82");
  });
});

describe("listNepaliFyOptions", () => {
  it("starts at 2081/82 and does not include earlier years", () => {
    const options = listNepaliFyOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(Number(options.at(-1)?.value)).toBe(MIN_NEPALI_FY_START);
    expect(options.at(-1)?.label).toBe("2081/82");
    expect(options.some((o) => Number(o.value) < MIN_NEPALI_FY_START)).toBe(false);
  });
});
