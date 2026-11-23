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
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { buildClinicalImageViewUrl } from "@/lib/clinical-images";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface ColposcopyPrintViewProps {
  report: ColposcopyReportItem;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
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
  const boxClass = isPositive
    ? tone === "destructive"
      ? "border-destructive bg-destructive text-destructive-foreground"
      : tone === "warning"
        ? "border-warning bg-warning text-warning-foreground"
        : "border-success bg-success text-success-foreground"
    : "border-border bg-card text-transparent";

  const pillClass =
    tone === "destructive"
      ? "bg-destructive text-destructive-foreground"
      : tone === "warning"
        ? "bg-warning text-warning-foreground"
        : "bg-success text-success-foreground";

  const rowBg = isPositive
    ? tone === "destructive"
      ? "bg-destructive/10 text-foreground font-semibold"
      : tone === "warning"
        ? "bg-warning/15 text-foreground font-semibold"
        : "bg-success/10 text-foreground font-semibold"
    : "text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1.5 rounded px-1.5 py-[1.5px] text-[8.5px] leading-tight",
        rowBg
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-3 shrink-0 items-center justify-center rounded-[2px] border text-[8px] font-bold leading-none",
            boxClass
          )}
        >
          {isPositive ? "✓" : ""}
        </span>
        <span className="truncate">{label}</span>
      </div>

      {isPositive ? (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-[0.5px] font-mono text-[7px] font-bold uppercase",
            pillClass
          )}
        >
          ✓ POSITIVO
        </span>
      ) : null}
    </div>
  );
}

function SectionCard({
  roman,
  title,
  tag,
  tone = "primary",
  children,
}: {
  roman: string;
  title: string;
  tag: string;
  tone?: "primary" | "success" | "warning" | "destructive";
  children: React.ReactNode;
}) {
  const headerTone =
    tone === "destructive"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "border-warning/35 bg-warning/15 text-foreground"
        : tone === "success"
          ? "border-success/30 bg-success/10 text-success"
          : "border-primary/25 bg-primary/10 text-primary";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div
        className={cn(
          "flex items-center justify-between border-b px-2.5 py-1 text-[8.5px] font-bold tracking-wider uppercase",
          headerTone
        )}
      >
        <span>
          {roman}. {title}
        </span>
        <span className="font-mono text-[7.5px] opacity-85">{tag}</span>
      </div>
      <div className="space-y-0.5 p-1.5">{children}</div>
    </div>
  );
}

function CheckOptionChip({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[8px]",
        checked
          ? "border-primary bg-primary/10 font-bold text-primary"
          : "border-border bg-card text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "inline-flex size-2.5 items-center justify-center rounded-[2px] border text-[7px] leading-none",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-transparent"
        )}
      >
        {checked ? "✓" : ""}
      </span>
      {label}
    </span>
  );
}

function matchPapCategory(
  rawPap: string | null | undefined
): "NILM" | "ASC-US" | "ASC-H" | "LIE-BG" | "LIE-AG" | "CA" | "OTROS" {
  const upper = (rawPap ?? "").toUpperCase();
  if (!upper) return "OTROS";
  if (upper.includes("ASC-US") || upper.includes("ASCUS")) return "ASC-US";
  if (upper.includes("ASC-H") || upper.includes("ASCH")) return "ASC-H";
  if (upper.includes("LIE-BG") || upper.includes("LIEBG") || upper.includes("NIC I") || upper.includes("BAJO GRADO")) {
    return "LIE-BG";
  }
  if (upper.includes("LIE-AG") || upper.includes("LIEAG") || upper.includes("NIC II") || upper.includes("NIC III") || upper.includes("ALTO GRADO")) {
    return "LIE-AG";
  }
  if (upper.includes("CA IN SITU") || upper.includes("CARCINOMA")) return "CA";
  if (upper.includes("NEGATIVO") || upper.includes("NILM") || upper.includes("NORMAL")) {
    return "NILM";
  }
  return "OTROS";
}

function matchVphCategory(
  rawVph: string | null | undefined
): "NEGATIVO" | "POSITIVO" | "NA" | "NO_REALIZADO" {
  const upper = (rawVph ?? "").toUpperCase();
  if (!upper || upper.includes("NO REALIZADO") || upper.includes("NO SE REALIZ") || upper.includes("NO REFIERE")) {
    return "NO_REALIZADO";
  }
  if (upper === "NA" || upper === "N/A" || upper.includes("PENDIENTE")) {
    return "NA";
  }
  if (upper.includes("NEGATIVO") || upper.includes("NO DETECTADO")) {
    return "NEGATIVO";
  }
  if (upper.includes("POSITIVO") || upper.includes("DETECTADO") || upper.includes("GENOTIPO")) {
    return "POSITIVO";
  }
  return "NO_REALIZADO";
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
  background,
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
  const papCat = matchPapCategory(background?.papHistory);
  const vphCat = matchVphCategory(background?.vphTestHistory);

  // Las primeras 4 imágenes se integran en la Página 2 (igual que la Pág. 10 de informe.pdf)
  const inlinePhotos = report.images.slice(0, 4);
  const overflowPhotoChunks = chunkColpoImages(report.images.slice(4), 4);
  const totalReportPages = 2 + overflowPhotoChunks.length;
  const shortCode = `COLP-${report.id.slice(0, 8).toUpperCase()}`;

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

      {/* =====================================================================
          PÁGINA 1 / 2: FILIACIÓN + ANTECEDENTES + SECCIONES IFCPC I A VII
         ===================================================================== */}
      <section className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-2.5 px-[13mm] pt-[9mm] pb-2">
          {/* 1. Membrete CENDO + Médico Evaluador */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-2">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={false} />
              <div>
                <h1 className="font-sans text-base font-extrabold tracking-tight text-primary">
                  CENDO • CENTRO DE ENDOMETRIOSIS
                </h1>
                <p className="text-[10px] font-medium text-foreground">
                  Ginecología Especializada • Colposcopía Digital • Cirugía
                  Ginecológica de Alta Precisión
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                  {clinicAddress} • Citas: {clinicPhone}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[10.5px] font-bold text-primary uppercase">
                {report.doctorName}
              </p>
              <p className="text-[8.5px] font-semibold text-muted-foreground uppercase">
                {resolvedSig.doctorSpecialty}
              </p>
              <p className="font-mono text-[9px] font-semibold text-foreground">
                {credentials || "CMP 61693 • RNE 38657"}
              </p>
            </div>
          </header>

          {/* Barra de Título Oficial del Informe */}
          <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5">
            <div>
              <h2 className="text-xs font-extrabold tracking-tight text-primary uppercase">
                INFORME DE COLPOSCOPÍA ESPECIALIZADA (PÁGINA 1 /{" "}
                {totalReportPages})
              </h2>
              <p className="text-[8.5px] text-muted-foreground">
                Nomenclatura Internacional IFCPC Río de Janeiro 2011 • CENDO
                Miraflores
              </p>
            </div>
            <div className="text-right font-mono text-[9.5px]">
              <span className="inline-block rounded border border-border bg-card px-2 py-0.5 font-bold text-foreground">
                N°: {shortCode}
              </span>
              <p className="mt-0.5 text-[9px] font-semibold text-muted-foreground">
                Fecha: {formatPeruDateDisplay(report.reportDate)}
              </p>
            </div>
          </div>

          {/* 2. Datos Personales (Sin truncar nombre) */}
          <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="col-span-5">
              <span className="block text-[8px] font-bold text-muted-foreground uppercase">
                Apellidos y Nombres
              </span>
              <strong className="block text-[11px] leading-snug font-bold text-foreground">
                {patient.fullName}
              </strong>
            </div>

            <div className="col-span-2">
              <span className="block text-[8px] font-bold text-muted-foreground uppercase">
                Documento
              </span>
              <span className="font-mono text-[10.5px] font-bold text-foreground">
                {patient.documentType} {patient.documentNumber}
              </span>
            </div>

            <div className="col-span-2">
              <span className="block text-[8px] font-bold text-muted-foreground uppercase">
                Edad / Teléfono
              </span>
              <span className="text-[10px] font-semibold text-foreground">
                {patient.age} años
                {patient.phone ? ` • ${patient.phone}` : ""}
              </span>
            </div>

            <div className="col-span-3 text-right">
              <span className="block text-[8px] font-bold text-muted-foreground uppercase">
                Validez del Examen
              </span>
              <span
                className={cn(
                  "mt-0.5 inline-block rounded-full border px-2.5 py-0.5 text-[9px] font-bold",
                  report.adequateColposcopy
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-warning/40 bg-warning/15 text-foreground"
                )}
              >
                {report.adequateColposcopy
                  ? "Colposcopía Adecuada"
                  : "Colposcopía Inadecuada"}
              </span>
            </div>
          </div>

          {/* 3. Información Complementaria / Antecedentes (Pág. 9 de informe.pdf) */}
          <div className="overflow-hidden rounded-lg border border-primary/25 bg-card">
            <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-2.5 py-1 text-[8.5px] font-bold tracking-wider text-primary uppercase">
              <span>INFORMACIÓN COMPLEMENTARIA • ANTECEDENTES GINECO-OBSTÉTRICOS Y GENERALES</span>
              <span className="font-mono text-[7.5px]">HISTORIA CLÍNICA</span>
            </div>
            <div className="space-y-1.5 px-2.5 py-1.5 text-[9px]">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <strong className="text-muted-foreground">
                    Fórmula Obstétrica:{" "}
                  </strong>
                  <span className="font-mono font-bold text-foreground">
                    {background?.obstetricFormula || "G0 P0000"}
                  </span>
                </div>
                <div className="col-span-2">
                  <strong className="text-muted-foreground">FUR: </strong>
                  <span className="font-mono font-semibold text-foreground">
                    {background?.lastMenstrualPeriod
                      ? formatPeruDateDisplay(background.lastMenstrualPeriod)
                      : "NA"}
                  </span>
                </div>
                <div className="col-span-3">
                  <strong className="text-muted-foreground">IRS / NPS: </strong>
                  <span className="font-mono font-semibold text-foreground">
                    {background?.sexualDebutAge
                      ? `${background.sexualDebutAge}a`
                      : "NA"}{" "}
                    / {background?.sexualPartnersCount ?? "NA"}
                  </span>
                </div>
                <div className="col-span-4">
                  <strong className="text-muted-foreground">MAC: </strong>
                  <span className="font-semibold text-foreground">
                    {background?.contraceptiveMethod || "Ninguno"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 items-center gap-2 border-t border-border/70 pt-1">
                <div className="col-span-7 flex flex-wrap items-center gap-1">
                  <strong className="mr-0.5 text-[8.5px] text-muted-foreground uppercase">
                    Resultado PAP:
                  </strong>
                  <CheckOptionChip label="NILM" checked={papCat === "NILM"} />
                  <CheckOptionChip
                    label="ASC-US"
                    checked={papCat === "ASC-US"}
                  />
                  <CheckOptionChip label="ASC-H" checked={papCat === "ASC-H"} />
                  <CheckOptionChip
                    label="LIE-BG"
                    checked={papCat === "LIE-BG"}
                  />
                  <CheckOptionChip
                    label="LIE-AG"
                    checked={papCat === "LIE-AG"}
                  />
                  <CheckOptionChip
                    label="CA in situ"
                    checked={papCat === "CA"}
                  />
                  <CheckOptionChip
                    label={
                      papCat === "OTROS" && background?.papHistory
                        ? `OTROS (${background.papHistory.slice(0, 22)})`
                        : "OTROS"
                    }
                    checked={papCat === "OTROS"}
                  />
                </div>

                <div className="col-span-5 flex flex-wrap items-center justify-end gap-1">
                  <strong className="mr-0.5 text-[8.5px] text-muted-foreground uppercase">
                    Test VPH:
                  </strong>
                  <CheckOptionChip
                    label="Negativo"
                    checked={vphCat === "NEGATIVO"}
                  />
                  <CheckOptionChip
                    label="Positivo"
                    checked={vphCat === "POSITIVO"}
                  />
                  <CheckOptionChip label="NA" checked={vphCat === "NA"} />
                  <CheckOptionChip
                    label="No se realizó"
                    checked={vphCat === "NO_REALIZADO"}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Sección I: Criterios de Evaluación General */}
          <div className="overflow-hidden rounded-lg border border-border bg-muted/15">
            <div className="border-b border-border bg-muted/40 px-2.5 py-1 text-[8.5px] font-bold tracking-wider text-primary uppercase">
              I. CRITERIOS DE EVALUACIÓN GENERAL (IFCPC RÍO DE JANEIRO 2011)
            </div>
            <div className="grid grid-cols-3 gap-2 p-2">
              <div className="rounded border border-border bg-card px-2.5 py-1.5">
                <span className="block text-[7.5px] font-bold text-muted-foreground uppercase">
                  1. Adecuación del Examen
                </span>
                <strong className="text-[10.5px] font-bold text-foreground">
                  {report.adequateColposcopy ? "Adecuada" : "Inadecuada"}
                  {!report.adequateColposcopy && ext.inadequateReason
                    ? ` (${ext.inadequateReason})`
                    : ""}
                </strong>
              </div>
              <div className="rounded border border-border bg-card px-2.5 py-1.5">
                <span className="block text-[7.5px] font-bold text-muted-foreground uppercase">
                  2. Unión Escamocolumnar (UEC)
                </span>
                <strong className="text-[10.5px] font-bold text-foreground">
                  {report.squamocolumnarJunctionVisible}
                </strong>
              </div>
              <div className="rounded border border-border bg-card px-2.5 py-1.5">
                <span className="block text-[7.5px] font-bold text-muted-foreground uppercase">
                  3. Zona de Transformación (ZT)
                </span>
                <strong className="text-[10.5px] font-bold text-foreground">
                  {report.transformationZoneType}
                </strong>
              </div>
            </div>
          </div>

          {/* 5. Secciones II a VII Desglosadas en 2 Columnas (Sin "— NEGATIVO" repetido) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Columna Izquierda: II, III y IV */}
            <div className="space-y-2">
              <SectionCard
                roman="II"
                title="HALLAZGOS NORMALES (FISIOLÓGICOS)"
                tag="IFCPC 2011"
                tone="success"
              >
                <FindingRow
                  label="Epitelio Escamoso Original: Maduro"
                  isPositive={report.matureSquamousEpithelium}
                  tone="normal"
                />
                <FindingRow
                  label="Ectopia / Epitelio Cilíndrico (Columnar)"
                  isPositive={report.ectopy}
                  tone="normal"
                />
                <FindingRow
                  label="Epitelio Metaplásico: Quistes de Naboth"
                  isPositive={Boolean(ext.nabothCyst)}
                  tone="normal"
                />
                <FindingRow
                  label="Criptas / Aberturas Glandulares Abiertas"
                  isPositive={Boolean(ext.cryptOpenings)}
                  tone="normal"
                />
                <FindingRow
                  label="Deciduosis en el Embarazo"
                  isPositive={Boolean(ext.deciduosis)}
                  tone="normal"
                />
              </SectionCard>

              <SectionCard
                roman="III"
                title="HALLAZGOS ANORMALES • GRADO 1 (MENOR)"
                tag="LIE-BG"
                tone="warning"
              >
                <FindingRow
                  label="Epitelio Acetoblanco Delgado / Tenue"
                  isPositive={report.thinAcetowhiteEpithelium}
                  tone="warning"
                />
                <FindingRow
                  label="Borde Irregular / Geográfico"
                  isPositive={report.irregularBorder}
                  tone="warning"
                />
                <FindingRow
                  label="Mosaico Fino"
                  isPositive={report.fineMosaic}
                  tone="warning"
                />
                <FindingRow
                  label="Punteado (Puntillado) Fino"
                  isPositive={report.finePunctation}
                  tone="warning"
                />
              </SectionCard>

              <SectionCard
                roman="IV"
                title="HALLAZGOS ANORMALES • GRADO 2 (MAYOR)"
                tag="LIE-AG"
                tone="destructive"
              >
                <FindingRow
                  label="Epitelio Acetoblanco Denso / Nacarado"
                  isPositive={report.denseAcetowhiteEpithelium}
                  tone="destructive"
                />
                <FindingRow
                  label="Aparición Rápida de Epitelio Acetoblanco"
                  isPositive={Boolean(ext.rapidAcetowhite)}
                  tone="destructive"
                />
                <FindingRow
                  label="Orificios Glandulares con Bordes Engrosados"
                  isPositive={Boolean(ext.thickenedGlands)}
                  tone="destructive"
                />
                <FindingRow
                  label="Mosaico Grueso"
                  isPositive={report.coarseMosaic}
                  tone="destructive"
                />
                <FindingRow
                  label="Punteado (Puntillado) Grueso"
                  isPositive={report.coarsePunctation}
                  tone="destructive"
                />
                <FindingRow
                  label="Bordes Delimitados / Cortantes"
                  isPositive={Boolean(ext.sharpBorders)}
                  tone="destructive"
                />
                <FindingRow
                  label="Signo del Límite del Borde Interno (Inner Border)"
                  isPositive={Boolean(ext.innerBorderSign)}
                  tone="destructive"
                />
                <FindingRow
                  label="Signo de la Cresta o Sobreelevado (Ridge Sign)"
                  isPositive={Boolean(ext.ridgeSign)}
                  tone="destructive"
                />
              </SectionCard>
            </div>

            {/* Columna Derecha: V, VI y VII */}
            <div className="space-y-2">
              <SectionCard
                roman="V"
                title="NO ESPECÍFICOS & TEST DE SCHILLER"
                tag="LUGOL"
                tone="primary"
              >
                <FindingRow
                  label="Leucoplasia (Queratosis / Hiperqueratosis)"
                  isPositive={Boolean(ext.leukoplakia)}
                  tone="warning"
                />
                <FindingRow
                  label="Erosión / Ulceración Epitelial"
                  isPositive={Boolean(ext.erosion)}
                  tone="warning"
                />
                <div className="mt-1 flex items-center justify-between rounded border border-border bg-muted/25 px-2 py-1 text-[8.5px]">
                  <strong className="text-foreground">
                    Solución de Lugol (Test de Schiller):
                  </strong>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[8px] font-bold",
                      report.schillerTest.toLowerCase().includes("positivo")
                        ? "bg-warning/20 text-foreground"
                        : "bg-success/15 text-success"
                    )}
                  >
                    {report.schillerTest}
                  </span>
                </div>
              </SectionCard>

              <SectionCard
                roman="VI"
                title="SOSPECHA DE INVASIÓN NEOPLÁSICA"
                tag="ALERTA"
                tone="destructive"
              >
                <FindingRow
                  label="Vasos Atípicos / Calibre Irregular"
                  isPositive={report.atypicalVessels}
                  tone="destructive"
                />
                <FindingRow
                  label="Vasos Delgados / Fragilidad Vascular"
                  isPositive={Boolean(ext.fragileVessels)}
                  tone="destructive"
                />
                <FindingRow
                  label="Superficie Irregular / Nodular"
                  isPositive={Boolean(ext.irregularSurface)}
                  tone="destructive"
                />
                <FindingRow
                  label="Lesión Exofítica Creciente"
                  isPositive={Boolean(ext.exophyticLesion)}
                  tone="destructive"
                />
                <FindingRow
                  label="Necrosis / Ulceración Necrótica"
                  isPositive={Boolean(ext.necrosis)}
                  tone="destructive"
                />
                <FindingRow
                  label="Tumoración Nodular Visible"
                  isPositive={Boolean(ext.nodularTumor)}
                  tone="destructive"
                />
              </SectionCard>

              <SectionCard
                roman="VII"
                title="HALLAZGOS VARIOS / MISCELÁNEOS"
                tag="OTROS"
                tone="primary"
              >
                <FindingRow
                  label="Zona de Transformación Congénita"
                  isPositive={Boolean(ext.congenitalTZ)}
                  tone="normal"
                />
                <FindingRow
                  label="Condiloma / Excrecencia VPH"
                  isPositive={Boolean(ext.condyloma)}
                  tone="warning"
                />
                <FindingRow
                  label="Pólipo (Exocervical / Endocervical)"
                  isPositive={Boolean(ext.polyp)}
                  tone="warning"
                />
                <FindingRow
                  label="Inflamación / Cervicitis"
                  isPositive={Boolean(ext.inflammation)}
                  tone="warning"
                />
                <FindingRow
                  label="Estenosis del Canal Cervical"
                  isPositive={Boolean(ext.stenosis)}
                  tone="warning"
                />
                <FindingRow
                  label="Anomalías Post-Tratamiento"
                  isPositive={Boolean(ext.postTreatmentAnomaly)}
                  tone="warning"
                />
                <FindingRow
                  label="Focos de Endometriosis Cervical"
                  isPositive={Boolean(ext.endometriosisFoci)}
                  tone="warning"
                />
                <div className="mt-1 border-t border-border/70 px-1.5 pt-1 text-[8px] text-muted-foreground">
                  <strong className="text-foreground">Otros: </strong>
                  <span>{ext.otherFindings?.trim() || "Ninguno"}</span>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        {/* Pie de Página 1 */}
        <div>
          <p className="pb-1.5 text-center font-mono text-[8.5px] text-muted-foreground">
            Continúa en Página 2: Mapeo de Biopsia (Reloj Cervical), Diagnóstico
            Conclusivo, Plan de Manejo y Registro Fotográfico
          </p>
          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
          />
        </div>
      </section>

      {/* =====================================================================
          PÁGINA 2 / 2: BIOPSIA (RELOJ) + DIAGNÓSTICO + FOTOS + FIRMA
         ===================================================================== */}
      <section className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-3 px-[13mm] pt-[9mm] pb-2">
          {/* 1. Cabecera Página 2 */}
          <header className="flex items-center justify-between border-b-2 border-primary pb-2">
            <div className="flex items-center gap-2.5">
              <BrandLogo size="sm" showText={false} />
              <div>
                <h2 className="font-sans text-sm font-extrabold tracking-tight text-primary uppercase">
                  CENDO • INFORME DE COLPOSCOPÍA (PÁGINA 2 / {totalReportPages})
                </h2>
                <p className="text-[9.5px] text-muted-foreground">
                  Paciente:{" "}
                  <strong className="text-foreground">
                    {patient.fullName}
                  </strong>{" "}
                  ({patient.documentType}: {patient.documentNumber})
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[9.5px] text-muted-foreground">
              <p className="font-bold text-foreground">N°: {shortCode}</p>
              <p>Fecha: {formatPeruDateDisplay(report.reportDate)}</p>
            </div>
          </header>

          {/* 2. Bloque Lado a Lado: BIOPSIA (Reloj) a la izquierda + DIAGNÓSTICO & PLAN a la derecha (Pág. 10 de informe.pdf) */}
          <div className="grid grid-cols-12 gap-3">
            {/* Izquierda: Biopsia y Reloj Cervical */}
            <div className="col-span-5 flex flex-col justify-between overflow-hidden rounded-lg border border-primary/25 bg-card">
              <div className="border-b border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-bold tracking-wider text-primary uppercase">
                BIOPSIA CERVICAL & MAPEO HORARIO
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-2.5">
                <div className="flex items-center gap-3">
                  <CheckOptionChip
                    label="SÍ (Biopsia Dirigida)"
                    checked={report.cervicalBiopsyTaken}
                  />
                  <CheckOptionChip
                    label="NO"
                    checked={!report.cervicalBiopsyTaken}
                  />
                </div>

                <CervicalClock
                  selectedHours={report.biopsyClockHours}
                  interactive={false}
                  size="sm"
                  showLegend
                />

                <p className="text-center font-mono text-[9px] font-semibold text-foreground">
                  {report.cervicalBiopsyTaken
                    ? report.biopsyClockHours.length > 0
                      ? `Muestras tomadas en horas: ${report.biopsyClockHours
                          .map((h) => `${h}h`)
                          .join(", ")}`
                      : "Biopsia cervical dirigida tomada"
                    : "Sin toma de biopsia dirigida"}
                </p>
              </div>
            </div>

            {/* Derecha: Diagnóstico Conclusivo + Plan de Manejo */}
            <div className="col-span-7 flex flex-col gap-2.5">
              <div className="overflow-hidden rounded-lg border border-warning/40 bg-warning/10">
                <div className="flex items-center justify-between border-b border-warning/30 bg-warning/15 px-3 py-1.5">
                  <span className="text-[9px] font-bold tracking-wider text-primary uppercase">
                    DIAGNÓSTICO COLPOSCÓPICO ({classification.label.toUpperCase()})
                  </span>
                  <span className="rounded border border-primary/30 bg-card px-2 py-0.5 font-mono text-[9px] font-bold text-primary">
                    CIE-10: {report.cie10Code}
                  </span>
                </div>
                <div className="space-y-1 p-3 text-[10.5px]">
                  <p className="font-bold text-foreground uppercase">
                    1.{" "}
                    {report.adequateColposcopy
                      ? "COLPOSCOPÍA ADECUADA"
                      : "COLPOSCOPÍA INADECUADA"}{" "}
                    • UEC {report.squamocolumnarJunctionVisible.toUpperCase()}
                  </p>
                  <p className="font-bold text-foreground uppercase">
                    2. ZONA DE TRANSFORMACIÓN{" "}
                    {report.transformationZoneType.toUpperCase()}
                  </p>
                  <p className="font-bold text-primary uppercase">
                    3. {report.diagnosis}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-hidden rounded-lg border border-primary/25 bg-primary/5">
                <div className="border-b border-primary/20 bg-primary/10 px-3 py-1.5 text-[9px] font-bold tracking-wider text-primary uppercase">
                  PLAN DE MANEJO Y CONDUCTA RECOMENDADA
                </div>
                <div className="space-y-1.5 p-3 text-[10.5px] leading-relaxed text-foreground">
                  <p className="whitespace-pre-line font-medium">
                    {report.planRecommendations}
                  </p>
                  {ext.otherFindings ? (
                    <p className="border-t border-primary/20 pt-1.5 text-[9.5px] text-muted-foreground">
                      <strong className="text-foreground">
                        Observaciones adicionales:{" "}
                      </strong>
                      {ext.otherFindings}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Registro Fotográfico Colposcópico Integrado en la Página 2 (como en Pág. 10 de informe.pdf) */}
          <div className="overflow-hidden rounded-lg border border-primary/25 bg-card">
            <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-3 py-1.5">
              <span className="text-[9px] font-bold tracking-wider text-primary uppercase">
                IMÁGENES • REGISTRO FOTOGRÁFICO COLPOSCÓPICO DIGITAL (
                {report.images.length}{" "}
                {report.images.length === 1 ? "TOMA" : "TOMAS"})
              </span>
              <span className="font-mono text-[8px] text-muted-foreground">
                SSF • ÁCIDO ACÉTICO 5% • TEST DE SCHILLER (LUGOL)
              </span>
            </div>

            {inlinePhotos.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-muted-foreground">
                Sin capturas fotográficas digitales adjuntas en este informe.
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-2.5 p-2.5",
                  inlinePhotos.length === 1
                    ? "grid-cols-1"
                    : inlinePhotos.length === 2
                      ? "grid-cols-2"
                      : inlinePhotos.length === 3
                        ? "grid-cols-3"
                        : "grid-cols-2"
                )}
              >
                {inlinePhotos.map((img, idx) => (
                  <figure
                    key={img.storagePath}
                    className="overflow-hidden rounded-lg border border-border bg-muted/15"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center bg-card p-1",
                        inlinePhotos.length === 4 ? "h-[41mm]" : "h-[56mm]"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Impresión autenticada desde Storage privado */}
                      <img
                        src={buildClinicalImageViewUrl(img.storagePath)}
                        alt={img.caption || `Captura colposcópica ${idx + 1}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <figcaption className="truncate border-t border-border bg-muted/30 px-2 py-1 font-mono text-[8.5px] font-semibold text-foreground">
                      {idx + 1}. {img.caption || `Captura colposcópica ${idx + 1}`}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Firma Digital Real del Dr. Patrick + Cenefa Oficial */}
        <div>
          <div className="flex items-end justify-between px-[13mm] pb-3">
            <div className="font-mono text-[8.5px] leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">
                Documento médico legal • CENDO Miraflores
              </p>
              <p>
                Estudio colposcópico digital según nomenclatura IFCPC Río de
                Janeiro 2011
              </p>
            </div>
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

      {/* PÁGINAS ANEXAS ADICIONALES SOLO SI HAY MÁS DE 4 FOTOGRAFÍAS */}
      {overflowPhotoChunks.map((batch, pageIdx) => (
        <section
          key={`colpo-extra-photos-${pageIdx}`}
          className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none"
        >
          <div className="flex-1 space-y-4 px-[13mm] pt-[9mm] pb-4">
            <header className="flex items-center justify-between border-b-2 border-primary pb-2.5">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" showText={false} />
                <div>
                  <h2 className="font-sans text-sm font-extrabold tracking-tight text-primary uppercase">
                    ANEXO FOTOGRÁFICO ADICIONAL (PÁGINA {3 + pageIdx} /{" "}
                    {totalReportPages})
                  </h2>
                  <p className="text-[9.5px] text-muted-foreground">
                    Paciente: <strong>{patient.fullName}</strong> •{" "}
                    {patient.documentType} {patient.documentNumber}
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-[9.5px] text-muted-foreground">
                <p>N°: {shortCode}</p>
                <p>{formatPeruDateDisplay(report.reportDate)}</p>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-4">
              {batch.map((img, idx) => {
                const photoNum = 5 + pageIdx * 4 + idx;
                return (
                  <figure
                    key={img.storagePath}
                    className="overflow-hidden rounded-lg border border-border bg-muted/15"
                  >
                    <div className="flex aspect-[4/3] items-center justify-center bg-card p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Ventana de impresión con endpoint binario autenticado */}
                      <img
                        src={buildClinicalImageViewUrl(img.storagePath)}
                        alt={img.caption || `Captura colposcópica ${photoNum}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <figcaption className="border-t border-border bg-muted/30 px-2.5 py-2 font-mono text-[10px] font-medium text-foreground">
                      {photoNum}. {img.caption}
                    </figcaption>
                  </figure>
                );
              })}
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
