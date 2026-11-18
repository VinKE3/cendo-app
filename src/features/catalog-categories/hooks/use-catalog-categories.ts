"use client";

import { useState } from "react";
import { toast } from "sonner";
import type {
  CatalogCategoryItem,
  CategoryScope,
} from "../catalog-categories.schema";
import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
} from "../actions/catalog-categories.actions";

export function useCatalogCategories(options: {
  scope: CategoryScope;
  initialCategories: CatalogCategoryItem[];
  onRenameSuccess?: (oldName: string, newName: string) => void;
}) {
  const [categories, setCategories] = useState<CatalogCategoryItem[]>(
    options.initialCategories
  );
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    const res = await createCategoryAction({
      scope: options.scope,
      name: newName.trim(),
    });
    setIsCreating(false);

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo crear la categoría.");
      return;
    }

    setCategories((prev) =>
      [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name))
    );
    setNewName("");
    toast.success(`Categoría "${res.data.name}" agregada.`);
  };

  const startEditing = (item: CatalogCategoryItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleRename = async (item: CatalogCategoryItem) => {
    if (!editingName.trim() || editingName.trim() === item.name) {
      cancelEditing();
      return;
    }

    setBusyId(item.id);
    const res = await renameCategoryAction({
      id: item.id,
      scope: options.scope,
      name: editingName.trim(),
    });
    setBusyId(null);

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo renombrar la categoría.");
      return;
    }

    setCategories((prev) =>
      prev
        .map((c) => (c.id === item.id ? res.data! : c))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    options.onRenameSuccess?.(item.name, res.data.name);
    cancelEditing();
    toast.success(`Categoría actualizada a "${res.data.name}".`);
  };

  const handleDelete = async (item: CatalogCategoryItem) => {
    setBusyId(item.id);
    const res = await deleteCategoryAction({
      id: item.id,
      scope: options.scope,
    });
    setBusyId(null);

    if (!res.success) {
      toast.error(res.error || "No se pudo eliminar la categoría.");
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== item.id));
    toast.success(`Categoría "${item.name}" eliminada.`);
  };

  const syncUsageCounts = (namesInUse: string[]) => {
    const map = new Map<string, number>();
    for (const raw of namesInUse) {
      const key = raw.trim().toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        usageCount: map.get(c.name.trim().toLowerCase()) ?? 0,
      }))
    );
  };

  return {
    categories,
    categoryNames: categories.map((c) => c.name),
    open,
    setOpen,
    newName,
    setNewName,
    isCreating,
    editingId,
    editingName,
    setEditingName,
    busyId,
    handleCreate,
    startEditing,
    cancelEditing,
    handleRename,
    handleDelete,
    syncUsageCounts,
  };
}
