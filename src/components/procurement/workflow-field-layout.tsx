"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  buildWorkflowFieldLayout,
  type CustomWorkflowField,
  type WorkflowStageKey,
} from "@/lib/procurement/stage-field-catalog";
import { WorkflowCustomFieldInput } from "@/components/procurement/workflow-custom-field-input";

type WorkflowFieldLayoutProps = {
  stageKey: WorkflowStageKey | string;
  customFields: CustomWorkflowField[];
  builtinRenderers: Record<string, ReactNode>;
  values: Record<string, string>;
  onValueChange: (fieldId: string, value: string) => void;
  disabled?: boolean;
  className?: string;
  visibleBuiltinKeys?: string[];
};

export function WorkflowFieldLayout({
  stageKey,
  customFields,
  builtinRenderers,
  values,
  onValueChange,
  disabled,
  className = "contents",
  visibleBuiltinKeys,
}: WorkflowFieldLayoutProps) {
  const layout = useMemo(
    () => buildWorkflowFieldLayout(stageKey, customFields, { visibleBuiltinKeys }),
    [stageKey, customFields, visibleBuiltinKeys],
  );

  return (
    <div className={className}>
      {layout.map((item) => {
        if (item.kind === "builtin") {
          const node = builtinRenderers[item.fieldKey];
          if (!node) return null;
          return <div key={`builtin-${item.fieldKey}`}>{node}</div>;
        }
        return (
          <WorkflowCustomFieldInput
            key={item.id}
            field={item}
            value={values[item.id] ?? ""}
            disabled={disabled}
            onChange={(v) => onValueChange(item.id, v)}
          />
        );
      })}
    </div>
  );
}
