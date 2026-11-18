"use client";

import { BookOpen, Copy, Search, Star } from "lucide-react";
import { TablePagination } from "@/components/common/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Cie10Category } from "@/features/catalogo/cie10.data";
import { useCie10 } from "@/features/catalogo/hooks/use-cie10";
import { cn } from "@/lib/utils";

export function Cie10View() {
  const {
    items,
    totalCount,
    pagination,
    categoryLabels,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    onlyFavorites,
    setOnlyFavorites,
    copyCode,
  } = useCie10();

  const categories = Object.entries(categoryLabels) as Array<[Cie10Category, string]>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              CATÁLOGO CLÍNICO • {totalCount} CÓDIGOS CIE-10
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Catálogo CIE-10 Ginecología y Obstetricia
          </h1>
        </div>

        <Button
          type="button"
          variant={onlyFavorites ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyFavorites((prev) => !prev)}
        >
          <Star className="size-3.5" />
          {onlyFavorites ? "Mostrando Frecuentes" : "Solo Frecuentes"}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código (N80.1), diagnóstico o palabra clave..."
            className="bg-card pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={cn(
              "cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              categoryFilter === "ALL"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Todas las categorías
          </button>
          {categories.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryFilter(key)}
              className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                categoryFilter === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Código</TableHead>
              <TableHead>Descripción Diagnóstica</TableHead>
              <TableHead className="w-56">Área Clínica</TableHead>
              <TableHead className="w-24 text-right">Copiar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.code}>
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      {item.isFavorite ? (
                        <Star className="size-3 fill-warning text-warning" />
                      ) : null}
                      {item.code}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Palabras clave: {item.keywords.join(", ")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px]">
                      {categoryLabels[item.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => copyCode(item)}
                      aria-label={`Copiar ${item.code}`}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No se encontraron códigos CIE-10 con ese criterio.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        onPageChange={pagination.setCurrentPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="códigos CIE-10"
      />
    </div>
  );
}
