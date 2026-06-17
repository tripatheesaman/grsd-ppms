"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/loading-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  WORKFLOW_FIELD_TYPES,
  WORKFLOW_STAGE_DEFINITIONS,
  buildWorkflowFieldLayout,
  type CustomWorkflowField,
  type WorkflowStageKey,
} from "@/lib/procurement/stage-field-catalog";
import {
  useCreateWorkflowFieldMutation,
  useDeleteWorkflowFieldMutation,
  useGetWorkflowFieldsQuery,
  useUpdateWorkflowFieldMutation,
} from "@/store/api/settingsApi";

export function SettingsWorkflowFieldsPanel() {
  const [stageKey, setStageKey] = useState(WORKFLOW_STAGE_DEFINITIONS[0]!.key);
  const { data: allFields, isLoading } = useGetWorkflowFieldsQuery(undefined);
  const [createField] = useCreateWorkflowFieldMutation();
  const [updateField] = useUpdateWorkflowFieldMutation();
  const [deleteField] = useDeleteWorkflowFieldMutation();

  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("TEXT");
  const [newAnchor, setNewAnchor] = useState("");
  const [newPosition, setNewPosition] = useState<"BEFORE" | "AFTER">("AFTER");
  const [newOptions, setNewOptions] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [newHint, setNewHint] = useState("");

  const stageDef = WORKFLOW_STAGE_DEFINITIONS.find((s) => s.key === stageKey)!;
  const stageFields = useMemo(
    () => ((allFields ?? []) as CustomWorkflowField[]).filter((f) => f.stageKey === stageKey),
    [allFields, stageKey],
  );
  const layout = useMemo(
    () => buildWorkflowFieldLayout(stageKey, stageFields),
    [stageKey, stageFields],
  );

  const anchorOptions = stageDef.fields;

  async function handleAdd() {
    if (!newLabel.trim()) {
      toast.error("Enter a field label");
      return;
    }
    if (!newAnchor) {
      toast.error("Select an anchor field");
      return;
    }
    try {
      await createField({
        stageKey,
        label: newLabel.trim(),
        fieldType: newType,
        anchorFieldKey: newAnchor,
        position: newPosition,
        required: newRequired,
        hint: newHint.trim() || null,
        optionsJson:
          newType === "SELECT"
            ? newOptions
                .split(/[,;\n]/)
                .map((s) => s.trim())
                .filter(Boolean)
            : null,
      }).unwrap();
      toast.success("Custom field added");
      setNewLabel("");
      setNewHint("");
      setNewOptions("");
    } catch {
      toast.error("Failed to add field");
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Workflow custom fields</CardTitle>
            <CardDescription>
              Add extra input fields before or after any built-in field at each workflow stage.
              Custom fields appear on the procurement detail screen and create/edit form when that
              stage is active.
            </CardDescription>
          </div>
        </CardHeader>
        <Select
          label="Workflow stage"
          value={stageKey}
          onChange={(e) => {
            setStageKey(e.target.value as WorkflowStageKey);
            setNewAnchor("");
          }}
        >
          {WORKFLOW_STAGE_DEFINITIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">{stageDef.description}</p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Field order preview</CardTitle>
          <CardDescription>
            Built-in fields (gray) and your custom fields (highlighted) in display order
          </CardDescription>
        </CardHeader>
        {isLoading ? (
          <p className="text-sm text-[var(--color-text-soft)]">Loading…</p>
        ) : layout.length === 0 ? (
          <EmptyState title="No fields defined for this stage" />
        ) : (
          <ol className="space-y-2">
            {layout.map((item, idx) => (
              <li
                key={item.kind === "builtin" ? `b-${item.fieldKey}` : `c-${item.id}`}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  item.kind === "builtin"
                    ? "border-[var(--color-border)] bg-[var(--color-surface-strong)]/40"
                    : "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5"
                }`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-[var(--color-text-soft)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--color-text)]">{item.label}</span>
                    <Badge tone={item.kind === "builtin" ? "default" : "primary"}>
                      {item.kind === "builtin" ? "Built-in" : "Custom"}
                    </Badge>
                    <Badge tone="default">{item.fieldType}</Badge>
                  </div>
                  {item.kind === "custom" && item.hint && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">{item.hint}</p>
                  )}
                </div>
                {item.kind === "custom" && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await updateField({
                          id: item.id,
                          body: { sortOrder: Math.max(0, idx) },
                        });
                      }}
                    >
                      Order {idx + 1}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm(`Delete custom field “${item.label}”?`)) return;
                        await deleteField(item.id);
                        toast.success("Field deleted");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add custom field</CardTitle>
          <CardDescription>
            Choose where to insert the new field relative to an existing built-in field
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Field label"
            placeholder="e.g. Internal reference number"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Select
            label="Field type"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            {WORKFLOW_FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select
            label="Insert relative to"
            value={newAnchor}
            onChange={(e) => setNewAnchor(e.target.value)}
          >
            <option value="">Select built-in field…</option>
            {anchorOptions.map((f) => (
              <option key={f.fieldKey} value={f.fieldKey}>
                {f.label}
              </option>
            ))}
          </Select>
          <Select
            label="Position"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value as "BEFORE" | "AFTER")}
          >
            <option value="BEFORE">Before selected field</option>
            <option value="AFTER">After selected field</option>
          </Select>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Required
          </label>
          <Input
            label="Hint text (optional)"
            value={newHint}
            onChange={(e) => setNewHint(e.target.value)}
          />
          {newType === "SELECT" && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Textarea
                label="Dropdown options"
                hint="One per line or comma-separated"
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
              />
            </div>
          )}
        </div>
        <Button className="mt-4" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add field
        </Button>
      </Card>

      {stageFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage custom fields</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {stageFields.map((field) => (
              <div
                key={field.id}
                className="rounded-xl border border-[var(--color-border)] p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Label"
                    value={field.label}
                    onChange={(e) =>
                      updateField({ id: field.id, body: { label: e.target.value } })
                    }
                  />
                  <Select
                    label="Type"
                    value={field.fieldType}
                    onChange={(e) =>
                      updateField({ id: field.id, body: { fieldType: e.target.value } })
                    }
                  >
                    {WORKFLOW_FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Anchor"
                    value={field.anchorFieldKey}
                    onChange={(e) =>
                      updateField({ id: field.id, body: { anchorFieldKey: e.target.value } })
                    }
                  >
                    {anchorOptions.map((f) => (
                      <option key={f.fieldKey} value={f.fieldKey}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Position"
                    value={field.position}
                    onChange={(e) =>
                      updateField({
                        id: field.id,
                        body: { position: e.target.value as "BEFORE" | "AFTER" },
                      })
                    }
                  >
                    <option value="BEFORE">Before</option>
                    <option value="AFTER">After</option>
                  </Select>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        updateField({ id: field.id, body: { required: e.target.checked } })
                      }
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={field.isActive}
                      onChange={(e) =>
                        updateField({ id: field.id, body: { isActive: e.target.checked } })
                      }
                    />
                    Active
                  </label>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
