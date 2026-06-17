"use client";

import toast from "react-hot-toast";
import { apiPath } from "@/lib/config/app-config";
import { useAppSelector } from "@/store/hooks";

export function PlaceholderGuideDownload() {
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  async function download() {
    try {
      const headers: HeadersInit = {};
      if (accessToken) headers.authorization = `Bearer ${accessToken}`;
      const response = await fetch(apiPath("/api/templates/guide"), {
        headers,
        credentials: "include",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        toast.error(data?.error?.message ?? "Download failed");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ppms-placeholder-guide.txt";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
    >
      Download placeholder guide
    </button>
  );
}
