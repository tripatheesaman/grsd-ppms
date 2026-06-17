import { describe, expect, it } from "vitest";
import { mergeSplitPlaceholderRuns } from "@/lib/documents/fix-docx-xml";

describe("mergeSplitPlaceholderRuns", () => {
  it("joins w:t runs split inside a placeholder", () => {
    const xml =
      '<w:t>{{tit</w:t></w:r><w:r><w:t>le}}</w:t>';
    const merged = mergeSplitPlaceholderRuns(xml);
    expect(merged).toBe("<w:t>{{title}}</w:t>");
  });
});
