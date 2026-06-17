function normalizeBasePath(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "/ppms";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading !== "/" ? withLeading.replace(/\/+$/, "") : "/";
}

export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? "./uploads-dev";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function withBasePath(path: string): string {
  return `${BASE_PATH}${normalizePath(path)}`;
}

export function apiPath(path: string): string {
  return `${BASE_PATH}${normalizePath(path)}`;
}

export const UPLOADS_BASE_URL = `${BASE_PATH}/uploads`;
