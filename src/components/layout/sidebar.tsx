"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Users,
  ScrollText,
  UserCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useShell } from "@/components/layout/shell-context";
import { WORKFLOW_QUEUES } from "@/lib/procurement/workflow-queues";
import { useGetProcurementQueueCountsQuery } from "@/store/api/procurementsApi";
import { hasPermission } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import type { AuthUserDto } from "@/types/api";
import type { LucideIcon } from "lucide-react";

const topNavItems: { href: string; label: string; permission: string | null; icon: LucideIcon }[] =
  [
    { href: "/dashboard", label: "Dashboard", permission: "dashboard.view", icon: LayoutDashboard },
    { href: "/settings", label: "Settings", permission: "settings.view", icon: Settings },
    { href: "/users", label: "Users", permission: "users.view", icon: Users },
    { href: "/audit", label: "Audit log", permission: "audit.view", icon: ScrollText },
    { href: "/profile", label: "Profile", permission: null, icon: UserCircle },
  ];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  nested,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  nested?: boolean;
  badge?: number;
  onNavigate: () => void;
}) {
  const showBadge = badge != null;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        nested ? "py-2 text-[0.8125rem]" : ""
      } ${
        active
          ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30"
          : "text-[var(--color-text-soft)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]"
      }`}
    >
      <Icon className={`shrink-0 opacity-90 ${nested ? "h-4 w-4" : "h-5 w-5"}`} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {showBadge && (
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold tabular-nums leading-none ${
            active
              ? "bg-white/20 text-white"
              : badge > 0
                ? "bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
                : "bg-[var(--color-surface-strong)] text-[var(--color-text-soft)]"
          }`}
          aria-label={`${badge} items`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user) as AuthUserDto | null;
  const { mobileNavOpen, closeMobileNav } = useShell();
  const [procOpen, setProcOpen] = useState(true);

  const canViewProcurements = hasPermission(user, "procurement.view");
  const { data: queueCountsData } = useGetProcurementQueueCountsQuery(undefined, {
    skip: !canViewProcurements,
    pollingInterval: 60_000,
  });
  const queueCounts = queueCountsData?.counts ?? {};

  const procurementsActive = pathname?.startsWith("/procurements");

  const nav = (
    <>
      <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5 sm:py-5">
        <BrandLogo variant="sidebar" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 sm:p-4" aria-label="Main">
        {topNavItems.slice(0, 1).map((item) => {
          if (item.permission && !hasPermission(user, item.permission)) return null;
          const active = pathname === item.href;
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={active}
              onNavigate={closeMobileNav}
            />
          );
        })}

        {canViewProcurements && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setProcOpen((v) => !v)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                procurementsActive
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "text-[var(--color-text)] hover:bg-[var(--color-surface-strong)]"
              }`}
              aria-expanded={procOpen}
            >
              <span>Procurements</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition ${procOpen ? "rotate-180" : ""}`}
              />
            </button>
            {procOpen && (
              <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-[var(--color-border)] pl-2">
                {WORKFLOW_QUEUES.map((q) => {
                  const active =
                    q.key === "all" ? pathname === "/procurements" : pathname === q.href;
                  const badge = q.showSidebarCount ? (queueCounts[q.key] ?? 0) : undefined;
                  return (
                    <NavLink
                      key={q.key}
                      href={q.href}
                      label={q.shortLabel}
                      icon={q.icon}
                      active={!!active}
                      nested
                      badge={badge}
                      onNavigate={closeMobileNav}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {topNavItems.slice(1).map((item) => {
          if (item.permission && !hasPermission(user, item.permission)) return null;
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={!!active}
              onNavigate={closeMobileNav}
            />
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileNavOpen}
        onClick={closeMobileNav}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,18rem)] flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-lg)] transition-transform duration-300 ease-out lg:hidden ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileNavOpen}
      >
        <div className="flex items-center justify-end border-b border-[var(--color-border)] p-2">
          <button
            type="button"
            onClick={closeMobileNav}
            className="rounded-xl p-2 text-[var(--color-text-soft)] hover:bg-[var(--color-surface-strong)]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>

      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] lg:flex xl:w-72">
        {nav}
      </aside>
    </>
  );
}
