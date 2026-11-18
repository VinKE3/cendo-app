import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { cn } from "@/lib/utils";

interface CendoCoverPageProps {
  documentTitle: string;
  patientFullName: string;
  documentNumber?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorCredentials?: string;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  className?: string;
}

export function CendoCoverPage({
  documentTitle,
  patientFullName,
  documentNumber,
  doctorName = "DR. PATRICK JACINTO GOMERO",
  doctorSpecialty = "GINECÓLOGO OBSTETRA",
  doctorCredentials = "CMP 61693 • RNE 38657",
  clinicAddress,
  clinicEmail,
  clinicPhone,
  className,
}: CendoCoverPageProps) {
  return (
    <section
      className={cn(
        "page-sheet relative mx-auto flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden border border-border bg-card text-foreground shadow-sm print:border-none print:shadow-none",
        className,
      )}
      aria-label={`Carátula institucional - ${documentTitle}`}
    >
      {/* Membrete institucional superior izquierdo */}
      <div className="px-14 pt-12">
        <BrandLogo size="lg" layout="vertical" />
      </div>

      {/* Bloque central del informe y datos de la paciente */}
      <div className="flex flex-1 flex-col items-center justify-center px-16 text-center">
        <p className="text-lg font-medium uppercase tracking-[0.28em] text-primary">
          INFORME
        </p>

        <h1 className="mt-4 max-w-xl text-3xl font-extrabold uppercase tracking-wide text-primary">
          {documentTitle}
        </h1>

        <div className="my-7 h-[3px] w-24 rounded-full bg-warning" aria-hidden="true" />

        <p className="text-xl font-semibold uppercase tracking-wide text-primary">
          {patientFullName}
        </p>

        {documentNumber ? (
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            DNI / HC: {documentNumber}
          </p>
        ) : null}
      </div>

      {/* Bloque de firma del médico tratante + cenefa inferior */}
      <div className="flex flex-col">
        <div className="px-14 pb-8 text-right">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            {doctorName}
          </p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-primary">
            {doctorSpecialty}
          </p>
          <p className="mt-0.5 text-[11px] font-medium tracking-wider text-muted-foreground">
            {doctorCredentials}
          </p>
        </div>

        <CendoFooterWave
          address={clinicAddress}
          email={clinicEmail}
          phone={clinicPhone}
        />
      </div>
    </section>
  );
}
