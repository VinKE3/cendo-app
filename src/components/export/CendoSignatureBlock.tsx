import { cn } from "@/lib/utils";

interface CendoSignatureBlockProps {
  doctorName: string;
  doctorSpecialty?: string;
  doctorCredentials?: string;
  signatureSrc?: string | null;
  showDigitalSignature: boolean;
  align?: "center" | "right";
  compact?: boolean;
  slim?: boolean;
  showSalutation?: boolean;
  className?: string;
}

export function CendoSignatureBlock({
  doctorName,
  doctorSpecialty,
  doctorCredentials,
  signatureSrc,
  showDigitalSignature,
  align = "center",
  compact = false,
  slim = false,
  showSalutation = false,
  className,
}: CendoSignatureBlockProps) {
  const canRenderSignature = Boolean(showDigitalSignature && signatureSrc);

  return (
    <div
      className={cn(
        slim ? "min-w-[195px] max-w-[240px]" : "min-w-[215px] max-w-[260px]",
        align === "right" ? "ml-auto text-center" : "text-center",
        className
      )}
    >
      {showSalutation ? (
        <p className="mb-1 text-[10.5px] font-semibold tracking-wide text-foreground">
          Atentamente
        </p>
      ) : null}

      <div
        className={cn(
          "flex w-full items-end justify-center border-b border-foreground/45 pb-1",
          slim ? "h-9" : compact ? "h-12" : "h-16"
        )}
      >
        {canRenderSignature ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Ventana de impresión A4/A5 requiere <img> directo sin Next Image lazy/srcset */
          <img
            src={signatureSrc!}
            alt={`Firma médica de ${doctorName}`}
            className="max-h-full max-w-[180px] object-contain mix-blend-multiply print:mix-blend-normal select-none"
          />
        ) : (
          <span className="sr-only">
            Espacio reservado para firma manuscrita y sello físico
          </span>
        )}
      </div>

      <div
        className={cn(
          slim ? "space-y-0 pt-0.5 leading-tight" : "space-y-0.5 pt-1"
        )}
      >
        <p
          className={cn(
            "font-bold tracking-wide text-foreground uppercase",
            slim ? "text-[10px]" : "text-[11px]"
          )}
        >
          {doctorName}
        </p>
        {doctorSpecialty ? (
          <p
            className={cn(
              "font-semibold tracking-wide text-primary uppercase",
              slim ? "text-[8.5px]" : "text-[9.5px]"
            )}
          >
            {doctorSpecialty}
          </p>
        ) : null}
        <p
          className={cn(
            "font-mono font-semibold text-muted-foreground",
            slim ? "text-[8.5px]" : "text-[9.5px]"
          )}
        >
          {doctorCredentials || "CMP 61693 • RNE 38657"}
        </p>
      </div>
    </div>
  );
}
