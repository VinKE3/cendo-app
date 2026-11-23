"use client";

import { useId, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useCie10Catalog } from "@/components/providers/Cie10CatalogProvider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  findCie10ByCode,
  formatCie10CategoryLabel,
  searchCie10Catalog,
} from "@/features/cie10/cie10.schema";

interface Cie10AutocompleteProps {
  diagnosis: string;
  cie10Code: string;
  onChange: (diagnosis: string, cie10Code: string) => void;
  required?: boolean;
  diagnosisError?: string;
  label?: string;
  inputId?: string;
  placeholder?: string;
}

export function Cie10Autocomplete({
  diagnosis,
  cie10Code,
  onChange,
  required = false,
  diagnosisError,
  label = "Diagnóstico Clínico",
  inputId,
  placeholder = "Escriba diagnóstico o código CIE-10 (ej. Endometriosis, N80.3, Z34.0)...",
}: Cie10AutocompleteProps) {
  const reactId = useId();
  const resolvedInputId = inputId || `cie10-diagnosis-${reactId}`;
  const { catalog } = useCie10Catalog();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const favoritePresets = useMemo(
    () => catalog.filter((item) => item.isFavorite).slice(0, 15),
    [catalog]
  );

  const suggestions = useMemo(
    () => searchCie10Catalog(diagnosis, catalog, 8),
    [diagnosis, catalog]
  );

  const handleSelectItem = (name: string, code: string) => {
    onChange(name, code);
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-2.5">
      {/* Presets rápidos frecuentes CENDO */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <label
          htmlFor={resolvedInputId}
          className="flex items-center gap-1.5 text-xs font-medium"
        >
          {label} {required ? <span className="text-destructive">*</span> : null}
        </label>

        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 shrink-0 text-primary" />
          <select
            aria-label="Diagnósticos frecuentes CENDO"
            value=""
            onChange={(e) => {
              const found = findCie10ByCode(e.target.value, catalog);
              if (found) {
                handleSelectItem(found.name, found.code);
              }
            }}
            className="h-7 max-w-xs rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="" disabled>
              Diagnóstico frecuente (1 clic)...
            </option>
            {favoritePresets.map((item) => (
              <option key={item.id} value={item.code}>
                {item.code} — {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inputs bidireccionales Diagnóstico + Código CIE-10 */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
        <div className="relative sm:col-span-9">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={resolvedInputId}
            value={diagnosis}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => {
              // Retardo corto para permitir clic en una sugerencia
              setTimeout(() => setDropdownOpen(false), 160);
            }}
            onChange={(e) => {
              onChange(e.target.value, cie10Code);
              setDropdownOpen(true);
            }}
            placeholder={placeholder}
            className="pl-8"
            aria-invalid={Boolean(diagnosisError)}
          />

          {dropdownOpen && suggestions.length > 0 ? (
            <div className="absolute z-40 mt-1 max-h-56 w-full divide-y divide-border overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
              {suggestions.map((item) => (
                <button
                  key={`${item.id}-${item.code}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectItem(item.name, item.code);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatCie10CategoryLabel(item.category)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                    {item.code}
                  </Badge>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="sm:col-span-3">
          <Input
            aria-label="Código CIE-10"
            value={cie10Code}
            onChange={(e) => {
              const code = e.target.value.toUpperCase();
              const exact = findCie10ByCode(code, catalog);
              onChange(exact && !diagnosis.trim() ? exact.name : diagnosis, code);
            }}
            placeholder="CIE-10 (N80.3)"
            maxLength={15}
            className="font-mono uppercase"
          />
        </div>
      </div>

      {diagnosisError ? (
        <p className="text-xs text-destructive">{diagnosisError}</p>
      ) : null}
    </div>
  );
}
