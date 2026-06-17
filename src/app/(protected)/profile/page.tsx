"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Shield } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useChangePasswordMutation } from "@/store/api/authApi";
import { useAppSelector } from "@/store/hooks";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }).unwrap();
      toast.success("Password updated");
      reset();
    } catch {
      toast.error("Failed to update password");
    }
  }

  return (
    <AppShell title="Profile">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your signed-in identity</CardDescription>
            </div>
          </CardHeader>
          <dl className="divide-y divide-[var(--color-border)]">
            {[
              ["Name", user?.fullName],
              ["Email", user?.email],
              ["Role", user?.role],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <dt className="text-sm font-medium text-[var(--color-text-soft)]">{label}</dt>
                <dd className="text-sm font-semibold text-[var(--color-text)]">
                  {label === "Role" ? (
                    <Badge tone={value === "ADMIN" ? "primary" : "default"}>{value}</Badge>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Use at least 8 characters for your new password</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register("currentPassword")}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              <Shield className="h-4 w-4" />
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
