"use client";

import {
  BookOpen,
  Copy,
  Pencil,
  Plus,
  Search,
  Star,
  Tags,
  Trash2,
} from "lucide-react";
import { ManageCategoriesModal } from "@/components/common/ManageCategoriesModal";
import { TablePagination } from "@/components/common/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Cie10RecordItem } from "@/features/cie10/cie10.schema";
import { useCie10 } from "@/features/cie10/hooks/use-cie10";
import { cn } from "@/lib/utils";
import { Cie10Modal } from "./Cie10Modal";

interface Cie10ViewProps {
  initialItems: Cie10RecordItem[];
  initialCategories: CatalogCategoryItem[];
  canEdit: boolean;
  canDelete: boolean;
}

export function Cie10View({
  initialItems,
  initialCategories,
  canEdit,
  canDelete,
}: Cie10ViewProps) {
  const {
    items,
    totalCount,
    filteredCount,
    pagination,
    categories,
    categoryManager,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    onlyFavorites,
    setOnlyFavorites,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    isSubmitting,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    togglingFavoriteId,
    openCreateModal,
    openEditModal,
    onSubmit,
    handleToggleFavorite,
    confirmDelete,
    copyCode,
  } = useCie10(initialItems, initialCategories);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              CATÁLOGO CLÍNICO • {totalCount} CÓDIGOS CIE-10
              {filteredCount !== totalCount
                ? ` (${filteredCount} filtrados)`
                : ""}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Catálogo CIE-10 Ginecología y Obstetricia
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={onlyFavorites ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyFavorites((prev) => !prev)}
          >
            <Star className="size-3.5" />
            {onlyFavorites ? "Mostrando Frecuentes" : "Solo Frecuentes"}
          </Button>

          {canEdit ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => categoryManager.setOpen(true)}
              >
                <Tags className="size-3.5" />
                Gestionar Áreas
              </Button>
              <Button type="button" size="sm" onClick={openCreateModal}>
                <Plus className="size-3.5" />
                Nuevo CIE-10
              </Button>
            </>
          ) : null}
        </div>
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Descripción Diagnóstica</TableHead>
              <TableHead className="w-56">Área Clínica</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => void handleToggleFavorite(item)}
                          disabled={togglingFavoriteId === item.id}
                          aria-label={
                            item.isFavorite
                              ? `Quitar ${item.code} de frecuentes`
                              : `Marcar ${item.code} como frecuente`
                          }
                          title={
                            item.isFavorite
                              ? "Quitar de diagnósticos frecuentes"
                              : "Marcar como diagnóstico frecuente"
                          }
                          className="cursor-pointer rounded p-0.5 transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          <Star
                            className={cn(
                              "size-3.5",
                              item.isFavorite
                                ? "fill-warning text-warning"
                                : "text-muted-foreground/50 hover:text-warning"
                            )}
                          />
                        </button>
                      ) : item.isFavorite ? (
                        <Star className="size-3.5 fill-warning text-warning" />
                      ) : null}
                      {item.code}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.keywords.length > 0 ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Palabras clave: {item.keywords.join(", ")}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px]">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => copyCode(item)}
                        aria-label={`Copiar ${item.code}`}
                        title="Copiar código y diagnóstico"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditModal(item)}
                          aria-label={`Editar ${item.code}`}
                          title="Editar código CIE-10"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Eliminar ${item.code}`}
                          title="Eliminar código CIE-10"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
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

      <Cie10Modal
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
        title="Gestionar Áreas Clínicas CIE-10"
        description="Agregue, renombre o elimine áreas clínicas para organizar el catálogo CIE-10. Solo se pueden eliminar áreas sin diagnósticos asociados."
        placeholder="Ej. Medicina Reproductiva / Uroginecología"
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

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Código CIE-10</DialogTitle>
            <DialogDescription>
              ¿Confirma archivar el código{" "}
              <strong className="font-mono text-foreground">
                {deleteTarget?.code}
              </strong>{" "}
              ({deleteTarget?.name}) del catálogo de la sede? Los registros
              clínicos históricos conservarán su diagnóstico guardado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? "Eliminando..." : "Confirmar Eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
