import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaginationBar({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--color-text-soft)]">
        Page <span className="font-semibold text-[var(--color-text)]">{page}</span> of{" "}
        <span className="font-semibold text-[var(--color-text)]">{totalPages}</span>
        {total != null && (
          <>
            {" "}
            · <span className="font-semibold text-[var(--color-text)]">{total}</span> total
          </>
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden xs:inline sm:inline">Previous</span>
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={onNext}>
          <span className="hidden xs:inline sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
