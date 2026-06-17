import { baseApi } from "@/store/api/baseApi";
import type { DashboardUpcoming } from "@/types/api";

export type DashboardData = {
  statusCounts: Array<{ status: string; _count: { id: number } }>;
  upcoming: DashboardUpcoming[];
  workCountdown: Array<{
    procurementId: string;
    title: string;
    status: string;
    dueDate: string;
    remainingDays: number;
  }>;
  totals: { active: number; inProgress: number };
};

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardData, void>({
      query: () => "/dashboard",
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
