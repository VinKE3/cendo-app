"use client";

import { type SetStateAction, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination";
import {
  CIE10_CATEGORY_LABELS,
  CIE10_GYN_CATALOG,
  type Cie10Category,
  type Cie10Item,
} from "../cie10.data";

export function useCie10() {
  const [search, setSearchState] = useState("");
  const [categoryFilter, setCategoryFilterState] = useState<"ALL" | Cie10Category>("ALL");
  const [onlyFavorites, setOnlyFavoritesState] = useState(false);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CIE10_GYN_CATALOG.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }
      if (onlyFavorites && !item.isFavorite) {
        return false;
      }
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    });
  }, [search, categoryFilter, onlyFavorites]);

  const pagination = usePagination(filteredItems);

  const setSearch = (value: string) => {
    setSearchState(value);
    pagination.resetPage();
  };

  const setCategoryFilter = (value: "ALL" | Cie10Category) => {
    setCategoryFilterState(value);
    pagination.resetPage();
  };

  const setOnlyFavorites = (value: SetStateAction<boolean>) => {
    setOnlyFavoritesState(value);
    pagination.resetPage();
  };

  const copyCode = async (item: Cie10Item) => {
    try {
      await navigator.clipboard.writeText(`${item.code} - ${item.name}`);
      toast.success(`Copiado: ${item.code}`);
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  };

  return {
    items: pagination.paginatedItems,
    totalCount: CIE10_GYN_CATALOG.length,
    pagination,
    categoryLabels: CIE10_CATEGORY_LABELS,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    onlyFavorites,
    setOnlyFavorites,
    copyCode,
  };
}
