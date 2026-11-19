import { cn } from "@/lib/utils";

interface CendoSignatureBlockProps {
  doctorName: string;
  doctorSpecialty?: string;
  doctorCredentials?: string;
  signatureSrc?: string | null;
  showDigitalSignature: boolean;
  align?: "center" | "right";
  compact?: boolean;
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
  showSalutation = false,
  className,
}: CendoSignatureBlockProps) {
  const canRenderSignature = Boolean(showDigitalSignature && signatureSrc);

  return (
    <div
      className={cn(
        "min-w-[215px] max-w-[260px]",
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
          compact ? "h-12" : "h-16"
        )}
      >
        {canRenderSignature ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Ventana de impresión A4/A5 requiere <img> directo sin Next Image lazy/srcset */
          <img
            src={signatureSrc!}
            alt={`Firma médica de ${doctorName}`}
            className="max-h-full max-w-[180px] object-contain mix-blend-multiply select-none"
          />
        ) : (
          <span className="sr-only">
            Espacio reservado para firma manuscrita y sello físico
          </span>
        )}
      </div>

      <div className="space-y-0.5 pt-1">
        <p className="text-[11px] font-bold tracking-wide text-foreground uppercase">
          {doctorName}
        </p>
        {doctorSpecialty ? (
          <p className="text-[9.5px] font-semibold tracking-wide text-primary uppercase">
            {doctorSpecialty}
          </p>
        ) : null}
        <p className="font-mono text-[9.5px] font-semibold text-muted-foreground">
          {doctorCredentials || "CMP 61693 • RNE 38657"}
        </p>
      </div>
    </div>
  );
}
