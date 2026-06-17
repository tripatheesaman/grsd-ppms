"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { UPLOADS_BASE_URL } from "@/lib/config/app-config";
import {
  useDeleteTemplateMutation,
  useGetLookupsQuery,
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
  bidTypeId: string | null;
  bidType?: { id: string; name: string } | null;
};

type Props = {
  templateType: string;
  title: string;
  description: string;
  uploadLabel: string;
  defaultTemplateName: string;
  showBidDays?: boolean;
};

export function BidTypeTemplateSettings({
  templateType,
  title,
  description,
  uploadLabel,
  defaultTemplateName,
  showBidDays = false,
}: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const canManage = hasPermission(user, "templates.manage");

  const { data: bidTypes, isLoading: bidTypesLoading } = useGetLookupsQuery("bid-types");
  const { data: templates, isLoading: templatesLoading, refetch } = useGetTemplatesQuery({
    type: templateType,
  });
  const { data: defaultTemplates } = useGetTemplatesQuery({
    type: templateType,
    bidTypeId: "null",
  });

  const [uploadTemplate, { isLoading: uploading }] = useUploadTemplateMutation();
  const [deleteTemplate] = useDeleteTemplateMutation();

  const [defaultName, setDefaultName] = useState(defaultTemplateName);
  const [defaultFile, setDefaultFile] = useState<File | null>(null);
  const [uploadByBidType, setUploadByBidType] = useState<
    Record<string, { name: string; file: File | null }>
  >({});

  const activeByBidType = useMemo(() => {
    const map = new Map<string, TemplateRow>();
    for (const row of (templates as TemplateRow[] | undefined) ?? []) {
      if (!row.bidTypeId || !row.isActive) continue;
      if (!map.has(row.bidTypeId)) map.set(row.bidTypeId, row);
    }
    return map;
  }, [templates]);

  const defaultTemplate = ((defaultTemplates as TemplateRow[] | undefined) ?? []).find(
    (t) => t.isActive,
  );

  function getUploadState(bidTypeId: string, bidTypeName: string) {
    return (
      uploadByBidType[bidTypeId] ?? {
        name: `${bidTypeName} ${uploadLabel}`,
        file: null,
      }
    );
  }

  async function handleUpload(
    bidTypeId: string | null,
    bidTypeName: string,
    name: string,
    file: File | null,
  ) {
    if (!file) {
      toast.error("Select a .docx file to upload");
      return;
    }
    try {
      await uploadTemplate({
        name: name.trim() || `${bidTypeName} ${uploadLabel}`,
        type: templateType,
        bidTypeId,
        file,
      }).unwrap();
      toast.success(`Template saved for ${bidTypeName}`);
      refetch();
      if (bidTypeId) {
        setUploadByBidType((prev) => ({
          ...prev,
          [bidTypeId]: { name: `${bidTypeName} ${uploadLabel}`, file: null },
        }));
      } else {
        setDefaultFile(null);
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data: string }).data)
          : "Upload failed";
      toast.error(message);
    }
  }

  async function handleDelete(template: TemplateRow) {
    const label = template.bidType?.name ?? "default";
    if (!window.confirm(`Remove ${uploadLabel} for ${label}?`)) return;
    try {
      await deleteTemplate(template.id).unwrap();
      toast.success("Template removed");
      refetch();
    } catch {
      toast.error("Failed to remove template");
    }
  }

  if (bidTypesLoading || templatesLoading) {
    return <LoadingState label="Loading templates…" />;
  }

  const types = (bidTypes as Array<{ id: string; name: string; defaultBidDays?: number }>) ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="mb-0">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>

      {types.length === 0 ? (
        <Card>
          <p className="p-5 text-sm text-[var(--color-text-soft)]">
            No bid types found. Add bid types under Settings → Lookups first.
          </p>
        </Card>
      ) : (
        types.map((bidType) => {
          const active = activeByBidType.get(bidType.id);
          const uploadState = getUploadState(bidType.id, bidType.name);
          return (
            <Card key={bidType.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">{bidType.name}</h3>
                  {showBidDays && (
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      Default bid period: {bidType.defaultBidDays ?? 0} days
                    </p>
                  )}
                </div>
                {active ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">
                    Template configured
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                    No template
                  </span>
                )}
              </div>

              {active && (
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
                        onClick={() => handleDelete(active)}
                        className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </dl>
              )}

              {canManage && (
                <>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Input
                      label={active ? "Replace template name" : "Template name"}
                      value={uploadState.name}
                      onChange={(e) =>
                        setUploadByBidType((prev) => ({
                          ...prev,
                          [bidType.id]: { ...uploadState, name: e.target.value },
                        }))
                      }
                    />
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-[var(--color-text-soft)]">
                        Word file (.docx)
                      </span>
                      <input
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="w-full text-sm"
                        onChange={(e) =>
                          setUploadByBidType((prev) => ({
                            ...prev,
                            [bidType.id]: {
                              ...uploadState,
                              file: e.target.files?.[0] ?? null,
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <Button
                    className="mt-4"
                    variant={active ? "secondary" : "primary"}
                    disabled={uploading}
                    onClick={() =>
                      handleUpload(bidType.id, bidType.name, uploadState.name, uploadState.file)
                    }
                  >
                    {active ? `Replace ${uploadLabel}` : `Upload ${uploadLabel}`}
                  </Button>
                </>
              )}
            </Card>
          );
        })
      )}

      <Card>
        <CardTitle>Default template (optional)</CardTitle>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
          Used when no bid-type-specific template exists for this document type.
        </p>
        {defaultTemplate && (
          <dl className="mt-4 space-y-2 rounded-xl border border-[var(--color-border)] p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-soft)]">Current</dt>
              <dd className="font-medium">{defaultTemplate.name}</dd>
            </div>
            <a
              href={`${UPLOADS_BASE_URL}/${defaultTemplate.filePath}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              Download default template
            </a>
          </dl>
        )}
        {canManage && (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                label="Template name"
                value={defaultName}
                onChange={(e) => setDefaultName(e.target.value)}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--color-text-soft)]">
                  Word file (.docx)
                </span>
                <input
                  type="file"
                  accept=".docx"
                  className="w-full text-sm"
                  onChange={(e) => setDefaultFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <Button
              className="mt-4"
              variant="secondary"
              disabled={uploading}
              onClick={() => handleUpload(null, "default", defaultName, defaultFile)}
            >
              {defaultTemplate ? "Replace default template" : "Upload default template"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
