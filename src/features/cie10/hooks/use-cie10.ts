"use client";

import { type SetStateAction, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCie10Catalog } from "@/components/providers/Cie10CatalogProvider";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import { useCatalogCategories } from "@/features/catalog-categories/hooks/use-catalog-categories";
import { usePagination } from "@/hooks/use-pagination";
import {
  createCie10Action,
  deleteCie10Action,
  toggleCie10FavoriteAction,
  updateCie10Action,
} from "../actions/cie10.actions";
import {
  cie10FormSchema,
  DEFAULT_CIE10_CATEGORIES,
  normalizeCie10SearchText,
  parseKeywordsInput,
  type Cie10FormValues,
  type Cie10RecordItem,
} from "../cie10.schema";

function sortCie10Items(list: Cie10RecordItem[]): Cie10RecordItem[] {
  return [...list].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) {
      return a.isFavorite ? -1 : 1;
    }
    return a.code.localeCompare(b.code);
  });
}

export function useCie10(
  initialItems: Cie10RecordItem[],
  initialCategories: CatalogCategoryItem[]
) {
  const { setCatalog } = useCie10Catalog();
  const [items, setItems] = useState<Cie10RecordItem[]>(() =>
    sortCie10Items(initialItems)
  );
  const [search, setSearchState] = useState("");
  const [categoryFilter, setCategoryFilterState] = useState<string>("ALL");
  const [onlyFavorites, setOnlyFavoritesState] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Cie10RecordItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cie10RecordItem | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(
    null
  );

  const applyItemsUpdate = (nextItems: Cie10RecordItem[]) => {
    const sorted = sortCie10Items(nextItems);
    setItems(sorted);
    setCatalog(sorted);
    return sorted;
  };

  const categoryManager = useCatalogCategories({
    scope: "cie10",
    initialCategories,
    onRenameSuccess: (oldName, newName) => {
      const oldLower = oldName.trim().toLowerCase();
      const updated = items.map((row) =>
        row.category.trim().toLowerCase() === oldLower
          ? { ...row, category: newName }
          : row
      );
      applyItemsUpdate(updated);
      if (categoryFilter.trim().toLowerCase() === oldLower) {
        setCategoryFilterState(newName);
      }
    },
  });

  const defaultCategory =
    categoryManager.categoryNames[0] ?? DEFAULT_CIE10_CATEGORIES[0];

  const form = useForm<Cie10FormValues>({
    resolver: zodResolver(cie10FormSchema),
    defaultValues: {
      code: "",
      name: "",
      category: defaultCategory,
      keywordsText: "",
      isFavorite: false,
    },
  });

  const filteredItems = useMemo(() => {
    const q = normalizeCie10SearchText(search);
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }
      if (onlyFavorites && !item.isFavorite) {
        return false;
      }
      if (!q) return true;
      return (
        normalizeCie10SearchText(item.code).includes(q) ||
        normalizeCie10SearchText(item.name).includes(q) ||
        normalizeCie10SearchText(item.category).includes(q) ||
        item.keywords.some((kw) => normalizeCie10SearchText(kw).includes(q))
      );
    });
  }, [items, search, categoryFilter, onlyFavorites]);

  const pagination = usePagination(filteredItems);

  const setSearch = (value: string) => {
    setSearchState(value);
    pagination.resetPage();
  };

  const setCategoryFilter = (value: string) => {
    setCategoryFilterState(value);
    pagination.resetPage();
  };

  const setOnlyFavorites = (value: SetStateAction<boolean>) => {
    setOnlyFavoritesState(value);
    pagination.resetPage();
  };

  const openCreateModal = () => {
    setEditingItem(null);
    form.reset({
      code: "",
      name: "",
      category:
        categoryFilter !== "ALL"
          ? categoryFilter
          : (categoryManager.categoryNames[0] ?? DEFAULT_CIE10_CATEGORIES[0]),
      keywordsText: "",
      isFavorite: false,
    });
    setDialogOpen(true);
  };

  const openEditModal = (item: Cie10RecordItem) => {
    setEditingItem(item);
    form.reset({
      code: item.code,
      name: item.name,
      category: item.category,
      keywordsText: item.keywords.join(", "),
      isFavorite: item.isFavorite,
    });
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      category: values.category.trim(),
      keywords: parseKeywordsInput(values.keywordsText),
      isFavorite: Boolean(values.isFavorite),
    };

    if (editingItem) {
      const res = await updateCie10Action({ ...payload, id: editingItem.id });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar el código CIE-10.");
        return;
      }
      const nextItems = applyItemsUpdate(
        items.map((row) => (row.id === editingItem.id ? res.data! : row))
      );
      categoryManager.syncUsageCounts(nextItems.map((i) => i.category));
      toast.success(`CIE-10 ${res.data.code} actualizado.`);
    } else {
      const res = await createCie10Action(payload);
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo registrar el código CIE-10.");
        return;
      }
      const nextItems = applyItemsUpdate([...items, res.data!]);
      categoryManager.syncUsageCounts(nextItems.map((i) => i.category));
      toast.success(`CIE-10 ${res.data.code} agregado al catálogo.`);
    }

    setDialogOpen(false);
    setEditingItem(null);
  });

  const handleToggleFavorite = async (item: Cie10RecordItem) => {
    setTogglingFavoriteId(item.id);
    const res = await toggleCie10FavoriteAction({
      id: item.id,
      isFavorite: !item.isFavorite,
    });
    setTogglingFavoriteId(null);

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo actualizar el estado frecuente.");
      return;
    }

    applyItemsUpdate(items.map((row) => (row.id === item.id ? res.data! : row)));
    toast.success(
      res.data.isFavorite
        ? `${res.data.code} marcado como frecuente.`
        : `${res.data.code} quitado de frecuentes.`
    );
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    const res = await deleteCie10Action({ id: target.id });
    setDeletingId(null);

    if (!res.success) {
      toast.error(res.error || "No se pudo eliminar el código CIE-10.");
      return;
    }

    const nextItems = applyItemsUpdate(
      items.filter((row) => row.id !== target.id)
    );
    categoryManager.syncUsageCounts(nextItems.map((i) => i.category));
    setDeleteTarget(null);
    toast.success(`Código CIE-10 ${target.code} eliminado del catálogo.`);
  };

  const copyCode = async (item: Cie10RecordItem) => {
    try {
      await navigator.clipboard.writeText(`${item.code} - ${item.name}`);
      toast.success(`Copiado: ${item.code}`);
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  };

  return {
    items: pagination.paginatedItems,
    totalCount: items.length,
    filteredCount: filteredItems.length,
    pagination,
    categories: categoryManager.categoryNames,
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
    isSubmitting: form.formState.isSubmitting,
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
  };
}
