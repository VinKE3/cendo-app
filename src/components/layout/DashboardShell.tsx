"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { CommandSearchModal } from "@/components/common/CommandSearchModal";
import { Cie10CatalogProvider } from "@/components/providers/Cie10CatalogProvider";
import { SignatureSettingsProvider } from "@/components/providers/SignatureSettingsProvider";
import type { AuthenticatedDoctor } from "@/features/auth/services/auth.service";
import type { Cie10RecordItem } from "@/features/cie10/cie10.schema";
import type { DoctorSignatureEntry } from "@/features/configuracion/configuracion.schema";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  doctor: AuthenticatedDoctor;
  todayAppointmentsCount: number;
  initialSignatureDirectory: DoctorSignatureEntry[];
  initialCie10Catalog: Cie10RecordItem[];
  children: React.ReactNode;
}

export function DashboardShell({
  doctor,
  todayAppointmentsCount,
  initialSignatureDirectory,
  initialCie10Catalog,
  children,
}: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SignatureSettingsProvider
      initialDirectory={initialSignatureDirectory}
      currentDoctorId={doctor.id}
    >
      <Cie10CatalogProvider initialCatalog={initialCie10Catalog}>
        <div className="min-h-screen bg-background text-foreground">
          <DashboardSidebar
            doctor={doctor}
            todayAppointmentsCount={todayAppointmentsCount}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          <div
            className={cn(
              "flex min-h-screen flex-col transition-all duration-200",
              isCollapsed ? "lg:pl-20" : "lg:pl-64"
            )}
          >
            <DashboardHeader
              doctor={doctor}
              onOpenMobileMenu={() => setIsMobileOpen(true)}
            />

            <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>

          <CommandSearchModal />
        </div>
      </Cie10CatalogProvider>
    </SignatureSettingsProvider>
  );
}
