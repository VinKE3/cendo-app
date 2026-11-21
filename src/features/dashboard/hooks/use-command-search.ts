"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { globalSearchAction } from "../actions/search.actions";
import type { Cie10RecordItem } from "@/features/cie10/cie10.schema";
import type { CommercialBrandItem } from "@/features/vademecum/vademecum.schema";

export type SearchScope = "all" | "patients" | "tariff" | "vademecum" | "cie10";

export interface GlobalSearchResults {
  patients: Array<{
    id: string;
    fullName: string;
    documentType: string;
    documentNumber: string;
    phone: string | null;
  }>;
  tariffs: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    price: number;
  }>;
  medications: Array<{
    id: string;
    genericName: string;
    atcCode: string | null;
    therapeuticGroup: string;
    commercialBrands: CommercialBrandItem[];
  }>;
  cie10: Cie10RecordItem[];
}

const EMPTY_RESULTS: GlobalSearchResults = {
  patients: [],
  tariffs: [],
  medications: [],
  cie10: [],
};

export function triggerGlobalSearch(scope: SearchScope = "all") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cendo:open-search", { detail: { scope } }));
}

export function useCommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<SearchScope>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setScope("all");
        setOpen((prev) => !prev);
      }
    };

    const onCustomOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ scope?: SearchScope }>).detail;
      setScope(detail?.scope ?? "all");
      setOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("cendo:open-search", onCustomOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("cendo:open-search", onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await globalSearchAction({ query });
      if (!cancelled) {
        if (res.success && res.data) {
          setResults(res.data);
        }
        setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
    }
  };

  return {
    open,
    setOpen: handleOpenChange,
    scope,
    setScope,
    query,
    setQuery,
    loading,
    results,
    navigateTo,
  };
}
