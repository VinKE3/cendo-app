"use client";

import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import type { ClinicalCheckupItem } from "@/features/chequeos/chequeos.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { formatPeruDateDisplay } from "@/lib/utils";

interface CheckupPrintViewProps {
  checkup: ClinicalCheckupItem;
  patient: PatientDirectoryItem;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
  signatureSrc?: string | null;
  showDigitalSignature?: boolean;
}

export function CheckupPrintView({
  checkup,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
  signatureSrc,
  showDigitalSignature,
}: CheckupPrintViewProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const resolvedSig = getSignatureForDoctor(
    checkup.doctorId,
    checkup.doctorCmp
  );
  const resolvedSignatureSrc =
    signatureSrc !== undefined ? signatureSrc : resolvedSig.signatureSrc;
  const resolvedShowDigitalSignature =
    showDigitalSignature !== undefined
      ? showDigitalSignature
      : resolvedSig.showByDefault;

  const credentials = [
    checkup.doctorCmp ? `CMP ${checkup.doctorCmp}` : "",
    checkup.doctorRne ? `RNE ${checkup.doctorRne}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      id="checkup-print-sheet"
      className="mx-auto max-w-[210mm] space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle={
            checkup.dossierConfig.coverTitle || "CHEQUEO GINECOLÓGICO"
          }
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={checkup.doctorName.toUpperCase()}
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
                  Chequeo Ginecológico Preventivo Integral • Eco Mamaria • Eco
                  Transvaginal • Colposcopía Digital
                </p>
                <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                  {clinicAddress} • Citas: {clinicPhone}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-l border-border pl-4 text-right">
              <div className="inline-block rounded border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary uppercase">
                CHEQUEO INTEGRAL
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                N° CHK-{checkup.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="font-mono text-[10px] font-semibold text-foreground">
                Fecha: {formatPeruDateDisplay(checkup.checkupDate)}
              </p>
            </div>
          </header>

          {/* 2. Filiación de la Paciente */}
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
                Estudios en Dossier
              </span>
              <span className="font-mono text-[10.5px] font-bold text-primary">
                {checkup.dossierConfig.items.length} pieza(s)
              </span>
            </div>

            <div className="col-span-12 border-t border-border pt-1.5 text-[10.5px]">
              <strong className="text-muted-foreground">
                Motivo del Chequeo:{" "}
              </strong>
              <span>{checkup.reasonForConsultation}</span>
            </div>
          </div>

          {/* 3. Resumen Ecográfico Consolidado (2 Columnas) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between border-b border-border pb-1">
                <h3 className="text-[10px] font-bold tracking-wider text-primary uppercase">
                  1. Ecografía Mamaria Bilateral
                </h3>
                {checkup.breastUltrasoundBirads ? (
                  <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                    {checkup.breastUltrasoundBirads}
                  </span>
                ) : null}
              </div>
              <p className="text-[10.5px] leading-relaxed text-foreground">
                {checkup.breastUltrasoundFindings ||
                  "Sin hallazgos mamarios consignados en resumen."}
              </p>
              {checkup.breastLesionMeasurements ? (
                <p className="font-mono text-[9.5px] text-muted-foreground">
                  <strong>Lesiones / Medidas: </strong>
                  {checkup.breastLesionMeasurements}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 rounded-lg border border-border bg-card p-3">
              <h3 className="border-b border-border pb-1 text-[10px] font-bold tracking-wider text-primary uppercase">
                2. Ecografía Transvaginal / Pélvica
              </h3>
              <p className="text-[10.5px] leading-relaxed text-foreground">
                {checkup.transvaginalUltrasoundFindings ||
                  "Sin hallazgos transvaginales consignados en resumen."}
              </p>
              <div className="grid grid-cols-2 gap-1.5 border-t border-border pt-1 font-mono text-[9.5px]">
                <div>
                  <strong className="text-muted-foreground">Útero: </strong>
                  <span>{checkup.uterusMeasurements || "-"}</span>
                </div>
                <div>
                  <strong className="text-muted-foreground">
                    Endometrio:{" "}
                  </strong>
                  <span>
                    {checkup.endometriumThicknessMm != null
                      ? `${checkup.endometriumThicknessMm} mm`
                      : "-"}
                  </span>
                </div>
              </div>
              {checkup.ovariesFindings ? (
                <p className="text-[10px] text-muted-foreground">
                  <strong>Ovarios: </strong>
                  {checkup.ovariesFindings}
                </p>
              ) : null}
            </div>
          </div>

          {/* 4. Colposcopía & Tamizaje Citológico/Molecular */}
          <div className="grid grid-cols-12 gap-3 rounded-lg border border-border bg-card p-3">
            <div className="col-span-7 space-y-1 border-r border-border pr-3">
              <h3 className="text-[10px] font-bold tracking-wider text-primary uppercase">
                3. Colposcopía Digital IFCPC
              </h3>
              {checkup.colposcopyResult ? (
                <p className="text-[10.5px] font-bold text-primary">
                  {checkup.colposcopyResult}
                </p>
              ) : null}
              <p className="text-[10px] leading-relaxed text-foreground">
                {checkup.colposcopyFindings ||
                  "Sin resumen colposcópico consignado."}
              </p>
            </div>

            <div className="col-span-5 space-y-1.5 text-[10.5px]">
              <h3 className="text-[10px] font-bold tracking-wider text-primary uppercase">
                4. Citología & Pruebas Moleculares
              </h3>
              <div>
                <strong className="text-muted-foreground">
                  Papanicolaou (PAP):{" "}
                </strong>
                <span className="font-semibold text-foreground">
                  {checkup.papResult || "Pendiente"}
                </span>
              </div>
              <div>
                <strong className="text-muted-foreground">Test VPH: </strong>
                <span className="font-semibold text-foreground">
                  {checkup.vphResult || "Pendiente / No solicitado"}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Conclusiones & Plan */}
          <div className="space-y-1.5 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[10px] font-bold tracking-wider text-primary uppercase">
                Conclusiones Diagnósticas Consolidadas
              </h3>
              {checkup.cie10Code ? (
                <span className="rounded border border-primary/30 bg-card px-2 py-0.5 font-mono text-[9.5px] font-bold text-primary">
                  CIE-10: {checkup.cie10Code}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] leading-relaxed font-semibold whitespace-pre-line text-foreground">
              {checkup.conclusions}
            </p>
            {checkup.medicalPrescription ? (
              <div className="border-t border-primary/20 pt-1.5 text-[10.5px]">
                <strong className="text-primary">
                  Plan Terapéutico & Indicaciones:{" "}
                </strong>
                <span className="whitespace-pre-line text-foreground">
                  {checkup.medicalPrescription}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Firma y Cenefa */}
        <div>
          <div className="px-[14mm] pb-4 text-right">
            <CendoSignatureBlock
              doctorName={checkup.doctorName}
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
