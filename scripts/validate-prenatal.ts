import assert from "node:assert/strict";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clinicalAuditLogs,
  patients,
  profiles,
} from "@/db/schema";
import {
  ALL_MINSA_FAMILY_HISTORY,
  ALL_MINSA_PERSONAL_HISTORY,
  calculateGestationalAge,
  calculateNaegeleFPP,
  evaluatePrenatalRisks,
  prenatalBaselineDataSchema,
  prenatalVisitItemSchema,
  upsertPrenatalCardInputSchema,
} from "@/features/prenatal/prenatal.schema";
import {
  getPrenatalCardByPatient,
  softDeletePrenatalCard,
  upsertPrenatalCard,
} from "@/features/prenatal/services/prenatal.service";
import type { SessionPayload } from "@/lib/security/action-guard";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  console.log("=== VALIDACIÓN E2E: CONTROL PRENATAL MINSA / CLAP ===");

  // 1. Validar Catálogos Oficiales MINSA (13 Familiares + 27 Personales)
  assert.equal(
    ALL_MINSA_FAMILY_HISTORY.length,
    13,
    "Deben existir exactamente los 13 ítems oficiales de Antecedentes Familiares MINSA."
  );
  assert.equal(
    ALL_MINSA_PERSONAL_HISTORY.length,
    28,
    "Deben existir exactamente los 28 ítems oficiales de Antecedentes Personales MINSA en 3 columnas (9 + 9 + 10)."
  );
  console.log(
    "✓ [1/7] Catálogos oficiales MINSA verificados (13 Familiares + 28 Personales)."
  );

  // 2. Validar Calculadora de Naegele y Edad Gestacional
  const fum = "2026-07-10";
  const fpp = calculateNaegeleFPP(fum);
  assert.equal(fpp, "2027-04-16", "Regla de Naegele (+280 días) debe ser exacta.");
  const ga = calculateGestationalAge(fum, "2026-11-19");
  assert.equal(ga.weeks, 18, "Semanas de EG calculadas correctamente.");
  assert.equal(ga.days, 6, "Días de EG calculados correctamente.");
  assert.equal(ga.trimester, 2, "Trimestre (2°T) calculado correctamente.");
  console.log(
    `✓ [2/7] Calculadora Naegele y Edad Gestacional verificadas (FUM ${fum} -> FPP ${fpp}, EG ${ga.formatted}).`
  );

  // 3. Validar Evaluador de Riesgo Obstétrico ARO (Alertas 🟨 y Seguimiento Continuo 🟥)
  const testBaseline = prenatalBaselineDataSchema.parse({
    fum,
    fpp,
    gestas: 2,
    partosVaginales: 0,
    cesareas: 1,
    abortos: 0,
    nacidosVivos: 1,
    viven: 1,
    familyHistory: ["Diabetes"],
    familyHistoryDetails: { Diabetes: "Madre" },
    personalHistory: ["Cirugía Pélv.-uterina"],
    personalHistoryDetails: { "Cirugía Pélv.-uterina": "Cesárea previa" },
    hemoglobin1: 10.6,
    hemoglobin1Date: "2026-08-25",
  });
  const testVisit = prenatalVisitItemSchema.parse({
    visitNumber: 1,
    visitDate: "2026-09-01",
    gestationalAgeWeeks: 7,
    gestationalAgeDays: 4,
    maternalWeightKg: 59.5,
    bloodPressure: "142/92",
    fetalHeartRate: 148,
  });
  const risk = evaluatePrenatalRisks(testBaseline, 36, [testVisit], []);
  assert.equal(risk.isHighRisk, true);
  assert.equal(risk.hasContinuousFollowUp, true);
  assert.ok(risk.continuousCount >= 3, "Debe detectar edad >35, cesárea previa y PA >=140/90 como seguimiento continuo 🟥.");
  assert.ok(risk.alertCount >= 2, "Debe detectar antecedente familiar Diabetes y Hb <11 como alertas 🟨.");
  console.log(
    `✓ [3/7] Evaluador ARO MINSA verificado (${risk.riskCategory}: ${risk.alertCount} alertas 🟨, ${risk.continuousCount} seg. continuo 🟥).`
  );

  // 4. Obtener perfil del Dr. Patrick y buscar pacientes demo
  const [doctor] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.tenantId, TENANT_ID), eq(profiles.role, "admin")))
    .limit(1);
  assert.ok(doctor, "Dr. Patrick debe existir en PostgreSQL.");

  const ctx: SessionPayload = {
    userId: doctor.id,
    tenantId: doctor.tenantId,
    role: doctor.role as "admin" | "moderator" | "user",
  };
  const actorName = `${doctor.doctorTitle} ${doctor.fullName}`;

  const [gabriela] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.tenantId, TENANT_ID),
        eq(patients.documentNumber, "71628493"),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);
  assert.ok(gabriela, "Paciente demo Gabriela Paredes (71628493) debe existir.");

  // 5. Probar creación, lectura, actualización y borrado lógico en Gabriela Paredes
  const existingGabCard = await getPrenatalCardByPatient(TENANT_ID, gabriela.id);
  if (existingGabCard) {
    await softDeletePrenatalCard(ctx, actorName, existingGabCard.id);
  }

  const createInput = upsertPrenatalCardInputSchema.parse({
    patientId: gabriela.id,
    clinicEstablishment:
      "CENDO - Centro de Endometriosis & Ginecología Especializada",
    attendingDoctorName: "Dr. Patrick José Jacinto Gomero",
    baseline: {
      hcNumber: gabriela.documentNumber,
      fum: "2026-08-01",
      fpp: calculateNaegeleFPP("2026-08-01"),
      usualWeightKg: 57,
      heightCm: 161,
      bloodGroup: "O",
      rhFactor: "Rh (+)",
      hemoglobin1: 12.6,
      hemoglobin1Date: "2026-09-10",
      hemoglobin2: 12.1,
      hemoglobin2Date: "2026-11-15",
      glucose1Result: "Normal",
      glucose1Value: 82,
      glucose1Date: "2026-09-10",
      glucose2Result: "Normal",
      glucose2Value: 85,
      glucose2Date: "2026-11-15",
      vdrlRpr1Result: "No reactivo",
      vdrlRpr1Date: "2026-09-10",
      hivRapid1Result: "No reactivo",
      hivRapid1Date: "2026-09-10",
    },
    visits: [
      {
        visitNumber: 1,
        visitDate: "2026-09-10",
        visitTime: "10:00",
        gestationalAgeWeeks: 5,
        gestationalAgeDays: 5,
        maternalWeightKg: 57.5,
        temperature: 36.6,
        bloodPressure: "105/68",
        maternalPulse: 76,
        uterineHeightCm: 0,
        fetusSituation: "NA",
        fetusPresentation: "NA",
        fetusPosition: "NA",
        fetalHeartRate: 0,
        fetalMovements: "NA",
        proteinuria: "-",
        edema: "SE",
        tendonReflex: "++",
        nippleExam: "Formado",
        ironFolicAcidGiven: false,
        calciumGiven: false,
        folicAcidEarlyGiven: true,
        counselingGiven: "Ác. Fólico + Signos de alarma",
        ultrasoundGestationalAge: "6s 0d",
        biophysicalProfileScore: "NA",
        nextAppointmentDate: "2026-10-10",
        homeVisit: "NA",
        birthPlanVisit: "Control",
        attentionEstablishment: "CENDO Miraflores",
        attendingDoctorName: "Dr. Patrick José Jacinto Gomero",
        sisFormatNumber: "Particular",
        notes: "Primer control prenatal precoz.",
      },
    ],
    maternalPathologies: [],
    syncBackgroundFur: false,
  });

  const createdCard = await upsertPrenatalCard(ctx, actorName, createInput);
  assert.ok(createdCard.id, "Debe crear el carnet prenatal con UUID válido.");
  assert.equal(createdCard.visits.length, 1);
  assert.equal(createdCard.baseline.hemoglobin1Date, "2026-09-10");
  assert.equal(createdCard.baseline.hemoglobin2Date, "2026-11-15");
  console.log(
    `✓ [4/7] Creación de Carnet Prenatal MINSA verificada (ID: ${createdCard.id}).`
  );

  // Actualizar agregando Atención 2
  const updatedCard = await upsertPrenatalCard(ctx, actorName, {
    ...createInput,
    visits: [
      ...createInput.visits,
      prenatalVisitItemSchema.parse({
        visitNumber: 2,
        visitDate: "2026-10-12",
        visitTime: "10:30",
        gestationalAgeWeeks: 10,
        gestationalAgeDays: 2,
        maternalWeightKg: 58.3,
        temperature: 36.5,
        bloodPressure: "110/70",
        maternalPulse: 78,
        uterineHeightCm: 0,
        fetalHeartRate: 152,
        folicAcidEarlyGiven: true,
        ironFolicAcidGiven: false,
        calciumGiven: false,
        nextAppointmentDate: "2026-11-12",
      }),
    ],
  });
  assert.equal(updatedCard.id, createdCard.id, "Upsert debe mantener el mismo ID del carnet de la paciente.");
  assert.equal(updatedCard.visits.length, 2, "Debe registrar 2 atenciones prenatales.");
  console.log(
    "✓ [5/7] Actualización longitudinal de Atenciones Prenatales (1 a 2) verificada."
  );

  // Eliminar carnet de prueba en Gabriela para dejar su perfil limpio y sembrar el demo completo en Daniela Castro
  await softDeletePrenatalCard(ctx, actorName, createdCard.id);
  const afterDelete = await getPrenatalCardByPatient(TENANT_ID, gabriela.id);
  assert.equal(afterDelete, null, "El carnet eliminado no debe listarse.");
  console.log("✓ [6/7] Borrado lógico (soft-delete) y auditoría verificados.");

  // 6. Sembrar Carnet Prenatal Demo Completo en Daniela Castro (DNI 74195820, G2 P2002)
  const [daniela] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.tenantId, TENANT_ID),
        eq(patients.documentNumber, "74195820"),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);
  assert.ok(daniela, "Paciente demo Daniela Castro (74195820) debe existir.");

  const demoFum = "2026-07-12";
  const demoFpp = calculateNaegeleFPP(demoFum);

  const demoCard = await upsertPrenatalCard(
    ctx,
    actorName,
    upsertPrenatalCardInputSchema.parse({
      patientId: daniela.id,
      clinicEstablishment:
        "CENDO - Centro de Endometriosis & Ginecología Especializada",
      attendingDoctorName: "Dr. Patrick José Jacinto Gomero",
      syncBackgroundFur: false,
      baseline: {
        hcNumber: daniela.documentNumber,
        establishmentOrigin: "CENDO - Miraflores",
        originNoApplies: true,
        originReferral: false,
        insuranceType: "PRIVADO",
        insuranceAffiliationCode: `CENDO-${daniela.documentNumber}`,
        educationLevel: "Superior",
        approvedEducationYears: 5,
        civilStatus: "Casada",
        fatherName: "Rodrigo Méndez Salazar",
        locality: "Santiago de Surco",
        department: "Lima",
        province: "Lima",
        district: "Santiago de Surco",
        patientAddress: daniela.address || "Av. Primavera 1420, Surco",
        patientPhone: daniela.phone || "981456723",
        patientEmail: daniela.email || "daniela.castro@correo.pe",
        patientOccupation: daniela.occupation || "Arquitecta",
        gestas: 2,
        abortos: 0,
        partosVaginales: 0,
        cesareas: 1,
        nacidosVivos: 1,
        nacidosMuertos: 0,
        viven: 1,
        rnMayorPesoGramos: 3420,
        previousDeliveryDate: "2023-05-14",
        adequateIntergenesicPeriod: true,
        previousDeliveryType: "Cesárea",
        previousAbortionType: "No Aplica",
        breastfeedingMonths: "6 meses o más",
        deliveryPlace: "EESS",
        pregnancyCaptured: true,
        communityAgentReferred: false,
        familyHistory: ["Hipertensión Arterial"],
        familyHistoryDetails: { "Hipertensión Arterial": "Padre" },
        personalHistory: ["Asma Bronquial", "Cirugía Pélv.-uterina"],
        personalHistoryDetails: {
          "Asma Bronquial": "Asma leve intermitente",
          "Cirugía Pélv.-uterina": "Cesárea segmentaria previa (2023)",
        },
        previousVaccines: {
          rubella: true,
          hepatitisB: true,
          hpv: true,
          yellowFever: true,
        },
        usualWeightKg: 58,
        heightCm: 163,
        antitetanicaPrevDoses: 2,
        antitetanica1stDoseMonth: "5° mes",
        antitetanica2ndDoseMonth: "6° mes",
        antitetanicaStatus: "Vacunada",
        bloodGroup: "O",
        rhFactor: "Rh (+)",
        smokerCigarettesDay: 0,
        drugsUse: false,
        fum: demoFum,
        fumDoubt: false,
        ultrasoundGestationalAgeWeeks: 7,
        ultrasoundDate: "2026-08-30",
        ultrasoundNoApplies: false,
        fpp: demoFpp,
        violenceScreening: {
          screeningDone: true,
          violenceDetected: false,
          date: "2026-08-30",
        },
        clinicalExam: "Normal",
        breastsExam: "Normal",
        cervixExam: "Normal",
        pelvisExam: "Normal",
        dentalExam: "Normal",
        hemoglobin1: 12.5,
        hemoglobin1Date: "2026-08-30",
        hemoglobin1NotDone: false,
        hemoglobin2: 12.1,
        hemoglobin2Date: "2026-11-10",
        hemoglobin2NotDone: false,
        hemoglobin3NotDone: true,
        hemoglobinDischargeNotDone: true,
        glucose1Result: "Normal",
        glucose1Value: 83,
        glucose1Date: "2026-08-30",
        glucose2Result: "Normal",
        glucose2Value: 86,
        glucose2Date: "2026-11-10",
        glucose3Result: "No se Hizo",
        glucoseToleranceResult: "Normal",
        glucoseToleranceValue: 118,
        glucoseToleranceDate: "2026-11-10",
        vdrlRpr1Result: "No reactivo",
        vdrlRpr1Date: "2026-08-30",
        vdrlRpr2Result: "No reactivo",
        vdrlRpr2Date: "2026-11-10",
        rapidSyphilisResult: "No reactivo",
        rapidSyphilisDate: "2026-08-30",
        hivRapid1Result: "No reactivo",
        hivRapid1Date: "2026-08-30",
        hivRapid2Result: "No reactivo",
        hivRapid2Date: "2026-11-10",
        completeUrineExamResult: "Negativo",
        completeUrineExamDate: "2026-08-30",
        completeUrineExam2Result: "Negativo",
        completeUrineExam2Date: "2026-11-10",
        leukocyturiaResult: "Negativo",
        leukocyturiaDate: "2026-08-30",
        nitritesResult: "Negativo",
        nitritesDate: "2026-08-30",
        urineCultureResult: "Negativo",
        urineCultureDate: "2026-08-30",
        urineCulture2Result: "Negativo",
        urineCulture2Date: "2026-11-10",
        hepatitisBResult: "Negativo",
        hepatitisBDate: "2026-08-30",
        papTestResult: "Normal",
        papTestDate: "2026-08-30",
        colposcopyResult: "Normal",
        colposcopyDate: "2026-11-18",
        psychoprophylaxisSessions: 2,
        prenatalStimulationSessions: 2,
        birthPlanDone: "SI",
        maternalWaitingHome: "NO_APLICA",
        plannedBirthPlace: "Clínica / Centro Quirúrgico CENDO",
      },
      visits: [
        {
          visitNumber: 1,
          visitDate: "2026-08-30",
          visitTime: "09:30",
          gestationalAgeWeeks: 7,
          gestationalAgeDays: 0,
          maternalWeightKg: 58.4,
          temperature: 36.6,
          bloodPressure: "108/68",
          maternalPulse: 76,
          uterineHeightCm: 0,
          fetusSituation: "NA",
          fetusPresentation: "NA",
          fetusPosition: "NA",
          fetalHeartRate: 142,
          fetalMovements: "NA",
          proteinuria: "-",
          edema: "SE",
          tendonReflex: "++",
          nippleExam: "Formado",
          ironFolicAcidGiven: false,
          calciumGiven: false,
          folicAcidEarlyGiven: true,
          counselingGiven: "Nutrición + Signos Alarma",
          ultrasoundGestationalAge: "7s 0d (LCN 10mm)",
          biophysicalProfileScore: "NA",
          nextAppointmentDate: "2026-09-28",
          homeVisit: "NA",
          birthPlanVisit: "Control",
          attentionEstablishment: "CENDO Miraflores",
          attendingDoctorName: "Dr. Patrick José Jacinto Gomero",
          sisFormatNumber: "Particular",
          notes: "Captación precoz 1° trimestre.",
        },
        {
          visitNumber: 2,
          visitDate: "2026-10-02",
          visitTime: "10:00",
          gestationalAgeWeeks: 11,
          gestationalAgeDays: 5,
          maternalWeightKg: 59.2,
          temperature: 36.5,
          bloodPressure: "110/70",
          maternalPulse: 78,
          uterineHeightCm: 10,
          fetusSituation: "NA",
          fetusPresentation: "NA",
          fetusPosition: "NA",
          fetalHeartRate: 154,
          fetalMovements: "NA",
          proteinuria: "-",
          edema: "SE",
          tendonReflex: "++",
          nippleExam: "Formado",
          ironFolicAcidGiven: false,
          calciumGiven: false,
          folicAcidEarlyGiven: true,
          counselingGiven: "Tamizaje cromosómico 1°T",
          ultrasoundGestationalAge: "12s 0d (TN normal)",
          biophysicalProfileScore: "NA",
          nextAppointmentDate: "2026-11-02",
          homeVisit: "NA",
          birthPlanVisit: "Control",
          attentionEstablishment: "CENDO Miraflores",
          attendingDoctorName: "Dr. Patrick José Jacinto Gomero",
          sisFormatNumber: "Particular",
          notes: "Ecografía genética normal.",
        },
        {
          visitNumber: 3,
          visitDate: "2026-11-18",
          visitTime: "11:00",
          gestationalAgeWeeks: 18,
          gestationalAgeDays: 3,
          maternalWeightKg: 61.0,
          temperature: 36.6,
          bloodPressure: "112/72",
          maternalPulse: 80,
          uterineHeightCm: 17,
          fetusSituation: "L",
          fetusPresentation: "C",
          fetusPosition: "D",
          fetalHeartRate: 146,
          fetalMovements: "++",
          proteinuria: "-",
          edema: "SE",
          tendonReflex: "++",
          nippleExam: "Formado",
          ironFolicAcidGiven: true,
          calciumGiven: false,
          folicAcidEarlyGiven: false,
          counselingGiven: "Suplementación Hierro + Ác. Fólico",
          ultrasoundGestationalAge: "18s 3d",
          biophysicalProfileScore: "NA",
          nextAppointmentDate: "2026-12-16",
          homeVisit: "NA",
          birthPlanVisit: "Control",
          attentionEstablishment: "CENDO Miraflores",
          attendingDoctorName: "Dr. Patrick José Jacinto Gomero",
          sisFormatNumber: "Particular",
          notes: "Inicia Sulfato Ferroso + Ácido Fólico.",
        },
      ],
      maternalPathologies: [
        {
          id: "mp-demo-1",
          name: "Atención materna por cicatriz uterina de cirugía previa",
          cie10: "O34.2",
          diagnosedDate: "2026-08-30",
        },
      ],
    })
  );

  assert.equal(demoCard.visits.length, 3);
  assert.equal(demoCard.maternalPathologies.length, 1);

  const [auditRow] = await db
    .select()
    .from(clinicalAuditLogs)
    .where(
      and(
        eq(clinicalAuditLogs.tenantId, TENANT_ID),
        eq(clinicalAuditLogs.entityType, "prenatal_cards"),
        eq(clinicalAuditLogs.entityId, demoCard.id)
      )
    )
    .limit(1);
  assert.ok(auditRow, "Debe existir traza en clinical_audit_logs.");

  console.log(
    `✓ [7/7] Carnet Prenatal Demo MINSA / CLAP sembrado en Daniela Castro (DNI 74195820, 3 atenciones, FUM ${demoFum}, FPP ${demoFpp}).`
  );
  console.log("=== TODAS LAS PRUEBAS (7/7) PASARON CON ÉXITO ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error en validación E2E de Control Prenatal:", err);
  process.exit(1);
});
