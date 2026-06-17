"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { ShellProvider, useShell } from "@/components/layout/shell-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { useLogoutMutation } from "@/store/api/authApi";
import { useAppSelector } from "@/store/hooks";

function AppShellInner({ children, title }: { children: React.ReactNode; title: string }) {
  const user = useAppSelector((s) => s.auth.user);
  const [logout] = useLogoutMutation();
  const router = useRouter();
  const { openMobileNav } = useShell();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-bg flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-card)]/90 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
                onClick={openMobileNav}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="font-display truncate text-lg font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="hidden items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-strong)]/50 px-3 py-1.5 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/15 text-xs font-bold text-[var(--color-primary)]">
                  {initials || <User className="h-4 w-4" />}
                </div>
                <span className="max-w-[140px] truncate text-sm font-medium text-[var(--color-text)] md:max-w-[200px]">
                  {user?.fullName}
                </span>
              </div>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-label="Log out"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="page-container page-stack">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <ShellProvider>
      <AppShellInner title={title}>{children}</AppShellInner>
    </ShellProvider>
  );
}
