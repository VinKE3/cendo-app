"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Pill,
  Receipt,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { logoutAction } from "@/features/auth/actions/auth.actions";
import type { AuthenticatedDoctor } from "@/features/auth/services/auth.service";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  doctor: AuthenticatedDoctor;
  todayAppointmentsCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string | null;
  adminOnly?: boolean;
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

function SidebarContent({
  doctor,
  todayAppointmentsCount,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
  isMobile = false,
}: {
  doctor: AuthenticatedDoctor;
  todayAppointmentsCount: number;
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const initials = getInitials(doctor.fullName);

  const navItems: NavItem[] = [
    { name: "Resumen / Inicio", href: "/dashboard", icon: LayoutDashboard },
    { name: "Pacientes e Historias", href: "/pacientes", icon: Users },
    {
      name: "Agenda y Citas",
      href: "/agenda",
      icon: Calendar,
      badge: todayAppointmentsCount > 0 ? String(todayAppointmentsCount) : "Hoy",
    },
    { name: "Tarifario de Exámenes", href: "/tarifario", icon: Receipt, badge: "S/" },
    { name: "Vademécum y Precios", href: "/vademecum", icon: Pill },
    { name: "Catálogo CIE-10", href: "/cie-10", icon: BookOpen, badge: "CIE" },
    {
      name: "Equipo Médico & Usuarios",
      href: "/usuarios",
      icon: UserCheck,
      badge: "Staff",
      adminOnly: true,
    },
    { name: "Configuración & Firma", href: "/configuracion", icon: Settings },
  ].filter((item) => !item.adminOnly || doctor.role === "admin");

  const collapsed = !isMobile && isCollapsed;

  return (
    <div className="flex h-full flex-col justify-between bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3.5">
        <Link href="/dashboard" onClick={onNavigate} className="overflow-hidden">
          <BrandLogo size={collapsed ? "sm" : "md"} showText={!collapsed} />
        </Link>
        {!isMobile && onToggleCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {!collapsed ? (
          <p className="mb-2 px-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Gestión Clínica
          </p>
        ) : null}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                )}
              />
              {!collapsed ? (
                <>
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.badge ? (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                        isActive
                          ? "bg-sidebar-primary-foreground/15 text-sidebar-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border bg-muted/30 p-3">
        {!collapsed ? (
          <div className="space-y-2.5 rounded-xl border border-sidebar-border bg-card p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-semibold text-foreground">
                  {doctor.doctorTitle} {doctor.fullName}
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  CMP {doctor.cmp} {doctor.rne ? `• RNE ${doctor.rne}` : ""}
                </p>
              </div>
            </div>

            <form action={logoutAction} className="border-t border-border pt-2">
              <Button
                type="submit"
                variant="ghost"
                size="xs"
                className="w-full justify-start gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-3.5" />
                <span>Cerrar Sesión</span>
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              title={`${doctor.doctorTitle} ${doctor.fullName} (CMP ${doctor.cmp})`}
              className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary"
            >
              {initials}
            </div>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardSidebar({
  doctor,
  todayAppointmentsCount,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: DashboardSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border transition-all duration-200 lg:block",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent
          doctor={doctor}
          todayAppointmentsCount={todayAppointmentsCount}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && onCloseMobile()}>
        <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de Navegación CENDO</SheetTitle>
          </SheetHeader>
          <SidebarContent
            doctor={doctor}
            todayAppointmentsCount={todayAppointmentsCount}
            isCollapsed={false}
            onNavigate={onCloseMobile}
            isMobile
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
