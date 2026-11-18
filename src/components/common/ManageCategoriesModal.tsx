"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
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
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";

interface ManageCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder: string;
  categories: CatalogCategoryItem[];
  newName: string;
  onNewNameChange: (val: string) => void;
  isCreating: boolean;
  editingId: string | null;
  editingName: string;
  onEditingNameChange: (val: string) => void;
  busyId: string | null;
  onCreate: (e: React.FormEvent) => Promise<void>;
  onStartEdit: (item: CatalogCategoryItem) => void;
  onCancelEdit: () => void;
  onSaveRename: (item: CatalogCategoryItem) => Promise<void>;
  onDelete: (item: CatalogCategoryItem) => Promise<void>;
}

export function ManageCategoriesModal({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  categories,
  newName,
  onNewNameChange,
  isCreating,
  editingId,
  editingName,
  onEditingNameChange,
  busyId,
  onCreate,
  onStartEdit,
  onCancelEdit,
  onSaveRename,
  onDelete,
}: ManageCategoriesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onCreate} className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={isCreating || !newName.trim()}>
            <Plus className="size-4" />
            Agregar
          </Button>
        </form>

        <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/20">
          {categories.length > 0 ? (
            categories.map((cat) => {
              const isEditing = editingId === cat.id;
              const isBusy = busyId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-1.5">
                      <Input
                        value={editingName}
                        onChange={(e) => onEditingNameChange(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={isBusy}
                        onClick={() => onSaveRename(cat)}
                        aria-label="Guardar nombre"
                        className="text-success"
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={onCancelEdit}
                        aria-label="Cancelar edición"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {cat.name}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {cat.usageCount} en uso
                        </Badge>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={isBusy}
                          onClick={() => onStartEdit(cat)}
                          aria-label={`Renombrar ${cat.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={isBusy}
                          onClick={() => onDelete(cat)}
                          aria-label={`Eliminar ${cat.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No hay categorías registradas aún.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
