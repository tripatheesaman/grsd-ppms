"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CustomWorkflowField } from "@/lib/procurement/stage-field-catalog";
import {
  useGetProcurementWorkflowFieldsQuery,
  useSaveProcurementWorkflowFieldsMutation,
} from "@/store/api/procurementsApi";
import { useGetWorkflowFieldsQuery } from "@/store/api/settingsApi";

export function useWorkflowCustomFieldsAll(procurementId: string | undefined) {
  const { data, refetch } = useGetProcurementWorkflowFieldsQuery(
    { procurementId: procurementId! },
    { skip: !procurementId },
  );
  const [saveFields] = useSaveProcurementWorkflowFieldsMutation();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const allFields = useMemo(
    () => (data?.fields ?? []) as CustomWorkflowField[],
    [data?.fields],
  );

  useEffect(() => {
    if (data?.values) {
      setLocalValues(data.values);
    }
  }, [data?.values]);

  const fieldsByStage = useMemo(() => {
    const map = new Map<string, CustomWorkflowField[]>();
    for (const field of allFields) {
      const list = map.get(field.stageKey) ?? [];
      list.push(field);
      map.set(field.stageKey, list);
    }
    return map;
  }, [allFields]);

  const getFieldsForStage = useCallback(
    (stageKey: string) => fieldsByStage.get(stageKey) ?? [],
    [fieldsByStage],
  );

  const setValue = useCallback((fieldId: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const validateStage = useCallback(
    (stageKey: string) => {
      for (const field of getFieldsForStage(stageKey)) {
        if (field.required && !(localValues[field.id] ?? "").trim()) {
          return `“${field.label}” is required`;
        }
      }
      return null;
    },
    [getFieldsForStage, localValues],
  );

  const persistStage = useCallback(
    async (stageKey: string) => {
      const err = validateStage(stageKey);
      if (err) throw new Error(err);
      const fields = getFieldsForStage(stageKey);
      const payload: Record<string, string> = {};
      for (const field of fields) {
        payload[field.id] = localValues[field.id] ?? "";
      }
      if (Object.keys(payload).length && procurementId) {
        await saveFields({ procurementId, values: payload }).unwrap();
      }
    },
    [getFieldsForStage, localValues, procurementId, saveFields, validateStage],
  );

  return {
    allFields,
    getFieldsForStage,
    values: localValues,
    setValue,
    validateStage,
    persistStage,
    refetch,
  };
}

export function useProcurementFormWorkflowFields(procurementId?: string) {
  const persisted = useWorkflowCustomFieldsAll(procurementId);
  const { data: settingsFields } = useGetWorkflowFieldsQuery("procurement_create", {
    skip: Boolean(procurementId),
  });
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  const customFields = useMemo(() => {
    if (procurementId) return persisted.getFieldsForStage("procurement_create");
    return ((settingsFields as CustomWorkflowField[]) ?? []).filter((f) => f.isActive);
  }, [procurementId, persisted, settingsFields]);

  const setValue = useCallback(
    (fieldId: string, value: string) => {
      if (procurementId) {
        persisted.setValue(fieldId, value);
        return;
      }
      setDraftValues((prev) => ({ ...prev, [fieldId]: value }));
    },
    [procurementId, persisted],
  );

  const values = procurementId ? persisted.values : draftValues;

  const validate = useCallback(() => {
    for (const field of customFields) {
      if (field.required && !(values[field.id] ?? "").trim()) {
        return `“${field.label}” is required`;
      }
    }
    return null;
  }, [customFields, values]);

  const persist = useCallback(async () => {
    const err = validate();
    if (err) throw new Error(err);
    const payload: Record<string, string> = {};
    for (const field of customFields) {
      payload[field.id] = values[field.id] ?? "";
    }
    if (!procurementId) return payload;
    if (Object.keys(payload).length) {
      await persisted.persistStage("procurement_create");
    }
    return payload;
  }, [customFields, procurementId, persisted, validate, values]);

  return {
    customFields,
    values,
    setValue,
    validate,
    persist,
  };
}
