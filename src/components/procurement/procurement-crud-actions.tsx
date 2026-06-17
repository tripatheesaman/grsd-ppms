"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useDeleteProcurementMutation } from "@/store/api/procurementsApi";
import { useAppSelector } from "@/store/hooks";
import { hasPermission } from "@/store/slices/authSlice";

type Props = {
  id: string;
  title?: string;
  layout?: "inline" | "buttons";
  onDeleted?: () => void;
};

export function ProcurementCrudActions({
  id,
  title,
  layout = "buttons",
  onDeleted,
}: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const router = useRouter();
  const [deleteProcurement, { isLoading: deleting }] = useDeleteProcurementMutation();

  const canEdit = hasPermission(user, "procurement.edit");
  const canDelete = hasPermission(user, "procurement.delete");

  if (!canEdit && !canDelete) return null;

  async function handleDelete() {
    const label = title ? `"${title}"` : "this procurement";
    const confirmed = window.confirm(
      `Delete ${label}? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteProcurement(id).unwrap();
      toast.success("Procurement deleted");
      onDeleted?.();
      router.push("/procurements");
    } catch {
      toast.error("Failed to delete procurement");
    }
  }

  if (layout === "inline") {
    return (
      <span className="inline-flex flex-wrap items-center gap-3">
        {canEdit && (
          <Link
            href={`/procurements/${id}/edit`}
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            Edit
          </Link>
        )}
        {canDelete && (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="font-semibold text-[var(--color-accent)] hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canEdit && (
        <Link href={`/procurements/${id}/edit`}>
          <Button variant="secondary" type="button">
            Edit
          </Button>
        </Link>
      )}
      {canDelete && (
        <Button variant="danger" type="button" disabled={deleting} onClick={handleDelete}>
          Delete
        </Button>
      )}
    </div>
  );
}
