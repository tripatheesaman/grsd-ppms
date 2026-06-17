"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UPLOADS_BASE_URL } from "@/lib/config/app-config";
import {
  useDeleteTemplateMutation,
  useGetTemplatesQuery,
  useUploadTemplateMutation,
} from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { hasPermission } from "@/store/slices/authSlice";

type TemplateRow = {
  id: string;
  name: string;
  filePath: string;
  version: number;
  isActive: boolean;
};

type Props = {
  templateType: string;
  title: string;
  description: string;
  defaultTemplateName: string;
  uploadLabel: string;
};

export function GlobalDocumentTemplateSettings({
  templateType,
  title,
  description,
  defaultTemplateName,
  uploadLabel,
}: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const canManage = hasPermission(user, "templates.manage");

  const { data: templates, isLoading, refetch } = useGetTemplatesQuery({
    type: templateType,
    bidTypeId: "null",
  });
  const [uploadTemplate, { isLoading: uploading }] = useUploadTemplateMutation();
  const [deleteTemplate] = useDeleteTemplateMutation();

  const [templateName, setTemplateName] = useState(defaultTemplateName);
  const [file, setFile] = useState<File | null>(null);

  const active = ((templates as TemplateRow[] | undefined) ?? []).find((t) => t.isActive);

  async function handleUpload() {
    if (!file) {
      toast.error("Select a .docx file to upload");
      return;
    }
    try {
      await uploadTemplate({
        name: templateName.trim() || defaultTemplateName,
        type: templateType,
        bidTypeId: null,
        file,
      }).unwrap();
      toast.success(`${title} saved`);
      setFile(null);
      refetch();
    } catch (err) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data: string }).data)
          : "Upload failed";
      toast.error(message);
    }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm(`Remove ${title.toLowerCase()}?`)) return;
    try {
      await deleteTemplate(active.id).unwrap();
      toast.success("Template removed");
      refetch();
    } catch {
      toast.error("Failed to remove template");
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardTitle>{title}</CardTitle>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">Loading...</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <p className="mt-2 text-sm text-[var(--color-text-soft)]">{description}</p>

      {active ? (
        <dl className="mt-4 space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-soft)]">Current file</dt>
            <dd className="text-right font-medium">{active.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-soft)]">Version</dt>
            <dd>{active.version}</dd>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={`${UPLOADS_BASE_URL}/${active.filePath}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              Download template
            </a>
            {canManage && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">No template configured yet.</p>
      )}

      {canManage && (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input
              label="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--color-text-soft)]">
                Word file (.docx)
              </span>
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="w-full text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <Button className="mt-4" variant={active ? "secondary" : "primary"} disabled={uploading} onClick={handleUpload}>
            {active ? `Replace ${uploadLabel}` : `Upload ${uploadLabel}`}
          </Button>
        </>
      )}
    </Card>
  );
}
