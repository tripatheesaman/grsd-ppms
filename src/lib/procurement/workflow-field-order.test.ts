import { describe, expect, it } from "vitest";
import {
  applyWorkflowFieldOrder,
  builtinFieldRef,
  customFieldRef,
  type LayoutFieldItem,
} from "@/lib/procurement/stage-field-catalog";

const defaultLayout: LayoutFieldItem[] = [
  { kind: "builtin", fieldKey: "title", label: "Title", fieldType: "text" },
  { kind: "builtin", fieldKey: "itemName", label: "Item name", fieldType: "text" },
  {
    kind: "custom",
    id: "c1",
    fieldKey: "ref_no",
    label: "Reference",
    fieldType: "TEXT",
    optionsJson: null,
    required: false,
    hint: null,
  },
];

describe("applyWorkflowFieldOrder", () => {
  it("reorders fields according to saved order", () => {
    const ordered = applyWorkflowFieldOrder(defaultLayout, [
      { fieldRef: customFieldRef("c1"), sortOrder: 0 },
      { fieldRef: builtinFieldRef("itemName"), sortOrder: 1 },
      { fieldRef: builtinFieldRef("title"), sortOrder: 2 },
    ]);
    expect(ordered.map((i) => (i.kind === "builtin" ? i.fieldKey : i.id))).toEqual([
      "c1",
      "itemName",
      "title",
    ]);
  });

  it("appends fields missing from saved order", () => {
    const ordered = applyWorkflowFieldOrder(defaultLayout, [
      { fieldRef: builtinFieldRef("title"), sortOrder: 0 },
    ]);
    expect(ordered).toHaveLength(3);
    expect(ordered[0]?.kind === "builtin" && ordered[0].fieldKey).toBe("title");
  });
});
