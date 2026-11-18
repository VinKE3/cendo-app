"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Pill,
  Receipt,
  Search,
  Stethoscope,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { triggerGlobalSearch } from "@/features/dashboard/hooks/use-command-search";
import type { CommercialBrandItem } from "@/features/vademecum/vademecum.schema";
import { formatCurrency, formatPeruDateText } from "@/lib/utils";

interface DashboardOverviewProps {
  doctorTitle: string;
  doctorName: string;
  todayPeru: string;
  metrics: {
    patientsCount: number;
    todayAppointmentsCount: number;
    studiesCount: number;
    activeTariffsCount: number;
    medicationsCount: number;
  };
  todayAppointments: Array<{
    id: string;
    patientId: string;
    patientName: string;
    patientDoc: string;
    doctorName: string;
    appointmentTime: string;
    appointmentType: string;
    reason: string;
    status: string;
  }>;
  recentPatients: Array<{
    id: string;
    fullName: string;
    documentType: string;
    documentNumber: string;
    age: number;
    phone: string | null;
  }>;
  topTariffs: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    price: number;
  }>;
  topMedications: Array<{
    id: string;
    genericName: string;
    atcCode: string | null;
    therapeuticGroup: string;
    commercialBrands: CommercialBrandItem[];
  }>;
}

export function DashboardOverview({
  doctorTitle,
  doctorName,
  todayPeru,
  metrics,
  todayAppointments,
  recentPatients,
  topTariffs,
  topMedications,
}: DashboardOverviewProps) {
  const formattedDate = formatPeruDateText(todayPeru);

  return (
    <div className="space-y-6">
      {/* Cabecera operativa compacta */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-end">
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground capitalize">
            {formattedDate} • Sede Miraflores
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Panel Clínico — {doctorTitle} {doctorName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => triggerGlobalSearch("patients")}
          >
            <Search className="size-3.5" />
            Buscar Paciente (Ctrl+K)
          </Button>
          <Link href="/agenda">
            <Button type="button" variant="outline" size="sm">
              <Calendar className="size-3.5" />
              Agenda del Día
            </Button>
          </Link>
          <Link href="/pacientes">
            <Button type="button" size="sm">
              <Users className="size-3.5" />
              Directorio Pacientes
            </Button>
          </Link>
        </div>
      </div>

      {/* Bento Grid Asimétrico: 8 cols operación clínica + 4 cols catálogos y métricas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna principal (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Agenda del día */}
          <Card className="border border-border bg-card">
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="size-4 text-primary" />
                  Agenda de Hoy
                </CardTitle>
                <CardDescription>
                  Citas programadas en horario oficial America/Lima.
                </CardDescription>
              </div>
              <Link
                href="/agenda"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver agenda completa
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>

            <CardContent className="pt-4">
              {todayAppointments.length > 0 ? (
                <div className="divide-y divide-border">
                  {todayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex flex-col justify-between gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-xs font-semibold text-foreground">
                          <Clock className="size-3 text-primary" />
                          {appt.appointmentTime.slice(0, 5)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {appt.patientName}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            Doc {appt.patientDoc} • {appt.appointmentType}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {appt.status}
                        </Badge>
                        <Link href={`/pacientes/${appt.patientId}`}>
                          <Button type="button" variant="outline" size="xs">
                            Abrir Ficha
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 py-8 text-center">
                  <Calendar className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Sin citas programadas para hoy
                  </p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Las citas registradas en Agenda aparecerán aquí automáticamente por orden
                    de llegada.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas pacientes atendidas / registradas */}
          <Card className="border border-border bg-card">
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Stethoscope className="size-4 text-primary" />
                  Pacientes Recientes
                </CardTitle>
                <CardDescription>
                  Acceso directo a historias clínicas, ecografías y colposcopías.
                </CardDescription>
              </div>
              <Link
                href="/pacientes"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver directorio
                <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>

            <CardContent className="pt-4">
              {recentPatients.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentPatients.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {p.fullName}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {p.documentType} {p.documentNumber}
                          {p.age > 0 ? ` • ${p.age} años` : ""}
                          {p.phone ? ` • ${p.phone}` : ""}
                        </p>
                      </div>
                      <Link href={`/pacientes/${p.id}`}>
                        <Button type="button" variant="outline" size="xs">
                          Ver Historia
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 py-8 text-center">
                  <Users className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Directorio de pacientes vacío
                  </p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    En la Fase 2 habilitaremos el registro y migración de historias
                    clínicas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna lateral (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Resumen denso de actividad */}
          <Card className="border border-border bg-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Resumen Operativo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Pacientes</p>
                <p className="mt-1 font-mono text-2xl font-bold text-foreground tabular-nums">
                  {metrics.patientsCount}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Citas Hoy</p>
                <p className="mt-1 font-mono text-2xl font-bold text-primary tabular-nums">
                  {metrics.todayAppointmentsCount}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Estudios</p>
                <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                  {metrics.studiesCount}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Tarifas / Fármacos</p>
                <p className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                  {metrics.activeTariffsCount} / {metrics.medicationsCount}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tarifario Frecuente */}
          <Card className="border border-border bg-card">
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Receipt className="size-4 text-warning" />
                Tarifas Frecuentes
              </CardTitle>
              <Link
                href="/tarifario"
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todas
              </Link>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="divide-y divide-border text-xs">
                {topTariffs.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{t.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {t.code}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono font-semibold text-primary tabular-nums">
                      {formatCurrency(t.price)}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => triggerGlobalSearch("tariff")}
              >
                <Search className="size-3.5" />
                Consultar Precio (Ctrl+K)
              </Button>
            </CardContent>
          </Card>

          {/* Vademécum rápido */}
          <Card className="border border-border bg-card">
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Pill className="size-4 text-success" />
                Vademécum Ginecológico
              </CardTitle>
              <Link
                href="/vademecum"
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todos
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-3">
              {topMedications.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border bg-muted/30 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-foreground">
                      {m.genericName}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {m.commercialBrands.length} marcas
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {m.commercialBrands.map((b) => b.brandName).join(", ")}
                  </p>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => triggerGlobalSearch("vademecum")}
              >
                <Search className="size-3.5" />
                Buscar Marcas y Precios
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
