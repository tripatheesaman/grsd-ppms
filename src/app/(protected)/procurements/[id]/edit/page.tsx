"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import {
  ProcurementForm,
  type ProcurementFormValues,
} from "@/components/procurement/procurement-form";
import { Button } from "@/components/ui/button";
import { mapProcurementToFormValues, toProcurementBody } from "@/lib/procurement/form-utils";
import {
  useGetProcurementQuery,
  useUpdateProcurementMutation,
} from "@/store/api/procurementsApi";
import { useGetLookupsQuery } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { hasPermission } from "@/store/slices/authSlice";

type ProcurementRecord = Record<string, unknown> & {
  title?: string;
  mediaOfBid?: { id: string; name: string } | null;
  sbd?: { id: string; name: string } | null;
  contractType?: { id: string; name: string } | null;
  unit?: { id: string; name: string } | null;
};

export default function EditProcurementPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const canEdit = hasPermission(user, "procurement.edit");

  const { data: proc, isLoading } = useGetProcurementQuery(id);
  const { data: refTypes, isLoading: refTypesLoading } = useGetLookupsQuery("reference-types");
  const [update, { isLoading: saving }] = useUpdateProcurementMutation();

  const formValues = useMemo(() => {
    if (!proc || !refTypes) return null;
    return mapProcurementToFormValues(
      proc as Record<string, unknown>,
      refTypes as Array<{ id: string; name: string }>,
    );
  }, [proc, refTypes]);

  const savedLookups = useMemo(() => {
    if (!proc) return undefined;
    const record = proc as ProcurementRecord;
    return {
      mediaOfBid: record.mediaOfBid,
      sbd: record.sbd,
      contractType: record.contractType,
      unit: record.unit,
    };
  }, [proc]);

  async function handleSubmit(values: ProcurementFormValues) {
    try {
      await update({ id, body: toProcurementBody(values) }).unwrap();
      toast.success("Procurement updated");
      router.push(`/procurements/${id}`);
    } catch {
      toast.error("Failed to update procurement");
    }
  }

  if (!canEdit) {
    return (
      <AppShell title="Edit procurement">
        <p className="text-[var(--color-text-soft)]">
          You do not have permission to edit procurements.
        </p>
        <Link href={`/procurements/${id}`} className="mt-4 inline-block">
          <Button variant="secondary">Back to details</Button>
        </Link>
      </AppShell>
    );
  }

  if (isLoading || refTypesLoading || !formValues) {
    return (
      <AppShell title="Edit procurement">
        <p className="text-[var(--color-text-soft)]">Loading...</p>
      </AppShell>
    );
  }

  const record = proc as ProcurementRecord;

  return (
    <AppShell title={`Edit: ${String(record.title ?? "")}`}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/procurements/${id}`}>
          <Button variant="secondary" type="button">
            Cancel
          </Button>
        </Link>
      </div>
      <ProcurementForm
        procurementId={id}
        key={`${id}-${formValues.bidTypeId}-${formValues.contractTypeId}`}
        defaultValues={formValues}
        savedLookups={savedLookups}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="Update procurement"
      />
    </AppShell>
  );
}
