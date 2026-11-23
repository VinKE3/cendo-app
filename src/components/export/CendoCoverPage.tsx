import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { BrandLogo } from "@/components/layout/BrandLogo";
import type { PrintPaperFormat } from "@/lib/pdfGenerator";
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
  paperFormat?: PrintPaperFormat;
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
  paperFormat = "A4",
  className,
}: CendoCoverPageProps) {
  const isA5 = paperFormat === "A5";
  const isA5Landscape = paperFormat === "A5_LANDSCAPE";

  return (
    <section
      className={cn(
        "page-sheet relative mx-auto flex flex-col justify-between overflow-hidden border border-border bg-card text-foreground shadow-sm print:border-none print:shadow-none",
        isA5Landscape
          ? "h-[147.5mm] w-[210mm]"
          : isA5
            ? "h-[209.5mm] w-[148mm]"
            : "h-[296.5mm] w-[210mm]",
        className,
      )}
      aria-label={`Carátula institucional - ${documentTitle}`}
    >
      {/* Membrete institucional superior izquierdo */}
      <div className={isA5Landscape ? "px-10 pt-5" : isA5 ? "px-9 pt-8" : "px-14 pt-12"}>
        <BrandLogo size={isA5Landscape ? "sm" : isA5 ? "md" : "lg"} layout="vertical" />
      </div>

      {/* Bloque central del informe y datos de la paciente */}
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center text-center",
          isA5Landscape ? "px-12" : isA5 ? "px-9" : "px-16",
        )}
      >
        <p
          className={cn(
            "font-medium uppercase tracking-[0.28em] text-primary",
            isA5Landscape ? "text-xs" : isA5 ? "text-sm" : "text-lg",
          )}
        >
          INFORME
        </p>

        <h1
          className={cn(
            "max-w-xl font-extrabold uppercase tracking-wide text-primary",
            isA5Landscape
              ? "mt-1.5 text-xl"
              : isA5
                ? "mt-3 text-2xl"
                : "mt-4 text-3xl",
          )}
        >
          {documentTitle}
        </h1>

        <div
          className={cn(
            "h-[3px] w-24 rounded-full bg-warning",
            isA5Landscape ? "my-3" : isA5 ? "my-5" : "my-7",
          )}
          aria-hidden="true"
        />

        <p
          className={cn(
            "font-semibold uppercase tracking-wide text-primary",
            isA5Landscape ? "text-base" : isA5 ? "text-lg" : "text-xl",
          )}
        >
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
        <div
          className={cn(
            "text-right",
            isA5Landscape ? "px-10 pb-2.5" : isA5 ? "px-9 pb-5" : "px-14 pb-8",
          )}
        >
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
          slim={isA5Landscape}
        />
      </div>
    </section>
  );
}
