"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import { useCatalogCategories } from "@/features/catalog-categories/hooks/use-catalog-categories";
import { usePagination } from "@/hooks/use-pagination";
import {
  vademecumInputSchema,
  type MedicationItem,
  type VademecumInput,
} from "../vademecum.schema";
import {
  createMedicationAction,
  deleteMedicationAction,
  updateMedicationAction,
} from "../actions/vademecum.actions";

export function useVademecum(
  initialItems: MedicationItem[],
  initialCategories: CatalogCategoryItem[]
) {
  const [items, setItems] = useState<MedicationItem[]>(initialItems);
  const [search, setSearchState] = useState("");
  const [groupFilter, setGroupFilterState] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MedicationItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryManager = useCatalogCategories({
    scope: "vademecum",
    initialCategories,
    onRenameSuccess: (oldName, newName) => {
      setItems((prev) =>
        prev.map((row) =>
          row.therapeuticGroup.trim().toLowerCase() === oldName.trim().toLowerCase()
            ? { ...row, therapeuticGroup: newName }
            : row
        )
      );
      if (groupFilter.trim().toLowerCase() === oldName.trim().toLowerCase()) {
        setGroupFilterState(newName);
      }
    },
  });

  const form = useForm<VademecumInput>({
    resolver: zodResolver(vademecumInputSchema),
    defaultValues: {
      genericName: "",
      atcCode: "",
      therapeuticGroup: categoryManager.categoryNames[0] ?? "",
      indications: "",
      contraindications: "",
      commercialBrands: [
        { brandName: "", laboratory: "", presentation: "", referencePricePen: 0 },
      ],
    },
  });

  const brandsFieldArray = useFieldArray({
    control: form.control,
    name: "commercialBrands",
  });

  const therapeuticGroups = useMemo(() => {
    const merged = new Set([
      ...categoryManager.categoryNames,
      ...items.map((item) => item.therapeuticGroup),
    ]);
    return Array.from(merged).filter(Boolean).sort();
  }, [categoryManager.categoryNames, items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (groupFilter !== "ALL" && item.therapeuticGroup !== groupFilter) {
        return false;
      }
      if (!q) return true;
      const matchesBrands = item.commercialBrands.some(
        (b) =>
          b.brandName.toLowerCase().includes(q) ||
          b.laboratory.toLowerCase().includes(q)
      );
      return (
        item.genericName.toLowerCase().includes(q) ||
        item.atcCode.toLowerCase().includes(q) ||
        item.therapeuticGroup.toLowerCase().includes(q) ||
        matchesBrands
      );
    });
  }, [items, search, groupFilter]);

  const pagination = usePagination(filteredItems);

  const setSearch = (value: string) => {
    setSearchState(value);
    pagination.resetPage();
  };

  const setGroupFilter = (value: string) => {
    setGroupFilterState(value);
    pagination.resetPage();
  };

  const openCreateModal = () => {
    setEditingItem(null);
    form.reset({
      genericName: "",
      atcCode: "",
      therapeuticGroup: categoryManager.categoryNames[0] ?? "",
      indications: "",
      contraindications: "",
      commercialBrands: [
        { brandName: "", laboratory: "", presentation: "", referencePricePen: 0 },
      ],
    });
    setDialogOpen(true);
  };

  const openEditModal = (item: MedicationItem) => {
    setEditingItem(item);
    form.reset({
      genericName: item.genericName,
      atcCode: item.atcCode,
      therapeuticGroup: item.therapeuticGroup,
      indications: item.indications,
      contraindications: item.contraindications,
      commercialBrands:
        item.commercialBrands.length > 0
          ? item.commercialBrands
          : [{ brandName: "", laboratory: "", presentation: "", referencePricePen: 0 }],
    });
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (editingItem) {
      const res = await updateMedicationAction({ ...values, id: editingItem.id });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar el fármaco.");
        return;
      }
      const nextItems = items.map((row) =>
        row.id === editingItem.id ? res.data! : row
      );
      setItems(nextItems);
      categoryManager.syncUsageCounts(nextItems.map((i) => i.therapeuticGroup));
      toast.success(`Fármaco "${res.data.genericName}" actualizado.`);
    } else {
      const res = await createMedicationAction(values);
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo registrar el fármaco.");
        return;
      }
      const nextItems = [...items, res.data!];
      setItems(nextItems);
      categoryManager.syncUsageCounts(nextItems.map((i) => i.therapeuticGroup));
      toast.success(`Fármaco "${res.data.genericName}" registrado.`);
    }

    setDialogOpen(false);
    setEditingItem(null);
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deleteMedicationAction({ id });
    setDeletingId(null);

    if (!res.success) {
      toast.error(res.error || "No se pudo eliminar el fármaco.");
      return;
    }

    const nextItems = items.filter((row) => row.id !== id);
    setItems(nextItems);
    categoryManager.syncUsageCounts(nextItems.map((i) => i.therapeuticGroup));
    toast.success("Fármaco retirado del vademécum.");
  };

  return {
    items: pagination.paginatedItems,
    totalCount: items.length,
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
    isSubmitting: form.formState.isSubmitting,
    deletingId,
    openCreateModal,
    openEditModal,
    onSubmit,
    handleDelete,
  };
}
