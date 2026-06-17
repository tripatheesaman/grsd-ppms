export function formatCountdown(dueDate: string | null | undefined, now: number): string {
  if (!dueDate) return "—";
  const dueAt = new Date(`${dueDate}T23:59:59`).getTime();
  if (!Number.isFinite(dueAt)) return "—";
  const diffMs = dueAt - now;
  if (diffMs <= 0) return "Due";
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}d ${hours}h`;
}

export function countdownTone(
  dueDate: string | null | undefined,
  now: number,
): "default" | "ALMOST_DUE" | "CRITICAL" | "success" {
  if (!dueDate) return "default";
  const dueAt = new Date(`${dueDate}T23:59:59`).getTime();
  const diffMs = dueAt - now;
  if (diffMs <= 0) return "CRITICAL";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 3) return "ALMOST_DUE";
  return "success";
}
