import { baseApi } from "@/store/api/baseApi";
import { apiPath } from "@/lib/config/app-config";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<Record<string, unknown>, void>({
      query: () => "/settings",
      providesTags: ["Settings"],
    }),
    updateSettings: builder.mutation<Record<string, unknown>, Record<string, unknown>>({
      query: (body) => ({ url: "/settings", method: "PUT", body }),
      invalidatesTags: ["Settings"],
    }),
    getLookups: builder.query<unknown[], string>({
      query: (entity) => `/settings/lookups/${entity}`,
      providesTags: (_r, _e, entity) => [{ type: "Lookups", id: entity }],
    }),
    createLookup: builder.mutation<unknown, { entity: string; body: Record<string, unknown> }>({
      query: ({ entity, body }) => ({
        url: `/settings/lookups/${entity}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { entity }) => [{ type: "Lookups", id: entity }],
    }),
    updateLookup: builder.mutation<
      unknown,
      { entity: string; id: string; body: Record<string, unknown> }
    >({
      query: ({ entity, id, body }) => ({
        url: `/settings/lookups/${entity}/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { entity }) => [{ type: "Lookups", id: entity }],
    }),
    deleteLookup: builder.mutation<void, { entity: string; id: string }>({
      query: ({ entity, id }) => ({
        url: `/settings/lookups/${entity}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { entity }) => [{ type: "Lookups", id: entity }],
    }),
    getWeeklyOff: builder.query<unknown[], { year?: number; month?: number }>({
      query: (params) => ({ url: "/settings/calendar/weekly-off", params }),
      providesTags: ["Calendar"],
    }),
    createWeeklyOff: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/settings/calendar/weekly-off", method: "POST", body }),
      invalidatesTags: ["Calendar"],
    }),
    updateWeeklyOff: builder.mutation<
      unknown,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/settings/calendar/weekly-off/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Calendar"],
    }),
    deleteWeeklyOff: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/settings/calendar/weekly-off/${id}`, method: "DELETE" }),
      invalidatesTags: ["Calendar"],
    }),
    getHolidays: builder.query<
      unknown[],
      { bsYear?: number; bsMonth?: number; year?: number; month?: number }
    >({
      query: (params) => ({ url: "/settings/calendar/holidays", params }),
      providesTags: ["Calendar"],
    }),
    createHoliday: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/settings/calendar/holidays", method: "POST", body }),
      invalidatesTags: ["Calendar"],
    }),
    saveMonthHolidays: builder.mutation<
      unknown[],
      | { bsYear: number; bsMonth: number; days: number[] }
      | { year: number; month: number; days: number[] }
    >({
      query: (body) => ({
        url: "/settings/calendar/holidays/bulk",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Calendar"],
    }),
    updateHoliday: builder.mutation<
      unknown,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/settings/calendar/holidays/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Calendar"],
    }),
    deleteHoliday: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/settings/calendar/holidays/${id}`, method: "DELETE" }),
      invalidatesTags: ["Calendar"],
    }),
    getReminders: builder.query<unknown[], void>({
      query: () => "/settings/reminders",
      providesTags: ["Reminders"],
    }),
    updateReminders: builder.mutation<{ success: boolean }, unknown[]>({
      query: (body) => ({ url: "/settings/reminders", method: "PUT", body }),
      invalidatesTags: ["Reminders"],
    }),
    getWorkflowFields: builder.query<unknown[], string | void>({
      query: (stageKey) => ({
        url: "/settings/workflow-fields",
        params: stageKey ? { stageKey } : undefined,
      }),
      providesTags: ["WorkflowFields"],
    }),
    createWorkflowField: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/settings/workflow-fields", method: "POST", body }),
      invalidatesTags: ["WorkflowFields"],
    }),
    updateWorkflowField: builder.mutation<
      unknown,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/settings/workflow-fields/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["WorkflowFields"],
    }),
    deleteWorkflowField: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/settings/workflow-fields/${id}`, method: "DELETE" }),
      invalidatesTags: ["WorkflowFields"],
    }),
    getSmtp: builder.query<Record<string, unknown> | null, void>({
      query: () => "/settings/smtp",
    }),
    updateSmtp: builder.mutation<Record<string, unknown>, Record<string, unknown>>({
      query: (body) => ({ url: "/settings/smtp", method: "PUT", body }),
    }),
    getTemplates: builder.query<unknown[], { type?: string; bidTypeId?: string } | void>({
      query: (params) => ({
        url: "/templates",
        params:
          params && typeof params === "object"
            ? {
                ...(params.type ? { type: params.type } : {}),
                ...(params.bidTypeId !== undefined ? { bidTypeId: params.bidTypeId } : {}),
              }
            : undefined,
      }),
      providesTags: ["Templates"],
    }),
    uploadTemplate: builder.mutation<
      Record<string, unknown>,
      { name: string; type: string; bidTypeId?: string | null; file: File }
    >({
      queryFn: async (body, api) => {
        const state = api.getState() as { auth: { accessToken: string | null } };
        const formData = new FormData();
        formData.append("name", body.name);
        formData.append("type", body.type);
        formData.append("file", body.file);
        if (body.bidTypeId) {
          formData.append("bidTypeId", body.bidTypeId);
        } else {
          formData.append("bidTypeId", "null");
        }

        const headers: HeadersInit = {};
        if (state.auth.accessToken) {
          headers.authorization = `Bearer ${state.auth.accessToken}`;
        }

        const response = await fetch(apiPath("/api/templates"), {
          method: "POST",
          body: formData,
          headers,
          credentials: "include",
        });

        const data = await response.json();
        if (!response.ok) {
          const message =
            (data as { error?: { message?: string } })?.error?.message ?? "Upload failed";
          return { error: { status: response.status, data: message } };
        }
        return { data: data as Record<string, unknown> };
      },
      invalidatesTags: ["Templates"],
    }),
    deleteTemplate: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/templates/${id}`, method: "DELETE" }),
      invalidatesTags: ["Templates"],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetLookupsQuery,
  useCreateLookupMutation,
  useUpdateLookupMutation,
  useDeleteLookupMutation,
  useGetWeeklyOffQuery,
  useCreateWeeklyOffMutation,
  useUpdateWeeklyOffMutation,
  useDeleteWeeklyOffMutation,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useSaveMonthHolidaysMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useGetRemindersQuery,
  useUpdateRemindersMutation,
  useGetWorkflowFieldsQuery,
  useCreateWorkflowFieldMutation,
  useUpdateWorkflowFieldMutation,
  useDeleteWorkflowFieldMutation,
  useGetSmtpQuery,
  useUpdateSmtpMutation,
  useGetTemplatesQuery,
  useUploadTemplateMutation,
  useDeleteTemplateMutation,
} = settingsApi;
