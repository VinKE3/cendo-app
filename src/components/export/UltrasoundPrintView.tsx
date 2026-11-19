"use client";

import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import type { ClinicalImageRecord } from "@/db/schema/specialty";
import {
  ULTRASOUND_COVER_TITLES,
  ULTRASOUND_TYPE_LABELS,
  type UltrasoundReportItem,
} from "@/features/ecografias/ecografias.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { buildClinicalImageViewUrl } from "@/lib/clinical-images";
import { formatPeruDateDisplay } from "@/lib/utils";

interface UltrasoundPrintViewProps {
  report: UltrasoundReportItem;
  patient: PatientDirectoryItem;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
  signatureSrc?: string | null;
  showDigitalSignature?: boolean;
}

function chunkImages(
  items: ClinicalImageRecord[],
  chunkSize: number
): ClinicalImageRecord[][] {
  const chunks: ClinicalImageRecord[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export function UltrasoundPrintView({
  report,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
  signatureSrc,
  showDigitalSignature,
}: UltrasoundPrintViewProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const resolvedSig = getSignatureForDoctor(report.doctorId, report.doctorCmp);
  const resolvedSignatureSrc =
    signatureSrc !== undefined ? signatureSrc : resolvedSig.signatureSrc;
  const resolvedShowDigitalSignature =
    showDigitalSignature !== undefined
      ? showDigitalSignature
      : resolvedSig.showByDefault;

  const credentials = [
    report.doctorCmp ? `CMP ${report.doctorCmp}` : "",
    report.doctorRne ? `RNE ${report.doctorRne}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const f = report.findings;
  const isGynMode =
    report.ultrasoundType === "TRANSVAGINAL" ||
    report.ultrasoundType === "PELVICA" ||
    report.ultrasoundType === "DOPPLER";
  const isBreastMode = report.ultrasoundType === "MAMA_BILATERAL";
  const isObstetricMode =
    report.ultrasoundType === "OBSTETRICA_1T" ||
    report.ultrasoundType === "OBSTETRICA_2T_3T";

  const photoChunks = chunkImages(report.images, 6);

  return (
    <div
      id="ultrasound-print-sheet"
      className="mx-auto max-w-[210mm] space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle={
            ULTRASOUND_COVER_TITLES[report.ultrasoundType] ||
            "ECOGRAFÍA ESPECIALIZADA"
          }
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={report.doctorName.toUpperCase()}
          doctorSpecialty={resolvedSig.doctorSpecialty}
          doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
          clinicAddress={clinicAddress}
          clinicEmail={clinicEmail}
          clinicPhone={clinicPhone}
        />
      ) : null}

      {/* PÁGINA DEL INFORME ESTRUCTURADO */}
      <section className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-3.5 px-[14mm] pt-[10mm] pb-4">
          {/* 1. Membrete CENDO */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-3">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={false} />
              <div>
                <h1 className="font-sans text-lg font-extrabold tracking-tight text-primary">
                  CENDO • CENTRO DE ENDOMETRIOSIS
                </h1>
                <p className="text-[11px] font-medium text-foreground">
                  Unidad de Diagnóstico por Imágenes • Ecografía Ginecológica y
                  Obstétrica
                </p>
                <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                  {clinicAddress} • Citas: {clinicPhone}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-l border-border pl-4 text-right">
              <div className="inline-block rounded border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary uppercase">
                INFORME ECOGRÁFICO
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                N° ECO-{report.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="font-mono text-[10px] font-semibold text-foreground">
                Fecha: {formatPeruDateDisplay(report.reportDate)}
              </p>
            </div>
          </header>

          {/* Banner Modalidad */}
          <div className="flex items-center justify-between rounded-lg border-l-[5px] border-warning bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <span className="block font-mono text-[8.5px] font-bold tracking-widest text-warning uppercase">
                Modalidad Diagnóstica Especializada
              </span>
              <h2 className="mt-0.5 text-lg leading-tight font-extrabold tracking-wide uppercase">
                {ULTRASOUND_TYPE_LABELS[report.ultrasoundType] ||
                  report.ultrasoundType}
              </h2>
            </div>
            <div className="shrink-0 pl-3 text-right font-mono text-[9.5px]">
              <span className="block opacity-80">Protocolo CENDO</span>
              <strong className="text-warning">Alta Resolución</strong>
            </div>
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

            <div className="col-span-3">
              <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                {patient.documentType}
              </span>
              <span className="font-mono font-bold text-foreground">
                {patient.documentNumber}
              </span>
            </div>

            <div className="col-span-3">
              <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                Edad
              </span>
              <span className="font-medium text-foreground">
                {patient.age} años
              </span>
            </div>

            <div className="col-span-12 border-t border-border pt-1.5 text-[11px]">
              <strong className="text-muted-foreground">
                Indicación Clínica:{" "}
              </strong>
              <span className="text-foreground">{report.indication}</span>
            </div>
          </div>

          {/* 3. Hallazgos Detallados */}
          <div className="space-y-2.5 rounded-lg border border-border bg-card p-3.5">
            <h3 className="border-b border-border pb-1 text-[10px] font-bold tracking-wider text-primary uppercase">
              Hallazgos Ecográficos Detallados
            </h3>

            {isGynMode ? (
              <div className="space-y-2.5 text-[11px]">
                <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-muted/25 p-2.5">
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      Posición Útero
                    </span>
                    <strong className="font-mono text-foreground">
                      {f.uterusPosition || "AVF"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      Dimensiones
                    </span>
                    <strong className="font-mono text-foreground">
                      {f.uterusDimensions || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      Volumen Uterino
                    </span>
                    <strong className="font-mono text-foreground">
                      {typeof f.uterusVolumeCc === "number"
                        ? `${f.uterusVolumeCc} cc`
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      Endometrio
                    </span>
                    <strong className="font-mono text-foreground">
                      {typeof f.endometriumThicknessMm === "number"
                        ? `${f.endometriumThicknessMm} mm`
                        : "—"}
                      {f.endometriumPattern ? ` (${f.endometriumPattern})` : ""}
                    </strong>
                  </div>
                </div>

                {f.myometriumStatus ? (
                  <div>
                    <strong className="text-muted-foreground">
                      Miometrio y Zona de Unión:{" "}
                    </strong>
                    <span className="text-foreground">
                      {f.myometriumStatus}
                    </span>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded border border-border bg-muted/15 p-2">
                    <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                      Ovario Derecho
                    </span>
                    <span className="text-foreground">
                      {f.rightOvaryDimensions || "Sin particularidades"}
                    </span>
                  </div>
                  <div className="rounded border border-border bg-muted/15 p-2">
                    <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                      Ovario Izquierdo
                    </span>
                    <span className="text-foreground">
                      {f.leftOvaryDimensions || "Sin particularidades"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded border border-border bg-muted/20 p-2">
                  <div>
                    <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                      Signo Deslizamiento (IDEA)
                    </span>
                    <strong className="font-mono text-foreground">
                      {f.slidingSign || "Positivo"}
                    </strong>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                      Fondo de Saco de Douglas
                    </span>
                    <span className="text-foreground">
                      {f.douglasPouch || "Libre de colecciones"}
                    </span>
                  </div>
                  {f.uterosacralLigaments ? (
                    <div className="col-span-3 border-t border-border pt-1">
                      <strong className="text-muted-foreground">
                        Ligamentos Uterosacros:{" "}
                      </strong>
                      <span>{f.uterosacralLigaments}</span>
                    </div>
                  ) : null}
                  {f.endometriosisFoci ? (
                    <div className="col-span-3 border-t border-border pt-1">
                      <strong className="text-muted-foreground">
                        Focos / Notas Anexiales:{" "}
                      </strong>
                      <span>{f.endometriosisFoci}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isBreastMode ? (
              <div className="space-y-2.5 text-[11px]">
                {f.breastPattern ? (
                  <div>
                    <strong className="text-muted-foreground">
                      Patrón Fibroglandular:{" "}
                    </strong>
                    <span>{f.breastPattern}</span>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <strong className="mb-0.5 block text-[10px] text-primary uppercase">
                      Mama Derecha y Axila
                    </strong>
                    <p className="whitespace-pre-line text-foreground">
                      {f.rightBreastFindings || "Sin lesiones focales."}
                    </p>
                  </div>
                  <div className="rounded border border-border bg-muted/20 p-2.5">
                    <strong className="mb-0.5 block text-[10px] text-primary uppercase">
                      Mama Izquierda y Axila
                    </strong>
                    <p className="whitespace-pre-line text-foreground">
                      {f.leftBreastFindings || "Sin lesiones focales."}
                    </p>
                  </div>
                </div>
                {f.biradsCategory ? (
                  <div className="flex items-center justify-between rounded border border-primary/25 bg-primary/5 px-3 py-1.5">
                    <span className="font-semibold text-primary">
                      Clasificación ACR BI-RADS:
                    </span>
                    <span className="rounded bg-primary px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary-foreground">
                      {f.biradsCategory}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isObstetricMode ? (
              <div className="space-y-2.5 text-[11px]">
                <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-muted/25 p-2.5">
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      Sacos Gestacionales
                    </span>
                    <strong className="font-mono text-foreground">
                      {f.gestationalSacsCount ?? 1}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      LCN / Biometría
                    </span>
                    <strong className="font-mono text-foreground">
                      {typeof f.embryoCrownRumpLengthMm === "number"
                        ? `${f.embryoCrownRumpLengthMm} mm`
                        : "Acorde"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      Edad Gestacional
                    </span>
                    <strong className="font-mono text-foreground">
                      {f.gestationalAgeByEcho || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      F.C.F. Fetal
                    </span>
                    <strong className="font-mono text-foreground">
                      {typeof f.fetalHeartRate === "number"
                        ? `${f.fetalHeartRate} lpm`
                        : "Presente"}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {f.placentaLocation ? (
                    <div>
                      <strong className="text-muted-foreground">
                        Placenta / Corion:{" "}
                      </strong>
                      <span>{f.placentaLocation}</span>
                    </div>
                  ) : null}
                  {f.amnioticFluidIndex ? (
                    <div>
                      <strong className="text-muted-foreground">
                        Líquido Amniótico:{" "}
                      </strong>
                      <span>{f.amnioticFluidIndex}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* 4. Conclusión Diagnóstica */}
          <div className="space-y-1.5 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <h3 className="text-[10px] font-bold tracking-wider text-primary uppercase">
              Conclusión Diagnóstica
            </h3>
            <p className="font-semibold leading-relaxed whitespace-pre-line text-foreground">
              {report.conclusion}
            </p>
            {report.recommendations ? (
              <div className="border-t border-primary/20 pt-1.5 text-[11px]">
                <strong className="text-primary">
                  Recomendaciones / Seguimiento:{" "}
                </strong>
                <span className="whitespace-pre-line text-foreground">
                  {report.recommendations}
                </span>
              </div>
            ) : null}
          </div>

          {report.images.length > 0 ? (
            <p className="font-mono text-[10px] text-muted-foreground">
              * Adjunta {report.images.length} captura(s) ecográfica(s) en anexo
              fotográfico siguiente ({photoChunks.length}{" "}
              {photoChunks.length === 1 ? "página" : "páginas"}).
            </p>
          ) : null}
        </div>

        {/* Firma y Cenefa */}
        <div>
          <div className="px-[14mm] pb-4 text-right">
            <CendoSignatureBlock
              doctorName={report.doctorName}
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

      {/* PÁGINAS ANEXAS DE CAPTURAS FOTOGRÁFICAS (SIN RECORTES) */}
      {photoChunks.map((batch, pageIdx) => (
        <section
          key={`eco-photos-${pageIdx}`}
          className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none"
        >
          <div className="flex-1 space-y-4 px-[14mm] pt-[10mm] pb-4">
            <header className="flex items-center justify-between border-b-2 border-primary pb-2.5">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" showText={false} />
                <div>
                  <h2 className="font-sans text-base font-extrabold tracking-tight text-primary">
                    ANEXO FOTOGRÁFICO DE ECOGRAFÍA ({pageIdx + 1} /{" "}
                    {photoChunks.length})
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Paciente: <strong>{patient.fullName}</strong> •{" "}
                    {patient.documentType} {patient.documentNumber}
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-muted-foreground">
                <p>N° ECO-{report.id.slice(0, 8).toUpperCase()}</p>
                <p>{formatPeruDateDisplay(report.reportDate)}</p>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-4">
              {batch.map((img, idx) => (
                <figure
                  key={img.storagePath}
                  className="overflow-hidden rounded-lg border border-border bg-muted/15"
                >
                  <div className="flex aspect-[4/3] items-center justify-center bg-card p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Ventana de impresión con endpoint binario autenticado */}
                    <img
                      src={buildClinicalImageViewUrl(img.storagePath)}
                      alt={img.caption || `Captura ecográfica ${idx + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <figcaption className="border-t border-border bg-muted/30 px-2.5 py-1.5 font-mono text-[9.5px] font-medium text-foreground">
                    Fig. {pageIdx * 6 + idx + 1}: {img.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
          />
        </section>
      ))}
    </div>
  );
}
