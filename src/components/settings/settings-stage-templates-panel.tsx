"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlaceholderGuideDownload } from "@/components/settings/placeholder-guide-download";
import { UPLOADS_BASE_URL } from "@/lib/config/app-config";
import {
  DOCUMENT_TEMPLATE_TYPE_OPTIONS,
  type StageTemplateSlot,
} from "@/lib/procurement/stage-template-catalog";
import {
  WORKFLOW_STAGE_DEFINITIONS,
  type WorkflowStageKey,
} from "@/lib/procurement/stage-field-catalog";
import {
  useCreateStageTemplateSlotMutation,
  useDeleteStageTemplateSlotMutation,
  useDeleteTemplateMutation,
  useGetLookupsQuery,
  useGetStageTemplateSlotsQuery,
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
  stageTemplateSlotId: string | null;
  bidType?: { id: string; name: string } | null;
};

function SlotTemplateUpload({
  slot,
  canManage,
}: {
  slot: StageTemplateSlot;
  canManage: boolean;
}) {
  const { data: bidTypes } = useGetLookupsQuery("bid-types", { skip: !slot.bidTypeScoped });
  const { data: templates, refetch } = useGetTemplatesQuery({ stageTemplateSlotId: slot.id });
  const [uploadTemplate, { isLoading: uploading }] = useUploadTemplateMutation();
  const [deleteTemplate] = useDeleteTemplateMutation();
  const [name, setName] = useState(`${slot.label} template`);
  const [file, setFile] = useState<File | null>(null);
  const [bidTypeUploads, setBidTypeUploads] = useState<
    Record<string, { name: string; file: File | null }>
  >({});

  const activeTemplates = useMemo(() => {
    const rows = (templates as TemplateRow[] | undefined) ?? [];
    return rows.filter((t) => t.isActive);
  }, [templates]);

  const activeByBidType = useMemo(() => {
    const map = new Map<string, TemplateRow>();
    for (const row of activeTemplates) {
      if (!row.bidTypeId) continue;
      if (!map.has(row.bidTypeId)) map.set(row.bidTypeId, row);
    }
    return map;
  }, [activeTemplates]);

  const defaultTemplate = activeTemplates.find((t) => !t.bidTypeId);

  async function handleUpload(bidTypeId: string | null, bidTypeName: string) {
    const state = bidTypeId
      ? (bidTypeUploads[bidTypeId] ?? { name: `${bidTypeName} ${slot.label}`, file: null })
      : { name, file };
    if (!state.file) {
      toast.error("Select a .docx file to upload");
      return;
    }
    try {
      await uploadTemplate({
        name: state.name.trim() || `${bidTypeName} ${slot.label}`,
        type: slot.documentType ?? "NOTICE",
        bidTypeId,
        stageTemplateSlotId: slot.id,
        file: state.file,
      }).unwrap();
      toast.success("Template uploaded");
      refetch();
      if (bidTypeId) {
        setBidTypeUploads((prev) => ({
          ...prev,
          [bidTypeId]: { name: `${bidTypeName} ${slot.label}`, file: null },
        }));
      } else {
        setFile(null);
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data: string }).data)
          : "Upload failed";
      toast.error(message);
    }
  }

  async function handleDelete(template: TemplateRow, label: string) {
    if (!window.confirm(`Remove template for ${label}?`)) return;
    try {
      await deleteTemplate(template.id).unwrap();
      toast.success("Template removed");
      refetch();
    } catch {
      toast.error("Failed to remove template");
    }
  }

  const types = (bidTypes as Array<{ id: string; name: string }> | undefined) ?? [];

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-[var(--color-text)]">{slot.label}</h4>
            {slot.isBuiltin ? (
              <Badge tone="default">Built-in</Badge>
            ) : (
              <Badge tone="primary">Custom</Badge>
            )}
            {slot.documentType && <Badge tone="default">{slot.documentType}</Badge>}
          </div>
          {slot.description && (
            <p className="mt-1 text-sm text-[var(--color-text-soft)]">{slot.description}</p>
          )}
        </div>
      </div>

      {slot.bidTypeScoped ? (
        <div className="mt-4 space-y-4">
          {types.length === 0 ? (
            <p className="text-sm text-[var(--color-text-soft)]">
              Add bid types under Lookups to upload per-type templates.
            </p>
          ) : (
            types.map((bidType) => {
              const active = activeByBidType.get(bidType.id);
              const uploadState =
                bidTypeUploads[bidType.id] ?? {
                  name: `${bidType.name} ${slot.label}`,
                  file: null,
                };
              return (
                <div key={bidType.id} className="rounded-lg border border-[var(--color-border)]/70 p-3">
                  <p className="font-medium text-[var(--color-text)]">{bidType.name}</p>
                  {active && (
                    <div className="mt-2 text-sm">
                      <p>
                        Current: <strong>{active.name}</strong> (v{active.version})
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <a
                          href={`${UPLOADS_BASE_URL}/${active.filePath}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          Download
                        </a>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(active, bidType.name)}
                            className="font-semibold text-[var(--color-accent)] hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {canManage && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Input
                        label="Template name"
                        value={uploadState.name}
                        onChange={(e) =>
                          setBidTypeUploads((prev) => ({
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
                          accept=".docx"
                          className="w-full text-sm"
                          onChange={(e) =>
                            setBidTypeUploads((prev) => ({
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
                      className="mt-3"
                      variant={active ? "secondary" : "primary"}
                      size="sm"
                      disabled={uploading}
                      onClick={() => handleUpload(bidType.id, bidType.name)}
                    >
                      {active ? "Replace template" : "Upload template"}
                    </Button>
                  )}
                </div>
              );
            })
          )}
          {defaultTemplate && (
            <p className="text-xs text-[var(--color-text-soft)]">
              Default fallback: {defaultTemplate.name}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {defaultTemplate ? (
            <dl className="space-y-2 rounded-lg border border-[var(--color-border)]/70 p-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-soft)]">Current</dt>
                <dd className="font-medium">{defaultTemplate.name}</dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`${UPLOADS_BASE_URL}/${defaultTemplate.filePath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--color-primary)] hover:underline"
                >
                  Download template
                </a>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete(defaultTemplate, slot.label)}
                    className="font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-text-soft)]">No template uploaded yet.</p>
          )}
          {canManage && (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input label="Template name" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[var(--color-text-soft)]">
                    Word file (.docx)
                  </span>
                  <input
                    type="file"
                    accept=".docx"
                    className="w-full text-sm"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <Button
                className="mt-3"
                variant={defaultTemplate ? "secondary" : "primary"}
                size="sm"
                disabled={uploading}
                onClick={() => handleUpload(null, slot.label)}
              >
                {defaultTemplate ? "Replace template" : "Upload template"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SettingsStageTemplatesPanel() {
  const user = useAppSelector((s) => s.auth.user);
  const canManage = hasPermission(user, "templates.manage");

  const [stageKey, setStageKey] = useState<WorkflowStageKey>(
    WORKFLOW_STAGE_DEFINITIONS[0]!.key,
  );
  const { data: slots, isLoading } = useGetStageTemplateSlotsQuery(stageKey);
  const [createSlot] = useCreateStageTemplateSlotMutation();
  const [deleteSlot] = useDeleteStageTemplateSlotMutation();

  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDocumentType, setNewDocumentType] = useState("");
  const [newBidTypeScoped, setNewBidTypeScoped] = useState(false);

  const stageDef = WORKFLOW_STAGE_DEFINITIONS.find((s) => s.key === stageKey)!;
  const stageSlots = [...((slots ?? []) as StageTemplateSlot[])].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );

  async function handleAddSlot() {
    if (!newLabel.trim()) {
      toast.error("Enter a template name");
      return;
    }
    try {
      await createSlot({
        stageKey,
        label: newLabel.trim(),
        description: newDescription.trim() || null,
        documentType: newDocumentType || null,
        bidTypeScoped: newBidTypeScoped,
      }).unwrap();
      toast.success("Template slot added");
      setNewLabel("");
      setNewDescription("");
      setNewDocumentType("");
      setNewBidTypeScoped(false);
    } catch {
      toast.error("Failed to add template slot");
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading stage templates…" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="mb-0">
          <div>
            <CardTitle>Templates by workflow stage</CardTitle>
            <CardDescription>
              Upload Word templates for each workflow phase. Add custom template slots when you need
              extra documents at a stage.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="mt-4">
          <PlaceholderGuideDownload />
        </div>
        <Select
          className="mt-4"
          label="Workflow stage"
          value={stageKey}
          onChange={(e) => setStageKey(e.target.value as WorkflowStageKey)}
        >
          {WORKFLOW_STAGE_DEFINITIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">{stageDef.description}</p>
      </Card>

      {stageSlots.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-text-soft)]">
            No template slots for this stage yet. Add one below.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {stageSlots.map((slot) => (
            <Card key={slot.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <SlotTemplateUpload slot={slot} canManage={canManage} />
                </div>
                {canManage && !slot.isBuiltin && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (!window.confirm(`Delete template slot “${slot.label}”?`)) return;
                      await deleteSlot(slot.id);
                      toast.success("Template slot deleted");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add template slot</CardTitle>
            <CardDescription>
              Create a new document template placeholder for this workflow stage.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Template label"
              placeholder="e.g. Supplementary notice"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Select
              label="Document type (optional)"
              value={newDocumentType}
              onChange={(e) => setNewDocumentType(e.target.value)}
            >
              <option value="">Custom / upload only</option>
              {DOCUMENT_TEMPLATE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Input
              label="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={newBidTypeScoped}
                onChange={(e) => setNewBidTypeScoped(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              One template per bid type
            </label>
          </div>
          <Button className="mt-4" onClick={handleAddSlot}>
            <Plus className="h-4 w-4" />
            Add template slot
          </Button>
        </Card>
      )}

      {!canManage && (
        <p className="text-sm text-[var(--color-text-soft)]">
          You need the <strong>Manage Document Templates</strong> permission to upload or change
          templates.
        </p>
      )}
    </div>
  );
}
