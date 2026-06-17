"use client";

import { Input, Select, Textarea } from "@/components/ui/input";
import { DateBsHint } from "@/components/ui/date-bs-hint";
import { parseSelectOptions } from "@/lib/procurement/stage-field-catalog";

type CustomField = {
  id: string;
  label: string;
  fieldType: string;
  optionsJson: string[] | null;
  required: boolean;
  hint: string | null;
};

export function WorkflowCustomFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const options = parseSelectOptions(field.optionsJson);

  if (field.fieldType === "TEXTAREA") {
    return (
      <Textarea
        label={field.label}
        hint={field.hint ?? undefined}
        value={value}
        disabled={disabled}
        required={field.required}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.fieldType === "SELECT") {
    return (
      <Select
        label={field.label}
        hint={field.hint ?? undefined}
        value={value}
        disabled={disabled}
        required={field.required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }

  if (field.fieldType === "DATE") {
    return (
      <div>
        <Input
          label={field.label}
          hint={field.hint ?? undefined}
          type="date"
          value={value}
          disabled={disabled}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
        <DateBsHint value={value} />
      </div>
    );
  }

  return (
    <Input
      label={field.label}
      hint={field.hint ?? undefined}
      type={field.fieldType === "NUMBER" ? "number" : "text"}
      value={value}
      disabled={disabled}
      required={field.required}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
