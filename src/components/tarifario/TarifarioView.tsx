"use client";

import { useState } from "react";
import {
  MessageCircle,
  Pencil,
  Plus,
  Receipt,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { ManageCategoriesModal } from "@/components/common/ManageCategoriesModal";
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
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import { useTarifario } from "@/features/tarifario/hooks/use-tarifario";
import type { ProcedureTariffItem } from "@/features/tarifario/tarifario.schema";
import type { CalendarClinicInfo } from "@/lib/calendar-export";
import { cn, formatCurrency } from "@/lib/utils";
import { generateTariffWhatsAppUrl } from "@/lib/whatsapp-share";
import { TariffModal } from "./TariffModal";

interface TarifarioViewProps {
  initialItems: ProcedureTariffItem[];
  initialCategories: CatalogCategoryItem[];
  clinicInfo?: CalendarClinicInfo;
  canEdit: boolean;
  canDelete: boolean;
}

export function TarifarioView({
  initialItems,
  initialCategories,
  clinicInfo,
  canEdit,
  canDelete,
}: TarifarioViewProps) {
  const {
    items,
    allItems,
    totalCount,
    pagination,
    categories,
    categoryManager,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    isSubmitting,
    deletingId,
    openCreateModal,
    openEditModal,
    onSubmit,
    handleDelete,
  } = useTarifario(initialItems, initialCategories);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedItems = allItems.filter((row) => selectedIds.includes(row.id));
  const pageItemIds = items.map((row) => row.id);
  const allPageSelected =
    pageItemIds.length > 0 && pageItemIds.every((id) => selectedIds.includes(id));

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      if (allPageSelected) {
        return prev.filter((id) => !pageItemIds.includes(id));
      }
      const next = new Set(prev);
      for (const id of pageItemIds) {
        next.add(id);
      }
      return Array.from(next);
    });
  };

  const sendTariffsWhatsApp = (targetItems: ProcedureTariffItem[]) => {
    if (targetItems.length === 0) return;
    const url = generateTariffWhatsAppUrl(
      targetItems.map((t) => ({
        code: t.code,
        name: t.name,
        category: t.category,
        price: t.price,
        description: t.description,
      })),
      clinicInfo
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const onDeleteRow = async (id: string) => {
    await handleDelete(id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              CATÁLOGO OFICIAL • {totalCount} PRESTACIONES
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Tarifario de Exámenes y Procedimientos
          </h1>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => categoryManager.setOpen(true)}
            >
              <Tags className="size-4" />
              Gestionar Categorías
            </Button>
            <Button type="button" onClick={openCreateModal}>
              <Plus className="size-4" />
              Nueva Tarifa
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, procedimiento o detalle..."
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
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                categoryFilter === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="text-xs text-foreground">
            <strong className="text-primary">
              {selectedItems.length}{" "}
              {selectedItems.length === 1
                ? "tarifa seleccionada"
                : "tarifas seleccionadas"}
            </strong>{" "}
            <span className="font-mono text-muted-foreground">
              • Total referencial:{" "}
              {formatCurrency(
                selectedItems.reduce((acc, row) => acc + Number(row.price || 0), 0)
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => sendTariffsWhatsApp(selectedItems)}
            >
              <MessageCircle className="size-3.5" />
              Enviar {selectedItems.length} tarifa(s) por WhatsApp
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              <X className="size-3.5" />
              Limpiar selección
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectPage}
                  aria-label="Seleccionar tarifas de esta página"
                  className="size-3.5 cursor-pointer accent-primary"
                />
              </TableHead>
              <TableHead className="w-28">Código</TableHead>
              <TableHead>Procedimiento / Servicio</TableHead>
              <TableHead className="w-36">Categoría</TableHead>
              <TableHead className="w-28 text-right">Precio (S/)</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <TableRow
                    key={item.id}
                    className={isSelected ? "bg-primary/5" : undefined}
                  >
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectId(item.id)}
                        aria-label={`Seleccionar ${item.code}`}
                        className="size-3.5 cursor-pointer accent-primary"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {item.code}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[11px]">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-foreground tabular-nums">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px]",
                          item.active
                            ? "border-success/40 bg-success/10 text-success"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.active ? "ACTIVO" : "INACTIVO"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => sendTariffsWhatsApp([item])}
                          aria-label={`Enviar ${item.code} por WhatsApp`}
                          title="Enviar tarifa por WhatsApp"
                          className="text-success hover:bg-success/10 hover:text-success"
                        >
                          <MessageCircle className="size-3.5" />
                        </Button>
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEditModal(item)}
                            aria-label={`Editar ${item.code}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={deletingId === item.id}
                            onClick={() => void onDeleteRow(item.id)}
                            aria-label={`Eliminar ${item.code}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No hay prestaciones que coincidan con el filtro actual.
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
        itemLabel="prestaciones"
      />

      <TariffModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        categories={categories}
        form={form}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />

      <ManageCategoriesModal
        open={categoryManager.open}
        onOpenChange={categoryManager.setOpen}
        title="Gestionar Categorías del Tarifario"
        description="Agregue, renombre o elimine categorías de prestaciones médicas. Solo se pueden eliminar categorías sin tarifas asociadas."
        placeholder="Ej. Cirugía Laparoscópica"
        categories={categoryManager.categories}
        newName={categoryManager.newName}
        onNewNameChange={categoryManager.setNewName}
        isCreating={categoryManager.isCreating}
        editingId={categoryManager.editingId}
        editingName={categoryManager.editingName}
        onEditingNameChange={categoryManager.setEditingName}
        busyId={categoryManager.busyId}
        onCreate={categoryManager.handleCreate}
        onStartEdit={categoryManager.startEditing}
        onCancelEdit={categoryManager.cancelEditing}
        onSaveRename={categoryManager.handleRename}
        onDelete={categoryManager.handleDelete}
      />
    </div>
  );
}
