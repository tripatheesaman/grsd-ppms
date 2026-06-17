import { baseApi } from "@/store/api/baseApi";
import { clearSession, setSession } from "@/store/slices/authSlice";
import type { AuthUserDto } from "@/types/api";

type LoginResponse = { accessToken: string; user: AuthUserDto };

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setSession(data));
      },
      invalidatesTags: ["Auth"],
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(clearSession());
      },
    }),
    me: builder.query<AuthUserDto, void>({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),
    changePassword: builder.mutation<
      { success: boolean },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: "/profile/password", method: "PUT", body }),
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useMeQuery, useChangePasswordMutation } =
  authApi;
