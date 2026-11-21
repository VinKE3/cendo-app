"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CIE10_CATEGORY_LABELS,
  CIE10_GYN_CATALOG,
} from "@/features/catalogo/cie10.data";
import type { Cie10RecordItem } from "@/features/cie10/cie10.schema";

const FALLBACK_CATALOG: Cie10RecordItem[] = CIE10_GYN_CATALOG.map((item) => ({
  id: item.code,
  code: item.code,
  name: item.name,
  category: CIE10_CATEGORY_LABELS[item.category],
  keywords: item.keywords,
  isFavorite: Boolean(item.isFavorite),
  createdAt: "2026-01-01T00:00:00.000Z",
}));

interface Cie10CatalogContextValue {
  catalog: Cie10RecordItem[];
  setCatalog: (next: Cie10RecordItem[]) => void;
  refreshCatalog: () => Promise<void>;
}

const Cie10CatalogContext = createContext<Cie10CatalogContextValue | null>(null);

interface Cie10CatalogProviderProps {
  initialCatalog: Cie10RecordItem[];
  children: ReactNode;
}

export function Cie10CatalogProvider({
  initialCatalog,
  children,
}: Cie10CatalogProviderProps) {
  const [prevInitial, setPrevInitial] = useState(initialCatalog);
  const [catalog, setCatalog] = useState<Cie10RecordItem[]>(initialCatalog);

  if (prevInitial !== initialCatalog) {
    setPrevInitial(initialCatalog);
    setCatalog(initialCatalog);
  }

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/cie-10", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        success?: boolean;
        data?: Cie10RecordItem[];
      };
      if (json.success && Array.isArray(json.data)) {
        setCatalog(json.data);
      }
    } catch {
      // Ignorar errores transitorios de red al refrescar catálogo CIE-10
    }
  }, []);

  const value = useMemo<Cie10CatalogContextValue>(
    () => ({
      catalog,
      setCatalog,
      refreshCatalog,
    }),
    [catalog, refreshCatalog]
  );

  return (
    <Cie10CatalogContext.Provider value={value}>
      {children}
    </Cie10CatalogContext.Provider>
  );
}

export function useCie10Catalog(): Cie10CatalogContextValue {
  const ctx = useContext(Cie10CatalogContext);
  if (!ctx) {
    return {
      catalog: FALLBACK_CATALOG,
      setCatalog: () => undefined,
      refreshCatalog: async () => undefined,
    };
  }
  return ctx;
}
