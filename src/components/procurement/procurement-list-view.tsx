"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Download,
  Eye,
  Filter,
  Plus,
  RotateCcw,
  Tag,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProcurementCrudActions } from "@/components/procurement/procurement-crud-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/loading-state";
import { Input, Select } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination";
import { countdownTone, formatCountdown } from "@/lib/client/countdown";
import { apiPath } from "@/lib/config/app-config";
import { formatCurrency } from "@/lib/currency";
import { formatDualDate } from "@/lib/dates/display";
import {
  getWorkflowQueue,
  type WorkflowQueueKey,
} from "@/lib/procurement/workflow-queues";
import { STATUS_LABELS } from "@/lib/procurement/workflow";
import { useListProcurementsQuery } from "@/store/api/procurementsApi";
import { hasPermission } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import type { ProcurementStatus } from "@prisma/client";

type ProcurementListViewProps = {
  queue?: WorkflowQueueKey;
  /** @deprecated use queue */
  stage?: WorkflowQueueKey;
};

export function ProcurementListView({ queue, stage }: ProcurementListViewProps) {
  const queueKey = queue ?? stage ?? "all";
  const config = getWorkflowQueue(queueKey);
  const user = useAppSelector((s) => s.auth.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [bidTypeId, setBidTypeId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const showCountdown = config.showCountdown;
  const showBidderCount = config.showBidderCount;
  const showDaysInStage = config.showDaysInStage;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const statusOptions = useMemo(() => {
    if (config.statuses) {
      return config.statuses.map((s) => [s, STATUS_LABELS[s]] as const);
    }
    return Object.entries(STATUS_LABELS);
  }, [config.statuses]);

  const { data, isLoading } = useListProcurementsQuery({
    page,
    pageSize: 25,
    search: search || undefined,
    status: status || undefined,
    queue: queueKey !== "all" && !status ? queueKey : undefined,
    bidTypeId: bidTypeId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sort,
    order,
  });

  const bidTypes = useMemo(() => {
    const map = new Map<string, string>();
    data?.data.forEach((row) => {
      if (row.bidTypeId && row.bidTypeName) map.set(row.bidTypeId, row.bidTypeName);
    });
    return [...map.entries()];
  }, [data?.data]);

  const activeFilterCount = [search, status, bidTypeId, dateFrom, dateTo].filter(Boolean).length;

  function resetFilters() {
    setSearch("");
    setStatus("");
    setBidTypeId("");
    setDateFrom("");
    setDateTo("");
    setSort("createdAt");
    setOrder("desc");
    setPage(1);
  }

  const exportParams = new URLSearchParams({
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(queueKey !== "all" && !status ? { queue: queueKey } : {}),
  });

  const exportUrl = `${apiPath("/api/procurements/export")}?${exportParams.toString()}`;
  const StageIcon = config.icon;

  return (
    <AppShell title={config.label}>
      <Card padding="default" className="border-[var(--color-primary)]/10">
        <CardHeader className="mb-0 gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <StageIcon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <CardTitle>{config.label}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            {hasPermission(user, "procurement.export") && (
              <a href={exportUrl} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none">
                <Button variant="secondary" type="button" className="w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </a>
            )}
            {hasPermission(user, "procurement.create") && queueKey === "all" && (
              <Link href="/procurements/new" className="flex-1 sm:flex-none">
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Filter className="h-4 w-4 text-[var(--color-primary)]" />
                Search &amp; filters
                {activeFilterCount > 0 && (
                  <Badge tone="primary">{activeFilterCount} active</Badge>
                )}
              </CardTitle>
              <CardDescription>Refine results by keyword, status, dates, and sort order</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="lg:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                {filtersOpen ? "Hide" : "Show"}
              </Button>
              {activeFilterCount > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <div
          className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${
            filtersOpen ? "" : "hidden lg:grid"
          }`}
        >
          <div className="sm:col-span-2 xl:col-span-2">
            <Input
              label="Search"
              placeholder="Title, item, DTSSR…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">
              {config.statuses ? `All in ${config.shortLabel}` : "All statuses"}
            </option>
            {statusOptions.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select
            label="Bid type"
            value={bidTypeId}
            onChange={(e) => {
              setBidTypeId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All bid types</option>
            {bidTypes.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Input
            label="Notice from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="Notice to"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
          <Select
            label="Sort by"
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(":");
              setSort(s ?? "createdAt");
              setOrder((o as "asc" | "desc") ?? "desc");
              setPage(1);
            }}
          >
            <option value="createdAt:desc">Newest first</option>
            <option value="createdAt:asc">Oldest first</option>
            <option value="noticeDate:desc">Notice date (newest)</option>
            <option value="noticeDate:asc">Notice date (oldest)</option>
            <option value="title:asc">Title (A–Z)</option>
            <option value="title:desc">Title (Z–A)</option>
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {data?.meta.total != null
                ? `${data.meta.total} procurement${data.meta.total === 1 ? "" : "s"}`
                : "Loading results…"}
            </CardDescription>
          </div>
        </CardHeader>

        {isLoading ? (
          <LoadingState />
        ) : !data?.data.length ? (
          <EmptyState
            title="No procurements found"
            description="Try adjusting your filters or create a new procurement."
            action={
              hasPermission(user, "procurement.create") && queueKey === "all" ? (
                <Link href="/procurements/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    New procurement
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Mobile / tablet cards */}
            <div className="space-y-3 md:hidden">
              {data.data.map((row) => {
                const countdown = showCountdown
                  ? formatCountdown(row.workCountdownDueDate, now)
                  : null;
                const tone = showCountdown
                  ? countdownTone(row.workCountdownDueDate, now)
                  : "default";
                return (
                  <article
                    key={row.id}
                    className="data-card rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-strong)]/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-display truncate text-sm font-bold text-[var(--color-text)]">
                          {row.title}
                        </h4>
                        <p className="mt-0.5 truncate text-sm text-[var(--color-text-soft)]">
                          {row.itemName}
                        </p>
                      </div>
                      <Badge tone="primary">
                        {STATUS_LABELS[row.status as ProcurementStatus] ?? row.status}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <dt className="text-[var(--color-text-soft)]">Bid type</dt>
                        <dd className="font-medium">{row.bidTypeName ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-soft)]">Estimate</dt>
                        <dd className="font-medium">{formatCurrency(row.costEstimate)}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[var(--color-text-soft)]">Notice date</dt>
                        <dd className="font-medium">{formatDualDate(row.noticeDate)}</dd>
                      </div>
                      {showBidderCount && (
                        <div>
                          <dt className="text-[var(--color-text-soft)]">Active bidders</dt>
                          <dd className="font-medium">{row.activeBidderCount ?? "—"}</dd>
                        </div>
                      )}
                      {showDaysInStage && (
                        <div>
                          <dt className="text-[var(--color-text-soft)]">Days in stage</dt>
                          <dd className="font-medium">
                            {row.daysInStage != null ? `${row.daysInStage}d` : "—"}
                          </dd>
                        </div>
                      )}
                      {showCountdown && (
                        <div>
                          <dt className="text-[var(--color-text-soft)]">Countdown</dt>
                          <dd>
                            <Badge tone={tone}>{countdown}</Badge>
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
                      <Link
                        href={`/procurements/${row.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]"
                      >
                        <Eye className="h-4 w-4" />
                        View details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <ProcurementCrudActions id={row.id} title={row.title} layout="inline" />
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="table-wrap hidden md:block">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Item</th>
                    <th>Status</th>
                    <th className="hidden lg:table-cell">Bid type</th>
                    <th className="hidden xl:table-cell">Notice</th>
                    <th className="hidden lg:table-cell">Estimate</th>
                    {showBidderCount && <th>Active bidders</th>}
                    {showDaysInStage && <th>Days in stage</th>}
                    {showCountdown && <th>Countdown</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => {
                    const countdown = showCountdown
                      ? formatCountdown(row.workCountdownDueDate, now)
                      : null;
                    const tone = showCountdown
                      ? countdownTone(row.workCountdownDueDate, now)
                      : "default";
                    return (
                      <tr key={row.id}>
                        <td className="max-w-[200px] font-semibold xl:max-w-xs">
                          <span className="line-clamp-2">{row.title}</span>
                        </td>
                        <td className="max-w-[160px]">
                          <span className="line-clamp-2">{row.itemName}</span>
                        </td>
                        <td>
                          <Badge tone="primary">
                            {STATUS_LABELS[row.status as ProcurementStatus] ?? row.status}
                          </Badge>
                        </td>
                        <td className="hidden lg:table-cell">{row.bidTypeName ?? "—"}</td>
                        <td className="hidden whitespace-nowrap xl:table-cell">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-[var(--color-text-soft)]" />
                            {formatDualDate(row.noticeDate)}
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap lg:table-cell">
                          <span className="inline-flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-[var(--color-text-soft)]" />
                            {formatCurrency(row.costEstimate)}
                          </span>
                        </td>
                        {showBidderCount && (
                          <td className="whitespace-nowrap font-semibold">
                            {row.activeBidderCount ?? "—"}
                          </td>
                        )}
                        {showDaysInStage && (
                          <td className="whitespace-nowrap">
                            {row.daysInStage != null ? (
                              <Badge tone={row.daysInStage > 14 ? "ALMOST_DUE" : "primary"}>
                                {row.daysInStage}d
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                        {showCountdown && (
                          <td className="whitespace-nowrap">
                            <Badge tone={tone}>{countdown}</Badge>
                          </td>
                        )}
                        <td>
                          <div className="flex flex-col gap-1.5">
                            <Link
                              href={`/procurements/${row.id}`}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                            <ProcurementCrudActions id={row.id} title={row.title} layout="inline" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        )}
      </Card>
    </AppShell>
  );
}
