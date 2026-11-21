"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import { useCatalogCategories } from "@/features/catalog-categories/hooks/use-catalog-categories";
import { usePagination } from "@/hooks/use-pagination";
import {
  tariffInputSchema,
  type ProcedureTariffItem,
  type TariffInput,
} from "../tarifario.schema";
import {
  createTariffAction,
  deleteTariffAction,
  updateTariffAction,
} from "../actions/tarifario.actions";

export function useTarifario(
  initialItems: ProcedureTariffItem[],
  initialCategories: CatalogCategoryItem[],
  initialExternalLabs: CatalogCategoryItem[] = []
) {
  const [items, setItems] = useState<ProcedureTariffItem[]>(initialItems);
  const [search, setSearchState] = useState("");
  const [categoryFilter, setCategoryFilterState] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcedureTariffItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryManager = useCatalogCategories({
    scope: "tariff",
    initialCategories,
    onRenameSuccess: (oldName, newName) => {
      setItems((prev) =>
        prev.map((row) =>
          row.category.trim().toLowerCase() === oldName.trim().toLowerCase()
            ? { ...row, category: newName }
            : row
        )
      );
      if (categoryFilter.trim().toLowerCase() === oldName.trim().toLowerCase()) {
        setCategoryFilterState(newName);
      }
    },
  });

  const externalLabManager = useCatalogCategories({
    scope: "external_lab",
    initialCategories: initialExternalLabs,
    onRenameSuccess: (oldName, newName) => {
      const oldLower = oldName.trim().toLowerCase();
      setItems((prev) =>
        prev.map((row) => ({
          ...row,
          providerCosts: row.providerCosts.map((entry) =>
            entry.laboratoryName.trim().toLowerCase() === oldLower
              ? { ...entry, laboratoryName: newName }
              : entry
          ),
        }))
      );
    },
  });

  const defaultCategory = categoryManager.categoryNames[0] ?? "Procedimiento";

  const form = useForm<TariffInput>({
    resolver: zodResolver(tariffInputSchema),
    defaultValues: {
      code: "",
      name: "",
      category: defaultCategory,
      description: "",
      price: 180,
      providerCosts: [],
      active: true,
    },
  });

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter]);

  const pagination = usePagination(filteredItems);

  const setSearch = (value: string) => {
    setSearchState(value);
    pagination.resetPage();
  };

  const setCategoryFilter = (value: string) => {
    setCategoryFilterState(value);
    pagination.resetPage();
  };

  const syncExternalLabUsage = (nextItems: ProcedureTariffItem[]) => {
    const usedLabsPerRow = nextItems.flatMap((row) =>
      Array.from(
        new Set(
          row.providerCosts
            .map((entry) => entry.laboratoryName.trim())
            .filter(Boolean)
        )
      )
    );
    externalLabManager.syncUsageCounts(usedLabsPerRow);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    form.reset({
      code: "",
      name: "",
      category: categoryManager.categoryNames[0] ?? "",
      description: "",
      price: 180,
      providerCosts: [],
      active: true,
    });
    setDialogOpen(true);
  };

  const openEditModal = (item: ProcedureTariffItem) => {
    setEditingItem(item);
    form.reset({
      code: item.code,
      name: item.name,
      category: item.category,
      description: item.description,
      price: item.price,
      providerCosts: item.providerCosts.map((entry) => ({
        laboratoryName: entry.laboratoryName,
        ...(entry.variant ? { variant: entry.variant } : {}),
        cost: entry.cost,
      })),
      active: item.active,
    });
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const normalizedValues: TariffInput = {
      ...values,
      providerCosts: (values.providerCosts ?? []).map((entry) => {
        const cleanVariant = entry.variant?.trim();
        return cleanVariant
          ? {
              laboratoryName: entry.laboratoryName.trim(),
              variant: cleanVariant,
              cost: entry.cost,
            }
          : {
              laboratoryName: entry.laboratoryName.trim(),
              cost: entry.cost,
            };
      }),
    };

    if (editingItem) {
      const res = await updateTariffAction({
        ...normalizedValues,
        id: editingItem.id,
      });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar la tarifa.");
        return;
      }
      const nextItems = items.map((row) =>
        row.id === editingItem.id ? res.data! : row
      );
      setItems(nextItems);
      categoryManager.syncUsageCounts(nextItems.map((i) => i.category));
      syncExternalLabUsage(nextItems);
      toast.success(`Tarifa ${res.data.code} actualizada.`);
    } else {
      const res = await createTariffAction(normalizedValues);
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo registrar la tarifa.");
        return;
      }
      const nextItems = [...items, res.data!];
      setItems(nextItems);
      categoryManager.syncUsageCounts(nextItems.map((i) => i.category));
      syncExternalLabUsage(nextItems);
      toast.success(`Tarifa ${res.data.code} registrada.`);
    }

    setDialogOpen(false);
    setEditingItem(null);
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deleteTariffAction({ id });
    setDeletingId(null);

    if (!res.success) {
      toast.error(res.error || "No se pudo eliminar la tarifa.");
      return;
    }

    const nextItems = items.filter((row) => row.id !== id);
    setItems(nextItems);
    categoryManager.syncUsageCounts(nextItems.map((i) => i.category));
    syncExternalLabUsage(nextItems);
    toast.success("Prestación eliminada del tarifario.");
  };

  return {
    items: pagination.paginatedItems,
    allItems: items,
    totalCount: items.length,
    pagination,
    categories: categoryManager.categoryNames,
    categoryManager,
    externalLabs: externalLabManager.categoryNames,
    externalLabManager,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    isSubmitting: form.formState.isSubmitting,
    deletingId,
    openCreateModal,
    openEditModal,
    onSubmit,
    handleDelete,
  };
}
