"use client";

import { FlaskConical, Info, Microscope } from "lucide-react";
import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { BrandLogo } from "@/components/layout/BrandLogo";
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
}

export function LabOrderPrintView({
  labOrder,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
}: LabOrderPrintViewProps) {
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
              ? "REMISIÓN A ANATOMÍA PATOLÓGICA / CITOLOGÍA"
              : "ORDEN DE LABORATORIO CLÍNICO"
          }
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={labOrder.doctorName.toUpperCase()}
          doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
          clinicAddress={clinicAddress}
          clinicEmail={clinicEmail}
          clinicPhone={clinicPhone}
        />
      ) : null}

      <section className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-3 px-[14mm] pt-[10mm] pb-4">
          {/* 1. Membrete Institucional */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-2.5">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={false} />
              <div>
                <h1 className="font-serif text-lg font-bold tracking-tight text-primary">
                  CENDO • CENTRO DE ENDOMETRIOSIS
                </h1>
                <p className="text-[11px] font-medium text-foreground">
                  Ginecología Especializada • Cirugía Laparoscópica • Patología Cervical
                </p>
                <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                  {clinicAddress} • Citas: {clinicPhone}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-l border-border pl-4 text-right">
              <div className="inline-block rounded border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                {isPathologyTemplate
                  ? labOrder.templateTitle
                    ? labOrder.templateTitle.split("(")[0].trim().toUpperCase()
                    : "REMISIÓN A PATOLOGÍA"
                  : "ORDEN DE LABORATORIO"}
              </div>
              <p className="mt-1 font-mono text-[9.5px] text-muted-foreground">
                N° LAB-{labOrder.id.slice(0, 8).toUpperCase()}
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
              <strong className="text-sm font-bold text-foreground">
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

          {/* 2.5 Datos de Muestra & Anatomía Patológica */}
          {isPathologyTemplate && specimen ? (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                  <Microscope className="size-3.5" />
                  Remisión de Muestra & Estudio Patológico / Citológico
                </span>
                <span className="rounded border border-primary/20 bg-card px-2 py-0.5 font-mono text-[9px] font-semibold text-primary">
                  {labOrder.templateTitle || labOrder.templateType}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-[10.5px]">
                <div>
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    Sitio Anatómico
                  </span>
                  <span className="font-semibold text-foreground">
                    {specimen.anatomicalSite || "No especificado"}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    Fijador / Transporte
                  </span>
                  <span className="font-mono text-foreground">
                    {specimen.fixative || "Formol tamponado 10%"}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    N° Envases
                  </span>
                  <span className="font-bold text-foreground">
                    {specimen.containerCount ?? 1} envase(s)
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                    Aspecto Macroscópico
                  </span>
                  <span className="text-foreground">
                    {specimen.cervixAspect || "Sin particularidades"}
                  </span>
                </div>
              </div>

              {specimen.furDate ||
              specimen.obstetricParity ||
              specimen.contraceptiveMethod ? (
                <div className="grid grid-cols-3 gap-2 border-t border-primary/20 pt-1 text-[10px]">
                  <div>
                    <strong className="text-muted-foreground">FUR: </strong>
                    <span className="font-mono font-semibold text-foreground">
                      {specimen.furDate
                        ? formatPeruDateDisplay(specimen.furDate)
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <strong className="text-muted-foreground">
                      Fórmula Obstétrica:{" "}
                    </strong>
                    <span className="font-mono font-semibold text-foreground">
                      {specimen.obstetricParity || "—"}
                    </span>
                  </div>
                  <div>
                    <strong className="text-muted-foreground">MAC: </strong>
                    <span className="font-semibold text-foreground">
                      {specimen.contraceptiveMethod || "—"}
                    </span>
                  </div>
                </div>
              ) : null}

              {specimen.clinicalFindings ? (
                <div className="border-t border-primary/20 pt-1 text-[10px]">
                  <strong className="text-muted-foreground">
                    Observaciones para Patología:{" "}
                  </strong>
                  <span className="italic text-foreground">
                    {specimen.clinicalFindings}
                  </span>
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
                  Exámenes Solicitados ({labOrder.items.length})
                </span>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">
                Laboratorio Clínico / Anatomía Patológica
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
                  ? "Indicaciones de Remisión y Seguimiento"
                  : "Indicaciones de Preparación para la Paciente"}
              </strong>
            </div>
            <p className="pl-5 text-[10.5px] leading-relaxed whitespace-pre-line text-foreground">
              {instructionsText}
            </p>
          </div>
        </div>

        {/* Talón de Recepción & Firma */}
        <div className="shrink-0 space-y-2 px-[14mm] pt-2 pb-2">
          {isPathologyTemplate ? (
            <div className="space-y-1 rounded border border-dashed border-border bg-muted/20 p-2 font-mono text-[8.5px] text-muted-foreground">
              <div className="flex justify-between font-bold text-foreground">
                <span>TALÓN DE RECEPCIÓN & CADENA DE CUSTODIA</span>
                <span>N° REGISTRO PATOLOGÍA: __________________</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>Recibido por: ________________________</div>
                <div>Fecha/Hora: ____/____/202__ ___:___</div>
                <div>Envase: [ ] Conforme [ ] Observado</div>
              </div>
            </div>
          ) : null}

          <div className="flex items-end justify-between border-t border-border pt-2">
            <div className="space-y-0.5 font-mono text-[8.5px] text-muted-foreground">
              <p>Documento médico oficial • CENDO Miraflores</p>
              <p>Emitido a través del Sistema Clínico CENDO</p>
            </div>

            <div className="min-w-[210px] space-y-0.5 text-center">
              <div className="flex h-8 items-center justify-center border-b border-border">
                <span className="font-serif text-sm font-bold italic text-primary select-none">
                  {labOrder.doctorName}
                </span>
              </div>
              <p className="text-[11px] font-bold text-foreground uppercase">
                {labOrder.doctorName}
              </p>
              <p className="font-mono text-[9.5px] font-semibold text-muted-foreground">
                {credentials || "CMP 61693 • RNE 38657"}
              </p>
            </div>
          </div>

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
