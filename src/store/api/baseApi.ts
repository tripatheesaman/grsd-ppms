import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { apiPath } from "@/lib/config/app-config";
import { setSession, clearSession } from "@/store/slices/authSlice";
import type { AuthUserDto } from "@/types/api";

type AuthState = {
  accessToken: string | null;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiPath("/api"),
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    const refresh = await rawBaseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions,
    );
    if (refresh.data) {
      const data = refresh.data as { accessToken: string; user: AuthUserDto };
      api.dispatch(setSession(data));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearSession());
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "Procurements",
    "Procurement",
    "Settings",
    "Lookups",
    "Users",
    "Permissions",
    "Templates",
    "Dashboard",
    "Notifications",
    "Audit",
    "Calendar",
    "Reminders",
    "WorkflowFields",
    "WorkflowFieldValues",
  ],
  endpoints: () => ({}),
});
