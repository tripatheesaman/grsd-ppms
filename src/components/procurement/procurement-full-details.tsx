"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { buildFullDetailSections } from "@/lib/procurement/detail-display";

type Props = {
  procurement: Record<string, unknown>;
  open: boolean;
  onClose: () => void;
};

export function ProcurementFullDetails({ procurement, open, onClose }: Props) {
  const sections = buildFullDetailSections(procurement);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="procurement-full-details-title"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-6 py-4">
          <h2
            id="procurement-full-details-title"
            className="text-lg font-semibold text-[var(--color-text)]"
          >
            Full procurement details
          </h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-6 py-4">
          {sections.map((section) => (
            <section key={section.title} className="mb-8 last:mb-0">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                {section.title}
              </h3>
              <dl className="space-y-2 text-sm">
                {section.rows.map((row, index) => (
                  <div
                    key={`${section.title}-${row.label}-${index}`}
                    className="flex flex-col gap-0.5 border-b border-[var(--color-border)]/40 py-2 sm:flex-row sm:justify-between sm:gap-4"
                  >
                    <dt className="shrink-0 text-[var(--color-text-soft)]">{row.label}</dt>
                    <dd className="font-medium text-[var(--color-text)] sm:text-right">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
