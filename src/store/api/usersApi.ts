import { baseApi } from "@/store/api/baseApi";
import type { PaginatedMeta, PermissionCatalogItem } from "@/types/api";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<
      { data: unknown[]; meta: PaginatedMeta },
      Record<string, string | number | undefined>
    >({
      query: (params) => ({ url: "/users", params }),
      providesTags: ["Users"],
    }),
    createUser: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation<unknown, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PUT", body }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: ["Users"],
    }),
    getUserPermissions: builder.query<{ permissions: unknown[] }, string>({
      query: (id) => `/users/${id}/permissions`,
    }),
    updateUserPermissions: builder.mutation<
      { success: boolean },
      { id: string; permissions: Array<{ permissionId: string; allowed: boolean }> }
    >({
      query: ({ id, permissions }) => ({
        url: `/users/${id}/permissions`,
        method: "PUT",
        body: permissions,
      }),
    }),
    getPermissionCatalog: builder.query<PermissionCatalogItem[], void>({
      query: () => "/permissions",
      providesTags: ["Permissions"],
    }),
    updateRolePermissions: builder.mutation<
      { success: boolean },
      { role: string; permissions: Array<{ permissionId: string; allowed: boolean }> }
    >({
      query: (body) => ({ url: "/permissions", method: "PUT", body }),
      invalidatesTags: ["Permissions"],
    }),
    getAuditLogs: builder.query<
      { data: unknown[]; meta: PaginatedMeta },
      Record<string, string | number | undefined>
    >({
      query: (params) => ({ url: "/audit", params }),
      providesTags: ["Audit"],
    }),
    getNotifications: builder.query<
      { data: unknown[]; meta: PaginatedMeta },
      Record<string, string | number | undefined>
    >({
      query: (params) => ({ url: "/notifications", params }),
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "POST" }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserPermissionsQuery,
  useUpdateUserPermissionsMutation,
  useGetPermissionCatalogQuery,
  useUpdateRolePermissionsMutation,
  useGetAuditLogsQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} = usersApi;
