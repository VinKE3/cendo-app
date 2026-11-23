"use client";

import { FlaskConical, Info, Microscope, Scan } from "lucide-react";
import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import {
  getDefaultInstructionsForTemplateType,
  getLabOrderKindMeta,
  isImagingLabTemplate,
  isPathologyLabTemplate,
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

  const kindMeta = getLabOrderKindMeta(labOrder.templateType);
  const isImagingTemplate = isImagingLabTemplate(labOrder.templateType);
  const isPathologyTemplate = isPathologyLabTemplate(labOrder.templateType);
  const specimen = labOrder.specimenDetails;
  const instructionsText =
    labOrder.patientInstructions.trim() ||
    getDefaultInstructionsForTemplateType(labOrder.templateType);
  const isSpaciousItems = labOrder.items.length <= 6;

  return (
    <div
      id="lab-order-print-sheet"
      className="mx-auto max-w-[210mm] space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle={kindMeta.fullTitle}
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
        <div className="flex flex-1 flex-col justify-between gap-4 px-[12mm] pt-[9mm] pb-3">
          <div className="space-y-3">
            {/* 1. Membrete Institucional */}
            <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-2.5">
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
                <div
                  className={cn(
                    "inline-block rounded border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                    isImagingTemplate
                      ? "border-warning bg-warning/15 text-foreground"
                      : "border-primary/20 bg-primary/10 text-primary"
                  )}
                >
                  {kindMeta.fullTitle}
                </div>
                <p className="mt-1 font-mono text-[9.5px] text-muted-foreground">
                  N° {kindMeta.codePrefix}-{labOrder.id.slice(0, 8).toUpperCase()}
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

            {/* Cintillo protagonista a todo lo ancho para distinguir el tipo de examen solicitado en toda la hoja */}
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-2",
                isImagingTemplate
                  ? "border-warning bg-warning/10 text-foreground"
                  : isPathologyTemplate
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-primary/60 bg-primary/5 text-primary"
              )}
            >
              <div className="flex items-center gap-2.5">
                {isImagingTemplate ? (
                  <Scan className="size-5 shrink-0 text-warning" />
                ) : isPathologyTemplate ? (
                  <Microscope className="size-5 shrink-0 text-primary" />
                ) : (
                  <FlaskConical className="size-5 shrink-0 text-primary" />
                )}
                <div>
                  <p className="text-xs font-extrabold tracking-wider uppercase">
                    {isImagingTemplate
                      ? "SOLICITUD PARA CENTRO DE DIAGNÓSTICO POR IMÁGENES"
                      : isPathologyTemplate
                        ? "REMISIÓN PARA ANATOMÍA PATOLÓGICA & CITOLOGÍA"
                        : "SOLICITUD PARA LABORATORIO CLÍNICO"}
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {isImagingTemplate
                      ? "Ecografía Ginecológica / Obstétrica / Mamaria • Resonancia Magnética • Mamografía / TAC / Rx"
                      : isPathologyTemplate
                        ? "Estudio Histopatológico, Citológico o Biopsia con Cadena de Custodia CENDO"
                        : "Análisis Hematológicos, Bioquímicos, Perfil Hormonal, Marcadores y Microbiología"}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded border border-current/25 bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase">
                {kindMeta.shortLabel}
              </span>
            </div>

            {/* 2. Filiación de la Paciente */}
            <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
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
                  <strong className="text-foreground">Diagnóstico / Indicación Clínica: </strong>
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
          </div>

          {/* 3. Exámenes Solicitados — Protagonista en la hoja */}
          <div className="flex flex-1 flex-col justify-start space-y-3">
            <div className="overflow-hidden rounded-lg border-2 border-border">
              <div
                className={cn(
                  "flex items-center justify-between border-b border-border px-3.5 py-2",
                  isImagingTemplate ? "bg-warning/15" : "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  {isImagingTemplate ? (
                    <Scan className="size-4 text-warning" />
                  ) : isPathologyTemplate ? (
                    <Microscope className="size-4 text-primary" />
                  ) : (
                    <FlaskConical className="size-4 text-primary" />
                  )}
                  <span className="text-xs font-extrabold tracking-wider text-foreground uppercase">
                    {isImagingTemplate
                      ? `Estudios por Imágenes Solicitados (${labOrder.items.length})`
                      : isPathologyTemplate
                        ? `Estudio Histopatológico / Citológico Solicitado (${labOrder.items.length})`
                        : `Exámenes de Laboratorio Solicitados (${labOrder.items.length})`}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold text-primary uppercase">
                  {kindMeta.shortLabel}
                </span>
              </div>

              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/25 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    <th className="w-10 px-3 py-2 text-center">#</th>
                    <th className="px-3 py-2">
                      {isImagingTemplate
                        ? "Estudio por Imágenes Solicitado"
                        : "Análisis / Estudio"}
                    </th>
                    <th className="w-44 px-3 py-2">
                      {isImagingTemplate ? "Modalidad / Vía" : "Tipo de Muestra"}
                    </th>
                    <th className="w-52 px-3 py-2">
                      {isImagingTemplate ? "Preparación / Nota" : "Nota Clínica"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {labOrder.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td
                        className={cn(
                          "px-3 text-center font-mono text-xs font-bold text-primary",
                          isSpaciousItems ? "py-3.5" : "py-2"
                        )}
                      >
                        {idx + 1}
                      </td>
                      <td
                        className={cn(
                          "px-3",
                          isSpaciousItems ? "py-3.5" : "py-2"
                        )}
                      >
                        <p className="text-[13px] font-bold text-foreground">
                          {item.testName}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {item.category}
                        </p>
                      </td>
                      <td
                        className={cn(
                          "px-3 font-mono text-[11px] font-medium text-foreground",
                          isSpaciousItems ? "py-3.5" : "py-2"
                        )}
                      >
                        {item.sampleType ||
                          (isImagingTemplate
                            ? "Diagnóstico por Imágenes"
                            : "Sangre venosa")}
                      </td>
                      <td
                        className={cn(
                          "px-3 text-[11px] italic text-muted-foreground",
                          isSpaciousItems ? "py-3.5" : "py-2"
                        )}
                      >
                        {item.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {labOrder.customTests ? (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                <strong className="mb-0.5 block text-[10px] font-bold text-primary uppercase">
                  {isImagingTemplate
                    ? "Estudios por Imágenes / Especificaciones Adicionales"
                    : "Exámenes Complementarios / Adicionales"}
                </strong>
                <p className="text-xs leading-relaxed whitespace-pre-line text-foreground">
                  {labOrder.customTests}
                </p>
              </div>
            ) : null}
          </div>

          {/* 4. Indicaciones */}
          <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-primary">
              <Info className="size-3.5" />
              <strong className="text-[10px] font-bold tracking-wider uppercase">
                {isImagingTemplate
                  ? "Indicaciones de Preparación para Estudio por Imágenes"
                  : isPathologyTemplate
                    ? "Indicaciones de Remisión"
                    : "Indicaciones de Preparación para la Paciente"}
              </strong>
            </div>
            <p className="pl-5 text-[11.5px] leading-relaxed whitespace-pre-line text-foreground">
              {instructionsText}
            </p>
          </div>
        </div>

        {/* Firma y Cenefa ancladas al fondo */}
        <div className="shrink-0 break-inside-avoid">
          <div className="flex items-end justify-between border-t border-border px-[12mm] pt-2 pb-1.5">
            <div className="space-y-0.5 font-mono text-[8.5px] text-muted-foreground">
              <p>
                {kindMeta.fullTitle} • CENDO Miraflores
              </p>
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
