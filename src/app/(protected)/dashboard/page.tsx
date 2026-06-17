"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, FolderKanban } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { formatDualDate } from "@/lib/dates/display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/loading-state";
import { StatCard } from "@/components/ui/stat-card";
import { WORKFLOW_QUEUES } from "@/lib/procurement/workflow-queues";
import { STATUS_LABELS } from "@/lib/procurement/workflow";
import { useGetDashboardQuery } from "@/store/api/dashboardApi";
import type { ProcurementStatus } from "@prisma/client";

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardQuery();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  function renderCountdown(dueDate: string) {
    const dueAt = new Date(`${dueDate}T23:59:59`).getTime();
    const diffMs = dueAt - now;
    if (diffMs <= 0) return "Due";
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `${days}d ${hours}h`;
  }

  return (
    <AppShell title="Dashboard">
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Active procurements"
              value={data?.totals.active ?? 0}
              icon={FolderKanban}
              accent="primary"
            />
            <StatCard
              label="In progress / contract"
              value={data?.totals.inProgress ?? 0}
              icon={Activity}
              accent="success"
            />
            <StatCard
              label="Upcoming milestones"
              value={data?.upcoming.length ?? 0}
              icon={AlertTriangle}
              accent="accent"
              className="sm:col-span-2 xl:col-span-1"
            />
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Procurement stages</CardTitle>
                <CardDescription>Jump to workflow-specific lists</CardDescription>
              </div>
            </CardHeader>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {WORKFLOW_QUEUES.filter((s) => s.key !== "all").map((stage) => {
                const Icon = stage.icon;
                return (
                  <Link
                    key={stage.key}
                    href={stage.href}
                    className="group flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-strong)]/30 p-4 transition hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold text-[var(--color-text)]">
                          {stage.shortLabel}
                        </p>
                        <p className="line-clamp-2 text-xs text-[var(--color-text-soft)]">
                          {stage.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-soft)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" />
                    </div>
                  </Link>
                );
              })}
              <Link href="/procurements" className="group flex items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] p-4 transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5">
                <Button variant="ghost" size="sm" className="pointer-events-none">
                  View all procurements
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Upcoming milestones</CardTitle>
                <CardDescription>Procurements requiring attention soon</CardDescription>
              </div>
            </CardHeader>
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Procurement</th>
                    <th>Milestone</th>
                    <th>Date</th>
                    <th>Days</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.upcoming.map((item) => (
                    <tr key={`${item.procurementId}-${item.milestoneKey}`}>
                      <td>
                        <Link
                          href={`/procurements/${item.procurementId}`}
                          className="font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td>{item.milestoneLabel}</td>
                      <td className="whitespace-nowrap">{formatDualDate(item.targetDate)}</td>
                      <td>{item.daysUntil}</td>
                      <td>
                        <Badge tone={item.severity}>{item.severity}</Badge>
                      </td>
                    </tr>
                  ))}
                  {!data?.upcoming.length && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="No upcoming milestones" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Status overview</CardTitle>
                <CardDescription>Procurements grouped by workflow status</CardDescription>
              </div>
            </CardHeader>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data?.statusCounts.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-strong)]/40 px-4 py-3"
                >
                  <span className="text-sm font-medium text-[var(--color-text-soft)]">
                    {STATUS_LABELS[s.status as ProcurementStatus] ?? s.status}
                  </span>
                  <span className="font-display text-xl font-bold text-[var(--color-primary)]">
                    {s._count.id}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Work countdown</CardTitle>
                <CardDescription>Live remaining time after PO issue date</CardDescription>
              </div>
            </CardHeader>
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Procurement</th>
                    <th>Status</th>
                    <th>Due date</th>
                    <th>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.workCountdown.map((item) => (
                    <tr key={item.procurementId}>
                      <td>
                        <Link
                          href={`/procurements/${item.procurementId}`}
                          className="font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td>{STATUS_LABELS[item.status as ProcurementStatus] ?? item.status}</td>
                      <td className="whitespace-nowrap">{formatDualDate(item.dueDate)}</td>
                      <td className="whitespace-nowrap">{renderCountdown(item.dueDate)}</td>
                    </tr>
                  ))}
                  {!data?.workCountdown?.length && (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState title="No active work countdowns" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}
