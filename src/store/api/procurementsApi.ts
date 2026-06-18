import { baseApi } from "@/store/api/baseApi";
import type { PaginatedMeta, ProcurementListItem } from "@/types/api";

export type ProcurementListResponse = {
  data: ProcurementListItem[];
  meta: PaginatedMeta;
};

export const procurementsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listProcurements: builder.query<
      ProcurementListResponse,
      Record<string, string | number | undefined>
    >({
      query: (params) => ({
        url: "/procurements",
        params: Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
        ),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((p) => ({ type: "Procurements" as const, id: p.id })),
              { type: "Procurements", id: "LIST" },
            ]
          : [{ type: "Procurements", id: "LIST" }],
    }),
    getProcurementQueueCounts: builder.query<
      { counts: Partial<Record<string, number>> },
      void
    >({
      query: () => "/procurements/queue-counts",
      providesTags: [{ type: "Procurements", id: "QUEUE_COUNTS" }],
    }),
    getProcurementWorkflowFields: builder.query<
      {
        fields: unknown[];
        values: Record<string, string>;
        fieldOrderByStage?: Record<string, Array<{ fieldRef: string; sortOrder: number }>>;
      },
      { procurementId: string; stageKey?: string }
    >({
      query: ({ procurementId, stageKey }) => ({
        url: `/procurements/${procurementId}/workflow-fields`,
        params: stageKey ? { stageKey } : undefined,
      }),
      providesTags: (_r, _e, { procurementId }) => [
        { type: "Procurement", id: procurementId },
        { type: "WorkflowFieldValues", id: procurementId },
      ],
    }),
    saveProcurementWorkflowFields: builder.mutation<
      { success: boolean },
      { procurementId: string; values: Record<string, string> }
    >({
      query: ({ procurementId, values }) => ({
        url: `/procurements/${procurementId}/workflow-fields`,
        method: "PUT",
        body: { values },
      }),
      invalidatesTags: (_r, _e, { procurementId }) => [
        { type: "Procurement", id: procurementId },
        { type: "WorkflowFieldValues", id: procurementId },
      ],
    }),
    getProcurement: builder.query<Record<string, unknown>, string>({
      query: (id) => `/procurements/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Procurement", id }],
    }),
    createProcurement: builder.mutation<Record<string, unknown>, Record<string, unknown>>({
      query: (body) => ({ url: "/procurements", method: "POST", body }),
      invalidatesTags: [
        { type: "Procurements", id: "LIST" },
        { type: "Procurements", id: "QUEUE_COUNTS" },
        "Dashboard",
      ],
    }),
    updateProcurement: builder.mutation<
      Record<string, unknown>,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({ url: `/procurements/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        { type: "Procurements", id: "LIST" },
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    transitionProcurement: builder.mutation<
      Record<string, unknown>,
      { id: string; status: string; payload?: Record<string, unknown> }
    >({
      query: ({ id, status, payload }) => ({
        url: `/procurements/${id}/transition`,
        method: "POST",
        body: { status, payload },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        "Dashboard",
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    saveProcurementCinNumber: builder.mutation<
      Record<string, unknown>,
      {
        id: string;
        cinNumber: string;
        supplierWitnessName: string;
        supplierWitnessDesignation: string;
        supplierSigningAuthorityName: string;
        supplierSigningAuthorityDesignation: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/procurements/${id}/cin`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    correctProcurementStatus: builder.mutation<
      Record<string, unknown>,
      { id: string; action: "STEP_BACK" | "CANCEL" | "REOPEN_COMPLETED" }
    >({
      query: ({ id, action }) => ({
        url: `/procurements/${id}/status-correction`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        "Dashboard",
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    restartProcurement: builder.mutation<Record<string, unknown>, string>({
      query: (id) => ({ url: `/procurements/${id}/restart`, method: "POST" }),
      invalidatesTags: [{ type: "Procurements", id: "LIST" }, { type: "Procurements", id: "QUEUE_COUNTS" }],
    }),
    refreshProcurementSettings: builder.mutation<Record<string, unknown>, string>({
      query: (id) => ({ url: `/procurements/${id}/refresh-settings`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Procurement", id }],
    }),
    saveBidders: builder.mutation<
      { success: boolean; status?: string; bidderCount?: number },
      {
        id: string;
        bidders: Array<{
          name: string;
          address: string;
          phone?: string | null;
          bidResponseDate: string;
        }>;
        finalize?: boolean;
        replaceAll?: boolean;
      }
    >({
      query: ({ id, bidders, finalize, replaceAll }) => ({
        url: `/procurements/${id}/bidders`,
        method: "POST",
        body: { bidders, finalize, replaceAll },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    updateBidder: builder.mutation<
      { id: string; name: string; address: string; phone: string | null; bidResponseDate: string },
      {
        procurementId: string;
        bidderId: string;
        name: string;
        address: string;
        phone?: string | null;
        bidResponseDate: string;
      }
    >({
      query: ({ procurementId, bidderId, ...body }) => ({
        url: `/procurements/${procurementId}/bidders/${bidderId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { procurementId }) => [{ type: "Procurement", id: procurementId }],
    }),
    deleteBidder: builder.mutation<
      { success: boolean; bidderCount: number },
      { procurementId: string; bidderId: string }
    >({
      query: ({ procurementId, bidderId }) => ({
        url: `/procurements/${procurementId}/bidders/${bidderId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { procurementId }) => [{ type: "Procurement", id: procurementId }],
    }),
    setTechnicalResults: builder.mutation<
      { success: boolean },
      { id: string; results: Array<{ bidderId: string; passed: boolean }> }
    >({
      query: ({ id, results }) => ({
        url: `/procurements/${id}/bidders`,
        method: "PATCH",
        body: { results },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    saveCommitteeDecision: builder.mutation<
      Record<string, unknown>,
      {
        id: string;
        winnerBidderId: string;
        bidCurrencyId: string;
        paymentConditionId: string;
        bidAmountWithoutVatLines: Array<{
          currencyId: string;
          amount: number;
          forexRate?: number | null;
        }>;
        bidAmountWithVatLines?: Array<{
          currencyId: string;
          amount: number;
          forexRate?: number | null;
        }>;
        warrantyDays: number;
        workDays: Array<{ workDayCategoryId: string; days: number }>;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/procurements/${id}/committee-decision`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    updatePriceBidSchedule: builder.mutation<
      Record<string, unknown>,
      { id: string; priceBidOpenDate: string }
    >({
      query: ({ id, priceBidOpenDate }) => ({
        url: `/procurements/${id}/price-bid-schedule`,
        method: "PATCH",
        body: { priceBidOpenDate },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    setWinner: builder.mutation<{ success: boolean }, { id: string; bidderId: string }>({
      query: ({ id, bidderId }) => ({
        url: `/procurements/${id}/winner`,
        method: "POST",
        body: { bidderId },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Procurement", id },
        { type: "Procurements", id: "QUEUE_COUNTS" },
      ],
    }),
    generateDocument: builder.mutation<
      { filePath: string; downloadUrl: string },
      { id: string; type: string; bidderId?: string }
    >({
      query: ({ id, type, bidderId }) => ({
        url: `/procurements/${id}/generate/${type}${bidderId ? `?bidderId=${bidderId}` : ""}`,
        method: "POST",
      }),
    }),
    generateTechnicalLetters: builder.mutation<
      {
        filePath: string;
        downloadUrl: string;
        counts: { passed: number; failed: number; total: number };
      },
      string
    >({
      query: (id) => ({
        url: `/procurements/${id}/generate/technical-letters`,
        method: "POST",
      }),
    }),
    deleteProcurement: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/procurements/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Procurements", id: "LIST" }, { type: "Procurements", id: "QUEUE_COUNTS" }],
    }),
  }),
});

export const {
  useListProcurementsQuery,
  useGetProcurementQueueCountsQuery,
  useGetProcurementWorkflowFieldsQuery,
  useSaveProcurementWorkflowFieldsMutation,
  useGetProcurementQuery,
  useCreateProcurementMutation,
  useUpdateProcurementMutation,
  useTransitionProcurementMutation,
  useSaveProcurementCinNumberMutation,
  useCorrectProcurementStatusMutation,
  useRestartProcurementMutation,
  useRefreshProcurementSettingsMutation,
  useSaveBiddersMutation,
  useUpdateBidderMutation,
  useDeleteBidderMutation,
  useSetTechnicalResultsMutation,
  useSaveCommitteeDecisionMutation,
  useUpdatePriceBidScheduleMutation,
  useSetWinnerMutation,
  useGenerateDocumentMutation,
  useGenerateTechnicalLettersMutation,
  useDeleteProcurementMutation,
} = procurementsApi;
