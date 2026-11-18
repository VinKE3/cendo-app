"use client";

import { Pencil, Pill, Plus, Search, Tags, Trash2 } from "lucide-react";
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
import { useVademecum } from "@/features/vademecum/hooks/use-vademecum";
import type { MedicationItem } from "@/features/vademecum/vademecum.schema";
import { formatCurrency } from "@/lib/utils";
import { VademecumModal } from "./VademecumModal";

interface VademecumViewProps {
  initialItems: MedicationItem[];
  initialCategories: CatalogCategoryItem[];
  canEdit: boolean;
  canDelete: boolean;
}

export function VademecumView({
  initialItems,
  initialCategories,
  canEdit,
  canDelete,
}: VademecumViewProps) {
  const {
    items,
    totalCount,
    pagination,
    therapeuticGroups,
    categoryManager,
    search,
    setSearch,
    groupFilter,
    setGroupFilter,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    brandsFieldArray,
    isSubmitting,
    deletingId,
    openCreateModal,
    openEditModal,
    onSubmit,
    handleDelete,
  } = useVademecum(initialItems, initialCategories);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Pill className="size-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              VADEMÉCUM CLÍNICO • {totalCount} FÁRMACOS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Vademécum Farmacológico y Marcas Comerciales
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
              Nuevo Fármaco
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
            placeholder="Buscar genérico, marca comercial, laboratorio o ATC..."
            className="bg-card pl-9"
          />
        </div>

        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none focus-visible:border-ring"
          aria-label="Filtrar por grupo terapéutico"
        >
          <option value="ALL">Todos los grupos terapéuticos</option>
          {therapeuticGroups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">ATC</TableHead>
              <TableHead>Principio Activo & Grupo</TableHead>
              <TableHead>Marcas Comerciales & Precio Ref.</TableHead>
              {canEdit || canDelete ? (
                <TableHead className="w-24 text-right">Acciones</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {item.atcCode || "—"}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal">
                    <p className="font-semibold text-foreground">{item.genericName}</p>
                    <p className="text-xs text-muted-foreground">{item.therapeuticGroup}</p>
                    {item.indications ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {item.indications}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-col gap-1.5">
                      {item.commercialBrands.map((brand, idx) => (
                        <div
                          key={`${brand.brandName}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground">
                              {brand.brandName}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              • {brand.laboratory} ({brand.presentation})
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="shrink-0 font-mono text-[11px] tabular-nums"
                          >
                            {formatCurrency(brand.referencePricePen)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  {canEdit || canDelete ? (
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEditModal(item)}
                            aria-label={`Editar ${item.genericName}`}
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
                            onClick={() => handleDelete(item.id)}
                            aria-label={`Eliminar ${item.genericName}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={canEdit || canDelete ? 4 : 3}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No se encontraron fármacos con ese criterio.
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
        itemLabel="fármacos"
      />

      <VademecumModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        therapeuticGroups={therapeuticGroups}
        form={form}
        brandsFieldArray={brandsFieldArray}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />

      <ManageCategoriesModal
        open={categoryManager.open}
        onOpenChange={categoryManager.setOpen}
        title="Gestionar Grupos Terapéuticos"
        description="Agregue, renombre o elimine grupos terapéuticos del Vademécum. Solo se pueden eliminar grupos sin fármacos asignados."
        placeholder="Ej. Hormonoterapia / TRH Climatérica"
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
