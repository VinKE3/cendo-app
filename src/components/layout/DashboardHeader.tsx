"use client";

import { MapPin, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { triggerGlobalSearch } from "@/features/dashboard/hooks/use-command-search";
import type { AuthenticatedDoctor } from "@/features/auth/services/auth.service";

interface DashboardHeaderProps {
  doctor: AuthenticatedDoctor;
  onOpenMobileMenu: () => void;
}

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DashboardHeader({ doctor, onOpenMobileMenu }: DashboardHeaderProps) {
  const initials = getInitials(doctor.fullName);

  return (
    <header className="sticky top-0 z-20 flex h-15 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex flex-1 items-center gap-2.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>

        <button
          type="button"
          onClick={() => triggerGlobalSearch("all")}
          className="flex w-full max-w-md cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="size-3.5 shrink-0" />
            <span className="truncate">
              Buscar pacientes, tarifas, vademécum o CIE-10...
            </span>
          </span>
          <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground sm:inline-block">
            Ctrl + K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground md:flex">
          <span className="size-2 rounded-full bg-success" />
          <MapPin className="size-3.5 text-warning" />
          <span className="font-mono text-[11px]">Miraflores • Of. 405</span>
        </div>

        <ThemeToggle />

        <div className="flex items-center gap-2.5 border-l border-border pl-2.5 sm:pl-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs font-semibold text-foreground">
              {doctor.doctorTitle} {doctor.fullName}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              CMP {doctor.cmp} {doctor.rne ? `• RNE ${doctor.rne}` : ""}
            </p>
          </div>
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-mono text-xs font-bold text-primary-foreground">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
