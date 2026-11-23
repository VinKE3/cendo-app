"use client";

import { AlertTriangle, Calendar } from "lucide-react";
import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

export type PrescriptionPaperFormat = "A4" | "A5";

interface PrescriptionPrintViewProps {
  prescription: MedicalPrescriptionItem;
  patient: PatientDirectoryItem;
  patientAllergies?: string | null;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
  paperFormat?: PrescriptionPaperFormat;
  signatureSrc?: string | null;
  showDigitalSignature?: boolean;
}

function hasPositiveAllergy(value?: string | null): boolean {
  if (!value) return false;
  const clean = value.trim().toLowerCase();
  return (
    clean !== "" &&
    !clean.startsWith("niega") &&
    clean !== "ninguna" &&
    clean !== "ninguno" &&
    clean !== "no refiere"
  );
}

export function PrescriptionPrintView({
  prescription,
  patient,
  patientAllergies,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
  paperFormat = "A4",
  signatureSrc,
  showDigitalSignature,
}: PrescriptionPrintViewProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const resolvedSig = getSignatureForDoctor(
    prescription.doctorId,
    prescription.doctorCmp
  );
  const resolvedSignatureSrc =
    signatureSrc !== undefined ? signatureSrc : resolvedSig.signatureSrc;
  const resolvedShowDigitalSignature =
    showDigitalSignature !== undefined
      ? showDigitalSignature
      : resolvedSig.showByDefault;

  const credentials = [
    prescription.doctorCmp ? `CMP ${prescription.doctorCmp}` : "",
    prescription.doctorRne ? `RNE ${prescription.doctorRne}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const isA5 = paperFormat === "A5";
  const showAllergyAlert = hasPositiveAllergy(patientAllergies);
  const isSpaciousLayout = prescription.items.length <= 3;

  return (
    <div
      id="prescription-print-sheet"
      className={cn(
        "mx-auto space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0",
        isA5 ? "max-w-[148mm]" : "max-w-[210mm]"
      )}
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle="RECETA MÉDICA OFICIAL"
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={prescription.doctorName.toUpperCase()}
          doctorSpecialty={resolvedSig.doctorSpecialty}
          doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
          clinicAddress={clinicAddress}
          clinicEmail={clinicEmail}
          clinicPhone={clinicPhone}
          paperFormat={paperFormat}
        />
      ) : null}

      <section
        className={cn(
          "page-sheet box-border flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none",
          isA5
            ? "min-h-[210mm] w-[148mm] text-xs"
            : "min-h-[297mm] w-[210mm] text-[13px]"
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col justify-between",
            isA5
              ? "gap-3 px-[10mm] pt-[7mm] pb-2"
              : "gap-4 px-[14mm] pt-[10mm] pb-3"
          )}
        >
          <div className={cn(isA5 ? "space-y-2.5" : "space-y-4")}>
            {/* 1. Membrete Institucional */}
            <header className="flex items-start justify-between gap-3 border-b-2 border-primary pb-2.5">
              <div className="flex items-center gap-2.5">
                <BrandLogo size={isA5 ? "sm" : "md"} showText={false} />
                <div>
                  <h1
                    className={cn(
                      "font-sans font-extrabold tracking-tight text-primary",
                      isA5 ? "text-base" : "text-lg"
                    )}
                  >
                    CENDO • CENTRO DE ENDOMETRIOSIS
                  </h1>
                  <p className="text-[10.5px] font-medium text-foreground">
                    Ginecología Especializada • Cirugía Laparoscópica • Patología Cervical
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                    {clinicAddress} • Citas: {clinicPhone}
                  </p>
                </div>
              </div>

              <div className="shrink-0 border-l border-border pl-3 text-right">
                <div className="inline-block rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                  RECETA MÉDICA
                </div>
                <p className="mt-1 font-mono text-[9.5px] text-muted-foreground">
                  N° REC-{prescription.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="font-mono text-[10px] font-semibold text-foreground">
                  Fecha: {formatPeruDateDisplay(prescription.prescriptionDate)}
                </p>
              </div>
            </header>

            {/* 2. Filiación de la Paciente */}
            <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
              <div className="col-span-6">
                <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                  Paciente
                </span>
                <strong className="text-xs font-bold text-foreground sm:text-sm">
                  {patient.fullName}
                </strong>
              </div>

              <div className="col-span-2">
                <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                  {patient.documentType}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {patient.documentNumber}
                </span>
              </div>

              <div className="col-span-2">
                <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                  Edad
                </span>
                <span className="font-medium text-foreground">{patient.age} años</span>
              </div>

              <div className="col-span-2">
                <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                  Teléfono
                </span>
                <span className="font-mono text-muted-foreground">
                  {patient.phone || "—"}
                </span>
              </div>

              <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1.5 text-[11px]">
                <div>
                  <strong className="text-foreground">Diagnóstico: </strong>
                  <span className="text-foreground">{prescription.diagnosis}</span>
                </div>
                {prescription.cie10Code ? (
                  <span className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[9.5px] font-bold text-foreground">
                    CIE-10: {prescription.cie10Code}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Alerta de Alergias / RAMs si existen */}
            {showAllergyAlert ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div>
                  <strong className="uppercase">Alerta de Alergias / RAMs: </strong>
                  <span>{patientAllergies}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. Cuerpo Rp/ — Amplio, legible y distribuido como receta física */}
          <div className="flex flex-1 flex-col justify-start pt-1">
            <div className="flex items-baseline gap-2.5 border-b-2 border-primary/35 pb-1.5">
              <span
                className={cn(
                  "font-serif font-bold italic text-primary select-none",
                  isA5 ? "text-2xl" : "text-3xl"
                )}
              >
                Rp/
              </span>
              <span
                className={cn(
                  "font-bold tracking-wider text-muted-foreground uppercase",
                  isA5 ? "text-[10.5px]" : "text-xs"
                )}
              >
                Prescripción Médica e Indicaciones de Administración
              </span>
            </div>

            <div
              className={cn(
                "mt-3 flex-1",
                isSpaciousLayout
                  ? isA5
                    ? "space-y-3.5"
                    : "space-y-5"
                  : isA5
                    ? "space-y-2"
                    : "space-y-3"
              )}
            >
              {prescription.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={cn(
                    "break-inside-avoid rounded-lg border border-border/80 bg-card",
                    isSpaciousLayout
                      ? isA5
                        ? "space-y-1.5 p-3"
                        : "space-y-2 p-4"
                      : isA5
                        ? "space-y-1 p-2.5"
                        : "space-y-1.5 p-3"
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-1.5">
                    <div className="flex items-baseline gap-2.5">
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center justify-center rounded bg-primary font-mono font-bold text-primary-foreground",
                          isA5 ? "size-5 text-[11px]" : "size-6 text-xs"
                        )}
                      >
                        {idx + 1}
                      </span>
                      <strong
                        className={cn(
                          "font-extrabold tracking-tight text-foreground",
                          isA5
                            ? isSpaciousLayout
                              ? "text-[13.5px]"
                              : "text-xs"
                            : isSpaciousLayout
                              ? "text-[16px]"
                              : "text-[14px]"
                        )}
                      >
                        {item.medicationName}
                      </strong>
                    </div>

                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-1.5",
                        isA5 ? "text-[10px]" : "text-[11px]"
                      )}
                    >
                      <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono font-semibold text-foreground">
                        {item.presentation}
                      </span>
                      {item.quantity ? (
                        <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono font-bold text-primary">
                          Cant.: {item.quantity}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "space-y-1 text-foreground",
                      isA5 ? "pl-7" : "pl-8.5",
                      isA5
                        ? isSpaciousLayout
                          ? "text-[12px] leading-relaxed"
                          : "text-[11px] leading-snug"
                        : isSpaciousLayout
                          ? "text-[14px] leading-relaxed"
                          : "text-[12.5px] leading-snug"
                    )}
                  >
                    <p>
                      <strong className="text-primary">Administrar:</strong>{" "}
                      {item.dosage} —{" "}
                      <span className="font-semibold">{item.route}</span> —{" "}
                      {item.frequency} — {item.duration}.
                    </p>
                    {item.instructions ? (
                      <p className="italic text-muted-foreground">
                        <strong className="not-italic text-foreground">Nota:</strong>{" "}
                        {item.instructions}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Indicaciones Generales y Próxima Cita (Parte inferior antes de firma) */}
          {prescription.generalIndications || prescription.nextAppointmentDate ? (
            <div className="space-y-2.5 pt-1">
              {prescription.generalIndications ? (
                <div
                  className={cn(
                    "space-y-1 rounded-lg border border-border bg-muted/30",
                    isA5 ? "p-2.5 text-[11px]" : "p-3.5 text-[13px]"
                  )}
                >
                  <strong className="block text-[10px] font-bold tracking-wider text-primary uppercase">
                    Indicaciones Generales y Cuidados Clínicos
                  </strong>
                  <p className="leading-relaxed whitespace-pre-line text-foreground">
                    {prescription.generalIndications}
                  </p>
                </div>
              ) : null}

              {prescription.nextAppointmentDate ? (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2 text-foreground",
                    isA5 ? "text-[11px]" : "text-xs"
                  )}
                >
                  <span className="flex items-center gap-1.5 font-semibold text-primary">
                    <Calendar className="size-3.5" />
                    Próxima Cita de Control Ginecológico:
                  </span>
                  <strong className="rounded border border-border bg-card px-2.5 py-0.5 font-mono">
                    {formatPeruDateDisplay(prescription.nextAppointmentDate)}
                  </strong>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* 5. Pie Legal + Firma anclados siempre al pie de página */}
        <div className="shrink-0 break-inside-avoid pt-2">
          <div
            className={cn(
              "flex items-end justify-between gap-4 border-t border-border pt-2.5 pb-2",
              isA5 ? "px-[10mm]" : "px-[14mm]"
            )}
          >
            <div className="max-w-xs space-y-0.5 font-mono text-[8.5px] text-muted-foreground">
              <p>Documento médico oficial • Válido para dispensación en farmacia</p>
              <p>Ley General de Salud N° 26842 • Sistema Clínico CENDO Miraflores</p>
            </div>

            <CendoSignatureBlock
              doctorName={prescription.doctorName}
              doctorSpecialty={resolvedSig.doctorSpecialty}
              doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
              signatureSrc={resolvedSignatureSrc}
              showDigitalSignature={resolvedShowDigitalSignature}
              compact={isA5}
            />
          </div>

          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
            compact={isA5}
          />
        </div>
      </section>
    </div>
  );
}
