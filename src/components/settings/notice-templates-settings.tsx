"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { PlaceholderGuideDownload } from "@/components/settings/placeholder-guide-download";
import { UPLOADS_BASE_URL } from "@/lib/config/app-config";
import { PLACEHOLDER_CATALOG_BY_CATEGORY } from "@/lib/documents/placeholders";
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
  updatedAt: string;
};

export function NoticeTemplatesSettings() {
  const user = useAppSelector((s) => s.auth.user);
  const canManage = hasPermission(user, "templates.manage");

  const { data: bidTypes, isLoading: bidTypesLoading } = useGetLookupsQuery("bid-types");
  const { data: noticeTemplates, isLoading: templatesLoading, refetch } = useGetTemplatesQuery({
    type: "NOTICE",
  });
  const { data: defaultTemplates } = useGetTemplatesQuery({ type: "NOTICE", bidTypeId: "null" });

  const [uploadTemplate, { isLoading: uploading }] = useUploadTemplateMutation();
  const [deleteTemplate] = useDeleteTemplateMutation();

  const [defaultName, setDefaultName] = useState("Default notice template");
  const [defaultFile, setDefaultFile] = useState<File | null>(null);
  const [uploadByBidType, setUploadByBidType] = useState<Record<string, { name: string; file: File | null }>>(
    {},
  );

  const activeByBidType = useMemo(() => {
    const map = new Map<string, TemplateRow>();
    for (const row of (noticeTemplates as TemplateRow[] | undefined) ?? []) {
      if (!row.bidTypeId || !row.isActive) continue;
      if (!map.has(row.bidTypeId)) map.set(row.bidTypeId, row);
    }
    return map;
  }, [noticeTemplates]);

  const defaultTemplate = ((defaultTemplates as TemplateRow[] | undefined) ?? []).find(
    (t) => t.isActive,
  );

  function getUploadState(bidTypeId: string, bidTypeName: string) {
    return (
      uploadByBidType[bidTypeId] ?? {
        name: `${bidTypeName} notice template`,
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
        name: name.trim() || `${bidTypeName} notice`,
        type: "NOTICE",
        bidTypeId,
        file,
      }).unwrap();
      toast.success(`Notice template saved for ${bidTypeName}`);
      refetch();
      if (bidTypeId) {
        setUploadByBidType((prev) => ({
          ...prev,
          [bidTypeId]: { name: `${bidTypeName} notice template`, file: null },
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
    if (!window.confirm(`Remove notice template for ${label}?`)) return;
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="mb-0">
          <div>
            <CardTitle>Notice templates by bid type</CardTitle>
            <CardDescription>
              Upload one Word (.docx) notice template per type of bid. Generation uses the template
              matching each procurement&apos;s bid type.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="mt-4">
          <PlaceholderGuideDownload />
        </div>
      </Card>

      {types.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-text-soft)]">
            No bid types found. Add bid types under the Lookups tab first, then upload notice
            templates here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {types.map((bidType) => {
            const active = activeByBidType.get(bidType.id);
            const uploadState = getUploadState(bidType.id, bidType.name);
            return (
              <Card key={bidType.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">{bidType.name}</h3>
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      Default bid period: {bidType.defaultBidDays ?? 0} days
                    </p>
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
                )}
                {canManage && (
                  <Button
                    className="mt-4"
                    variant={active ? "secondary" : "primary"}
                    disabled={uploading}
                    onClick={() =>
                      handleUpload(bidType.id, bidType.name, uploadState.name, uploadState.file)
                    }
                  >
                    {active ? "Replace notice template" : "Upload notice template"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardTitle>Default notice template (optional)</CardTitle>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
          Used when no bid-type-specific notice template exists.
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
        )}
        {canManage && (
          <Button
            className="mt-4"
            variant="secondary"
            disabled={uploading}
            onClick={() => handleUpload(null, "default", defaultName, defaultFile)}
          >
            {defaultTemplate ? "Replace default template" : "Upload default template"}
          </Button>
        )}
      </Card>

      <Card>
        <CardTitle>Available placeholders</CardTitle>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
          Full list grouped by category. Download the guide for a plain-text copy. Reference and
          work-day tokens use dynamic keys (e.g. {`{{ifb_number}}`}, {`{{work_day_ex_work_days}}`}).
        </p>
        <div className="mt-4 max-h-[32rem] space-y-6 overflow-y-auto pr-1">
          {Object.entries(PLACEHOLDER_CATALOG_BY_CATEGORY).map(([category, items]) => (
            <section key={category}>
              <h3 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">{category}</h3>
              <ul className="grid gap-2 text-sm md:grid-cols-2">
                {items.map((p) => (
                  <li
                    key={p.token}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2"
                  >
                    <code className="text-[var(--color-primary)]">{p.token}</code>
                    <span className="ml-2 text-[var(--color-text-soft)]">{p.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Card>

      {!canManage && (
        <p className="text-sm text-[var(--color-text-soft)]">
          You need the <strong>Manage Document Templates</strong> permission to upload or change
          templates.
        </p>
      )}
    </div>
  );
}
