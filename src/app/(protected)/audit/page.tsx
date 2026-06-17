"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PaginationBar } from "@/components/ui/pagination";
import { useGetAuditLogsQuery } from "@/store/api/usersApi";

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetAuditLogsQuery({ page, pageSize: 50 });

  return (
    <AppShell title="Audit log">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>System audit trail</CardTitle>
            <CardDescription>Immutable record of user actions across the system</CardDescription>
          </div>
        </CardHeader>
        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data as Array<Record<string, unknown>>)?.map((log) => (
                    <tr key={String(log.id)}>
                      <td className="whitespace-nowrap text-xs sm:text-sm">
                        {new Date(String(log.createdAt)).toLocaleString()}
                      </td>
                      <td>
                        {(log.user as Record<string, unknown>)?.email
                          ? String((log.user as Record<string, unknown>).email)
                          : "—"}
                      </td>
                      <td>
                        <code className="rounded bg-[var(--color-surface-strong)] px-1.5 py-0.5 text-xs">
                          {String(log.action)}
                        </code>
                      </td>
                      <td className="text-xs sm:text-sm">
                        {String(log.entityType)}
                        {log.entityId ? ` · ${String(log.entityId).slice(0, 8)}…` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && (
              <PaginationBar
                page={data.meta.page}
                totalPages={data.meta.totalPages}
                onPrev={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            )}
          </>
        )}
      </Card>
    </AppShell>
  );
}
