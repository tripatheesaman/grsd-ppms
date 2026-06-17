"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateBsHint } from "@/components/ui/date-bs-hint";
import {
  useGetLookupsQuery,
  useGetSettingsQuery,
} from "@/store/api/settingsApi";
import {
  buildReferenceFormRows,
  mergeLookupOptions,
  firstFieldError,
  sortLookupRows,
  type ProcurementSavedLookups,
} from "@/lib/procurement/form-utils";
import { useProcurementFormWorkflowFields } from "@/lib/procurement/use-workflow-custom-fields";
import { WorkflowStageFields } from "@/components/procurement/workflow-stage-fields";

export type { ProcurementSavedLookups };

const schema = z.object({
  title: z.string().min(1),
  itemName: z.string().min(1),
  dtssrNumber: z.string().optional(),
  mediaOfBidId: z.string().optional(),
  bidTypeId: z.string().min(1),
  sbdId: z.string().optional(),
  contractTypeId: z.string().optional(),
  unitId: z.string().optional(),
  costEstimate: z
    .union([z.string(), z.number()])
    .refine((v) => String(v).trim() !== "" && Number(v) > 0, {
      message: "Enter a cost estimate greater than 0",
    })
    .transform((v) => Number(v)),
  bsfPercent: z.coerce.number().min(0).max(100),
  totalQuantity: z.coerce.number().optional(),
  noticeDate: z.string().min(1),
  scheduledInitiationDate: z.string().optional(),
  prebidTime: z.string().optional(),
  bidSubmissionTime: z.string().optional(),
  bidOpenTime: z.string().optional(),
  references: z
    .array(
      z.object({
        referenceTypeId: z.string().optional(),
        number: z.string(),
      }),
    )
    .min(1)
    .refine((refs) => refs.some((r) => r.number.trim().length > 0), {
      message: "Enter at least one reference number",
    }),
});

export type ProcurementFormInput = z.input<typeof schema>;
export type ProcurementFormParsed = z.output<typeof schema>;
export type ProcurementFormValues = Omit<ProcurementFormParsed, "references"> & {
  references: Array<{ referenceTypeId: string; number: string }>;
};

type Props = {
  defaultValues?: Partial<ProcurementFormInput>;
  savedLookups?: ProcurementSavedLookups;
  procurementId?: string;
  onSubmit: (
    values: ProcurementFormValues,
    workflowValues?: Record<string, string>,
  ) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
};

export function ProcurementForm({
  defaultValues,
  savedLookups,
  procurementId,
  onSubmit,
  loading,
  submitLabel = "Save procurement",
}: Props) {
  const workflow = useProcurementFormWorkflowFields(procurementId);
  const { data: settings } = useGetSettingsQuery();
  const { data: refTypes } = useGetLookupsQuery("reference-types");
  const { data: media } = useGetLookupsQuery("media-of-bid");
  const { data: bidTypes } = useGetLookupsQuery("bid-types");
  const { data: sbds } = useGetLookupsQuery("sbd");
  const { data: contractTypes } = useGetLookupsQuery("contract-types");
  const { data: units } = useGetLookupsQuery("units");
  const emptyDefaults = useMemo(
    (): ProcurementFormInput => ({
      title: "",
      itemName: "",
      dtssrNumber: "",
      mediaOfBidId: "",
      bidTypeId: "",
      sbdId: "",
      contractTypeId: "",
      unitId: "",
      costEstimate: "",
      bsfPercent: (settings?.bsfDefaultPercent as number) ?? 2.5,
      totalQuantity: undefined,
      noticeDate: "",
      scheduledInitiationDate: "",
      prebidTime: (settings?.defaultPrebidTime as string) ?? "12:00",
      bidSubmissionTime: (settings?.defaultBidSubmissionTime as string) ?? "16:00",
      bidOpenTime: (settings?.defaultBidOpenTime as string) ?? "14:00",
      references: [],
    }),
    [settings],
  );

  const form = useForm<ProcurementFormInput, unknown, ProcurementFormParsed>({
    resolver: zodResolver(schema),
    defaultValues: { ...emptyDefaults, ...defaultValues },
  });

  const noticeDate = form.watch("noticeDate");
  const scheduledInitiationDate = form.watch("scheduledInitiationDate");

  const sortedRefTypes = useMemo(
    () =>
      sortLookupRows(
        (refTypes as Array<{ id: string; name: string; sortOrder?: number }> | undefined) ?? [],
      ),
    [refTypes],
  );

  const referenceRows = form.watch("references");
  const { errors, isSubmitted } = form.formState;

  const lookupsReady = Boolean(
    refTypes && media && bidTypes && sbds && contractTypes && units,
  );

  const isEdit = Boolean(defaultValues?.bidTypeId);

  const mediaOfBidId = form.watch("mediaOfBidId");
  const sbdId = form.watch("sbdId");
  const contractTypeId = form.watch("contractTypeId");
  const unitId = form.watch("unitId");

  const mediaOptions = useMemo(
    () =>
      mergeLookupOptions(
        media as Array<{ id: string; name: string }> | undefined,
        mediaOfBidId,
        savedLookups?.mediaOfBid,
      ),
    [media, mediaOfBidId, savedLookups?.mediaOfBid],
  );
  const sbdOptions = useMemo(
    () =>
      mergeLookupOptions(
        sbds as Array<{ id: string; name: string }> | undefined,
        sbdId,
        savedLookups?.sbd,
      ),
    [sbds, sbdId, savedLookups?.sbd],
  );
  const contractTypeOptions = useMemo(
    () =>
      mergeLookupOptions(
        contractTypes as Array<{ id: string; name: string }> | undefined,
        contractTypeId,
        savedLookups?.contractType,
      ),
    [contractTypes, contractTypeId, savedLookups?.contractType],
  );
  const unitOptions = useMemo(
    () =>
      mergeLookupOptions(
        units as Array<{ id: string; name: string }> | undefined,
        unitId,
        savedLookups?.unit,
      ),
    [units, unitId, savedLookups?.unit],
  );

  useEffect(() => {
    if (!lookupsReady || sortedRefTypes.length === 0) return;

    if (isEdit && defaultValues) {
      form.reset({
        ...emptyDefaults,
        ...defaultValues,
        references: buildReferenceFormRows(sortedRefTypes, defaultValues.references ?? []),
      });
      return;
    }

    if (referenceRows.length !== sortedRefTypes.length) {
      form.setValue("references", buildReferenceFormRows(sortedRefTypes, referenceRows));
    }
  }, [
    lookupsReady,
    isEdit,
    defaultValues,
    emptyDefaults,
    sortedRefTypes,
    form,
    referenceRows.length,
  ]);

  function handleInvalid(fieldErrors: FieldErrors<ProcurementFormInput>) {
    toast.error(firstFieldError(fieldErrors) ?? "Please complete all required fields");
  }

  async function handleValid(values: ProcurementFormParsed) {
    const workflowError = workflow.validate();
    if (workflowError) {
      toast.error(workflowError);
      return;
    }

    const payload: ProcurementFormValues = {
      ...values,
      references: buildReferenceFormRows(sortedRefTypes, values.references),
    };

    if (procurementId) {
      await workflow.persist();
      await onSubmit(payload);
      return;
    }

    const workflowValues = (await workflow.persist()) as Record<string, string>;
    await onSubmit(payload, workflowValues);
  }

  return (
    <form onSubmit={form.handleSubmit(handleValid, handleInvalid)} className="space-y-6">
      <Card>
        <CardHeader className="mb-0">
          <div>
            <CardTitle>Basic information</CardTitle>
            <CardDescription>Title, bid type, and classification</CardDescription>
          </div>
        </CardHeader>
        <WorkflowStageFields
          stageKey="procurement_create"
          customFields={workflow.customFields}
          values={workflow.values}
          onValueChange={workflow.setValue}
          className="mt-4 grid gap-4 sm:grid-cols-2"
          visibleBuiltinKeys={[
            "title",
            "itemName",
            "dtssrNumber",
            "mediaOfBidId",
            "bidTypeId",
            "sbdId",
            "contractTypeId",
          ]}
          builtinRenderers={{
            title: (
              <Input
                label="Procurement title"
                error={errors.title?.message}
                {...form.register("title")}
              />
            ),
            itemName: (
              <Input label="Item name" error={errors.itemName?.message} {...form.register("itemName")} />
            ),
            dtssrNumber: <Input label="DTSSR number" {...form.register("dtssrNumber")} />,
            mediaOfBidId: (
              <Controller
                name="mediaOfBidId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Media of bid"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  >
                    <option value="">Select</option>
                    {mediaOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            ),
            bidTypeId: (
              <Controller
                name="bidTypeId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Type of bid"
                    error={errors.bidTypeId?.message}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  >
                    <option value="">Select</option>
                    {(
                      bidTypes as Array<{
                        id: string;
                        name: string;
                        defaultBidDays: number;
                        defaultPriceBidDays?: number;
                      }>
                    )?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.defaultBidDays} bid days, {b.defaultPriceBidDays ?? 7} price bid
                        days)
                      </option>
                    ))}
                  </Select>
                )}
              />
            ),
            sbdId: (
              <Controller
                name="sbdId"
                control={form.control}
                render={({ field }) => (
                  <Select label="SBD" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur}>
                    <option value="">Select</option>
                    {sbdOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            ),
            contractTypeId: (
              <Controller
                name="contractTypeId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Contract type"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  >
                    <option value="">Select</option>
                    {contractTypeOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            ),
          }}
        />
      </Card>

      <Card>
        <CardHeader className="mb-0">
          <div>
            <CardTitle>Reference numbers</CardTitle>
            <CardDescription>
              Enter a number for each type that applies. Leave others blank. At least one is required.
            </CardDescription>
          </div>
        </CardHeader>
        <WorkflowStageFields
          stageKey="procurement_create"
          customFields={workflow.customFields}
          values={workflow.values}
          onValueChange={workflow.setValue}
          className="mt-4 grid gap-4 sm:grid-cols-2"
          visibleBuiltinKeys={["references"]}
          builtinRenderers={{
            references: (
              <>
                {sortedRefTypes.map((refType, index) => (
                  <Input
                    key={refType.id}
                    label={refType.name}
                    error={errors.references?.[index]?.number?.message}
                    {...form.register(`references.${index}.number`)}
                    placeholder={`${refType.name} number (optional)`}
                  />
                ))}
                {errors.references?.message ? (
                  <p className="col-span-full text-sm text-[var(--color-accent)]">
                    {String(errors.references.message)}
                  </p>
                ) : null}
              </>
            ),
          }}
        />
      </Card>

      <Card>
        <CardHeader className="mb-0">
          <div>
            <CardTitle>Financial &amp; dates</CardTitle>
            <CardDescription>Estimates, notice date, and bid schedule times</CardDescription>
          </div>
        </CardHeader>
        <WorkflowStageFields
          stageKey="procurement_create"
          customFields={workflow.customFields}
          values={workflow.values}
          onValueChange={workflow.setValue}
          className="mt-4 grid gap-4 sm:grid-cols-2"
          visibleBuiltinKeys={[
            "unitId",
            "costEstimate",
            "bsfPercent",
            "totalQuantity",
            "noticeDate",
            "scheduledInitiationDate",
            "scheduledCompletionDate",
            "prebidTime",
            "bidSubmissionTime",
            "bidOpenTime",
          ]}
          builtinRenderers={{
            costEstimate: (
              <Input
                label="Cost estimate"
                type="number"
                step="0.01"
                min="0.01"
                error={errors.costEstimate?.message}
                {...form.register("costEstimate")}
              />
            ),
            bsfPercent: (
              <Input label="BSF %" type="number" step="0.01" {...form.register("bsfPercent")} />
            ),
            totalQuantity: (
              <Input label="Total quantity" type="number" step="0.0001" {...form.register("totalQuantity")} />
            ),
            unitId: (
              <Controller
                name="unitId"
                control={form.control}
                render={({ field }) => (
                  <Select label="Unit" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur}>
                    <option value="">Select</option>
                    {unitOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            ),
            noticeDate: (
              <div>
                <Input
                  label="Notice date"
                  type="date"
                  error={errors.noticeDate?.message}
                  {...form.register("noticeDate")}
                />
                <DateBsHint value={noticeDate} />
              </div>
            ),
            scheduledInitiationDate: (
              <div>
                <Input label="Scheduled initiation" type="date" {...form.register("scheduledInitiationDate")} />
                <DateBsHint value={scheduledInitiationDate} />
              </div>
            ),
            scheduledCompletionDate: (
              <p className="text-sm text-[var(--color-text-soft)]">
                Scheduled completion is calculated from notice date and bid type when saved.
              </p>
            ),
            prebidTime: <Input label="Pre-bid time" {...form.register("prebidTime")} />,
            bidSubmissionTime: <Input label="Bid submission time" {...form.register("bidSubmissionTime")} />,
            bidOpenTime: <Input label="Bid open time" {...form.register("bidOpenTime")} />,
          }}
        />
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          disabled={loading || !lookupsReady}
          size="lg"
          className="w-full sm:w-auto"
        >
          {loading ? "Saving…" : !lookupsReady ? "Loading form…" : submitLabel}
        </Button>
        {isSubmitted && Object.keys(errors).length > 0 ? (
          <p className="text-sm text-[var(--color-accent)]">
            {firstFieldError(errors) ?? "Please fix the highlighted fields above."}
          </p>
        ) : null}
      </div>
    </form>
  );
}
