"use client";

import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { BrandLogo } from "@/components/layout/BrandLogo";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { formatPeruDateDisplay } from "@/lib/utils";

interface ConsultationPrintViewProps {
  consultation: MedicalConsultationItem;
  patient: PatientDirectoryItem;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
}

export function ConsultationPrintView({
  consultation,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
}: ConsultationPrintViewProps) {
  const credentials = [
    consultation.doctorCmp ? `CMP ${consultation.doctorCmp}` : "",
    consultation.doctorRne ? `RNE ${consultation.doctorRne}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      id="consultation-print-sheet"
      className="mx-auto max-w-[210mm] space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle="CONSULTA MÉDICA GINECOLÓGICA"
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={consultation.doctorName.toUpperCase()}
          doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
          clinicAddress={clinicAddress}
          clinicEmail={clinicEmail}
          clinicPhone={clinicPhone}
        />
      ) : null}

      <section className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-3.5 px-[14mm] pt-[10mm] pb-4">
          {/* 1. Membrete Institucional */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-3">
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
              <div className="inline-block rounded border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-primary uppercase">
                HISTORIA CLÍNICA • CONSULTA
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                N° HC-CONS-{consultation.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="font-mono text-[10px] font-semibold text-foreground">
                Fecha: {formatPeruDateDisplay(consultation.consultationDate)}
              </p>
            </div>
          </header>

          {/* 2. Filiación de la Paciente */}
          <div className="grid grid-cols-12 items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <div className="col-span-5">
              <span className="block text-[9.5px] font-semibold text-muted-foreground uppercase">
                Paciente
              </span>
              <strong className="text-sm font-bold text-foreground">
                {patient.fullName}
              </strong>
            </div>
            <div className="col-span-3">
              <span className="block text-[9.5px] font-semibold text-muted-foreground uppercase">
                Documento
              </span>
              <span className="font-mono font-semibold text-foreground">
                {patient.documentType} {patient.documentNumber}
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-[9.5px] font-semibold text-muted-foreground uppercase">
                Edad
              </span>
              <span className="font-mono font-semibold text-foreground">
                {patient.age} años
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-[9.5px] font-semibold text-muted-foreground uppercase">
                Teléfono
              </span>
              <span className="font-mono text-foreground">{patient.phone || "—"}</span>
            </div>
          </div>

          {/* 3. Anamnesis y Signos Vitales */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-7 space-y-1.5 rounded-lg border border-border p-3">
              <h2 className="text-[10px] font-bold tracking-wider text-primary uppercase">
                1. Anamnesis & Motivo de Consulta
              </h2>
              <div>
                <span className="block text-[9.5px] font-semibold text-muted-foreground">
                  Motivo:
                </span>
                <p className="font-semibold text-foreground">
                  {consultation.reasonForVisit}
                </p>
              </div>
              {consultation.illnessTime ? (
                <div>
                  <span className="block text-[9.5px] font-semibold text-muted-foreground">
                    Tiempo de Enfermedad:
                  </span>
                  <p>{consultation.illnessTime}</p>
                </div>
              ) : null}
              {consultation.symptoms ? (
                <div>
                  <span className="block text-[9.5px] font-semibold text-muted-foreground">
                    Relato Cronológico / Síntomas:
                  </span>
                  <p className="whitespace-pre-line">{consultation.symptoms}</p>
                </div>
              ) : null}
            </div>

            <div className="col-span-5 space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
              <h2 className="text-[10px] font-bold tracking-wider text-primary uppercase">
                2. Signos Vitales & Antropometría
              </h2>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div>
                  <span className="block text-[9px] text-muted-foreground">P.A.</span>
                  <strong>{consultation.vitalSigns.bloodPressure} mmHg</strong>
                </div>
                <div>
                  <span className="block text-[9px] text-muted-foreground">F.C.</span>
                  <strong>{consultation.vitalSigns.heartRate} lpm</strong>
                </div>
                <div>
                  <span className="block text-[9px] text-muted-foreground">F.R.</span>
                  <strong>{consultation.vitalSigns.respiratoryRate ?? 18} rpm</strong>
                </div>
                <div>
                  <span className="block text-[9px] text-muted-foreground">SatO2</span>
                  <strong>{consultation.vitalSigns.oxygenSaturation ?? 98}%</strong>
                </div>
                <div>
                  <span className="block text-[9px] text-muted-foreground">Temp.</span>
                  <strong>{consultation.vitalSigns.temperature} °C</strong>
                </div>
                <div>
                  <span className="block text-[9px] text-muted-foreground">IMC</span>
                  <strong className="text-primary">
                    {consultation.vitalSigns.bmi} kg/m²
                  </strong>
                </div>
                <div className="col-span-2 border-t border-border pt-1">
                  <span className="text-[9px] text-muted-foreground">
                    Peso / Talla:{" "}
                  </span>
                  <strong>
                    {consultation.vitalSigns.weightKg} kg •{" "}
                    {consultation.vitalSigns.heightCm} cm
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Examen Físico Dirigido */}
          <div className="space-y-1.5 rounded-lg border border-border p-3">
            <h2 className="text-[10px] font-bold tracking-wider text-primary uppercase">
              3. Examen Físico Ginecológico Dirigido
            </h2>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="font-semibold text-muted-foreground">General: </span>
                <span>{consultation.physicalExam.generalExam || "Normal"}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">Mamas: </span>
                <span>{consultation.physicalExam.breastsExam || "Normal"}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">
                  Genitales Externos:{" "}
                </span>
                <span>{consultation.physicalExam.externalGenitalia || "Normal"}</span>
              </div>
              <div>
                <span className="font-semibold text-muted-foreground">
                  Especuloscopía:{" "}
                </span>
                <span>{consultation.physicalExam.speculoscopy || "Normal"}</span>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-muted-foreground">
                  Tacto Bimanual:{" "}
                </span>
                <span>{consultation.physicalExam.bimanualPalpation || "Normal"}</span>
              </div>
            </div>
          </div>

          {/* 5. Diagnóstico y Plan Terapéutico */}
          <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[10px] font-bold tracking-wider text-primary uppercase">
                4. Impresión Diagnóstica & Plan de Trabajo
              </h2>
              {consultation.cie10Code ? (
                <span className="rounded border border-primary/30 bg-card px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  CIE-10: {consultation.cie10Code}
                </span>
              ) : null}
            </div>

            <p className="text-sm font-bold text-foreground">
              {consultation.diagnosis}
            </p>

            <div>
              <span className="block text-[9.5px] font-semibold text-muted-foreground uppercase">
                Plan de Trabajo / Indicaciones
              </span>
              <p className="mt-0.5 whitespace-pre-line text-foreground">
                {consultation.treatmentPlan}
              </p>
            </div>

            {consultation.auxiliaryExams ? (
              <div className="border-t border-border pt-1.5">
                <span className="block text-[9.5px] font-semibold text-muted-foreground uppercase">
                  Exámenes Auxiliares Solicitados
                </span>
                <p className="mt-0.5 whitespace-pre-line">
                  {consultation.auxiliaryExams}
                </p>
              </div>
            ) : null}

            {consultation.prescriptionNotes ? (
              <div className="border-t border-border pt-1.5">
                <span className="block text-[9.5px] font-semibold text-muted-foreground uppercase">
                  Terapéutica / Medicación (Rp/)
                </span>
                <p className="mt-0.5 whitespace-pre-line">
                  {consultation.prescriptionNotes}
                </p>
              </div>
            ) : null}

            {consultation.nextAppointmentDate ? (
              <p className="pt-1 font-mono text-[10.5px] font-semibold text-primary">
                Próximo control sugerido:{" "}
                {formatPeruDateDisplay(consultation.nextAppointmentDate)}
              </p>
            ) : null}
          </div>
        </div>

        {/* Firma médica y Cenefa CENDO */}
        <div>
          <div className="px-[14mm] pb-4 text-right">
            <div className="inline-block border-t border-border pt-2 text-right">
              <p className="text-xs font-bold text-primary uppercase">
                {consultation.doctorName}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
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
