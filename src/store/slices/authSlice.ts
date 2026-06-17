import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUserDto } from "@/types/api";

type AuthState = {
  accessToken: string | null;
  user: AuthUserDto | null;
};

const initialState: AuthState = {
  accessToken: null,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ accessToken: string; user: AuthUserDto }>) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    clearSession(state) {
      state.accessToken = null;
      state.user = null;
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;

export function hasPermission(user: AuthUserDto | null, key: string): boolean {
  if (!user) return false;
  if (user.role === "SUPERADMIN") return true;
  if (
    user.role === "ADMIN" &&
    (key === "audit.view" || key === "users.view" || key === "users.manage")
  ) {
    return false;
  }
  return user.permissions.some((p) => p.key === key && p.allowed);
}
