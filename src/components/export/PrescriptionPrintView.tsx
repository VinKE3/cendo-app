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
            ? "min-h-[210mm] w-[148mm] text-[11px]"
            : "min-h-[297mm] w-[210mm] text-xs"
        )}
      >
        <div
          className={cn(
            "flex-1",
            isA5 ? "space-y-2.5 px-[10mm] pt-[7mm] pb-3" : "space-y-3.5 px-[14mm] pt-[10mm] pb-4"
          )}
        >
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

          {/* 3. Cuerpo Rp/ */}
          <div className="space-y-2.5 pt-0.5">
            <div className="flex items-center gap-2 border-b border-primary/30 pb-1">
              <span className="font-serif text-xl font-bold italic text-primary select-none">
                Rp/
              </span>
              <span className="text-[10.5px] font-bold tracking-wider text-muted-foreground uppercase">
                Tratamiento Farmacológico Prescrito
              </span>
            </div>

            <div className="space-y-2">
              {prescription.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="space-y-1 rounded-lg border border-border bg-card p-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                        {idx + 1}
                      </span>
                      <strong className="font-bold text-foreground">
                        {item.medicationName}
                      </strong>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 text-[10px]">
                      <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono font-medium text-foreground">
                        {item.presentation}
                      </span>
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        {item.route}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5 pl-7 leading-snug text-foreground">
                    <p>
                      <strong>Dosis:</strong> {item.dosage} •{" "}
                      <strong>Frecuencia:</strong> {item.frequency} •{" "}
                      <strong>Duración:</strong> {item.duration}
                    </p>
                    {item.instructions ? (
                      <p className="text-[10.5px] italic text-muted-foreground">
                        <strong>Indicación especial:</strong> {item.instructions}
                      </p>
                    ) : null}
                    {item.quantity ? (
                      <p className="font-mono text-[10px] text-muted-foreground">
                        Cantidad a dispensar:{" "}
                        <strong className="text-foreground">{item.quantity}</strong>
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Indicaciones Generales */}
          {prescription.generalIndications ? (
            <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-2.5">
              <strong className="block text-[9.5px] font-bold text-foreground uppercase">
                Indicaciones Generales y Cuidados Clínicos
              </strong>
              <p className="leading-relaxed whitespace-pre-line text-foreground">
                {prescription.generalIndications}
              </p>
            </div>
          ) : null}

          {/* 5. Próxima Cita */}
          {prescription.nextAppointmentDate ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-foreground">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <Calendar className="size-3.5" />
                Próxima Cita de Control Ginecológico:
              </span>
              <strong className="rounded border border-border bg-card px-2 py-0.5 font-mono">
                {formatPeruDateDisplay(prescription.nextAppointmentDate)}
              </strong>
            </div>
          ) : null}

          {/* 6. Pie Legal y Firma */}
          <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
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
        </div>

        <div className="shrink-0 pt-2">
          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
          />
        </div>
      </section>
    </div>
  );
}
