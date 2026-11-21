"use client";

import { FlaskConical, Info, Microscope } from "lucide-react";
import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import {
  getDefaultInstructionsForTemplateType,
  type LabOrderItem,
} from "@/features/laboratorio/laboratorio.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface LabOrderPrintViewProps {
  labOrder: LabOrderItem;
  patient: PatientDirectoryItem;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
  signatureSrc?: string | null;
  showDigitalSignature?: boolean;
}

export function LabOrderPrintView({
  labOrder,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
  signatureSrc,
  showDigitalSignature,
}: LabOrderPrintViewProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const resolvedSig = getSignatureForDoctor(
    labOrder.doctorId,
    labOrder.doctorCmp
  );
  const resolvedSignatureSrc =
    signatureSrc !== undefined ? signatureSrc : resolvedSig.signatureSrc;
  const resolvedShowDigitalSignature =
    showDigitalSignature !== undefined
      ? showDigitalSignature
      : resolvedSig.showByDefault;

  const credentials = [
    labOrder.doctorCmp ? `CMP ${labOrder.doctorCmp}` : "",
    labOrder.doctorRne ? `RNE ${labOrder.doctorRne}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const isPathologyTemplate = labOrder.templateType !== "GENERAL";
  const specimen = labOrder.specimenDetails;
  const instructionsText =
    labOrder.patientInstructions.trim() ||
    getDefaultInstructionsForTemplateType(labOrder.templateType);

  return (
    <div
      id="lab-order-print-sheet"
      className="mx-auto max-w-[210mm] space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle={
            isPathologyTemplate
              ? "SOLICITUD DE ANATOMÍA PATOLÓGICA"
              : "ORDEN DE LABORATORIO CLÍNICO"
          }
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={labOrder.doctorName.toUpperCase()}
          doctorSpecialty={resolvedSig.doctorSpecialty}
          doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
          clinicAddress={clinicAddress}
          clinicEmail={clinicEmail}
          clinicPhone={clinicPhone}
        />
      ) : null}

      <section className="page-sheet box-border flex min-h-[296.5mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-2.5 px-[12mm] pt-[8mm] pb-2">
          {/* 1. Membrete Institucional */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-2">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" showText={false} />
              <div>
                <h1 className="font-sans text-base font-extrabold tracking-tight text-primary">
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

            <div className="shrink-0 border-l border-border pl-4 text-right">
              <div className="inline-block rounded border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                {isPathologyTemplate
                  ? "SOLICITUD DE ANATOMÍA PATOLÓGICA"
                  : "ORDEN DE LABORATORIO"}
              </div>
              <p className="mt-1 font-mono text-[9.5px] text-muted-foreground">
                N° {isPathologyTemplate ? "AP" : "LAB"}-
                {labOrder.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="font-mono text-[10px] font-semibold text-foreground">
                Fecha: {formatPeruDateDisplay(labOrder.orderDate)}
              </p>
              <span
                className={cn(
                  "mt-0.5 inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                  labOrder.urgency === "Urgente"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : labOrder.urgency === "Prioritario"
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-border bg-muted text-muted-foreground"
                )}
              >
                Prioridad: {labOrder.urgency}
              </span>
            </div>
          </header>

          {/* 2. Filiación de la Paciente */}
          <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="col-span-6">
              <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                Paciente
              </span>
              <strong className="text-[13px] font-bold text-foreground">
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

            <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1 text-[10.5px]">
              <div>
                <strong className="text-foreground">Diagnóstico / Indicación: </strong>
                <span className="text-foreground">{labOrder.diagnosis}</span>
              </div>
              {labOrder.cie10Code ? (
                <span className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[9.5px] font-bold text-foreground">
                  CIE-10: {labOrder.cie10Code}
                </span>
              ) : null}
            </div>
          </div>

          {/* 2.5 Datos de Muestra & Solicitud de Anatomía Patológica */}
          {isPathologyTemplate && specimen ? (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                  <Microscope className="size-3.5" />
                  Solicitud de Anatomía Patológica
                </span>
                <span className="rounded border border-primary/20 bg-card px-2 py-0.5 font-mono text-[9px] font-semibold text-primary">
                  {labOrder.templateTitle || "Protocolo CENDO"}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2.5 text-[11px]">
                <div className="col-span-6">
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    Muestra
                  </span>
                  <span className="font-bold text-foreground uppercase">
                    {specimen.anatomicalSite ||
                      labOrder.items[0]?.testName ||
                      "No especificada"}
                  </span>
                </div>
                <div className="col-span-3">
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    Fecha de Toma de Muestra
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {specimen.sampleObtainedAt
                      ? formatPeruDateDisplay(specimen.sampleObtainedAt)
                      : formatPeruDateDisplay(labOrder.orderDate)}
                  </span>
                </div>
                <div className="col-span-3">
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    Fecha de Última Regla (FUR)
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {specimen.furDate
                      ? formatPeruDateDisplay(specimen.furDate)
                      : "No consignada"}
                  </span>
                </div>

                <div className="col-span-6 border-t border-primary/15 pt-1.5">
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    Médico Solicitante
                  </span>
                  <span className="font-semibold text-foreground uppercase">
                    {specimen.requestingDoctor || labOrder.doctorName}
                  </span>
                </div>
                <div className="col-span-6 border-t border-primary/15 pt-1.5">
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    Datos Clínicos
                  </span>
                  <span className="text-foreground">
                    {specimen.clinicalFindings || labOrder.diagnosis || "Ninguno"}
                  </span>
                </div>
              </div>

              {specimen.fixative ||
              (typeof specimen.containerCount === "number" &&
                specimen.containerCount > 1) ||
              specimen.cervixAspect ||
              specimen.obstetricParity ||
              specimen.contraceptiveMethod ? (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 border-t border-primary/15 pt-1.5 text-[9.5px] text-muted-foreground">
                  {specimen.fixative ? (
                    <span>
                      <strong>Fijador:</strong> {specimen.fixative}
                    </span>
                  ) : null}
                  {typeof specimen.containerCount === "number" ? (
                    <span>
                      <strong>N° Envases:</strong> {specimen.containerCount}
                    </span>
                  ) : null}
                  {specimen.cervixAspect ? (
                    <span>
                      <strong>Aspecto Macroscópico:</strong>{" "}
                      {specimen.cervixAspect}
                    </span>
                  ) : null}
                  {specimen.obstetricParity ? (
                    <span>
                      <strong>Paridad:</strong> {specimen.obstetricParity}
                    </span>
                  ) : null}
                  {specimen.contraceptiveMethod ? (
                    <span>
                      <strong>MAC:</strong> {specimen.contraceptiveMethod}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 3. Exámenes Solicitados */}
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <FlaskConical className="size-3.5 text-primary" />
                <span className="text-[10.5px] font-bold tracking-wider text-foreground uppercase">
                  {isPathologyTemplate
                    ? `Estudio Solicitado (${labOrder.items.length})`
                    : `Exámenes Solicitados (${labOrder.items.length})`}
                </span>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">
                {isPathologyTemplate
                  ? "Anatomía Patológica / Citología"
                  : "Laboratorio Clínico"}
              </span>
            </div>

            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[9.5px] font-bold tracking-wider text-muted-foreground uppercase">
                  <th className="w-8 px-2.5 py-1.5 text-center">#</th>
                  <th className="px-2.5 py-1.5">Análisis / Estudio</th>
                  <th className="w-44 px-2.5 py-1.5">Tipo de Muestra</th>
                  <th className="w-48 px-2.5 py-1.5">Nota Clínica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {labOrder.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-2.5 py-1.5 text-center font-mono text-[10px] font-bold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <p className="text-[11px] font-semibold text-foreground">
                        {item.testName}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground">
                        {item.category}
                      </p>
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-[10px] text-foreground">
                      {item.sampleType || "Sangre venosa"}
                    </td>
                    <td className="px-2.5 py-1.5 text-[10px] italic text-muted-foreground">
                      {item.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {labOrder.customTests ? (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5">
              <strong className="mb-0.5 block text-[9.5px] font-bold text-primary uppercase">
                Exámenes Complementarios / Adicionales
              </strong>
              <p className="text-[11px] whitespace-pre-line text-foreground">
                {labOrder.customTests}
              </p>
            </div>
          ) : null}

          <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-primary">
              <Info className="size-3.5" />
              <strong className="text-[9.5px] font-bold tracking-wider uppercase">
                {isPathologyTemplate
                  ? "Indicaciones de Remisión"
                  : "Indicaciones de Preparación para la Paciente"}
              </strong>
            </div>
            <p className="pl-5 text-[10.5px] leading-relaxed whitespace-pre-line text-foreground">
              {instructionsText}
            </p>
          </div>
        </div>

        {/* Firma y Cenefa */}
        <div className="shrink-0 break-inside-avoid">
          <div className="flex items-end justify-between border-t border-border px-[12mm] pt-2 pb-1.5">
            <div className="space-y-0.5 font-mono text-[8.5px] text-muted-foreground">
              <p>Documento médico oficial • CENDO Miraflores</p>
              <p>Emitido a través del Sistema Clínico CENDO</p>
            </div>

            <CendoSignatureBlock
              doctorName={labOrder.doctorName}
              doctorSpecialty={resolvedSig.doctorSpecialty}
              doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
              signatureSrc={resolvedSignatureSrc}
              showDigitalSignature={resolvedShowDigitalSignature}
              compact
              showSalutation
            />
          </div>

          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
            compact
          />
        </div>
      </section>
    </div>
  );
}
