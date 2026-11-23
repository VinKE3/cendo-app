"use client";

import { AlertTriangle, Calendar } from "lucide-react";
import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import type { PrintPaperFormat } from "@/lib/pdfGenerator";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

export type PrescriptionPaperFormat = PrintPaperFormat;

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

  const isA5Portrait = paperFormat === "A5";
  const isA5Landscape = paperFormat === "A5_LANDSCAPE";
  const isCompactHeight = isA5Portrait || isA5Landscape;
  const showAllergyAlert = hasPositiveAllergy(patientAllergies);
  const isSpaciousLayout = prescription.items.length <= 3;

  const thTextSizeClass = isA5Landscape
    ? "pb-1.5 text-[11px]"
    : isA5Portrait
      ? "pb-1.5 text-[10px]"
      : "pb-2 text-[12px]";

  const tdRowClass = isA5Landscape
    ? isSpaciousLayout
      ? "py-2.5 text-[12.5px] leading-snug"
      : "py-1.5 text-[11px] leading-snug"
    : isA5Portrait
      ? isSpaciousLayout
        ? "py-3 text-[11px] leading-snug"
        : "py-2 text-[10px] leading-snug"
      : isSpaciousLayout
        ? "py-4 text-[14px] leading-snug"
        : "py-2.5 text-[12.5px] leading-snug";

  return (
    <div
      id="prescription-print-sheet"
      className={cn(
        "mx-auto space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0",
        isA5Portrait ? "max-w-[148mm]" : "max-w-[210mm]"
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
          isA5Landscape
            ? "min-h-[147.5mm] w-[210mm] text-[12px]"
            : isA5Portrait
              ? "min-h-[209.5mm] w-[148mm] text-xs"
              : "min-h-[296.5mm] w-[210mm] text-[13px]"
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col justify-between",
            isA5Landscape
              ? "gap-2 px-[10mm] pt-[5mm] pb-1"
              : isA5Portrait
                ? "gap-2.5 px-[10mm] pt-[7mm] pb-2"
                : "gap-4 px-[14mm] pt-[10mm] pb-3"
          )}
        >
          <div
            className={cn(
              isA5Landscape
                ? "space-y-1.5"
                : isA5Portrait
                  ? "space-y-2.5"
                  : "space-y-4"
            )}
          >
            {/* 1. Membrete Institucional */}
            <header
              className={cn(
                "flex items-start justify-between gap-3 border-b-2 border-primary",
                isA5Landscape ? "pb-1.5" : "pb-2.5"
              )}
            >
              <div className="flex items-center gap-2.5">
                <BrandLogo size={isCompactHeight ? "sm" : "md"} showText={false} />
                <div>
                  <h1
                    className={cn(
                      "font-sans font-extrabold tracking-tight text-primary",
                      isCompactHeight ? "text-base" : "text-lg"
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
            <div
              className={cn(
                "grid grid-cols-12 items-center rounded-lg border border-border bg-muted/30",
                isA5Landscape ? "gap-1.5 p-2" : "gap-2 p-2.5"
              )}
            >
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
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 text-[11px] text-destructive",
                  isA5Landscape ? "py-1.5" : "py-2"
                )}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div>
                  <strong className="uppercase">Alerta de Alergias / RAMs: </strong>
                  <span>{patientAllergies}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. Cuerpo Rp/ — Tabla abierta de 6 columnas (estilo recetario clínico) */}
          <div className="flex flex-1 flex-col justify-start pt-1">
            <div
              className={cn(
                "flex items-baseline gap-2.5",
                isA5Landscape ? "mb-1.5" : isA5Portrait ? "mb-2" : "mb-3"
              )}
            >
              <span
                className={cn(
                  "font-serif font-bold italic text-primary select-none",
                  isCompactHeight ? "text-2xl" : "text-3xl"
                )}
              >
                Rp/
              </span>
              <span
                className={cn(
                  "font-bold tracking-wider text-muted-foreground uppercase",
                  isCompactHeight ? "text-[10.5px]" : "text-xs"
                )}
              >
                Prescripción Médica e Indicaciones de Administración
              </span>
            </div>

            <div className="flex-1">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-foreground/40 text-foreground">
                    <th
                      className={cn(
                        "w-[23%] pr-2 text-left font-bold",
                        thTextSizeClass
                      )}
                    >
                      N. / Genérico
                    </th>
                    <th
                      className={cn(
                        "w-[18%] px-1.5 text-center font-bold",
                        thTextSizeClass
                      )}
                    >
                      Presentación
                    </th>
                    <th
                      className={cn(
                        "w-[25%] px-1.5 text-center font-bold",
                        thTextSizeClass
                      )}
                    >
                      Dosis
                    </th>
                    <th
                      className={cn(
                        "w-[13%] px-1.5 text-center font-bold",
                        thTextSizeClass
                      )}
                    >
                      Frecuencia
                    </th>
                    <th
                      className={cn(
                        "w-[9%] px-1.5 text-center font-bold",
                        thTextSizeClass
                      )}
                    >
                      Vía
                    </th>
                    <th
                      className={cn(
                        "w-[12%] pl-1.5 text-center font-bold",
                        thTextSizeClass
                      )}
                    >
                      Días / Tto.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.items.map((item) => (
                    <tr
                      key={item.id}
                      className="break-inside-avoid border-b border-border/40 align-top last:border-b-0"
                    >
                      <td
                        className={cn(
                          "pr-2 text-left font-semibold break-words text-foreground",
                          tdRowClass
                        )}
                      >
                        {item.medicationName}
                      </td>
                      <td
                        className={cn(
                          "px-1.5 text-center break-words text-foreground",
                          tdRowClass
                        )}
                      >
                        <span>{item.presentation}</span>
                        {item.quantity ? (
                          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                            Cant.: {item.quantity}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "px-1.5 text-center break-words text-foreground",
                          tdRowClass
                        )}
                      >
                        <span>{item.dosage}</span>
                        {item.instructions ? (
                          <span className="mt-0.5 block text-muted-foreground">
                            {item.instructions}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "px-1.5 text-center break-words text-foreground",
                          tdRowClass
                        )}
                      >
                        {item.frequency}
                      </td>
                      <td
                        className={cn(
                          "px-1.5 text-center break-words text-foreground",
                          tdRowClass
                        )}
                      >
                        {item.route}
                      </td>
                      <td
                        className={cn(
                          "pl-1.5 text-center break-words text-foreground",
                          tdRowClass
                        )}
                      >
                        {item.duration}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Indicaciones Generales y Próxima Cita (Parte inferior antes de firma) */}
          {prescription.generalIndications || prescription.nextAppointmentDate ? (
            <div className={cn("pt-1", isA5Landscape ? "space-y-1.5" : "space-y-2")}>
              {prescription.generalIndications ? (
                <div
                  className={cn(
                    "border-t border-border/70 pt-2 leading-relaxed text-foreground",
                    isCompactHeight ? "text-[11px]" : "text-[12.5px]"
                  )}
                >
                  <p className="whitespace-pre-line">
                    <strong className="font-bold text-primary">
                      Indicaciones generales:{" "}
                    </strong>
                    {prescription.generalIndications}
                  </p>
                </div>
              ) : null}

              {prescription.nextAppointmentDate ? (
                <div
                  className={cn(
                    "flex items-center justify-between text-foreground",
                    !prescription.generalIndications && "border-t border-border/70 pt-2",
                    isCompactHeight ? "text-[11px]" : "text-xs"
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
        <div className="shrink-0 break-inside-avoid pt-1.5">
          <div
            className={cn(
              "flex items-end justify-between gap-4 border-t border-border",
              isA5Landscape
                ? "px-[10mm] pt-1.5 pb-1"
                : isA5Portrait
                  ? "px-[10mm] pt-2 pb-1.5"
                  : "px-[14mm] pt-2.5 pb-2"
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
              compact={isCompactHeight}
            />
          </div>

          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
            compact={isA5Portrait}
            slim={isA5Landscape}
          />
        </div>
      </section>
    </div>
  );
}
