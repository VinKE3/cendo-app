"use client";

import Link from "next/link";
import { PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hasSignature: boolean;
  isOwnDocument?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SignatureToggleSwitch({
  checked,
  onCheckedChange,
  hasSignature,
  isOwnDocument = false,
  disabled = false,
  className,
}: SignatureToggleSwitchProps) {
  const effectiveDisabled = disabled || !hasSignature;
  const effectiveChecked = hasSignature ? checked : false;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PenTool className="size-4" aria-hidden="true" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            Incluir Firma Digital
          </p>
          {!hasSignature ? (
            <p className="text-xs text-muted-foreground">
              Sin firma cargada — imprimirá espacio para sello manual.{" "}
              {isOwnDocument ? (
                <Link
                  href="/configuracion"
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Configurar mi firma
                </Link>
              ) : null}
            </p>
          ) : effectiveChecked ? (
            <p className="text-xs text-muted-foreground">
              Se imprimirá su firma digitalizada sobre la línea de sello.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Dejará espacio en blanco (~18 mm) para firma y sello manual.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={effectiveChecked}
        aria-label="Incluir firma digital en documento PDF"
        disabled={effectiveDisabled}
        onClick={() => onCheckedChange(!effectiveChecked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          effectiveChecked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-card shadow-sm transition-transform",
            effectiveChecked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
