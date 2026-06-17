"use client";

import { APP_SHORT_NAME } from "@/lib/brand";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#f0f4fa] p-6 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-[#cdd9eb] bg-white p-8 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest text-[#dc143c]">{APP_SHORT_NAME}</p>
          <h2 className="mt-2 text-xl font-bold text-[#0c1a33]">Something went wrong</h2>
          <p className="mt-2 text-sm text-[#5a6f8f]">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 w-full rounded-xl bg-[#003893] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002566] sm:w-auto"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
