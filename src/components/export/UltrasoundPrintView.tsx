"use client";

import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import type { ClinicalImageRecord } from "@/db/schema/specialty";
import {
  calculateBppTotal,
  DOPPLER_VESSEL_META,
  formatBreastLesionSentence,
  getUltrasoundModeFlags,
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
  const {
    isGynMode,
    isBreastMode,
    isObs1TMode,
    isGeneticMode,
    isObs23Mode,
  } = getUltrasoundModeFlags(report.ultrasoundType);

  const bppTotal = calculateBppTotal(f);
  const hasDopplerEntries = Boolean(
    f.doppler &&
      DOPPLER_VESSEL_META.some((v) => {
        const entry = f.doppler?.[v.key];
        return (
          entry &&
          (typeof entry.pi === "number" ||
            Boolean(entry.percentile) ||
            Boolean(entry.status))
        );
      })
  );
  const showDopplerTable =
    Boolean(f.doppler) &&
    (f.includeDoppler === true ||
      (f.includeDoppler !== false &&
        report.ultrasoundType === "OBSTETRICA_MORFOLOGICA") ||
      hasDopplerEntries);

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

            <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1.5 text-[11px]">
              <div>
                <strong className="text-muted-foreground">
                  Motivo de Estudio:{" "}
                </strong>
                <span className="text-foreground">{report.indication}</span>
              </div>
              {f.referringDoctor ? (
                <div>
                  <strong className="text-muted-foreground">
                    Indicación / Solicitante:{" "}
                  </strong>
                  <span className="font-medium text-foreground">
                    {f.referringDoctor}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* 3. Hallazgos Detallados */}
          <div className="space-y-2.5 rounded-lg border border-border bg-card p-3.5">
            <h3 className="border-b border-border pb-1 text-[10px] font-bold tracking-wider text-primary uppercase">
              Informe / Hallazgos Ecográficos Detallados
            </h3>

            {isGynMode ? (
              <div className="space-y-2.5 text-[11px]">
                <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-muted/25 p-2.5">
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      Posición Útero
                    </span>
                    <strong className="font-mono text-foreground">
                      {f.uterusPosition || "—"}
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

                {f.myometriumStatus ||
                typeof f.cervixLengthMm === "number" ||
                f.cervixStatus ||
                f.uterusEcopulsionPain ? (
                  <div className="space-y-1">
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
                    {typeof f.cervixLengthMm === "number" || f.cervixStatus ? (
                      <div>
                        <strong className="text-muted-foreground">Cérvix: </strong>
                        <span className="text-foreground">
                          {[
                            typeof f.cervixLengthMm === "number"
                              ? `${f.cervixLengthMm} mm de longitud`
                              : "",
                            f.cervixStatus || "",
                          ]
                            .filter(Boolean)
                            .join(" — ")}
                        </span>
                      </div>
                    ) : null}
                    {f.uterusEcopulsionPain ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Sensibilidad Uterina:{" "}
                        </strong>
                        <span className="text-foreground">
                          {f.uterusEcopulsionPain}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded border border-border bg-muted/15 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                        Ovario Derecho
                      </span>
                      {typeof f.rightOvaryVolumeCc === "number" ? (
                        <span className="font-mono text-[9.5px] font-semibold text-primary">
                          Vol: {f.rightOvaryVolumeCc} cc
                        </span>
                      ) : null}
                    </div>
                    <span className="text-foreground">
                      {f.rightOvaryDimensions || "Sin particularidades"}
                    </span>
                  </div>
                  <div className="rounded border border-border bg-muted/15 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                        Ovario Izquierdo
                      </span>
                      {typeof f.leftOvaryVolumeCc === "number" ? (
                        <span className="font-mono text-[9.5px] font-semibold text-primary">
                          Vol: {f.leftOvaryVolumeCc} cc
                        </span>
                      ) : null}
                    </div>
                    <span className="text-foreground">
                      {f.leftOvaryDimensions || "Sin particularidades"}
                    </span>
                  </div>
                </div>

                {f.ovariesNotes ||
                f.periOvarianFluid ||
                f.ovaryEcopulsionPain ||
                f.douglasPouch ? (
                  <div className="space-y-1 rounded border border-border bg-muted/20 p-2">
                    {f.ovariesNotes ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Características Ováricas:{" "}
                        </strong>
                        <span>{f.ovariesNotes}</span>
                      </div>
                    ) : null}
                    {f.periOvarianFluid ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Espacio Peri-ovárico:{" "}
                        </strong>
                        <span>{f.periOvarianFluid}</span>
                      </div>
                    ) : null}
                    {f.ovaryEcopulsionPain ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Ecopulsión Anexial:{" "}
                        </strong>
                        <span>{f.ovaryEcopulsionPain}</span>
                      </div>
                    ) : null}
                    {f.douglasPouch ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Fondo de Saco de Douglas:{" "}
                        </strong>
                        <span>{f.douglasPouch}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {f.slidingSign ||
                f.uterosacralLigaments ||
                f.endometriosisFoci ? (
                  <div className="grid grid-cols-3 gap-2 rounded border border-border bg-muted/20 p-2">
                    {f.slidingSign ? (
                      <div>
                        <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                          Signo Deslizamiento (IDEA)
                        </span>
                        <strong className="font-mono text-foreground">
                          {f.slidingSign}
                        </strong>
                      </div>
                    ) : null}
                    {f.uterosacralLigaments ? (
                      <div className="col-span-2">
                        <strong className="text-muted-foreground">
                          Ligamentos Uterosacros:{" "}
                        </strong>
                        <span>{f.uterosacralLigaments}</span>
                      </div>
                    ) : null}
                    {f.endometriosisFoci ? (
                      <div className="col-span-3 border-t border-border pt-1">
                        <strong className="text-muted-foreground">
                          Focos de Endometriosis / Notas:{" "}
                        </strong>
                        <span>{f.endometriosisFoci}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isBreastMode ? (
              <div className="space-y-2.5 text-[11px]">
                {f.breastPattern || f.breastAcrType ? (
                  <div>
                    <strong className="text-muted-foreground">
                      Ecotextura Mamaria{f.breastAcrType ? ` (${f.breastAcrType})` : ""}:{" "}
                    </strong>
                    <span>{f.breastPattern || f.breastAcrType}</span>
                  </div>
                ) : null}

                {f.breastLesions && f.breastLesions.length > 0 ? (
                  <div className="space-y-1.5 rounded-lg border border-border bg-muted/15 p-2.5">
                    <strong className="block text-[10px] font-bold text-primary uppercase">
                      Hallazgos Focales / Lesiones Descritas
                    </strong>
                    <ul className="space-y-1">
                      {f.breastLesions.map((lesion, lIdx) => (
                        <li key={lesion.id || lIdx} className="leading-snug text-foreground">
                          • {formatBreastLesionSentence(lesion)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {f.rightBreastFindings || f.leftBreastFindings ? (
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
                ) : null}

                {f.breastComplement ? (
                  <div className="rounded border border-border bg-muted/15 p-2 text-foreground">
                    <strong className="text-muted-foreground">Complemento: </strong>
                    <span>{f.breastComplement}</span>
                  </div>
                ) : null}

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

            {isObs1TMode ? (
              <div className="space-y-2.5 text-[11px]">
                {/* Bloque Útero I Trimestre */}
                {f.uterusDimensions || f.uterusPosition || f.myometriumStatus ? (
                  <div className="rounded border border-border bg-muted/15 p-2">
                    <strong className="text-primary uppercase text-[9.5px] block mb-0.5">
                      Útero Grávido
                    </strong>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {f.uterusPosition ? (
                        <span>
                          <strong>Posición:</strong> {f.uterusPosition}
                        </span>
                      ) : null}
                      {f.uterusDimensions ? (
                        <span>
                          <strong>Dimensiones:</strong> {f.uterusDimensions}
                          {typeof f.uterusVolumeCc === "number"
                            ? ` (${f.uterusVolumeCc} cc)`
                            : ""}
                        </span>
                      ) : null}
                      {f.myometriumStatus ? (
                        <span>
                          <strong>Miometrio:</strong> {f.myometriumStatus}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Bloque Saco / Embrión */}
                <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-muted/25 p-2.5">
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      Sacos Gestacionales
                    </span>
                    <strong className="font-mono text-foreground">
                      {f.gestationalSacsCount ?? "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-muted-foreground">
                      CRL / LCN
                    </span>
                    <strong className="font-mono text-foreground">
                      {typeof f.embryoCrownRumpLengthMm === "number"
                        ? `${f.embryoCrownRumpLengthMm} mm`
                        : "—"}
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
                      Actividad Cardíaca
                    </span>
                    <strong className="font-mono text-foreground">
                      {typeof f.fetalHeartRate === "number"
                        ? `${f.fetalHeartRate} lpm`
                        : "—"}
                    </strong>
                  </div>
                  {typeof f.gestationalSacMm === "number" ||
                  typeof f.yolkSacMm === "number" ||
                  f.choriodecidualReaction ? (
                    <div className="col-span-4 flex flex-wrap gap-x-4 border-t border-border pt-1 text-[10.5px]">
                      {typeof f.gestationalSacMm === "number" ? (
                        <span>
                          <strong>Saco Gestacional:</strong> {f.gestationalSacMm} mm
                        </span>
                      ) : null}
                      {typeof f.yolkSacMm === "number" ? (
                        <span>
                          <strong>Vesícula Vitelina:</strong> {f.yolkSacMm} mm
                        </span>
                      ) : null}
                      {f.choriodecidualReaction ? (
                        <span>
                          <strong>Corion:</strong> {f.choriodecidualReaction}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Marcadores Genéticos 11-14 semanas */}
                {isGeneticMode ||
                typeof f.nuchalTranslucencyMm === "number" ||
                f.nasalBone ||
                f.ductusVenosusWave ||
                typeof f.uterineArteriesMeanPi === "number" ? (
                  <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                    <strong className="block text-[9.5px] font-bold text-primary uppercase">
                      Marcadores Genéticos & Riesgo FMF (11–14 Semanas)
                    </strong>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[10.5px]">
                      <div>
                        <span className="block text-[9px] text-muted-foreground">
                          Translucencia Nucal
                        </span>
                        <strong>
                          {typeof f.nuchalTranslucencyMm === "number"
                            ? `${f.nuchalTranslucencyMm} mm`
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground">
                          Hueso Nasal
                        </span>
                        <strong>{f.nasalBone || "—"}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground">
                          Ductus Venoso
                        </span>
                        <strong>
                          {f.ductusVenosusWave || "—"}
                          {typeof f.ductusVenosusPi === "number"
                            ? ` (IP: ${f.ductusVenosusPi})`
                            : ""}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground">
                          IP Prom. Art. Uterinas
                        </span>
                        <strong>
                          {typeof f.uterineArteriesMeanPi === "number"
                            ? f.uterineArteriesMeanPi
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground">
                          Riesgo Cromosomopatías
                        </span>
                        <strong>{f.chromosomopathyRisk || "—"}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-muted-foreground">
                          Riesgo Preeclampsia (&lt;37ss)
                        </span>
                        <strong>{f.preeclampsiaRisk || "—"}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Cérvix, Ovarios y Douglas 1T */}
                {typeof f.cervixLengthMm === "number" ||
                f.cervixStatus ||
                f.rightOvaryDimensions ||
                f.leftOvaryDimensions ||
                f.douglasPouch ? (
                  <div className="space-y-1 rounded border border-border bg-muted/15 p-2 text-[10.5px]">
                    {typeof f.cervixLengthMm === "number" || f.cervixStatus ? (
                      <div>
                        <strong className="text-muted-foreground">Cérvix: </strong>
                        <span>
                          {[
                            typeof f.cervixLengthMm === "number"
                              ? `${f.cervixLengthMm} mm`
                              : "",
                            f.cervixStatus || "",
                          ]
                            .filter(Boolean)
                            .join(" — ")}
                        </span>
                      </div>
                    ) : null}
                    {f.rightOvaryDimensions || f.leftOvaryDimensions ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <strong className="text-muted-foreground">
                            Ovario Derecho:{" "}
                          </strong>
                          <span>
                            {f.rightOvaryDimensions || "—"}
                            {typeof f.rightOvaryVolumeCc === "number"
                              ? ` (${f.rightOvaryVolumeCc} cc)`
                              : ""}
                          </span>
                        </div>
                        <div>
                          <strong className="text-muted-foreground">
                            Ovario Izquierdo:{" "}
                          </strong>
                          <span>
                            {f.leftOvaryDimensions || "—"}
                            {typeof f.leftOvaryVolumeCc === "number"
                              ? ` (${f.leftOvaryVolumeCc} cc)`
                              : ""}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    {f.douglasPouch ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Fondo de Saco de Douglas:{" "}
                        </strong>
                        <span>{f.douglasPouch}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isObs23Mode ? (
              <div className="space-y-2.5 text-[11px]">
                {/* Estática, Sexo, Vitalidad & Anatomía */}
                <div className="space-y-1 rounded border border-border bg-muted/15 p-2.5">
                  <div className="flex flex-wrap gap-x-5 gap-y-0.5 border-b border-border pb-1">
                    {f.fetalStatic ? (
                      <span>
                        <strong className="text-muted-foreground">Estática: </strong>
                        {f.fetalStatic}
                      </span>
                    ) : null}
                    {f.gestationalAgeByEcho ? (
                      <span>
                        <strong className="text-muted-foreground">EG Eco: </strong>
                        <span className="font-mono font-semibold">
                          {f.gestationalAgeByEcho}
                        </span>
                      </span>
                    ) : null}
                    {typeof f.fetalHeartRate === "number" ? (
                      <span>
                        <strong className="text-muted-foreground">F.C.F.: </strong>
                        <span className="font-mono font-semibold">
                          {f.fetalHeartRate} lpm
                        </span>
                      </span>
                    ) : null}
                    {f.fetalSex ? (
                      <span>
                        <strong className="text-muted-foreground">Sexo: </strong>
                        {f.fetalSex}
                      </span>
                    ) : null}
                  </div>

                  {f.fetalAnatomySummary ? (
                    <p>{f.fetalAnatomySummary}</p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10.5px]">
                    {f.fetalHeartFourChambers ? (
                      <div>
                        <strong className="text-muted-foreground">Corazón: </strong>
                        <span>{f.fetalHeartFourChambers}</span>
                      </div>
                    ) : null}
                    {f.fetalAbdominalWall ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Pared Abdominal:{" "}
                        </strong>
                        <span>{f.fetalAbdominalWall}</span>
                      </div>
                    ) : null}
                    {f.fetalKidneys ? (
                      <div>
                        <strong className="text-muted-foreground">Riñones: </strong>
                        <span>{f.fetalKidneys}</span>
                      </div>
                    ) : null}
                    {f.fetalSpine ? (
                      <div>
                        <strong className="text-muted-foreground">Columna: </strong>
                        <span>{f.fetalSpine}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Biometría Fetal */}
                <div className="grid grid-cols-6 gap-2 rounded-lg border border-border bg-muted/25 p-2 text-center font-mono">
                  <div>
                    <span className="block text-[9px] text-muted-foreground">
                      DBP
                    </span>
                    <strong>
                      {typeof f.bpdMm === "number" ? `${f.bpdMm} mm` : "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground">
                      CC
                    </span>
                    <strong>
                      {typeof f.hcMm === "number" ? `${f.hcMm} mm` : "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground">
                      CA
                    </span>
                    <strong>
                      {typeof f.acMm === "number" ? `${f.acMm} mm` : "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground">
                      LF
                    </span>
                    <strong>
                      {typeof f.flMm === "number" ? `${f.flMm} mm` : "—"}
                    </strong>
                  </div>
                  <div className="col-span-2 border-l border-border pl-2">
                    <span className="block text-[9px] text-muted-foreground">
                      Ponderado Fetal
                    </span>
                    <strong className="text-primary">
                      {typeof f.estimatedFetalWeightGr === "number"
                        ? `${f.estimatedFetalWeightGr} g`
                        : "—"}
                      {f.estimatedFetalWeightPercentile
                        ? ` (${f.estimatedFetalWeightPercentile})`
                        : ""}
                    </strong>
                  </div>
                </div>

                {/* Perfil Biofísico + Placenta + Cordón + Líquido */}
                <div className="grid grid-cols-12 gap-2">
                  {bppTotal !== null ? (
                    <div className="col-span-4 rounded border border-border bg-muted/15 p-2 text-[10px]">
                      <div className="flex items-center justify-between border-b border-border pb-0.5 mb-1">
                        <strong className="text-primary uppercase">
                          Perfil Biofísico
                        </strong>
                        <strong className="font-mono">{bppTotal} / 8 pts</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2">
                        <span>Mov. Corp.: {f.bppBodyMovements ?? "—"}</span>
                        <span>Mov. Resp.: {f.bppBreathingMovements ?? "—"}</span>
                        <span>Tono Musc.: {f.bppMuscleTone ?? "—"}</span>
                        <span>Líq. Amn.: {f.bppAmnioticFluid ?? "—"}</span>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={
                      bppTotal !== null
                        ? "col-span-8 space-y-0.5 rounded border border-border bg-muted/15 p-2 text-[10.5px]"
                        : "col-span-12 space-y-0.5 rounded border border-border bg-muted/15 p-2 text-[10.5px]"
                    }
                  >
                    {f.placentaLocation || f.placentaGrade || f.placentaHematomas ? (
                      <div>
                        <strong className="text-muted-foreground">Placenta: </strong>
                        <span>
                          {[f.placentaLocation, f.placentaGrade, f.placentaHematomas]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                      </div>
                    ) : null}
                    {f.umbilicalCord ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Cordón Umbilical:{" "}
                        </strong>
                        <span>{f.umbilicalCord}</span>
                      </div>
                    ) : null}
                    {typeof f.amnioticFluidIlaMm === "number" ||
                    f.amnioticFluidIndex ? (
                      <div>
                        <strong className="text-muted-foreground">
                          Líquido Amniótico:{" "}
                        </strong>
                        <span>
                          {[
                            typeof f.amnioticFluidIlaMm === "number"
                              ? `ILA: ${f.amnioticFluidIlaMm} mm`
                              : "",
                            f.amnioticFluidIndex || "",
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Tabla Estudio Doppler Materno-Fetal */}
                {showDopplerTable ? (
                  <div className="overflow-hidden rounded border border-primary/25">
                    <div className="bg-primary/10 px-2.5 py-1 text-[9.5px] font-bold tracking-wider text-primary uppercase">
                      Estudio Doppler Materno-Fetal
                    </div>
                    <table className="w-full text-[10.5px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-left text-[9.5px] font-semibold text-muted-foreground">
                          <th className="px-2.5 py-1">Vaso Evaluado</th>
                          <th className="w-24 px-2 py-1 font-mono">IP</th>
                          <th className="w-28 px-2 py-1 font-mono">Percentil</th>
                          <th className="w-28 px-2.5 py-1">Interpretación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {DOPPLER_VESSEL_META.map((vessel) => {
                          const row = f.doppler?.[vessel.key];
                          return (
                            <tr key={vessel.key}>
                              <td className="px-2.5 py-1 font-medium text-foreground">
                                {vessel.label}
                              </td>
                              <td className="px-2 py-1 font-mono">
                                {typeof row?.pi === "number" ? row.pi : "—"}
                              </td>
                              <td className="px-2 py-1 font-mono">
                                {row?.percentile || "—"}
                              </td>
                              <td className="px-2.5 py-1 font-semibold">
                                {row?.status || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
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

          {isBreastMode ? (
            <div className="rounded border border-border bg-muted/20 px-3 py-1.5 text-[9px] leading-snug text-muted-foreground">
              <p>
                <strong className="text-foreground">ACR BI-RADS:</strong> (0)
                Requiere evaluación adicional • (1) Normal • (2) Hallazgo
                benigno • (3) Control en 6 meses • (4) Sospecha de malignidad:
                Biopsia • (5) Signos de malignidad • (6) Malignidad confirmada.
              </p>
              <p className="mt-0.5">
                <strong className="text-foreground">
                  Tipo de mama según ACR:
                </strong>{" "}
                (A) Ecotextura homogénea a predominio graso • (B) Ecotextura
                homogénea fibroglandular • (C) Heterogéneamente densa • (D)
                Extremadamente densa.
              </p>
            </div>
          ) : null}

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
