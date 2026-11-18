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
import { BrandLogo } from "@/components/layout/BrandLogo";

const CLINICAL_CAPABILITIES = [
  {
    icon: CheckCircle2,
    iconClass: "text-success",
    label: "Colposcopía IFCPC y Mapeo Cervical",
  },
  {
    icon: FileText,
    iconClass: "text-accent",
    label: "Carnet Prenatal MINSA y Recetario",
  },
  {
    icon: UserCheck,
    iconClass: "text-warning",
    label: "Multi-Médico con Firma y CMP Dinámico",
  },
  {
    icon: ShieldCheck,
    iconClass: "text-warning",
    label: "Informes PDF A4 con Trazabilidad Legal",
  },
];

export function LoginBrandPanel() {
  const currentYear = new Date().getFullYear();

  return (
    <section
      className="relative flex flex-col justify-between overflow-hidden p-8 text-primary-foreground lg:w-1/2 lg:p-14"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklch, var(--primary), black 26%) 0%, var(--primary) 52%, color-mix(in oklch, var(--primary), white 6%) 100%)",
      }}
    >
      <div className="relative z-10 flex flex-col justify-between gap-8 lg:h-full">
        <div>
          <BrandLogo size="lg" inverted />

          <div className="mt-8 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold text-warning backdrop-blur-sm">
              <Sparkles className="size-3.5" />
              Portal Médico Institucional &bull; Versión 2.0
            </div>
            <h1 className="max-w-xl font-heading text-3xl leading-tight font-extrabold tracking-tight text-primary-foreground lg:text-4xl">
              Centro Especializado en Endometriosis y Salud Femenina
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-primary-foreground/85 lg:text-base">
              Plataforma asistencial de alta precisión para gestión de pacientes,
              colposcopía IFCPC 2011, control prenatal y emisión de informes médicos
              certificados.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-primary-foreground/15 pb-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-warning uppercase">
              <Building2 className="size-4" />
              Sede Central de Atención
            </span>
            <span className="rounded-full border border-success/40 bg-success/20 px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              Consultorios Activos
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-warning/35 bg-warning/20 text-warning">
              <Stethoscope className="size-6" />
            </div>
            <div>
              <p className="font-heading text-base font-bold text-primary-foreground">
                Dr. Patrick José Jacinto Gomero
              </p>
              <p className="font-mono text-xs text-primary-foreground/85">
                Director Médico &bull; CMP 61693 &bull; RNE 38657
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-2 text-xs text-primary-foreground/85 sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-warning" />
              <span>Av. Benavides 2975, Of. 405, Miraflores</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0 text-warning" />
              <span>Citas: 985 945 697</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-primary-foreground/75 uppercase">
            Capacidades del Sistema Clínico
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CLINICAL_CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-xl border border-primary-foreground/10 p-2.5 text-xs text-primary-foreground/95"
                  style={{
                    backgroundColor: "color-mix(in oklch, var(--primary), black 35%)",
                  }}
                >
                  <Icon className={`size-4 shrink-0 ${item.iconClass}`} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-primary-foreground/15 pt-4 text-[11px] text-primary-foreground/80">
          <span>&copy; {currentYear} CENDO &bull; Centro de Endometriosis</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-success" />
            Sesión Zero Trust HMAC &bull; SUSALUD
          </span>
        </footer>
      </div>
    </section>
  );
}
