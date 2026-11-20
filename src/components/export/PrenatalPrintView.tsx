"use client";

import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import {
  evaluatePrenatalRisks,
  MINSA_FAMILY_HISTORY_COL1,
  MINSA_FAMILY_HISTORY_COL2,
  MINSA_PERSONAL_HISTORY_COL1,
  MINSA_PERSONAL_HISTORY_COL2,
  MINSA_PERSONAL_HISTORY_COL3,
  type PrenatalCardItem,
  type PrenatalReferralEntry,
} from "@/features/prenatal/prenatal.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface PrenatalPrintViewProps {
  card: PrenatalCardItem;
  patient: PatientDirectoryItem;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
  signatureSrc?: string | null;
  showDigitalSignature?: boolean;
}

function MinsaCheckBox({
  checked,
  variant = "white",
  size = "sm",
}: {
  checked: boolean;
  variant?: "white" | "yellow" | "red";
  size?: "xs" | "sm";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[2px] border font-sans font-extrabold leading-none select-none",
        size === "xs" ? "size-3 text-[8px]" : "size-3.5 text-[9px]",
        variant === "red"
          ? checked
            ? "border-red-800 bg-red-600 text-white"
            : "border-red-600 bg-red-100 text-transparent"
          : variant === "yellow"
            ? checked
              ? "border-amber-700 bg-amber-400 text-slate-950"
              : "border-amber-500 bg-amber-100/80 text-transparent"
            : checked
              ? "border-slate-800 bg-slate-900 text-white"
              : "border-slate-400 bg-white text-transparent"
      )}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "  /  /  ";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  }
  return dateStr;
}

export function PrenatalPrintView({
  card,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = false,
  signatureSrc,
  showDigitalSignature,
}: PrenatalPrintViewProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const resolvedSig = getSignatureForDoctor(
    card.attendingDoctorId,
    card.doctorCmp
  );
  const resolvedSignatureSrc =
    signatureSrc !== undefined ? signatureSrc : resolvedSig.signatureSrc;
  const resolvedShowDigitalSignature =
    showDigitalSignature !== undefined
      ? showDigitalSignature
      : resolvedSig.hasSignature && resolvedSig.showByDefault;

  const { baseline, visits, maternalPathologies } = card;
  const risks = evaluatePrenatalRisks(
    baseline,
    patient.age,
    visits,
    maternalPathologies
  );

  const doctorCleanName = (
    card.attendingDoctorName || "Dr. Patrick José Jacinto Gomero"
  )
    .replace(/^dr\.?\s+/i, "")
    .trim();

  const totalPartos =
    (baseline.partosVaginales || 0) + (baseline.cesareas || 0);
  const isParityRisk = totalPartos === 0 || totalPartos >= 4;
  const isAgeRisk = patient.age < 15 || patient.age > 35;

  const visitColumns = Array.from({ length: 9 }, (_, idx) => {
    return visits.find((v) => v.visitNumber === idx + 1) ?? null;
  });

  const basalBmi =
    baseline.usualWeightKg > 0 && baseline.heightCm > 100
      ? (
          baseline.usualWeightKg /
          Math.pow(baseline.heightCm / 100, 2)
        ).toFixed(1)
      : "—";

  const renderSpecialLabRightRow = (
    label: string,
    result: string | undefined,
    dateStr: string | undefined,
    mode: "neg_pos" | "norm_anorm" = "neg_pos"
  ) => {
    const val = result || "No se Hizo";
    const isGood =
      mode === "neg_pos" ? val === "Negativo" : val === "Normal";
    const isBad =
      mode === "neg_pos" ? val === "Positivo" : val === "Anormal";
    const isNotDone = val === "No se Hizo";
    const isNoApplies = val === "No Aplica";

    return (
      <tr key={label} className="border-b border-slate-200/80">
        <td className="py-[1.5px] pr-1 font-semibold text-slate-800">
          {label}
        </td>
        <td className="py-[1.5px] text-center">
          <MinsaCheckBox checked={isGood} variant="white" size="xs" />
        </td>
        <td className="py-[1.5px] text-center">
          <MinsaCheckBox checked={isBad} variant="yellow" size="xs" />
        </td>
        <td className="py-[1.5px] text-center">
          <MinsaCheckBox checked={isNotDone} variant="yellow" size="xs" />
        </td>
        <td className="py-[1.5px] text-center">
          <MinsaCheckBox checked={isNoApplies} variant="white" size="xs" />
        </td>
        <td className="py-[1.5px] pl-1 text-right text-[6.8px] text-slate-700">
          {dateStr ? formatShortDate(dateStr) : "  /  /  "}
        </td>
      </tr>
    );
  };

  const renderReferralRow = (label: string, ref?: PrenatalReferralEntry) => {
    const status = ref?.status || "NO_APLICA";
    return (
      <div className="grid grid-cols-12 items-center gap-1 text-[7.5px]">
        <span className="col-span-4 font-bold text-slate-800">{label}</span>
        <div className="col-span-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5">
            SI <MinsaCheckBox checked={status === "SI"} variant="white" size="xs" />
          </span>
          <span className="inline-flex items-center gap-0.5">
            NO <MinsaCheckBox checked={status === "NO"} variant="yellow" size="xs" />
          </span>
          <span className="inline-flex items-center gap-0.5">
            NO APLICA{" "}
            <MinsaCheckBox
              checked={status === "NO_APLICA"}
              variant="white"
              size="xs"
            />
          </span>
        </div>
        <span className="col-span-2 text-slate-700">
          Fecha:{" "}
          <strong className="underline">
            {ref?.date ? formatShortDate(ref.date) : "  /  /  "}
          </strong>
        </span>
        <span className="col-span-2 truncate text-slate-700">
          Estbl. Trasl: <strong>{ref?.targetEstablishment || "—"}</strong>
        </span>
      </div>
    );
  };

  return (
    <div
      id="prenatal-print-root"
      className="mx-auto max-w-[210mm] space-y-6 bg-white font-sans text-xs text-slate-900 print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle="CARNET DE CONTROL PRENATAL"
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={`DR. ${doctorCleanName.toUpperCase()}`}
          doctorSpecialty="GINECOLOGÍA Y OBSTETRICIA - MEDICINA MATERNO FETAL"
          doctorCredentials={`CMP ${card.doctorCmp || "61693"} • RNE ${card.doctorRne || "38657"}`}
          clinicAddress={clinicAddress}
          clinicEmail={clinicEmail}
          clinicPhone={clinicPhone}
        />
      ) : null}

      {/* =====================================================================
          PÁGINA 1: ANVERSO (FILIACIÓN, ANTECEDENTES & DATOS BASALES EMBARAZO)
          ===================================================================== */}
      <div className="page-sheet box-border flex min-h-[297mm] max-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-[6mm_10mm_4mm_10mm] font-sans shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-1.5">
          {/* 1. Cabecera Oficial MINSA / CENDO */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-primary pb-1">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" showText={false} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-slate-800 px-1.5 py-0.5 text-[7.5px] font-extrabold text-white uppercase">
                    PERÚ • Ministerio de Salud
                  </span>
                  <span className="text-[11px] font-extrabold tracking-tight text-primary">
                    CENDO • CONTROL MATERNO PERINATAL (CLAP)
                  </span>
                </div>
                <p className="text-[7.5px] text-slate-600">
                  {clinicAddress} • Tel: {clinicPhone} • DR.{" "}
                  {doctorCleanName.toUpperCase()} (CMP {card.doctorCmp} • RNE{" "}
                  {card.doctorRne})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="space-y-0.5 text-right text-[7px]">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                    <span className="inline-block size-2.5 border border-amber-600 bg-amber-400" />
                    = significa ALERTA
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                    <span className="inline-block size-2.5 border border-red-800 bg-red-600" />
                    = requiere seguimiento continuo
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <span className="bg-slate-800 px-1.5 py-0.5 text-[8.5px] font-extrabold text-white">
                    No. HC
                  </span>
                  <span className="rounded border border-slate-400 bg-slate-50 px-2 py-0.5 text-[9.5px] font-extrabold tracking-widest text-slate-900">
                    {baseline.hcNumber || patient.documentNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. FILIACIÓN DE LA GESTANTE */}
          <div className="rounded border border-slate-400 bg-slate-50/40 p-1.5 text-[7.8px] leading-tight">
            <div className="grid grid-cols-12 gap-1.5 border-b border-slate-200 pb-1">
              <div className="col-span-6">
                <span className="font-bold text-slate-600">
                  Apellidos y Nombres:{" "}
                </span>
                <strong className="text-[9.5px] font-extrabold text-slate-950 uppercase">
                  {patient.fullName}
                </strong>
              </div>
              <div className="col-span-6 text-right">
                <span className="font-bold text-slate-600">
                  Establecimiento:{" "}
                </span>
                <strong className="text-slate-900">
                  {card.clinicEstablishment}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-12 items-center gap-1 border-b border-slate-200 py-1">
              <div className="col-span-5 flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Establ. Origen:</span>
                <strong className="truncate text-slate-900">
                  {baseline.establishmentOrigin || "CENDO Miraflores"}
                </strong>
                <span className="inline-flex items-center gap-0.5">
                  <MinsaCheckBox
                    checked={baseline.originNoApplies}
                    variant="white"
                    size="xs"
                  />{" "}
                  No Aplica
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <MinsaCheckBox
                    checked={baseline.originReferral}
                    variant="white"
                    size="xs"
                  />{" "}
                  Referencia
                </span>
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Tipo Seguro:</span>
                {(["SIS", "ESSALUD", "PRIVADO"] as const).map((seg) => (
                  <span key={seg} className="inline-flex items-center gap-0.5">
                    {seg}{" "}
                    <MinsaCheckBox
                      checked={baseline.insuranceType === seg}
                      variant="white"
                      size="xs"
                    />
                  </span>
                ))}
              </div>

              <div className="col-span-3 text-right">
                <span className="font-bold text-slate-600">Cód. Afiliación: </span>
                <strong className="rounded border border-slate-300 bg-white px-1 py-0.2 text-slate-900">
                  {baseline.insuranceAffiliationCode ||
                    `CENDO-${patient.documentNumber}`}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-12 items-center gap-1 border-b border-slate-200 py-1">
              <div className="col-span-3">
                <span className="font-bold text-slate-600">DNI N°: </span>
                <strong className="rounded border border-slate-300 bg-white px-1.5 py-0.2 text-[8.5px] font-extrabold text-slate-950">
                  {patient.documentNumber}
                </strong>
              </div>
              <div className="col-span-5 truncate">
                <span className="font-bold text-slate-600">Dirección: </span>
                <strong className="text-slate-900">
                  {baseline.patientAddress || patient.address || "Lima"}
                </strong>
                <span className="ml-1 text-slate-600">
                  ({baseline.district || patient.district} / {baseline.province} /{" "}
                  {baseline.department})
                </span>
              </div>
              <div className="col-span-2 truncate">
                <span className="font-bold text-slate-600">Ocupación: </span>
                <strong className="text-slate-900">
                  {baseline.patientOccupation || patient.occupation || "—"}
                </strong>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                <span className="font-bold text-slate-600">Edad:</span>
                <strong className="text-[8.5px] font-extrabold text-slate-950">
                  {patient.age}a
                </strong>
                <MinsaCheckBox
                  checked={isAgeRisk}
                  variant="red"
                  size="xs"
                />
                <span className="text-[6.5px] font-bold text-red-800">
                  &lt;15 / &gt;35
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 items-center gap-1 pt-1">
              <div className="col-span-5 flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-600">Estudios:</span>
                <span className="inline-flex items-center gap-0.5">
                  <MinsaCheckBox
                    checked={baseline.educationLevel === "Analfabeta"}
                    variant="yellow"
                    size="xs"
                  />{" "}
                  Analfabeta
                </span>
                {(
                  [
                    ["Primaria", "Primaria"],
                    ["Secundaria", "Secundaria"],
                    ["Superior", "Superior"],
                    ["Superior No Univ", "Sup. No Univ."],
                  ] as const
                ).map(([val, lbl]) => (
                  <span key={val} className="inline-flex items-center gap-0.5">
                    <MinsaCheckBox
                      checked={baseline.educationLevel === val}
                      variant="white"
                      size="xs"
                    />{" "}
                    {lbl}
                  </span>
                ))}
                <span className="text-slate-600">
                  (Años aprob:{" "}
                  <strong>{baseline.approvedEducationYears}</strong>)
                </span>
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Estado Civil:</span>
                <span className="inline-flex items-center gap-0.5">
                  <MinsaCheckBox
                    checked={baseline.civilStatus === "Casada"}
                    variant="white"
                    size="xs"
                  />{" "}
                  Casada
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <MinsaCheckBox
                    checked={baseline.civilStatus === "Conviviente"}
                    variant="white"
                    size="xs"
                  />{" "}
                  Conviv.
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <MinsaCheckBox
                    checked={baseline.civilStatus === "Soltera"}
                    variant="yellow"
                    size="xs"
                  />{" "}
                  Soltera
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <MinsaCheckBox
                    checked={baseline.civilStatus === "Otro"}
                    variant="yellow"
                    size="xs"
                  />{" "}
                  Otro
                </span>
              </div>

              <div className="col-span-3 truncate text-right">
                <span className="font-bold text-slate-600">Tel: </span>
                <strong>{baseline.patientPhone || patient.phone}</strong>
                {baseline.fatherName ? (
                  <span className="ml-1 text-slate-600">
                    • Padre RN: <strong>{baseline.fatherName}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* 3. ANTECEDENTES OBSTÉTRICOS + GESTACIÓN ANTERIOR */}
          <div className="grid grid-cols-12 gap-1.5">
            {/* Antecedentes Obstétricos (6 cols) */}
            <div className="col-span-6 rounded border border-slate-400 bg-white p-1.5 text-[7.5px]">
              <div className="mb-1 flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span className="bg-slate-200 px-1.5 py-0.2 font-extrabold text-slate-900 uppercase">
                  Antecedentes Obstétricos
                </span>
                <span className="font-extrabold text-primary">
                  Fórmula: G{baseline.gestas} P{totalPartos}
                  {baseline.abortos}
                  {baseline.nacidosVivos}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 text-center">
                <div className="space-y-1">
                  <div className="rounded border border-slate-300 bg-slate-50 p-0.5">
                    <span className="block text-[6.8px] font-bold text-slate-600">
                      Gestas
                    </span>
                    <strong className="text-[10px] font-extrabold">
                      {String(baseline.gestas).padStart(2, "0")}
                    </strong>
                  </div>
                  <div className="space-y-0.5 rounded border border-slate-200 p-0.5 text-left text-[6.8px]">
                    <div className="flex items-center justify-between">
                      <span>0 ó + 3</span>
                      <MinsaCheckBox
                        checked={isParityRisk}
                        variant="yellow"
                        size="xs"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>&lt; 2500 g</span>
                      <MinsaCheckBox
                        checked={
                          baseline.lowWeightHistory ||
                          (baseline.rnMayorPesoGramos > 0 &&
                            baseline.rnMayorPesoGramos < 2500)
                        }
                        variant="yellow"
                        size="xs"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Múltiple</span>
                      <MinsaCheckBox
                        checked={baseline.multipleHistory}
                        variant="yellow"
                        size="xs"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>&lt; 37 sem.</span>
                      <MinsaCheckBox
                        checked={baseline.pretermHistory}
                        variant="yellow"
                        size="xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div
                    className={cn(
                      "rounded border p-0.5",
                      baseline.abortos > 0
                        ? "border-amber-500 bg-amber-200/80"
                        : "border-amber-400 bg-amber-50"
                    )}
                  >
                    <span className="block text-[6.8px] font-bold text-slate-700">
                      Abortos
                    </span>
                    <strong className="text-[10px] font-extrabold">
                      {String(baseline.abortos).padStart(2, "0")}
                    </strong>
                  </div>
                  <div className="rounded border border-slate-300 bg-slate-50 p-0.5">
                    <span className="block text-[6.8px] font-bold text-slate-600">
                      Partos
                    </span>
                    <strong className="text-[10px] font-extrabold">
                      {String(totalPartos).padStart(2, "0")}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div className="rounded border border-slate-300 bg-slate-50 p-0.5">
                    <span className="block text-[6.8px] font-bold text-slate-600">
                      Vaginales
                    </span>
                    <strong className="text-[10px] font-extrabold">
                      {String(baseline.partosVaginales).padStart(2, "0")}
                    </strong>
                  </div>
                  <div
                    className={cn(
                      "rounded border p-0.5",
                      baseline.cesareas > 0
                        ? "border-red-700 bg-red-600 text-white"
                        : "border-red-400 bg-red-50 text-red-950"
                    )}
                  >
                    <span className="block text-[6.8px] font-bold">
                      Cesáreas
                    </span>
                    <strong className="text-[10px] font-extrabold">
                      {String(baseline.cesareas).padStart(2, "0")}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div className="rounded border border-slate-300 bg-slate-50 p-0.5">
                    <span className="block text-[6.5px] font-bold text-slate-600">
                      Nacidos vivos
                    </span>
                    <strong className="text-[10px] font-extrabold">
                      {String(baseline.nacidosVivos).padStart(2, "0")}
                    </strong>
                  </div>
                  <div
                    className={cn(
                      "rounded border p-0.5",
                      baseline.nacidosMuertos > 0
                        ? "border-amber-500 bg-amber-300"
                        : "border-amber-400 bg-amber-50"
                    )}
                  >
                    <span className="block text-[6.5px] font-bold text-slate-700">
                      Nac. muertos
                    </span>
                    <strong className="text-[10px] font-extrabold">
                      {String(baseline.nacidosMuertos).padStart(2, "0")}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-0.5">
                  <div className="rounded border border-slate-300 bg-slate-50 p-0.5">
                    <span className="block text-[6.5px] font-bold text-slate-600">
                      Viven
                    </span>
                    <strong className="text-[9.5px] font-extrabold">
                      {String(baseline.viven).padStart(2, "0")}
                    </strong>
                  </div>
                  <div className="rounded border border-amber-400 bg-amber-50 p-0.5">
                    <span className="block text-[6px] font-bold text-slate-700">
                      Muerto 1ra sem
                    </span>
                    <strong className="text-[8.5px] font-extrabold">
                      {String(baseline.deadFirstWeek).padStart(2, "0")}
                    </strong>
                  </div>
                  <div className="rounded border border-amber-400 bg-amber-50 p-0.5">
                    <span className="block text-[6px] font-bold text-slate-700">
                      Desp. 1ra sem
                    </span>
                    <strong className="text-[8.5px] font-extrabold">
                      {String(baseline.deadAfterFirstWeek).padStart(2, "0")}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1">
                <span className="font-extrabold text-slate-800">
                  RN de mayor peso:{" "}
                  <span className="rounded border border-slate-400 bg-slate-50 px-1.5 py-0.2 font-extrabold">
                    {baseline.rnMayorPesoGramos
                      ? `${baseline.rnMayorPesoGramos} g`
                      : "____ g"}
                  </span>
                </span>
                <span className="text-[6.8px] text-slate-500">
                  {baseline.rnMayorPesoGramos >= 4000
                    ? "⚠️ Macrosomía (≥4000g)"
                    : baseline.rnMayorPesoGramos > 0 &&
                        baseline.rnMayorPesoGramos < 2500
                      ? "⚠️ Bajo Peso (<2500g)"
                      : "Peso natal previo"}
                </span>
              </div>
            </div>

            {/* Gestación Anterior (6 cols) */}
            <div className="col-span-6 rounded border border-slate-400 bg-white p-1.5 text-[7.2px]">
              <div className="mb-1 flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span className="bg-slate-200 px-1.5 py-0.2 font-extrabold text-slate-900 uppercase">
                  Gestación Anterior
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    Fecha:{" "}
                    <strong>
                      {baseline.previousDeliveryDate
                        ? formatShortDate(baseline.previousDeliveryDate)
                        : "  /  /  "}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Per. Intergenésico Adecuado: Sí{" "}
                    <MinsaCheckBox
                      checked={baseline.adequateIntergenesicPeriod === true}
                      variant="white"
                      size="xs"
                    />{" "}
                    No{" "}
                    <MinsaCheckBox
                      checked={baseline.adequateIntergenesicPeriod === false}
                      variant="yellow"
                      size="xs"
                    />
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className="space-y-0.5 border-r border-slate-200 pr-1">
                  <span className="block font-extrabold text-slate-800">
                    Terminación
                  </span>
                  {(
                    [
                      ["Parto Vaginal", "white"],
                      ["Cesárea", "yellow"],
                      ["Aborto", "yellow"],
                      ["Ectópico", "yellow"],
                      ["Aborto molar", "yellow"],
                      ["No Aplica", "white"],
                    ] as const
                  ).map(([opt, v]) => (
                    <div
                      key={opt}
                      className="flex items-center justify-between"
                    >
                      <span>{opt}</span>
                      <MinsaCheckBox
                        checked={baseline.previousDeliveryType === opt}
                        variant={v}
                        size="xs"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-0.5 border-r border-slate-200 pr-1">
                  <span className="block font-extrabold text-slate-800">
                    Si fue aborto: Tipo
                  </span>
                  {(
                    [
                      ["Incompleto", "yellow"],
                      ["Completo", "yellow"],
                      ["Frustro/Retenido", "yellow"],
                      ["Séptico", "yellow"],
                      ["No Aplica", "white"],
                    ] as const
                  ).map(([opt, v]) => (
                    <div
                      key={opt}
                      className="flex items-center justify-between"
                    >
                      <span>{opt}</span>
                      <MinsaCheckBox
                        checked={baseline.previousAbortionType === opt}
                        variant={v}
                        size="xs"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-0.5">
                  <span className="block font-extrabold text-slate-800">
                    Lactancia Materna
                  </span>
                  {(
                    [
                      ["no hubo", "red"],
                      ["< 6 meses", "yellow"],
                      ["6 meses o más", "white"],
                      ["No aplica", "white"],
                    ] as const
                  ).map(([opt, v]) => (
                    <div
                      key={opt}
                      className="flex items-center justify-between"
                    >
                      <span>{opt}</span>
                      <MinsaCheckBox
                        checked={baseline.breastfeedingMonths === opt}
                        variant={v}
                        size="xs"
                      />
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-0.5">
                    <span className="block font-bold text-slate-800">
                      Lugar del parto:
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-0.5">
                        EESS{" "}
                        <MinsaCheckBox
                          checked={baseline.deliveryPlace === "EESS"}
                          variant="white"
                          size="xs"
                        />
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        Domic.{" "}
                        <MinsaCheckBox
                          checked={baseline.deliveryPlace === "Domic."}
                          variant="yellow"
                          size="xs"
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-0.5">
                <span className="inline-flex items-center gap-1 font-bold">
                  Captada: Sí{" "}
                  <MinsaCheckBox
                    checked={baseline.pregnancyCaptured === true}
                    variant="white"
                    size="xs"
                  />{" "}
                  No{" "}
                  <MinsaCheckBox
                    checked={baseline.pregnancyCaptured === false}
                    variant="white"
                    size="xs"
                  />
                </span>
                <span className="inline-flex items-center gap-1 font-bold">
                  Referida x Ag. Comuni: Sí{" "}
                  <MinsaCheckBox
                    checked={baseline.communityAgentReferred === true}
                    variant="white"
                    size="xs"
                  />{" "}
                  No{" "}
                  <MinsaCheckBox
                    checked={baseline.communityAgentReferred === false}
                    variant="white"
                    size="xs"
                  />
                </span>
              </div>
            </div>
          </div>

          {/* 4. ANTECEDENTES FAMILIARES (13), PERSONALES (27) & VACUNAS PREVIAS (4) */}
          <div className="grid grid-cols-12 gap-1.5 text-[7px] leading-tight">
            {/* Antecedentes Familiares (4 cols) - Todos los 13 ítems visibles */}
            <div className="col-span-4 rounded border border-slate-400 bg-white p-1.5">
              <div className="mb-1 border-b border-slate-200 pb-0.5">
                <span className="bg-slate-200 px-1.5 py-0.2 font-extrabold text-slate-900 uppercase">
                  Antecedentes Familiares
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <div className="space-y-0.5">
                  {MINSA_FAMILY_HISTORY_COL1.map((item) => {
                    const checked = baseline.familyHistory.includes(item.id);
                    const rel = baseline.familyHistoryDetails?.[item.id];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-0.5"
                      >
                        <span
                          className={cn(
                            "truncate",
                            checked && item.isAlert && "font-extrabold text-slate-950"
                          )}
                        >
                          {item.label}
                          {checked && rel ? ` (${rel})` : ""}
                        </span>
                        <MinsaCheckBox
                          checked={checked}
                          variant={item.isAlert ? "yellow" : "white"}
                          size="xs"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-0.5">
                  {MINSA_FAMILY_HISTORY_COL2.map((item) => {
                    const checked = baseline.familyHistory.includes(item.id);
                    const rel = baseline.familyHistoryDetails?.[item.id];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-0.5"
                      >
                        <span
                          className={cn(
                            "truncate",
                            checked && item.isAlert && "font-extrabold text-slate-950"
                          )}
                        >
                          {item.label}
                          {checked && rel ? ` (${rel})` : ""}
                        </span>
                        <MinsaCheckBox
                          checked={checked}
                          variant={item.isAlert ? "yellow" : "white"}
                          size="xs"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              {baseline.familyHistoryOther ? (
                <div className="mt-0.5 truncate border-t border-slate-200 pt-0.5 text-[6.8px] text-slate-700">
                  Otros: <strong>{baseline.familyHistoryOther}</strong>
                </div>
              ) : null}
            </div>

            {/* Antecedentes Personales (6 cols) - Todos los 27 ítems visibles en 3 columnas */}
            <div className="col-span-6 rounded border border-slate-400 bg-white p-1.5">
              <div className="mb-1 border-b border-slate-200 pb-0.5">
                <span className="bg-slate-200 px-1.5 py-0.2 font-extrabold text-slate-900 uppercase">
                  Antecedentes Personales
                </span>
              </div>
              <div className="grid grid-cols-3 gap-x-1.5 gap-y-0.5">
                {[
                  MINSA_PERSONAL_HISTORY_COL1,
                  MINSA_PERSONAL_HISTORY_COL2,
                  MINSA_PERSONAL_HISTORY_COL3,
                ].map((col, colIdx) => (
                  <div key={colIdx} className="space-y-0.5">
                    {col.map((item) => {
                      const checked = baseline.personalHistory.includes(item.id);
                      const detail = baseline.personalHistoryDetails?.[item.id];
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-0.5"
                        >
                          <span
                            className={cn(
                              "truncate",
                              checked &&
                                item.severity !== "none" &&
                                "font-extrabold text-slate-950"
                            )}
                          >
                            {item.label}
                            {checked && detail ? ` (${detail})` : ""}
                          </span>
                          <MinsaCheckBox
                            checked={checked}
                            variant={
                              item.severity === "continuous"
                                ? "red"
                                : item.severity === "alert"
                                  ? "yellow"
                                  : "white"
                            }
                            size="xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Vacunas Previas (2 cols) */}
            <div className="col-span-2 rounded border border-slate-400 bg-white p-1.5">
              <div className="mb-1 border-b border-slate-200 pb-0.5">
                <span className="bg-slate-200 px-1 py-0.2 font-extrabold text-slate-900 uppercase">
                  Vac. Previas
                </span>
              </div>
              <div className="space-y-1">
                {(
                  [
                    ["rubella", "Rubeola"],
                    ["hepatitisB", "Hepatitis B"],
                    ["hpv", "Papiloma Virus"],
                    ["yellowFever", "Fiebre Amarilla"],
                  ] as const
                ).map(([key, label]) => {
                  const isYes = baseline.previousVaccines[key] === true;
                  return (
                    <div key={key} className="border-b border-slate-100 pb-0.5">
                      <span className="block font-bold text-slate-800">
                        {label}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-0.5">
                          Sí{" "}
                          <MinsaCheckBox
                            checked={isYes}
                            variant="white"
                            size="xs"
                          />
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          No{" "}
                          <MinsaCheckBox
                            checked={!isYes}
                            variant="white"
                            size="xs"
                          />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. PESO Y TALLA + ANTITETÁNICA + TIPO DE SANGRE + FUMA / DROGAS */}
          <div className="grid grid-cols-12 gap-1.5 text-[7.3px]">
            {/* Peso y Talla (3 cols) */}
            <div className="col-span-3 rounded border border-slate-400 bg-white p-1.5">
              <span className="mb-0.5 block bg-slate-200 px-1 py-0.2 font-extrabold text-slate-900 uppercase">
                Peso y Talla (Pregestacional)
              </span>
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Peso Habitual:</span>
                  <strong className="rounded border border-slate-400 bg-slate-50 px-1.5 py-0.2 text-[8.5px]">
                    {baseline.usualWeightKg} kg
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Talla:</span>
                  <strong className="rounded border border-slate-400 bg-slate-50 px-1.5 py-0.2 text-[8.5px]">
                    {baseline.heightCm} cm
                  </strong>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-0.5 text-[6.8px]">
                  <span className="text-slate-600">IMC Basal:</span>
                  <strong>{basalBmi} kg/m²</strong>
                </div>
              </div>
            </div>

            {/* Antitetánica (3 cols) */}
            <div className="col-span-3 rounded border border-slate-400 bg-white p-1.5">
              <span className="mb-0.5 block bg-slate-200 px-1 py-0.2 font-extrabold text-slate-900 uppercase">
                Antitetánica
              </span>
              <div className="grid grid-cols-12 items-center gap-1 pt-0.5">
                <div className="col-span-4 text-center">
                  <span className="block text-[6.5px] font-bold">
                    N° Dosis Previa
                  </span>
                  <strong className="inline-block rounded border border-slate-400 bg-slate-50 px-2 py-0.5 text-[8.5px]">
                    {baseline.antitetanicaPrevDoses}
                  </strong>
                </div>
                <div className="col-span-5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">1ra:</span>
                    <span className="rounded border border-slate-300 px-1">
                      {baseline.antitetanica1stDoseMonth || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">2da:</span>
                    <span className="rounded border border-slate-300 px-1">
                      {baseline.antitetanica2ndDoseMonth || "—"}
                    </span>
                  </div>
                </div>
                <div className="col-span-3 space-y-0.5 text-center text-[6.5px]">
                  <div>
                    <span className="block">Sin dosis</span>
                    <MinsaCheckBox
                      checked={baseline.antitetanicaStatus === "Sin dosis"}
                      variant="yellow"
                      size="xs"
                    />
                  </div>
                  <div>
                    <span className="block">No Aplica</span>
                    <MinsaCheckBox
                      checked={baseline.antitetanicaStatus === "No Aplica"}
                      variant="white"
                      size="xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tipo de Sangre (4 cols) */}
            <div className="col-span-4 rounded border border-slate-400 bg-white p-1.5">
              <span className="mb-0.5 block bg-slate-200 px-1 py-0.2 font-extrabold text-slate-900 uppercase">
                Tipo de Sangre
              </span>
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Grupo:</span>
                  {(["A", "B", "AB", "O"] as const).map((grp) => (
                    <span key={grp} className="inline-flex items-center gap-0.5 font-bold">
                      {grp}{" "}
                      <MinsaCheckBox
                        checked={baseline.bloodGroup === grp}
                        variant="white"
                        size="xs"
                      />
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 pt-0.5 text-[6.6px]">
                  <span className="font-bold">Rh:</span>
                  <span className="inline-flex items-center gap-0.5">
                    Rh(+)
                    <MinsaCheckBox
                      checked={baseline.rhFactor === "Rh (+)"}
                      variant="white"
                      size="xs"
                    />
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    Rh(-) Desc
                    <MinsaCheckBox
                      checked={baseline.rhFactor === "Rh (-) Desconocida"}
                      variant="yellow"
                      size="xs"
                    />
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    Rh(-) No Sen
                    <MinsaCheckBox
                      checked={baseline.rhFactor === "Rh (-) No Sensibilizada"}
                      variant="yellow"
                      size="xs"
                    />
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    Rh(-) Sen
                    <MinsaCheckBox
                      checked={baseline.rhFactor === "Rh (-) Sensibilizada"}
                      variant="red"
                      size="xs"
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Fuma & Drogas (2 cols) */}
            <div className="col-span-2 flex flex-col justify-between rounded border border-slate-400 bg-white p-1.5">
              <div>
                <span className="block bg-slate-200 px-1 py-0.2 font-extrabold text-slate-900 uppercase">
                  Fuma
                </span>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[6.5px]">N° Cig/día:</span>
                  <strong className="rounded border border-slate-400 px-1.5">
                    {baseline.smokerCigarettesDay}
                  </strong>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-0.5">
                <span className="block bg-slate-200 px-1 py-0.2 font-extrabold text-slate-900 uppercase">
                  Drogas
                </span>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-0.5">
                    Sí{" "}
                    <MinsaCheckBox
                      checked={baseline.drugsUse === true}
                      variant="yellow"
                      size="xs"
                    />
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    No{" "}
                    <MinsaCheckBox
                      checked={baseline.drugsUse === false}
                      variant="white"
                      size="xs"
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. FECHA ÚLTIMA MENSTRUACIÓN (FUM / FPP) + HOSPITALIZACIÓN + EMERGENCIA */}
          <div className="grid grid-cols-12 gap-1.5 text-[7.3px]">
            {/* FUM, Eco Precoz & FPP (5 cols) */}
            <div className="col-span-5 rounded border border-slate-400 bg-white p-1.5">
              <span className="mb-0.5 block bg-slate-200 px-1.5 py-0.2 font-extrabold text-slate-900 uppercase">
                Fecha Última Menstruación & Regla de Naegele
              </span>
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>FUM:</strong>{" "}
                    <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.2 font-extrabold">
                      {baseline.fum ? formatPeruDateDisplay(baseline.fum) : "—"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <strong>Duda:</strong> Sí{" "}
                    <MinsaCheckBox
                      checked={baseline.fumDoubt === true}
                      variant="yellow"
                      size="xs"
                    />{" "}
                    No{" "}
                    <MinsaCheckBox
                      checked={baseline.fumDoubt === false}
                      variant="white"
                      size="xs"
                    />
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-0.5">
                  <span>
                    <strong>EG. (Ecografía):</strong>{" "}
                    <span className="rounded border border-slate-300 px-1 font-extrabold">
                      {!baseline.ultrasoundNoApplies &&
                      baseline.ultrasoundGestationalAgeWeeks > 0
                        ? `${baseline.ultrasoundGestationalAgeWeeks} Sem.`
                        : "—"}
                    </span>{" "}
                    Fecha:{" "}
                    <strong>
                      {baseline.ultrasoundDate
                        ? formatShortDate(baseline.ultrasoundDate)
                        : "  /  /  "}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    No Aplica{" "}
                    <MinsaCheckBox
                      checked={baseline.ultrasoundNoApplies}
                      variant="white"
                      size="xs"
                    />
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-0.5">
                  <span className="font-extrabold text-primary">
                    Fecha Probable de Parto (FPP):
                  </span>
                  <strong className="rounded bg-primary px-2 py-0.5 text-[8.5px] font-extrabold text-white">
                    {baseline.fpp ? formatPeruDateDisplay(baseline.fpp) : "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Hospitalización (4 cols) */}
            <div className="col-span-4 rounded border border-slate-400 bg-white p-1.5">
              <div className="mb-0.5 flex items-center justify-between bg-slate-200 px-1.5 py-0.2">
                <span className="font-extrabold text-slate-900 uppercase">
                  Hospitalización
                </span>
                <span className="inline-flex items-center gap-1">
                  Sí{" "}
                  <MinsaCheckBox
                    checked={baseline.hospitalized === true}
                    variant="yellow"
                    size="xs"
                  />{" "}
                  No{" "}
                  <MinsaCheckBox
                    checked={baseline.hospitalized === false}
                    variant="white"
                    size="xs"
                  />
                </span>
              </div>
              <div className="space-y-0.5 pt-0.5">
                <div>
                  Fecha:{" "}
                  <strong>
                    {baseline.hospitalizationHistory?.date
                      ? formatShortDate(baseline.hospitalizationHistory.date)
                      : "  /  /  "}
                  </strong>
                </div>
                <div className="truncate">
                  Diagnóstico:{" "}
                  <strong>
                    {baseline.hospitalizationHistory?.diagnosis || "—"}
                  </strong>
                </div>
                <div>
                  CIE 10:{" "}
                  <strong className="rounded border border-slate-300 px-1">
                    {baseline.hospitalizationHistory?.cie10 || "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Emergencia (3 cols) */}
            <div className="col-span-3 rounded border border-slate-400 bg-white p-1.5">
              <div className="mb-0.5 flex items-center justify-between bg-slate-200 px-1.5 py-0.2">
                <span className="font-extrabold text-slate-900 uppercase">
                  Emergencia
                </span>
                <MinsaCheckBox
                  checked={baseline.hadEmergency === true}
                  variant="yellow"
                  size="xs"
                />
              </div>
              <div className="space-y-0.5 pt-0.5">
                <div>
                  Fecha:{" "}
                  <strong>
                    {baseline.emergencyHistory?.date
                      ? formatShortDate(baseline.emergencyHistory.date)
                      : "  /  /  "}
                  </strong>
                </div>
                <div className="truncate">
                  Dx:{" "}
                  <strong>
                    {baseline.emergencyHistory?.diagnosis || "—"}
                  </strong>
                </div>
                <div>
                  CIE 10:{" "}
                  <strong className="rounded border border-slate-300 px-1">
                    {baseline.emergencyHistory?.cie10 || "—"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 7. VIOLENCIA/GÉNERO + EXAMEN FÍSICO BASAL + EXÁMENES DE LABORATORIO (3 TRIMESTRES & ESPECIALES) */}
          <div className="grid grid-cols-12 gap-1.5 text-[7px] leading-tight">
            {/* Columna Izquierda: Violencia / Género + Examen Físico (3 cols) */}
            <div className="col-span-3 flex flex-col justify-between space-y-1.5">
              {/* Violencia / Género */}
              <div className="rounded border border-slate-400 bg-white p-1.5">
                <span className="mb-0.5 block bg-slate-200 px-1.5 py-0.2 font-extrabold text-slate-900 uppercase">
                  Violencia / Género
                </span>
                <div className="space-y-0.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Ficha Tamizaje:</span>
                    <span className="inline-flex items-center gap-1">
                      Sí{" "}
                      <MinsaCheckBox
                        checked={
                          baseline.violenceScreening?.screeningDone === true
                        }
                        variant="white"
                        size="xs"
                      />{" "}
                      No{" "}
                      <MinsaCheckBox
                        checked={
                          baseline.violenceScreening?.screeningDone === false
                        }
                        variant="yellow"
                        size="xs"
                      />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Violencia:</span>
                    <span className="inline-flex items-center gap-1">
                      Sí{" "}
                      <MinsaCheckBox
                        checked={
                          baseline.violenceScreening?.violenceDetected === true
                        }
                        variant="yellow"
                        size="xs"
                      />{" "}
                      No{" "}
                      <MinsaCheckBox
                        checked={
                          baseline.violenceScreening?.violenceDetected === false
                        }
                        variant="white"
                        size="xs"
                      />
                    </span>
                  </div>
                  <div>
                    Fecha:{" "}
                    <strong>
                      {baseline.violenceScreening?.date
                        ? formatShortDate(baseline.violenceScreening.date)
                        : "  /  /  "}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Examen Físico Basal */}
              <div className="flex-1 rounded border border-slate-400 bg-white p-1.5">
                <span className="mb-0.5 block bg-slate-200 px-1.5 py-0.2 font-extrabold text-slate-900 uppercase">
                  Examen Físico
                </span>
                <table className="w-full text-[6.8px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-0.5 text-left">Área</th>
                      <th className="py-0.5 text-center">Sin Ex.</th>
                      <th className="py-0.5 text-center">Normal</th>
                      <th className="py-0.5 text-center">Patol.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(
                      [
                        ["Clínico:", baseline.clinicalExam],
                        ["Mamas:", baseline.breastsExam],
                        ["Cuello Uterino:", baseline.cervixExam],
                        ["Pelvis:", baseline.pelvisExam],
                        ["Odont.:", baseline.dentalExam],
                      ] as const
                    ).map(([label, val]) => (
                      <tr key={label}>
                        <td className="py-0.5 font-bold text-slate-800">
                          {label}
                        </td>
                        <td className="py-0.5 text-center">
                          <MinsaCheckBox
                            checked={val === "Sin Examen"}
                            variant="yellow"
                            size="xs"
                          />
                        </td>
                        <td className="py-0.5 text-center">
                          <MinsaCheckBox
                            checked={val === "Normal"}
                            variant="white"
                            size="xs"
                          />
                        </td>
                        <td className="py-0.5 text-center">
                          <MinsaCheckBox
                            checked={val === "Patológico"}
                            variant="yellow"
                            size="xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Columna Derecha: Exámenes de Laboratorio MINSA (9 cols) */}
            <div className="col-span-9 rounded border border-slate-400 bg-white p-1.5">
              <div className="mb-0.5 flex items-center justify-between bg-slate-200 px-1.5 py-0.2">
                <span className="font-extrabold text-slate-900 uppercase">
                  Exámenes de Laboratorio (Control Seriado 3 Trimestres & Tamizaje MINSA)
                </span>
                <span className="text-[6.8px] font-bold text-slate-700">
                  1° Trimestre • 2° Trimestre • 3° Trimestre / Alta
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2">
                {/* Mitad Izquierda de Laboratorio: Hb, Glicemia, Sífilis, VIH (6 cols) */}
                <div className="col-span-6 space-y-1 border-r border-slate-200 pr-1.5">
                  {/* Hemoglobina (1, 2, 3, Alta) */}
                  <table className="w-full text-[6.8px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="text-left">Hemoglobina</th>
                        <th className="text-center">Hg (g/dL)</th>
                        <th className="text-center">No se Hizo</th>
                        <th className="text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          [
                            "Hemoglobina 1 (1°T):",
                            baseline.hemoglobin1,
                            baseline.hemoglobin1NotDone,
                            baseline.hemoglobin1Date,
                          ],
                          [
                            "Hemoglobina 2 (2°T):",
                            baseline.hemoglobin2,
                            baseline.hemoglobin2NotDone,
                            baseline.hemoglobin2Date,
                          ],
                          [
                            "Hemoglobina 3 (3°T):",
                            baseline.hemoglobin3,
                            baseline.hemoglobin3NotDone,
                            baseline.hemoglobin3Date,
                          ],
                          [
                            "Hemogl. al Alta:",
                            baseline.hemoglobinDischarge,
                            baseline.hemoglobinDischargeNotDone,
                            baseline.hemoglobinDischargeDate,
                          ],
                        ] as const
                      ).map(([lbl, val, notDone, dt]) => (
                        <tr key={lbl} className="border-b border-slate-100">
                          <td className="py-[1px] font-bold text-slate-800">
                            {lbl}
                          </td>
                          <td className="py-[1px] text-center">
                            <span
                              className={cn(
                                "inline-block min-w-[34px] rounded border px-1 font-extrabold",
                                typeof val === "number" && val < 11
                                  ? "border-amber-600 bg-amber-200 text-slate-950"
                                  : "border-slate-300 bg-slate-50"
                              )}
                            >
                              {!notDone && typeof val === "number"
                                ? val.toFixed(1)
                                : "—"}
                            </span>
                          </td>
                          <td className="py-[1px] text-center">
                            <MinsaCheckBox
                              checked={Boolean(notDone)}
                              variant="yellow"
                              size="xs"
                            />
                          </td>
                          <td className="py-[1px] text-right text-slate-700">
                            {dt ? formatShortDate(dt) : "  /  /  "}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Glicemia 1, 2, 3 & Tolerancia */}
                  <table className="w-full text-[6.8px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="text-left">Glicemia (mg/dL)</th>
                        <th className="text-center">Norm</th>
                        <th className="text-center">Anorm</th>
                        <th className="text-center">NSH</th>
                        <th className="text-center">NA</th>
                        <th className="text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          [
                            "Glicemia 1 (1°T):",
                            baseline.glucose1Result,
                            baseline.glucose1Value,
                            baseline.glucose1Date,
                          ],
                          [
                            "Glicemia 2 (2°T):",
                            baseline.glucose2Result,
                            baseline.glucose2Value,
                            baseline.glucose2Date,
                          ],
                          [
                            "Glicemia 3 (3°T):",
                            baseline.glucose3Result,
                            baseline.glucose3Value,
                            baseline.glucose3Date,
                          ],
                          [
                            "Tolerancia Gluc.:",
                            baseline.glucoseToleranceResult,
                            baseline.glucoseToleranceValue,
                            baseline.glucoseToleranceDate,
                          ],
                        ] as const
                      ).map(([lbl, res, num, dt]) => (
                        <tr key={lbl} className="border-b border-slate-100">
                          <td className="py-[1px] font-bold text-slate-800">
                            {lbl}{" "}
                            {typeof num === "number" ? `(${num})` : ""}
                          </td>
                          <td className="text-center">
                            <MinsaCheckBox
                              checked={res === "Normal"}
                              variant="white"
                              size="xs"
                            />
                          </td>
                          <td className="text-center">
                            <MinsaCheckBox
                              checked={res === "Anormal"}
                              variant="yellow"
                              size="xs"
                            />
                          </td>
                          <td className="text-center">
                            <MinsaCheckBox
                              checked={res === "No se Hizo"}
                              variant="yellow"
                              size="xs"
                            />
                          </td>
                          <td className="text-center">
                            <MinsaCheckBox
                              checked={res === "No Aplica"}
                              variant="white"
                              size="xs"
                            />
                          </td>
                          <td className="text-right text-slate-700">
                            {dt ? formatShortDate(dt) : "  /  /  "}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Sífilis y VIH (3 Trimestres + Confirmatorias) */}
                  <table className="w-full text-[6.7px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="text-left">Serología Sífilis / VIH</th>
                        <th className="text-center">No Reac</th>
                        <th className="text-center">React</th>
                        <th className="text-center">NSH</th>
                        <th className="text-center">NA</th>
                        <th className="text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          [
                            "VDRL/RPR 1 (1°T):",
                            baseline.vdrlRpr1Result,
                            baseline.vdrlRpr1Date,
                          ],
                          [
                            "VDRL/RPR 2 (2°T):",
                            baseline.vdrlRpr2Result,
                            baseline.vdrlRpr2Date,
                          ],
                          [
                            "VDRL/RPR 3 (3°T):",
                            baseline.vdrlRpr3Result,
                            baseline.vdrlRpr3Date,
                          ],
                          [
                            "P. Ráp. Sífilis:",
                            baseline.rapidSyphilisResult,
                            baseline.rapidSyphilisDate,
                          ],
                          [
                            "FTA Abs / TPHA:",
                            baseline.ftaAbsResult !== "No Aplica"
                              ? baseline.ftaAbsResult
                              : baseline.tphaResult,
                            baseline.ftaAbsDate || baseline.tphaDate,
                          ],
                          [
                            "VIH P. Ráp. 1 (1°T):",
                            baseline.hivRapid1Result,
                            baseline.hivRapid1Date,
                          ],
                          [
                            "VIH P. Ráp. 2 (2°T):",
                            baseline.hivRapid2Result,
                            baseline.hivRapid2Date,
                          ],
                          [
                            "VIH P. Ráp. 3 (3°T):",
                            baseline.hivRapid3Result,
                            baseline.hivRapid3Date,
                          ],
                          [
                            "VIH ELISA:",
                            baseline.hivElisaResult,
                            baseline.hivElisaDate,
                          ],
                        ] as const
                      ).map(([lbl, res, dt]) => (
                        <tr key={lbl} className="border-b border-slate-100">
                          <td className="py-[1px] font-bold text-slate-800">
                            {lbl}
                          </td>
                          <td className="text-center">
                            <MinsaCheckBox
                              checked={res === "No reactivo"}
                              variant="white"
                              size="xs"
                            />
                          </td>
                          <td className="text-center">
                            <MinsaCheckBox
                              checked={res === "Reactivo"}
                              variant="yellow"
                              size="xs"
                            />
                          </td>
                          <td className="text-center">
                            <MinsaCheckBox
                              checked={res === "No se Hizo"}
                              variant="yellow"
                              size="xs"
                            />
                          </td>
                          <td className="text-center">
                            <MinsaCheckBox
                              checked={res === "No Aplica"}
                              variant="white"
                              size="xs"
                            />
                          </td>
                          <td className="text-right text-slate-700">
                            {dt ? formatShortDate(dt) : "  /  /  "}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mitad Derecha de Laboratorio: Infecciones, Orina (1/2/3), Urocultivo (1/2/3), PAP/IVAA/Colpo (6 cols) */}
                <div className="col-span-6">
                  <table className="w-full text-[6.7px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="text-left">Prueba Tamizaje</th>
                        <th className="text-center">Neg/Norm</th>
                        <th className="text-center">Pos/Anor</th>
                        <th className="text-center">NSH</th>
                        <th className="text-center">NA</th>
                        <th className="text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderSpecialLabRightRow(
                        "IFI / Western Blot:",
                        baseline.westernBlotResult,
                        baseline.westernBlotDate
                      )}
                      {renderSpecialLabRightRow(
                        "HTLV 1:",
                        baseline.htlv1Result,
                        baseline.htlv1Date
                      )}
                      {renderSpecialLabRightRow(
                        "TORCH:",
                        baseline.torchResult,
                        baseline.torchDate
                      )}
                      {renderSpecialLabRightRow(
                        "Gota Gruesa / Malaria:",
                        baseline.thickBloodSmearResult !== "No Aplica"
                          ? baseline.thickBloodSmearResult
                          : baseline.malariaRapidResult,
                        baseline.thickBloodSmearDate || baseline.malariaRapidDate
                      )}
                      {renderSpecialLabRightRow(
                        "Ex. Comp. Orina 1°T:",
                        baseline.completeUrineExamResult,
                        baseline.completeUrineExamDate
                      )}
                      {renderSpecialLabRightRow(
                        "Ex. Comp. Orina 2°T:",
                        baseline.completeUrineExam2Result,
                        baseline.completeUrineExam2Date
                      )}
                      {renderSpecialLabRightRow(
                        "Ex. Comp. Orina 3°T:",
                        baseline.completeUrineExam3Result,
                        baseline.completeUrineExam3Date
                      )}
                      {renderSpecialLabRightRow(
                        "Leucocituria / Nitritos:",
                        baseline.leukocyturiaResult === "Positivo" ||
                          baseline.nitritesResult === "Positivo"
                          ? "Positivo"
                          : baseline.leukocyturiaResult,
                        baseline.nitritesDate || baseline.leukocyturiaDate
                      )}
                      {renderSpecialLabRightRow(
                        "Urocultivo 1°T:",
                        baseline.urineCultureResult,
                        baseline.urineCultureDate
                      )}
                      {renderSpecialLabRightRow(
                        "Urocultivo 2°T:",
                        baseline.urineCulture2Result,
                        baseline.urineCulture2Date
                      )}
                      {renderSpecialLabRightRow(
                        "Urocultivo 3°T:",
                        baseline.urineCulture3Result,
                        baseline.urineCulture3Date
                      )}
                      {renderSpecialLabRightRow(
                        "BK Esputo / Listeria:",
                        baseline.bkSputumResult !== "No Aplica"
                          ? baseline.bkSputumResult
                          : baseline.listeriaResult,
                        baseline.bkSputumDate || baseline.listeriaDate
                      )}
                      {renderSpecialLabRightRow(
                        "Tamizaje Hepatitis B:",
                        baseline.hepatitisBResult,
                        baseline.hepatitisBDate
                      )}
                      {renderSpecialLabRightRow(
                        "PAP Cervical:",
                        baseline.papTestResult,
                        baseline.papTestDate,
                        "norm_anorm"
                      )}
                      {renderSpecialLabRightRow(
                        "IVAA Cervical:",
                        baseline.ivaaResult,
                        baseline.ivaaDate,
                        "norm_anorm"
                      )}
                      {renderSpecialLabRightRow(
                        "Colposcopia:",
                        baseline.colposcopyResult,
                        baseline.colposcopyDate,
                        "norm_anorm"
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie Página 1 */}
        <div className="shrink-0 space-y-1 pt-1">
          <div className="flex items-end justify-between border-t border-slate-200 pt-1 text-[7.5px]">
            <div className="text-slate-600">
              <p className="font-bold text-slate-800">
                CARNET DE ATENCIÓN MATERNO PERINATAL MINSA / CLAP (ANVERSO • PÁG. 1/2)
              </p>
              <p>
                Clasificación actual:{" "}
                <strong
                  className={
                    risks.isHighRisk ? "text-red-700" : "text-emerald-700"
                  }
                >
                  {risks.riskCategory}
                </strong>{" "}
                ({risks.alertCount} alerta[s], {risks.continuousCount} seg.
                continuo)
              </p>
            </div>
            <CendoSignatureBlock
              doctorName={`DR. ${doctorCleanName.toUpperCase()}`}
              doctorSpecialty="GINECOLOGÍA Y OBSTETRICIA - MEDICINA MATERNO FETAL"
              doctorCredentials={`CMP ${card.doctorCmp || "61693"} • RNE ${card.doctorRne || "38657"}`}
              signatureSrc={resolvedSignatureSrc}
              showDigitalSignature={resolvedShowDigitalSignature}
              align="right"
              compact
            />
          </div>
          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
          />
        </div>
      </div>

      {/* =====================================================================
          PÁGINA 2: REVERSO (MATRIZ DE 9 ATENCIONES, PATOLOGÍAS & REFERENCIAS)
          ===================================================================== */}
      <div className="page-sheet box-border flex min-h-[297mm] max-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-[6mm_10mm_4mm_10mm] font-sans shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-1.5">
          {/* 1. Cabecera Reverso + Citas de Control + Signos de Alarma (Fiel a reverso.jpeg) */}
          <div className="grid grid-cols-12 gap-1.5 rounded border border-slate-400 bg-slate-50/50 p-1.5 text-[7.5px]">
            <div className="col-span-5 flex flex-col justify-between border-r border-slate-300 pr-2">
              <div className="flex items-center gap-1.5">
                <BrandLogo size="sm" showText={false} />
                <div>
                  <span className="block text-[9.5px] font-extrabold text-primary uppercase">
                    CARNET DE ATENCIÓN PRENATAL (REVERSO • PÁG. 2/2)
                  </span>
                  <span className="text-[7px] font-bold text-slate-600">
                    ESTABLECIMIENTO: {card.clinicEstablishment}
                  </span>
                </div>
              </div>
              <div className="mt-1 space-y-0.5 border-t border-slate-200 pt-1">
                <div>
                  <span className="font-bold text-slate-600">
                    APELLIDOS Y NOMBRES:{" "}
                  </span>
                  <strong className="text-[9px] font-extrabold text-slate-950">
                    {patient.fullName}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    <span className="font-bold text-slate-600">N° HC / DNI: </span>
                    <strong className="rounded border border-slate-400 bg-white px-1.5 py-0.2 font-extrabold">
                      {baseline.hcNumber || patient.documentNumber}
                    </strong>
                  </span>
                  <span>
                    <span className="font-bold text-slate-600">FPP: </span>
                    <strong className="text-primary">
                      {baseline.fpp ? formatPeruDateDisplay(baseline.fpp) : "—"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Cita de Control */}
            <div className="col-span-3 flex flex-col justify-between border-r border-slate-300 pr-2">
              <span className="block bg-slate-200 px-1 py-0.2 text-center font-extrabold text-slate-900 uppercase">
                CITA DE CONTROL • CUMPLA CON LAS CITAS
              </span>
              <div className="grid grid-cols-3 gap-0.5 text-center text-[7px]">
                {visits.slice(-3).map((v) => (
                  <div
                    key={v.visitNumber}
                    className="rounded border border-slate-300 bg-white p-0.5"
                  >
                    <span className="block text-[6px] text-slate-500">
                      Próx. Cita ({v.visitNumber}°)
                    </span>
                    <strong className="font-extrabold text-slate-900">
                      {v.nextAppointmentDate
                        ? formatShortDate(v.nextAppointmentDate)
                        : "—"}
                    </strong>
                  </div>
                ))}
                {visits.length === 0 ? (
                  <div className="col-span-3 rounded border border-slate-300 bg-white p-1 text-slate-500">
                    Citas programadas en matriz inferior
                  </div>
                ) : null}
              </div>
              <div
                className={cn(
                  "rounded border px-1.5 py-0.5 text-center text-[7px] font-extrabold uppercase",
                  risks.isHighRisk
                    ? "border-red-400 bg-red-100 text-red-900"
                    : "border-emerald-400 bg-emerald-100 text-emerald-900"
                )}
              >
                {risks.riskCategory}
              </div>
            </div>

            {/* Signos de Alarma (Idéntico a reverso.jpeg) */}
            <div className="col-span-4 rounded border border-red-300 bg-red-50/70 p-1 text-[6.8px] text-red-950">
              <span className="block font-extrabold text-red-900 uppercase">
                ⚠️ SIGNOS DE ALARMA (Acudir a Emergencia):
              </span>
              <ul className="mt-0.5 grid grid-cols-2 gap-x-1 gap-y-0.2 leading-tight">
                <li>• Vómito exagerado</li>
                <li>• Sangre o líquido vaginal</li>
                <li>• Fiebre o escalofríos</li>
                <li>• Hinchazón de manos/cara/pies</li>
                <li>• Disminución mov. fetales</li>
                <li>• Contracciones antes de tiempo</li>
                <li className="col-span-2">
                  • Dolor de cabeza intenso o visión borrosa
                </li>
              </ul>
            </div>
          </div>

          {/* 2. MATRIZ OFICIAL DE 9 ATENCIONES PRENATALES (28 FILAS MINSA) */}
          <div className="overflow-hidden rounded border border-slate-400">
            <table className="w-full border-collapse font-sans text-[7.1px] leading-tight">
              <thead>
                <tr className="border-b border-slate-400 bg-slate-200 text-slate-900">
                  <th className="w-[44mm] border-r border-slate-400 px-1.5 py-1 text-left font-extrabold uppercase">
                    ATENCIONES PRENATALES
                  </th>
                  {visitColumns.map((v, idx) => (
                    <th
                      key={idx}
                      className={cn(
                        "border-r border-slate-400 px-1 py-1 text-center font-extrabold uppercase last:border-r-0",
                        v ? "bg-primary/15 text-primary" : "text-slate-700"
                      )}
                    >
                      ATENCIÓN {idx + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-slate-900">
                {/* 1. Fecha y Hora atención */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Fecha y Hora atención (d/m/a)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0"
                    >
                      {v
                        ? `${formatShortDate(v.visitDate)}${v.visitTime ? ` ${v.visitTime}` : ""}`
                        : "   /   /   "}
                    </td>
                  ))}
                </tr>

                {/* 2. Edad Gest. (semanas) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Edad Gest. (semanas)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center font-extrabold text-primary last:border-r-0"
                    >
                      {v
                        ? `${v.gestationalAgeWeeks}s${v.gestationalAgeDays ? ` ${v.gestationalAgeDays}d` : ""}`
                        : ""}
                    </td>
                  ))}
                </tr>

                {/* 3. Peso madre (kg) - Con triángulo amarillo MINSA */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Peso madre (kg)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="relative border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0"
                    >
                      <span className="pointer-events-none absolute top-0 right-0 size-0 border-t-[7px] border-l-[7px] border-t-amber-400 border-l-transparent" />
                      {v && v.maternalWeightKg > 0
                        ? `${v.maternalWeightKg} kg`
                        : ""}
                    </td>
                  ))}
                </tr>

                {/* 4. Temperatura (°C) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Temperatura (° C)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v && v.temperature > 0 ? `${v.temperature}°` : ""}
                    </td>
                  ))}
                </tr>

                {/* 5. Presión Arter. (mmHg) - Con triángulo amarillo MINSA */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Presión Arter. (mmHg)
                  </td>
                  {visitColumns.map((v, idx) => {
                    const [sys, dia] = (v?.bloodPressure || "")
                      .split("/")
                      .map((n) => parseInt(n || "0", 10));
                    const isHigh = sys >= 140 || dia >= 90;
                    return (
                      <td
                        key={idx}
                        className={cn(
                          "relative border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0",
                          isHigh && "bg-amber-200 text-red-900"
                        )}
                      >
                        <span className="pointer-events-none absolute top-0 right-0 size-0 border-t-[7px] border-l-[7px] border-t-amber-400 border-l-transparent" />
                        {v ? v.bloodPressure : ""}
                      </td>
                    );
                  })}
                </tr>

                {/* 6. Pulso Materno (por min) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Pulso Materno (por min)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v && v.maternalPulse > 0 ? v.maternalPulse : ""}
                    </td>
                  ))}
                </tr>

                {/* 7. Altura Uterina (cm) - Con triángulo amarillo MINSA */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Altura Uterina (cm)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="relative border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0"
                    >
                      <span className="pointer-events-none absolute top-0 right-0 size-0 border-t-[7px] border-l-[7px] border-t-amber-400 border-l-transparent" />
                      {v ? (v.uterineHeightCm > 0 ? `${v.uterineHeightCm}` : "NA") : ""}
                    </td>
                  ))}
                </tr>

                {/* 8. Situación (L/T/NA) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Situación (L / T / NA)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.fetusSituation : ""}
                    </td>
                  ))}
                </tr>

                {/* 9. Presentación (C/P/NA) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Presentación (C / P / NA)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.fetusPresentation : ""}
                    </td>
                  ))}
                </tr>

                {/* 10. Posición (D/I/NA) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Posición (D / I / NA)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.fetusPosition : ""}
                    </td>
                  ))}
                </tr>

                {/* 11. F.C.F. (por min./NA) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    F.C.F. (por min. / NA)
                  </td>
                  {visitColumns.map((v, idx) => {
                    const isAbnormal =
                      v &&
                      v.fetalHeartRate > 0 &&
                      (v.fetalHeartRate < 120 || v.fetalHeartRate > 160);
                    return (
                      <td
                        key={idx}
                        className={cn(
                          "border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0",
                          isAbnormal && "bg-amber-200 text-red-900"
                        )}
                      >
                        {v
                          ? v.fetalHeartRate > 0
                            ? v.fetalHeartRate
                            : "NA"
                          : ""}
                      </td>
                    );
                  })}
                </tr>

                {/* 12. Mov. Fetal (+/++/+++/SM/NA) - Con triángulo amarillo MINSA */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Mov. Fetal (+/++/+++/SM/NA)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className={cn(
                        "relative border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0",
                        v?.fetalMovements === "SM" && "bg-amber-200 text-red-900"
                      )}
                    >
                      <span className="pointer-events-none absolute top-0 right-0 size-0 border-t-[7px] border-l-[7px] border-t-amber-400 border-l-transparent" />
                      {v ? v.fetalMovements : ""}
                    </td>
                  ))}
                </tr>

                {/* 13. Proteinuria Cualitativa (+/++/+++/NSH) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Proteinuria Cualitativa (-/+/++/+++/NSH)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className={cn(
                        "border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0",
                        v &&
                          v.proteinuria !== "-" &&
                          v.proteinuria !== "NSH" &&
                          "bg-amber-200 font-bold text-red-900"
                      )}
                    >
                      {v ? v.proteinuria : ""}
                    </td>
                  ))}
                </tr>

                {/* 14. Edema (+/++/+++/SE) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Edema (+ / ++ / +++ / SE)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.edema : ""}
                    </td>
                  ))}
                </tr>

                {/* 15. Reflejo Osteotendinoso (0,+/++/+++) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Reflejo Osteotendinoso (0, +/++/+++)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.tendonReflex : ""}
                    </td>
                  ))}
                </tr>

                {/* 16. Examen de Pezón (Formado, No form/Sin Exam) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Examen de Pezón (Form/No form/Sin Ex)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.nippleExam : ""}
                    </td>
                  ))}
                </tr>

                {/* 17. Indic. Fierro / Ác. Fólico (≥ 14 Sem) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Indic. Fierro / Ác. Fólico (≥ 14 Sem)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0"
                    >
                      {v ? (v.ironFolicAcidGiven ? "Sí" : "No / NA") : ""}
                    </td>
                  ))}
                </tr>

                {/* 18. Indic. Calcio (≥ 20 Sem) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Indic. Calcio (≥ 20 Sem)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0"
                    >
                      {v ? (v.calciumGiven ? "Sí" : "No / NA") : ""}
                    </td>
                  ))}
                </tr>

                {/* 19. Indic. Ác. Fólico (Antes o 14 Sem) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Indic. Ác. Fólico (Antes o ≤ 14 Sem)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center font-bold last:border-r-0"
                    >
                      {v ? (v.folicAcidEarlyGiven ? "Sí" : "NA") : ""}
                    </td>
                  ))}
                </tr>

                {/* 20. Orient. Consej. (PF/ITS/NUT/Inm/VIH/TBC) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Orient. Consej. (PF/ITS/NUT/Inm/VIH)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="truncate border-r border-slate-300 px-0.5 py-[2px] text-center text-[6.5px] last:border-r-0"
                    >
                      {v ? v.counselingGiven || "Sí" : ""}
                    </td>
                  ))}
                </tr>

                {/* 21. EG de Eco. Control (Sem/No se hizo/NA) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    EG de Eco. Control (Sem / NSH / NA)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.ultrasoundGestationalAge || "NA" : ""}
                    </td>
                  ))}
                </tr>

                {/* 22. Perfil Biofísico (4,6,8,10 de 10/NSH/NA) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Perfil Biofísico (4,6,8,10/10 / NSH / NA)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.biophysicalProfileScore || "NA" : ""}
                    </td>
                  ))}
                </tr>

                {/* 23. Cita (d/m/a) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Cita (d/m/a)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center font-bold text-primary last:border-r-0"
                    >
                      {v && v.nextAppointmentDate
                        ? formatShortDate(v.nextAppointmentDate)
                        : ""}
                    </td>
                  ))}
                </tr>

                {/* 24. Visita domicil (Si/No/NA) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Visita domicil. (Sí / No / NA)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.homeVisit : ""}
                    </td>
                  ))}
                </tr>

                {/* 25. Plan Parto (control/visita/No se Hizo/NA) */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Plan Parto (control / visita / NSH / NA)
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center last:border-r-0"
                    >
                      {v ? v.birthPlanVisit : ""}
                    </td>
                  ))}
                </tr>

                {/* 26. Estab. de la atención */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Estab. de la atención
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="truncate border-r border-slate-300 px-0.5 py-[2px] text-center text-[6.5px] last:border-r-0"
                    >
                      {v ? v.attentionEstablishment || "CENDO" : ""}
                    </td>
                  ))}
                </tr>

                {/* 27. Responsable atención */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    Responsable atención
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="truncate border-r border-slate-300 px-0.5 py-[2px] text-center text-[6.5px] font-semibold last:border-r-0"
                    >
                      {v ? "Dr. P. Jacinto" : ""}
                    </td>
                  ))}
                </tr>

                {/* 28. N° Formato SIS / Seguro */}
                <tr>
                  <td className="border-r border-slate-400 bg-slate-50 px-1.5 py-[2px] font-bold">
                    N° Formato SIS / Seguro
                  </td>
                  {visitColumns.map((v, idx) => (
                    <td
                      key={idx}
                      className="border-r border-slate-300 px-0.5 py-[2px] text-center text-[6.5px] last:border-r-0"
                    >
                      {v ? v.sisFormatNumber || "Particular" : ""}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Leyenda Oficial del Reverso MINSA */}
            <div className="border-t border-slate-400 bg-slate-100 px-2 py-0.5 text-center text-[6.8px] font-bold text-slate-800">
              L = Longitudinal &nbsp;•&nbsp; T = Transversa &nbsp;•&nbsp; C =
              Cefálica &nbsp;•&nbsp; P = Pélvica &nbsp;•&nbsp; D = Derecha
              &nbsp;•&nbsp; I = Izquierda &nbsp;•&nbsp; SM = Sin Movimiento
              &nbsp;•&nbsp; SE = Sin Edema &nbsp;•&nbsp; NA = No Aplica
              &nbsp;•&nbsp; NSH = No Se Hizo
            </div>
          </div>

          {/* 3. PATOLOGÍAS MATERNAS (CIE 10) DIAGNOSTICADAS */}
          <div className="rounded border border-slate-400 bg-white p-1.5 text-[7.3px]">
            <div className="mb-1 flex items-center justify-between border-b border-slate-200 pb-0.5">
              <span className="bg-slate-200 px-1.5 py-0.2 font-extrabold text-slate-900 uppercase">
                Patologías Maternas (CIE 10) Diagnosticadas
              </span>
              <span className="inline-flex items-center gap-1 font-bold">
                Sin patologías{" "}
                <MinsaCheckBox
                  checked={maternalPathologies.length === 0}
                  variant="white"
                  size="xs"
                />
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8 space-y-0.5">
                {[0, 1, 2].map((idx) => {
                  const mp = maternalPathologies[idx];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-slate-200 pb-0.2"
                    >
                      <span>
                        <strong>{idx + 1}.</strong>{" "}
                        {mp ? mp.name : "____________________________________"}
                      </span>
                      <span>
                        Fecha:{" "}
                        <strong>
                          {mp?.diagnosedDate
                            ? formatShortDate(mp.diagnosedDate)
                            : "   /   /   "}
                        </strong>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="col-span-4 space-y-0.5 border-l border-slate-200 pl-2">
                <span className="block font-bold text-slate-700">
                  Códigos CIE 10:
                </span>
                {[0, 1, 2].map((idx) => {
                  const mp = maternalPathologies[idx];
                  return (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="font-bold">{idx + 1}:</span>
                      <span className="inline-block min-w-[55px] rounded border border-slate-400 bg-slate-50 px-1.5 text-center font-extrabold">
                        {mp?.cie10 || "____"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. REFERENCIAS MINSA (CONSULTA EXTERNA, EMERGENCIA, APOYO AL DIAGNÓSTICO) */}
          <div className="space-y-0.5 rounded border border-slate-400 bg-white p-1.5">
            {renderReferralRow(
              "Referencia - Consulta Externa",
              baseline.referralExternal
            )}
            {renderReferralRow(
              "Referencia Emergencia",
              baseline.referralEmergency
            )}
            {renderReferralRow(
              "Referencia - Apoyo al Diagnost.",
              baseline.referralDiagnosticSupport
            )}
          </div>

          {/* 5. FRANJA INFERIOR: PSICOPROFILAXIS, ESTIMULACIÓN PRENATAL, PLAN DE PARTO, CASA DE ESPERA */}
          <div className="grid grid-cols-12 items-center gap-1.5 rounded border border-slate-400 bg-slate-50 p-1.5 text-[7.2px] font-bold">
            <div className="col-span-3 flex items-center justify-between border-r border-slate-300 pr-2">
              <span>PSICOPROFILAXIS:</span>
              <span className="rounded border border-slate-400 bg-white px-2 py-0.2 font-extrabold">
                {String(baseline.psychoprophylaxisSessions || 0).padStart(
                  2,
                  "0"
                )}{" "}
                ses.
              </span>
            </div>
            <div className="col-span-3 flex items-center justify-between border-r border-slate-300 pr-2">
              <span>ESTIMULACIÓN PRENATAL:</span>
              <span className="rounded border border-slate-400 bg-white px-2 py-0.2 font-extrabold">
                {String(baseline.prenatalStimulationSessions || 0).padStart(
                  2,
                  "0"
                )}{" "}
                ses.
              </span>
            </div>
            <div className="col-span-3 flex items-center justify-between border-r border-slate-300 pr-2">
              <span>PLAN DE PARTO:</span>
              <span className="inline-flex items-center gap-1">
                SI{" "}
                <MinsaCheckBox
                  checked={baseline.birthPlanDone === "SI"}
                  variant="white"
                  size="xs"
                />{" "}
                NO{" "}
                <MinsaCheckBox
                  checked={baseline.birthPlanDone === "NO"}
                  variant="yellow"
                  size="xs"
                />{" "}
                NA{" "}
                <MinsaCheckBox
                  checked={baseline.birthPlanDone === "NO_APLICA"}
                  variant="white"
                  size="xs"
                />
              </span>
            </div>
            <div className="col-span-3 flex items-center justify-between">
              <span>CASA DE ESPERA:</span>
              <span className="inline-flex items-center gap-1">
                SI{" "}
                <MinsaCheckBox
                  checked={baseline.maternalWaitingHome === "SI"}
                  variant="white"
                  size="xs"
                />{" "}
                NO{" "}
                <MinsaCheckBox
                  checked={baseline.maternalWaitingHome === "NO"}
                  variant="yellow"
                  size="xs"
                />{" "}
                NA{" "}
                <MinsaCheckBox
                  checked={baseline.maternalWaitingHome === "NO_APLICA"}
                  variant="white"
                  size="xs"
                />
              </span>
            </div>
          </div>
        </div>

        {/* Pie Página 2 */}
        <div className="shrink-0 space-y-1 pt-1">
          <div className="flex items-end justify-between border-t border-slate-200 pt-1 text-[7.5px]">
            <div className="text-slate-600">
              <p className="font-bold text-slate-800">
                CARNET DE ATENCIÓN MATERNO PERINATAL MINSA / CLAP (REVERSO • PÁG. 2/2)
              </p>
              <p>
                Lugar previsto de parto:{" "}
                <strong>
                  {baseline.plannedBirthPlace ||
                    "Clínica / Centro Quirúrgico CENDO"}
                </strong>{" "}
                • Atenciones registradas: <strong>{visits.length} / 9</strong>
              </p>
            </div>
            <CendoSignatureBlock
              doctorName={`DR. ${doctorCleanName.toUpperCase()}`}
              doctorSpecialty="GINECOLOGÍA Y OBSTETRICIA - MEDICINA MATERNO FETAL"
              doctorCredentials={`CMP ${card.doctorCmp || "61693"} • RNE ${card.doctorRne || "38657"}`}
              signatureSrc={resolvedSignatureSrc}
              showDigitalSignature={resolvedShowDigitalSignature}
              align="right"
              compact
            />
          </div>
          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
          />
        </div>
      </div>
    </div>
  );
}
