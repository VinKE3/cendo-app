"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50],
  itemLabel = "registros",
  className,
}: TablePaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);
  const pages = getPageNumbers(safePage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 pt-3 pb-1 text-xs text-muted-foreground select-none sm:flex-row",
        className
      )}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-start">
        {onPageSizeChange ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Mostrar:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              aria-label="Registros por página"
              className="cursor-pointer bg-transparent pr-1 font-mono text-xs font-semibold text-foreground focus:outline-none"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-popover text-popover-foreground">
                  {opt}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-muted-foreground">por pág.</span>
          </div>
        ) : null}

        <div className="text-xs text-muted-foreground">
          Mostrando{" "}
          <span className="font-mono font-semibold text-foreground tabular-nums">
            {startItem}
          </span>{" "}
          -{" "}
          <span className="font-mono font-semibold text-foreground tabular-nums">
            {endItem}
          </span>{" "}
          de{" "}
          <span className="font-mono font-semibold text-foreground tabular-nums">
            {totalItems}
          </span>{" "}
          {itemLabel}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {totalPages > 4 ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={safePage === 1}
            title="Primera página"
            aria-label="Primera página"
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => safePage > 1 && onPageChange(safePage - 1)}
          disabled={safePage === 1}
          title="Página anterior"
        >
          <ChevronLeft className="size-3.5" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        <div className="flex items-center gap-1 px-0.5">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex size-7 items-center justify-center font-mono text-xs text-muted-foreground"
              >
                &hellip;
              </span>
            ) : (
              <Button
                key={`page-${p}`}
                type="button"
                variant={p === safePage ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(p)}
                className="font-mono text-xs tabular-nums"
              >
                {p}
              </Button>
            )
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => safePage < totalPages && onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          title="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="size-3.5" />
        </Button>

        {totalPages > 4 ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage === totalPages}
            title="Última página"
            aria-label="Última página"
          >
            <ChevronsRight className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
