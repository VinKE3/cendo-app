import { redirect } from "next/navigation";
import { LogOut, ShieldCheck, Building2, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedContext } from "@/lib/security/action-guard";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { logoutAction } from "@/features/auth/actions/auth.actions";

export default async function DashboardPage() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    redirect("/login");
  }

  const doctor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
  if (!doctor) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                FASE 0 COMPLETADA
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                {doctor.clinicalRole.toUpperCase()}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {doctor.doctorTitle} {doctor.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {doctor.specialty} •{" "}
              <span className="font-mono">
                CMP {doctor.cmp} | RNE {doctor.rne}
              </span>
            </p>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="default">
              <LogOut className="size-4" />
              Cerrar Sesión
            </Button>
          </form>
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="border border-border bg-card lg:col-span-7">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-primary" />
                {doctor.clinicName}
              </CardTitle>
              <CardDescription>{doctor.clinicAddress}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Correo de Sesión</p>
                <p className="mt-1 font-mono text-sm text-foreground">{doctor.email}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Aislamiento Multi-Sede</p>
                <p className="mt-1 truncate font-mono text-xs text-foreground">
                  {doctor.tenantId}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card lg:col-span-5">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="size-4 text-success" />
                Infraestructura Activa
              </CardTitle>
              <CardDescription>
                Esquema Drizzle ORM y seguridad Zero Trust verificados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Base de Datos</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-success">
                  <ShieldCheck className="size-3.5" />
                  19 tablas activas
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Autenticación</span>
                <span className="font-mono text-xs text-foreground">PBKDF2 + HMAC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Próximo Hito</span>
                <span className="font-mono text-xs text-foreground">Fase 1: Shell & Catálogos</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
