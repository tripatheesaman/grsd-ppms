"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Mail, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { useGetSmtpQuery, useUpdateSmtpMutation } from "@/store/api/settingsApi";

export function SettingsSmtpPanel() {
  const { data: smtp } = useGetSmtpQuery();
  const [updateSmtp, { isLoading }] = useUpdateSmtpMutation();
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");

  useEffect(() => {
    if (!smtp) return;
    const row = smtp as Record<string, unknown>;
    setHost(String(row.host ?? ""));
    setPort(String(row.port ?? "587"));
    setSecure(Boolean(row.secure));
    setUsername(String(row.username ?? ""));
    setFromEmail(String(row.fromEmail ?? ""));
    setFromName(String(row.fromName ?? ""));
    setPassword("");
  }, [smtp]);

  const configured = Boolean(smtp);
  const configuredHost = smtp ? String((smtp as Record<string, unknown>).host) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle>SMTP configuration</CardTitle>
            <CardDescription>
              Outbound email for milestone reminders and system notifications
            </CardDescription>
          </div>
          <Badge tone={configured ? "success" : "default"}>
            {configured ? "Configured" : "Not configured"}
          </Badge>
        </div>
      </CardHeader>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-strong)]/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Server className="h-5 w-5" />
          </div>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-[var(--color-text)]">
              {configured ? configuredHost : "No SMTP server saved"}
            </p>
            <p className="mt-1 text-[var(--color-text-soft)]">
              {configured
                ? "Reminders can be sent when the scheduler runs and users have valid email addresses."
                : "Configure SMTP to enable email reminders from the cron job."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Input label="SMTP host" value={host} onChange={(e) => setHost(e.target.value)} />
        <Input
          label="SMTP port"
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
        />
        <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-sm">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
          Use secure connection (SSL/TLS)
        </label>
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input
          label={configured ? "Password (leave blank to keep existing)" : "Password"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="From email"
          type="email"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
        />
        <Input
          label="From name"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
        />
      </div>

      <Button
        className="mt-6 w-full sm:w-auto"
        variant="secondary"
        disabled={isLoading}
        onClick={async () => {
          try {
            await updateSmtp({
              host: host.trim(),
              port: Number(port),
              secure,
              username: username.trim(),
              password: password.trim() || undefined,
              fromEmail: fromEmail.trim(),
              fromName: fromName.trim(),
            }).unwrap();
            setPassword("");
            toast.success("SMTP configuration saved");
          } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to save SMTP configuration"));
          }
        }}
      >
        <Mail className="h-4 w-4" />
        Save SMTP
      </Button>
    </Card>
  );
}
