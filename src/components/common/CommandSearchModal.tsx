"use client";

import { BookOpen, Pill, Receipt, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  useCommandSearch,
  type SearchScope,
} from "@/features/dashboard/hooks/use-command-search";
import { cn, formatCurrency } from "@/lib/utils";

const SCOPE_TABS: Array<{ id: SearchScope; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "patients", label: "Pacientes" },
  { id: "tariff", label: "Tarifario" },
  { id: "vademecum", label: "Vademécum" },
  { id: "cie10", label: "CIE-10" },
];

export function CommandSearchModal() {
  const { open, setOpen, scope, setScope, query, setQuery, loading, results, navigateTo } =
    useCommandSearch();

  const showPatients = scope === "all" || scope === "patients";
  const showTariffs = scope === "all" || scope === "tariff";
  const showMeds = scope === "all" || scope === "vademecum";
  const showCie10 = scope === "all" || scope === "cie10";

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Buscador Clínico CENDO"
      description="Busque pacientes, precios del tarifario, medicamentos del vademécum o códigos CIE-10."
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false}>
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2.5 py-2">
          {SCOPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={cn(
                "cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                scope === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
          {loading ? (
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              Buscando...
            </span>
          ) : null}
        </div>

        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Escriba nombre, DNI, código tarifario, fármaco o CIE-10..."
        />

        <CommandList className="max-h-96">
          <CommandEmpty>No se encontraron coincidencias clínicas.</CommandEmpty>

          {showPatients && results.patients.length > 0 ? (
            <CommandGroup heading="Pacientes">
              {results.patients.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`patient-${p.id}`}
                  onSelect={() => navigateTo(`/pacientes/${p.id}`)}
                >
                  <User className="size-4 text-primary" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{p.fullName}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {p.documentType} {p.documentNumber}
                      {p.phone ? ` • ${p.phone}` : ""}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Historia
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {showTariffs && results.tariffs.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tarifario de Exámenes (S/)">
                {results.tariffs.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`tariff-${t.id}`}
                    onSelect={() => navigateTo("/tarifario")}
                  >
                    <Receipt className="size-4 text-warning" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{t.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {t.code} • {t.category}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                      {formatCurrency(t.price)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {showMeds && results.medications.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Vademécum Farmacológico">
                {results.medications.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`med-${m.id}`}
                    onSelect={() => navigateTo("/vademecum")}
                  >
                    <Pill className="size-4 text-success" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{m.genericName}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {m.commercialBrands.map((b) => b.brandName).join(", ")}
                      </span>
                    </div>
                    {m.atcCode ? (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {m.atcCode}
                      </Badge>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}

          {showCie10 && results.cie10.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Diagnósticos CIE-10">
                {results.cie10.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={`cie-${c.code}`}
                    onSelect={() => navigateTo("/cie-10")}
                  >
                    <BookOpen className="size-4 text-muted-foreground" />
                    <span className="font-mono text-xs font-semibold text-primary">
                      {c.code}
                    </span>
                    <span className="truncate text-xs">{c.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
