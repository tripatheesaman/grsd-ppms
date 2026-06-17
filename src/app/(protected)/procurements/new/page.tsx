"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import {
  ProcurementForm,
  type ProcurementFormValues,
} from "@/components/procurement/procurement-form";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { toProcurementBody } from "@/lib/procurement/form-utils";
import { useCreateProcurementMutation, useSaveProcurementWorkflowFieldsMutation } from "@/store/api/procurementsApi";
import { useAppSelector } from "@/store/hooks";
import { hasPermission } from "@/store/slices/authSlice";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewProcurementPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const canCreate = hasPermission(user, "procurement.create");
  const [create, { isLoading }] = useCreateProcurementMutation();
  const [saveWorkflowFields] = useSaveProcurementWorkflowFieldsMutation();

  async function handleSubmit(
    values: ProcurementFormValues,
    workflowValues?: Record<string, string>,
  ) {
    try {
      const result = await create(toProcurementBody(values)).unwrap();
      if (workflowValues && Object.keys(workflowValues).length > 0) {
        await saveWorkflowFields({
          procurementId: String(result.id),
          values: workflowValues,
        }).unwrap();
      }
      toast.success("Procurement created");
      router.push(`/procurements/${result.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create procurement"));
    }
  }

  if (!canCreate) {
    return (
      <AppShell title="New procurement">
        <p className="text-[var(--color-text-soft)]">
          You do not have permission to create procurements.
        </p>
        <Link href="/procurements" className="mt-4 inline-block">
          <Button variant="secondary">Back to list</Button>
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title="New procurement">
      <ProcurementForm
        onSubmit={handleSubmit}
        loading={isLoading}
        submitLabel="Create procurement"
      />
    </AppShell>
  );
}
