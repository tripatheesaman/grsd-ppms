"use client";

import type { ReactNode } from "react";
import { WorkflowFieldLayout } from "@/components/procurement/workflow-field-layout";
import type { CustomWorkflowField } from "@/lib/procurement/stage-field-catalog";

type WorkflowStageFieldsProps = {
  stageKey: string;
  customFields: CustomWorkflowField[];
  values: Record<string, string>;
  onValueChange: (fieldId: string, value: string) => void;
  builtinRenderers: Record<string, ReactNode>;
  disabled?: boolean;
  className?: string;
  visibleBuiltinKeys?: string[];
};

export function WorkflowStageFields({
  stageKey,
  customFields,
  values,
  onValueChange,
  builtinRenderers,
  disabled,
  className = "flex flex-wrap items-end gap-4",
  visibleBuiltinKeys,
}: WorkflowStageFieldsProps) {
  return (
    <WorkflowFieldLayout
      stageKey={stageKey}
      customFields={customFields}
      builtinRenderers={builtinRenderers}
      values={values}
      onValueChange={onValueChange}
      disabled={disabled}
      className={className}
      visibleBuiltinKeys={visibleBuiltinKeys}
    />
  );
}
