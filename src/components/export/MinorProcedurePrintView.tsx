"use client";

import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import {
  isContraceptiveDeviceProcedure,
  PATHOLOGY_STATUS_LABELS,
  PROCEDURE_TYPE_LABELS,
  type MinorProcedureItem,
} from "@/features/procedimientos/procedimientos.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface MinorProcedurePrintViewProps {
  procedure: MinorProcedureItem;
  patient: PatientDirectoryItem;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
  signatureSrc?: string | null;
  showDigitalSignature?: boolean;
}

export function MinorProcedurePrintView({
  procedure,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
  signatureSrc,
  showDigitalSignature,
}: MinorProcedurePrintViewProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const resolvedSig = getSignatureForDoctor(
    procedure.doctorId,
    procedure.doctorCmp
  );
  const resolvedSignatureSrc =
    signatureSrc !== undefined ? signatureSrc : resolvedSig.signatureSrc;
  const resolvedShowDigitalSignature =
    showDigitalSignature !== undefined
      ? showDigitalSignature
      : resolvedSig.showByDefault;

  const credentials = [
    procedure.doctorCmp ? `CMP ${procedure.doctorCmp}` : "",
    procedure.doctorRne ? `RNE ${procedure.doctorRne}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const det = procedure.procedureDetails;
  const isDeviceProc = isContraceptiveDeviceProcedure(procedure.procedureType);
  const procedureLabel =
    PROCEDURE_TYPE_LABELS[procedure.procedureType] || procedure.procedureType;
  const shortCode = `PROC-${procedure.id.slice(0, 8).toUpperCase()}`;
  const pathologyStatus =
    det.pathologyStatus ??
    (det.specimenSentToPathology ? "PENDIENTE" : "NO_APLICA");

  return (
    <div
      id="procedure-print-sheet"
      className="mx-auto max-w-[210mm] space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle="PROCEDIMIENTO GINECOLÓGICO"
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={procedure.doctorName.toUpperCase()}
          doctorSpecialty={resolvedSig.doctorSpecialty}
          doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
          clinicAddress={clinicAddress}
          clinicEmail={clinicEmail}
          clinicPhone={clinicPhone}
        />
      ) : null}

      <section className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-3 px-[14mm] pt-[10mm] pb-4">
          {/* 1. Membrete CENDO */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-2.5">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={false} />
              <div>
                <h1 className="font-sans text-lg font-extrabold tracking-tight text-primary">
                  CENDO • CENTRO DE ENDOMETRIOSIS
                </h1>
                <p className="text-[11px] font-medium text-foreground">
                  Cirugía Ambulatoria • Patología Cervical • Procedimientos de
                  Consultorio
                </p>
                <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                  {clinicAddress} • Citas: {clinicPhone}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-l border-border pl-4 text-right">
              <div className="inline-block rounded border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary uppercase">
                PROTOCOLO QUIRÚRGICO MENOR
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                N° {shortCode}
              </p>
              <p className="font-mono text-[10px] font-semibold text-foreground">
                Fecha: {formatPeruDateDisplay(procedure.procedureDate)}
              </p>
            </div>
          </header>

          {/* 2. Filiación Completa + Modalidad del Procedimiento */}
          <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="col-span-5">
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
              <span className="font-medium text-foreground">
                {patient.age} años
              </span>
            </div>

            <div className="col-span-3 text-right">
              <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                Cirujano Responsable
              </span>
              <span className="text-[10px] font-bold text-primary">
                {procedure.doctorName}
              </span>
            </div>

            <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1.5">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase">
                  Procedimiento Realizado:{" "}
                </span>
                <strong className="text-xs font-extrabold text-primary uppercase">
                  {procedureLabel}
                </strong>
              </div>
              {det.informedConsentConfirmed !== false ? (
                <span className="rounded border border-success/35 bg-success/10 px-2 py-0.5 font-mono text-[8.5px] font-bold text-success">
                  ✓ Consentimiento Informado Verificado (NTS 139-MINSA)
                </span>
              ) : null}
            </div>
          </div>

          {/* 3. Diagnósticos Preoperatorio y Postoperatorio */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <span className="block text-[9.5px] font-bold text-muted-foreground uppercase">
                Diagnóstico Preoperatorio
              </span>
              <p className="mt-1 text-[11px] font-semibold text-foreground">
                {procedure.preOpDiagnosis}
              </p>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9.5px] font-bold text-primary uppercase">
                  Diagnóstico Postoperatorio Definitivo
                </span>
                {procedure.cie10Code ? (
                  <span className="rounded border border-primary/30 bg-card px-2 py-0.5 font-mono text-[9.5px] font-bold text-primary">
                    CIE-10: {procedure.cie10Code}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] font-bold text-foreground">
                {procedure.postOpDiagnosis}
              </p>
            </div>
          </div>

          {/* 4. Descripción de la Técnica Quirúrgica & Parámetros Intraoperatorios */}
          <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
            <h2 className="border-b border-border pb-1 text-[10px] font-bold tracking-wider text-primary uppercase">
              Descripción de la Técnica Quirúrgica & Hallazgos Operatorios
            </h2>

            <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-muted/25 p-2 text-[10.5px]">
              <div>
                <span className="block text-[8.5px] font-semibold text-muted-foreground uppercase">
                  Anestesia Empleada
                </span>
                <strong className="font-mono text-foreground">
                  {procedure.anesthesiaType}
                </strong>
              </div>
              <div>
                <span className="block text-[8.5px] font-semibold text-muted-foreground uppercase">
                  Sangrado Operatorio
                </span>
                <strong className="font-mono text-foreground">
                  {det.bleedingAmount}
                </strong>
              </div>
              <div>
                <span className="block text-[8.5px] font-semibold text-muted-foreground uppercase">
                  Método de Hemostasia
                </span>
                <strong className="font-mono text-foreground">
                  {det.hemostasisMethod}
                </strong>
              </div>
              <div>
                <span className="block text-[8.5px] font-semibold text-muted-foreground uppercase">
                  Envío a Patología
                </span>
                <strong
                  className={cn(
                    "font-mono",
                    det.specimenSentToPathology
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {det.specimenSentToPathology
                    ? "Sí (Remitido)"
                    : "No requerido"}
                </strong>
              </div>
            </div>

            {det.informedConsentConfirmed !== false ? (
              <p className="text-[10px] italic text-muted-foreground">
                Previa explicación detallada del acto médico, riesgos,
                beneficios y cuidados posteriores, y contando con el
                Consentimiento Informado otorgado por la paciente, se procede
                bajo normas de bioseguridad institucional:
              </p>
            ) : null}

            <div className="space-y-2 text-[11px]">
              <div>
                <strong className="block text-[10px] font-bold text-muted-foreground uppercase">
                  Técnica de Asepsia, Antisepsia y Acto Operatorio:
                </strong>
                <p className="mt-0.5 leading-relaxed whitespace-pre-line text-foreground">
                  {det.asepsisTechnique}
                </p>
              </div>

              {det.biopsySites ? (
                <div>
                  <strong className="block text-[10px] font-bold text-muted-foreground uppercase">
                    {isDeviceProc
                      ? "Sitio Anatómico de Inserción / Extracción:"
                      : "Sitio Anatómico de Biopsia / Resección:"}
                  </strong>
                  <p className="mt-0.5 font-medium text-foreground">
                    {det.biopsySites}
                  </p>
                </div>
              ) : null}

              {det.deviceInfo ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                  <strong className="block text-[9.5px] font-bold text-primary uppercase">
                    Trazabilidad del Dispositivo / Vigencia de Recambio:
                  </strong>
                  <p className="mt-0.5 font-mono text-[10.5px] font-bold text-foreground">
                    {det.deviceInfo}
                  </p>
                </div>
              ) : null}

              {det.specimenSentToPathology ? (
                <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-[9.5px] font-bold text-primary uppercase">
                      Rotulación y Cadena de Custodia del Espécimen (Anatomía
                      Patológica)
                    </strong>
                    <span
                      className={cn(
                        "rounded border px-2 py-0.5 font-mono text-[8.5px] font-bold",
                        pathologyStatus === "RECIBIDO"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-warning/50 bg-card text-foreground"
                      )}
                    >
                      {PATHOLOGY_STATUS_LABELS[pathologyStatus]}
                    </span>
                  </div>
                  <p className="text-[10.5px] font-medium text-foreground">
                    {det.specimenDescription ||
                      "Muestra tisular fijada en formol tamponado al 10% remitida a Anatomía Patológica."}
                  </p>
                  {det.pathologyResultNotes ? (
                    <p className="border-t border-warning/30 pt-1 text-[10.5px] font-bold text-primary">
                      Resultado Histopatológico: {det.pathologyResultNotes}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <strong className="block text-[10px] font-bold text-muted-foreground uppercase">
                  Complicaciones Intraoperatorias y Condición de Egreso:
                </strong>
                <p className="mt-0.5 text-foreground">
                  {det.complications ||
                    "Ninguna. Paciente egresa hemodinámicamente estable y sin sangrado activo."}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Cuidados e Indicaciones Post-Procedimiento */}
          <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-1">
              <h2 className="text-[10px] font-bold tracking-wider text-primary uppercase">
                Cuidados e Indicaciones Post-Procedimiento para la Paciente
              </h2>
              {procedure.nextControlDate ? (
                <span className="rounded border border-primary/30 bg-card px-2 py-0.5 font-mono text-[9.5px] font-bold text-primary">
                  Próximo Control:{" "}
                  {formatPeruDateDisplay(procedure.nextControlDate)}
                </span>
              ) : null}
            </div>

            <p className="text-[11px] leading-relaxed whitespace-pre-line text-foreground">
              {procedure.postOpIndications}
            </p>

            {procedure.medicationsPrescribed ? (
              <div className="border-t border-primary/20 pt-1.5 text-[10.5px]">
                <strong className="text-primary">
                  Medicación Farmacológica Indicada:{" "}
                </strong>
                <span className="font-medium text-foreground">
                  {procedure.medicationsPrescribed}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Firma Digital y Cenefa */}
        <div>
          <div className="flex items-end justify-between px-[14mm] pb-3">
            <div className="font-mono text-[8.5px] leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">
                Documento médico legal • CENDO Miraflores
              </p>
              <p>
                Protocolo operatorio ambulatorio registrado en Historia Clínica
                Electrónica
              </p>
            </div>
            <CendoSignatureBlock
              doctorName={procedure.doctorName}
              doctorSpecialty={resolvedSig.doctorSpecialty}
              doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
              signatureSrc={resolvedSignatureSrc}
              showDigitalSignature={resolvedShowDigitalSignature}
              align="right"
              showSalutation
            />
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
