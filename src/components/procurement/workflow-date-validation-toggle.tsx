"use client";

import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api/error-message";
import {
  useGetWorkflowDateValidationQuery,
  useSetWorkflowDateValidationMutation,
} from "@/store/api/settingsApi";

type Props = {
  onChanged?: () => void;
};

export function WorkflowDateValidationToggle({ onChanged }: Props) {
  const { data, isLoading } = useGetWorkflowDateValidationQuery();
  const [setEnabled, { isLoading: saving }] = useSetWorkflowDateValidationMutation();
  const enabled = data?.enabled !== false;

  async function toggle() {
    try {
      await setEnabled({ enabled: !enabled }).unwrap();
      onChanged?.();
      toast.success(
        !enabled
          ? "Workflow date validation enabled"
          : "Workflow date validation disabled",
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update validation setting"));
    }
  }

  return (
    <Card className="mb-6 border-amber-300/70">
      <CardTitle>Workflow date validation</CardTitle>
      <CardDescription>
        When enabled, procurement actions are blocked until scheduled milestone dates are reached.
        Only superadmins can change this setting.
      </CardDescription>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant={enabled ? "primary" : "secondary"}
          onClick={toggle}
          disabled={isLoading || saving}
        >
          {enabled ? "Validation: ON" : "Validation: OFF"}
        </Button>
        <span className="text-sm text-[var(--color-text-soft)]">
          {enabled
            ? "Users must wait for scheduled dates before advancing workflow."
            : "All workflow actions are allowed regardless of dates."}
        </span>
      </div>
    </Card>
  );
}
