"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery } from "@/store/api/authApi";
import { setSession } from "@/store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.accessToken);
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError } = useMeQuery(undefined, {
    skip: !!user,
  });

  useEffect(() => {
    if (data && token) {
      dispatch(setSession({ accessToken: token, user: data }));
    }
  }, [data, token, dispatch]);

  useEffect(() => {
    if (!isLoading && !user && (isError || !token)) {
      router.replace("/login");
    }
  }, [isLoading, isError, user, token, router]);

  if (isLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
