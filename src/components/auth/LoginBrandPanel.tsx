import {
  Building2,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/layout/BrandLogo";

const CLINICAL_CAPABILITIES = [
  {
    icon: CheckCircle2,
    label: "Colposcopía IFCPC y Mapeo Cervical",
  },
  {
    icon: FileText,
    label: "Carnet Prenatal MINSA y Recetario",
  },
  {
    icon: UserCheck,
    label: "Multi-Médico con Firma y CMP Dinámico",
  },
  {
    icon: ShieldCheck,
    label: "Informes PDF A4 con Trazabilidad Legal",
  },
];

export function LoginBrandPanel() {
  const currentYear = new Date().getFullYear();

  return (
    <section className="relative flex flex-col justify-between bg-primary p-8 text-primary-foreground lg:w-1/2 lg:p-12">
      <div className="space-y-8">
        <BrandLogo size="lg" inverted />

        <div className="space-y-3">
          <Badge
            variant="outline"
            className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
          >
            <Sparkles className="size-3.5 text-warning" />
            Portal Médico Institucional • v2.0
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-primary-foreground lg:text-4xl">
            Centro Especializado en Endometriosis y Salud Femenina
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-primary-foreground/80 lg:text-base">
            Plataforma asistencial de alta precisión para gestión de pacientes,
            colposcopía IFCPC 2011, control prenatal y emisión de informes médicos
            certificados.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-5">
          <div className="flex items-center justify-between border-b border-primary-foreground/15 pb-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-warning uppercase">
              <Building2 className="size-4" />
              Sede Central de Atención
            </span>
            <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-primary-foreground">
              ACTIVO
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 text-warning">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold text-primary-foreground">
                Dr. Patrick José Jacinto Gomero
              </p>
              <p className="font-mono text-xs text-primary-foreground/80">
                Director Médico • CMP 61693 • RNE 38657
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-primary-foreground/85 sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-warning" />
              <span>Av. Benavides 2975, Of. 405, Miraflores</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <Phone className="size-3.5 shrink-0 text-warning" />
              <span>Citas: 985 945 697</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-primary-foreground/75 uppercase">
            Capacidades del Sistema Clínico
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {CLINICAL_CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-2.5 text-xs text-primary-foreground/90"
                >
                  <Icon className="size-4 shrink-0 text-warning" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-primary-foreground/15 pt-4 text-[11px] text-primary-foreground/75">
        <span className="font-mono">&copy; {currentYear} CENDO • Lima - Perú</span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-warning" />
          Sesión Zero Trust HMAC • SUSALUD
        </span>
      </footer>
    </section>
  );
}
