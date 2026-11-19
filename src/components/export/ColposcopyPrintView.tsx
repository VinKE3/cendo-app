"use client";

import { CervicalClock } from "@/components/colposcopia/CervicalClock";
import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import type { ClinicalImageRecord } from "@/db/schema/specialty";
import {
  classifyColposcopyFindings,
  type ColposcopyReportItem,
} from "@/features/colposcopia/colposcopia.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { buildClinicalImageViewUrl } from "@/lib/clinical-images";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface ColposcopyPrintViewProps {
  report: ColposcopyReportItem;
  patient: PatientDirectoryItem;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
  signatureSrc?: string | null;
  showDigitalSignature?: boolean;
}

function FindingRow({
  label,
  isPositive,
  tone = "normal",
}: {
  label: string;
  isPositive?: boolean;
  tone?: "normal" | "warning" | "destructive";
}) {
  const pillClass = isPositive
    ? tone === "destructive"
      ? "bg-destructive text-destructive-foreground font-bold"
      : tone === "warning"
        ? "bg-warning text-warning-foreground font-bold"
        : "bg-success text-success-foreground font-bold"
    : "border border-border bg-card text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded px-2 py-0.5 text-[9px]",
        isPositive ? "bg-muted/60 font-semibold text-foreground" : "text-muted-foreground"
      )}
    >
      <span className="truncate pr-2">{label}</span>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase",
          pillClass
        )}
      >
        {isPositive ? "Positivo" : "Negativo"}
      </span>
    </div>
  );
}

function chunkColpoImages(
  items: ClinicalImageRecord[],
  chunkSize: number
): ClinicalImageRecord[][] {
  const chunks: ClinicalImageRecord[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export function ColposcopyPrintView({
  report,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
  signatureSrc,
  showDigitalSignature,
}: ColposcopyPrintViewProps) {
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

  const classification = classifyColposcopyFindings({
    thinAcetowhiteEpithelium: report.thinAcetowhiteEpithelium,
    irregularBorder: report.irregularBorder,
    fineMosaic: report.fineMosaic,
    finePunctation: report.finePunctation,
    denseAcetowhiteEpithelium: report.denseAcetowhiteEpithelium,
    coarseMosaic: report.coarseMosaic,
    coarsePunctation: report.coarsePunctation,
    atypicalVessels: report.atypicalVessels,
    extendedFindings: report.extendedFindings,
  });

  const ext = report.extendedFindings ?? {};
  const photoChunks = chunkColpoImages(report.images, 4);

  return (
    <div
      id="colposcopy-print-sheet"
      className="mx-auto max-w-[210mm] space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle="COLPOSCOPÍA DIGITAL ESPECIALIZADA"
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

      {/* HOJA PRINCIPAL IFCPC 2011 + RELOJ CERVICAL + DIAGNÓSTICO */}
      <section className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-3 px-[14mm] pt-[10mm] pb-3">
          {/* 1. Membrete CENDO */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-2.5">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={false} />
              <div>
                <h1 className="font-serif text-lg font-bold tracking-tight text-primary">
                  CENDO • CENTRO DE ENDOMETRIOSIS
                </h1>
                <p className="text-[11px] font-medium text-foreground">
                  Patología Cervical • Colposcopía Digital IFCPC 2011 •
                  Ginecología Especializada
                </p>
                <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                  {clinicAddress} • Citas: {clinicPhone}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-l border-border pl-4 text-right">
              <div className="inline-block rounded border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary uppercase">
                COLPOSCOPÍA DIGITAL
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                N° COLP-{report.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="font-mono text-[10px] font-semibold text-foreground">
                Fecha: {formatPeruDateDisplay(report.reportDate)}
              </p>
            </div>
          </header>

          {/* 2. Filiación & Clasificación IFCPC */}
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
              <span
                className={cn(
                  "inline-block rounded border px-2 py-0.5 font-mono text-[9.5px] font-bold",
                  classification.tone === "destructive"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : classification.tone === "warning"
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-success/40 bg-success/10 text-success"
                )}
              >
                {classification.grade.replace("_", " ")}
              </span>
            </div>

            <div className="col-span-12 grid grid-cols-4 gap-2 border-t border-border pt-1.5 text-[10px]">
              <div>
                <strong className="text-muted-foreground">Evaluación: </strong>
                <span className="font-semibold">
                  {report.adequateColposcopy ? "Adecuada" : "Inadecuada"}
                </span>
              </div>
              <div>
                <strong className="text-muted-foreground">ZSC: </strong>
                <span className="font-semibold">
                  {report.squamocolumnarJunctionVisible}
                </span>
              </div>
              <div>
                <strong className="text-muted-foreground">ZT: </strong>
                <span className="font-semibold">
                  {report.transformationZoneType}
                </span>
              </div>
              <div>
                <strong className="text-muted-foreground">Schiller: </strong>
                <span className="font-semibold">{report.schillerTest}</span>
              </div>
            </div>
          </div>

          {/* 3. Matriz IFCPC 2011 (2 Columnas) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 rounded-lg border border-border bg-card p-2.5">
              <h3 className="border-b border-border pb-1 text-[9.5px] font-bold tracking-wider text-primary uppercase">
                Hallazgos Normales & Grado 1 (Menor)
              </h3>
              <FindingRow
                label="Epitelio escamoso maduro"
                isPositive={report.matureSquamousEpithelium}
                tone="normal"
              />
              <FindingRow
                label="Ectopia / Epitelio columnar"
                isPositive={report.ectopy}
                tone="normal"
              />
              <FindingRow
                label="Quistes de Naboth / Glándulas"
                isPositive={Boolean(ext.nabothCyst || ext.cryptOpenings)}
                tone="normal"
              />
              <FindingRow
                label="Epitelio acetoblanco tenue"
                isPositive={report.thinAcetowhiteEpithelium}
                tone="warning"
              />
              <FindingRow
                label="Borde irregular / geográfico"
                isPositive={report.irregularBorder}
                tone="warning"
              />
              <FindingRow
                label="Mosaico fino"
                isPositive={report.fineMosaic}
                tone="warning"
              />
              <FindingRow
                label="Punteado fino"
                isPositive={report.finePunctation}
                tone="warning"
              />
            </div>

            <div className="space-y-1.5 rounded-lg border border-border bg-card p-2.5">
              <h3 className="border-b border-border pb-1 text-[9.5px] font-bold tracking-wider text-primary uppercase">
                Grado 2 (Mayor) & Sospecha de Invasión
              </h3>
              <FindingRow
                label="Epitelio acetoblanco denso / rápido"
                isPositive={Boolean(
                  report.denseAcetowhiteEpithelium || ext.rapidAcetowhite
                )}
                tone="destructive"
              />
              <FindingRow
                label="Mosaico grueso"
                isPositive={report.coarseMosaic}
                tone="destructive"
              />
              <FindingRow
                label="Punteado grueso"
                isPositive={report.coarsePunctation}
                tone="destructive"
              />
              <FindingRow
                label="Borde neto / Límite interno / Cresta"
                isPositive={Boolean(
                  ext.sharpBorders || ext.innerBorderSign || ext.ridgeSign
                )}
                tone="destructive"
              />
              <FindingRow
                label="Leucoplasia / Erosión epitelial"
                isPositive={Boolean(ext.leukoplakia || ext.erosion)}
                tone="warning"
              />
              <FindingRow
                label="Vasos atípicos / Vasos frágiles"
                isPositive={Boolean(
                  report.atypicalVessels || ext.fragileVessels
                )}
                tone="destructive"
              />
              <FindingRow
                label="Superficie irregular / Exofítica / Necrosis"
                isPositive={Boolean(
                  ext.irregularSurface ||
                    ext.exophyticLesion ||
                    ext.necrosis ||
                    ext.nodularTumor
                )}
                tone="destructive"
              />
            </div>
          </div>

          {ext.otherFindings ? (
            <div className="rounded border border-border bg-muted/20 px-3 py-1.5 text-[10.5px]">
              <strong className="text-muted-foreground">
                Observaciones Adicionales:{" "}
              </strong>
              <span>{ext.otherFindings}</span>
            </div>
          ) : null}

          {/* 4. Reloj Cervical & Diagnóstico Final */}
          <div className="grid grid-cols-12 items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <div className="col-span-4 flex flex-col items-center border-r border-primary/20 pr-2">
              <span className="mb-1 font-mono text-[9px] font-bold text-primary uppercase">
                Mapa Horario Cervical
              </span>
              <CervicalClock
                selectedHours={report.biopsyClockHours}
                interactive={false}
                size="sm"
                showLegend
              />
            </div>

            <div className="col-span-8 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[9.5px] font-bold text-primary uppercase">
                  Diagnóstico Colposcópico & Plan
                </span>
                <span className="rounded border border-primary/30 bg-card px-2 py-0.5 font-mono text-[9.5px] font-bold text-primary">
                  CIE-10: {report.cie10Code}
                </span>
              </div>

              <p className="text-xs font-bold text-foreground">
                {report.diagnosis}
              </p>

              <p className="text-[10.5px] leading-relaxed whitespace-pre-line text-foreground">
                {report.planRecommendations}
              </p>

              <div className="border-t border-primary/20 pt-1 font-mono text-[10px]">
                <strong className="text-muted-foreground">
                  Biopsia Cervical:{" "}
                </strong>
                <span className="font-semibold text-foreground">
                  {report.cervicalBiopsyTaken
                    ? report.biopsyClockHours.length > 0
                      ? `Tomada en horas ${report.biopsyClockHours
                          .map((h) => `${h}h`)
                          .join(", ")}`
                      : "Tomada (biopsia dirigida)"
                    : "No requerida en este acto"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Firma Médica y Cenefa */}
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

      {/* PÁGINAS ANEXAS DE FOTOGRAFÍAS COLPOSCÓPICAS (4 POR HOJA A4) */}
      {photoChunks.map((batch, pageIdx) => (
        <section
          key={`colpo-photos-${pageIdx}`}
          className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none"
        >
          <div className="flex-1 space-y-4 px-[14mm] pt-[10mm] pb-4">
            <header className="flex items-center justify-between border-b-2 border-primary pb-2.5">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" showText={false} />
                <div>
                  <h2 className="font-serif text-base font-bold text-primary">
                    ANEXO FOTOGRÁFICO DE COLPOSCOPÍA ({pageIdx + 1} /{" "}
                    {photoChunks.length})
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Paciente: <strong>{patient.fullName}</strong> •{" "}
                    {patient.documentType} {patient.documentNumber}
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-muted-foreground">
                <p>N° COLP-{report.id.slice(0, 8).toUpperCase()}</p>
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
                      alt={img.caption || `Captura colposcópica ${idx + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <figcaption className="border-t border-border bg-muted/30 px-2.5 py-2 font-mono text-[10px] font-medium text-foreground">
                    Captura {pageIdx * 4 + idx + 1}: {img.caption}
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
