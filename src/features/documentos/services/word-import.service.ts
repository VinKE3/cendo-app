import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  medicalConsultations,
  patientBackgrounds,
  patients,
  profiles,
  ultrasoundReports,
  wordHistoryDocuments,
} from "@/db/schema";
import type { UltrasoundFindingsRecord } from "@/db/schema/specialty";
import {
  isDocxZipMagicBytes,
  MAX_WORD_DOCX_BYTES,
  MAX_WORD_IMPORT_BATCH_FILES,
  type WordImportCommitItem,
  type WordImportCommitSummary,
  type WordImportPreviewItem,
} from "@/features/documentos/documentos.schema";
import { saveWordHistoryDocument } from "@/features/documentos/services/documentos.service";
import { calculateEllipsoidVolumeCc } from "@/features/ecografias/ecografias.schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { getPeruDateString } from "@/lib/utils";
import {
  classifyWordStructure,
  extractDocxStructure,
  parseWordHistoryDocx,
  parseWordUltrasoundDocx,
} from "@/lib/word-parser";

/**
 * Parsea un lote de hasta 20 archivos .docx para vista previa editable antes de guardar.
 */
export async function parseWordBatchForPreview(
  tenantId: string,
  files: Array<{
    fileKey: string;
    fileName: string;
    fileSize: number;
    lastModifiedYear?: number;
    bytes: Uint8Array;
  }>
): Promise<WordImportPreviewItem[]> {
  if (files.length === 0) {
    throw new DomainError("Seleccione al menos un archivo Word (.docx).");
  }
  if (files.length > MAX_WORD_IMPORT_BATCH_FILES) {
    throw new DomainError(
      `Máximo ${MAX_WORD_IMPORT_BATCH_FILES} archivos .docx por lote.`
    );
  }

  const existingPatients = await db
    .select({
      id: patients.id,
      documentNumber: patients.documentNumber,
      fullName: patients.fullName,
    })
    .from(patients)
    .where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)));

  const patientByDni = new Map(
    existingPatients.map((p) => [p.documentNumber.trim().toUpperCase(), p])
  );

  const currentYear = Number(getPeruDateString().slice(0, 4)) || 2026;
  const results: WordImportPreviewItem[] = [];

  for (const entry of files) {
    if (
      entry.bytes.byteLength === 0 ||
      entry.bytes.byteLength > MAX_WORD_DOCX_BYTES
    ) {
      results.push({
        fileKey: entry.fileKey,
        fileName: entry.fileName,
        fileSize: entry.fileSize,
        kind: "UNKNOWN",
        included: false,
        warnings: ["El archivo supera el límite de 10 MB o está vacío."],
        extractedText: "",
        documentNumber: "",
        firstName: "",
        lastName: "",
        fullName: "",
        birthDate: "",
        ageFromDoc: null,
        phone: "",
        civilStatus: "Soltera",
        educationLevel: "",
        occupation: "",
        birthPlace: "",
        address: "",
        religion: "",
        existingPatientId: null,
        existingPatientName: null,
        batchMatchedDni: false,
        consultations: [],
      });
      continue;
    }

    if (!isDocxZipMagicBytes(entry.bytes)) {
      results.push({
        fileKey: entry.fileKey,
        fileName: entry.fileName,
        fileSize: entry.fileSize,
        kind: "UNKNOWN",
        included: false,
        warnings: [
          "Formato inválido. Use archivos .docx modernos (no .doc antiguo).",
        ],
        extractedText: "",
        documentNumber: "",
        firstName: "",
        lastName: "",
        fullName: "",
        birthDate: "",
        ageFromDoc: null,
        phone: "",
        civilStatus: "Soltera",
        educationLevel: "",
        occupation: "",
        birthPlace: "",
        address: "",
        religion: "",
        existingPatientId: null,
        existingPatientName: null,
        batchMatchedDni: false,
        consultations: [],
      });
      continue;
    }

    try {
      const structure = await extractDocxStructure(entry.bytes);
      const kind = classifyWordStructure(structure, entry.fileName);
      const fallbackYear = entry.lastModifiedYear || currentYear;

      if (kind === "EMPTY_TEMPLATE" || kind === "UNKNOWN") {
        results.push({
          fileKey: entry.fileKey,
          fileName: entry.fileName,
          fileSize: entry.fileSize,
          kind,
          included: false,
          warnings: [
            kind === "EMPTY_TEMPLATE"
              ? "Plantilla vacía sin datos de paciente (XXXXXXXXXX); omitida."
              : "No se reconoce como Historia Clínica ni Ecografía CENDO.",
          ],
          extractedText: structure.fullText,
          documentNumber: "",
          firstName: "",
          lastName: "",
          fullName: "",
          birthDate: "",
          ageFromDoc: null,
          phone: "",
          civilStatus: "Soltera",
          educationLevel: "",
          occupation: "",
          birthPlace: "",
          address: "",
          religion: "",
          existingPatientId: null,
          existingPatientName: null,
          batchMatchedDni: false,
          consultations: [],
        });
        continue;
      }

      if (kind === "HISTORIA_CLINICA") {
        const parsed = parseWordHistoryDocx(
          structure,
          entry.fileName,
          fallbackYear
        );
        if (parsed.kind === "EMPTY_TEMPLATE") {
          results.push({
            fileKey: entry.fileKey,
            fileName: entry.fileName,
            fileSize: entry.fileSize,
            kind: "EMPTY_TEMPLATE",
            included: false,
            warnings: parsed.warnings,
            extractedText: parsed.extractedText,
            documentNumber: "",
            firstName: "",
            lastName: "",
            fullName: "",
            birthDate: "",
            ageFromDoc: null,
            phone: "",
            civilStatus: "Soltera",
            educationLevel: "",
            occupation: "",
            birthPlace: "",
            address: "",
            religion: "",
            existingPatientId: null,
            existingPatientName: null,
            batchMatchedDni: false,
            consultations: [],
          });
          continue;
        }

        const existing = parsed.documentNumber
          ? patientByDni.get(parsed.documentNumber.toUpperCase())
          : undefined;

        results.push({
          fileKey: entry.fileKey,
          fileName: entry.fileName,
          fileSize: entry.fileSize,
          kind: "HISTORIA_CLINICA",
          included: true,
          styleLabel: parsed.styleLabel,
          warnings: parsed.warnings,
          extractedText: parsed.extractedText,
          documentNumber: parsed.documentNumber,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          fullName: parsed.fullName,
          birthDate: parsed.birthDate,
          ageFromDoc: parsed.ageFromDoc,
          phone: parsed.phone,
          civilStatus: parsed.civilStatus,
          educationLevel: parsed.educationLevel,
          occupation: parsed.occupation,
          birthPlace: parsed.birthPlace,
          address: parsed.address,
          religion: parsed.religion,
          existingPatientId: existing?.id ?? null,
          existingPatientName: existing?.fullName ?? null,
          batchMatchedDni: false,
          background: parsed.background,
          consultations: parsed.consultations,
        });
      } else {
        const parsedEco = parseWordUltrasoundDocx(
          structure,
          entry.fileName,
          fallbackYear
        );
        if (parsedEco.kind === "EMPTY_TEMPLATE") {
          results.push({
            fileKey: entry.fileKey,
            fileName: entry.fileName,
            fileSize: entry.fileSize,
            kind: "EMPTY_TEMPLATE",
            included: false,
            warnings: parsedEco.warnings,
            extractedText: parsedEco.extractedText,
            documentNumber: "",
            firstName: "",
            lastName: "",
            fullName: "",
            birthDate: "",
            ageFromDoc: null,
            phone: "",
            civilStatus: "Soltera",
            educationLevel: "",
            occupation: "",
            birthPlace: "",
            address: "",
            religion: "",
            existingPatientId: null,
            existingPatientName: null,
            batchMatchedDni: false,
            consultations: [],
          });
          continue;
        }

        const existing = parsedEco.patientDocumentNumber
          ? patientByDni.get(parsedEco.patientDocumentNumber.toUpperCase())
          : undefined;

        results.push({
          fileKey: entry.fileKey,
          fileName: entry.fileName,
          fileSize: entry.fileSize,
          kind: "ECOGRAFIA",
          included: true,
          warnings: parsedEco.warnings,
          extractedText: parsedEco.extractedText,
          documentNumber: parsedEco.patientDocumentNumber,
          firstName: "",
          lastName: "",
          fullName: parsedEco.patientFullName,
          birthDate: "",
          ageFromDoc: null,
          phone: "",
          civilStatus: "Soltera",
          educationLevel: "",
          occupation: "",
          birthPlace: "",
          address: "",
          religion: "",
          existingPatientId: existing?.id ?? null,
          existingPatientName: existing?.fullName ?? null,
          batchMatchedDni: false,
          consultations: [],
          ultrasoundType: parsedEco.ultrasoundType,
          reportDate: parsedEco.reportDate,
          indication: parsedEco.indication,
          findings: parsedEco.findings,
          conclusion: parsedEco.conclusion,
          recommendations: parsedEco.recommendations,
        });
      }
    } catch (err) {
      results.push({
        fileKey: entry.fileKey,
        fileName: entry.fileName,
        fileSize: entry.fileSize,
        kind: "UNKNOWN",
        included: false,
        warnings: [
          err instanceof Error
            ? `Error leyendo .docx: ${err.message}`
            : "Error inesperado leyendo el archivo Word.",
        ],
        extractedText: "",
        documentNumber: "",
        firstName: "",
        lastName: "",
        fullName: "",
        birthDate: "",
        ageFromDoc: null,
        phone: "",
        civilStatus: "Soltera",
        educationLevel: "",
        occupation: "",
        birthPlace: "",
        address: "",
        religion: "",
        existingPatientId: null,
        existingPatientName: null,
        batchMatchedDni: false,
        consultations: [],
      });
    }
  }

  // Marcar ecografías cuyo DNI coincide con una Historia Clínica del mismo lote
  const batchHcsByDni = new Set(
    results
      .filter((r) => r.kind === "HISTORIA_CLINICA" && r.documentNumber)
      .map((r) => r.documentNumber.toUpperCase())
  );

  for (const item of results) {
    if (
      item.kind === "ECOGRAFIA" &&
      !item.existingPatientId &&
      item.documentNumber &&
      batchHcsByDni.has(item.documentNumber.toUpperCase())
    ) {
      item.batchMatchedDni = true;
    }
  }

  return results;
}

function enrichUltrasoundFindings(
  raw: Record<string, unknown> | undefined
): UltrasoundFindingsRecord {
  const f = { ...(raw ?? {}) } as UltrasoundFindingsRecord;
  if (f.uterusDimensions && !f.uterusVolumeCc) {
    const vol = calculateEllipsoidVolumeCc(f.uterusDimensions);
    if (vol !== null) f.uterusVolumeCc = vol;
  }
  if (f.rightOvaryDimensions && !f.rightOvaryVolumeCc) {
    const vol = calculateEllipsoidVolumeCc(f.rightOvaryDimensions);
    if (vol !== null) f.rightOvaryVolumeCc = vol;
  }
  if (f.leftOvaryDimensions && !f.leftOvaryVolumeCc) {
    const vol = calculateEllipsoidVolumeCc(f.leftOvaryDimensions);
    if (vol !== null) f.leftOvaryVolumeCc = vol;
  }
  return f;
}

/**
 * Persiste un lote validado de Historias Clínicas y Ecografías Word en PostgreSQL + Storage privado.
 */
export async function commitWordImportBatch(
  ctx: SessionPayload,
  actorName: string,
  params: {
    items: WordImportCommitItem[];
    filesByKey: Map<string, Uint8Array>;
  }
): Promise<WordImportCommitSummary> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [doctor] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, ctx.userId),
        eq(profiles.tenantId, tenantId),
        isNull(profiles.deletedAt)
      )
    )
    .limit(1);

  if (!doctor) {
    throw new DomainError("Médico autenticado no encontrado o inactivo.");
  }

  const doctorDisplayName = `${doctor.doctorTitle} ${doctor.fullName}`.trim();

  const existingPatients = await db
    .select()
    .from(patients)
    .where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)));

  const patientByDni = new Map(
    existingPatients.map((p) => [p.documentNumber.trim().toUpperCase(), p])
  );
  const patientById = new Map(existingPatients.map((p) => [p.id, p]));

  const summary: WordImportCommitSummary = {
    patientsCreated: 0,
    patientsLinked: 0,
    backgroundsCreated: 0,
    consultationsCreated: 0,
    ultrasoundsCreated: 0,
    wordDocsArchived: 0,
    skippedItems: [],
    affectedPatients: [],
  };

  const affectedMap = new Map<
    string,
    { id: string; fullName: string; documentNumber: string }
  >();

  const included = params.items.filter((it) => it.included);
  const histories = included.filter((it) => it.kind === "HISTORIA_CLINICA");
  const ultrasounds = included.filter((it) => it.kind === "ECOGRAFIA");

  // 1. Procesar Historias Clínicas primero
  for (const item of histories) {
    const cleanDni = item.documentNumber.trim().toUpperCase();
    const cleanFirst = item.firstName.trim().toUpperCase();
    const cleanLast = item.lastName.trim().toUpperCase();

    if (cleanDni.length < 6 || cleanFirst.length < 2 || cleanLast.length < 2) {
      summary.skippedItems.push({
        fileName: item.fileName,
        reason: "Faltan DNI, nombres o apellidos válidos.",
      });
      continue;
    }

    let patientRow =
      (item.existingPatientId ? patientById.get(item.existingPatientId) : undefined) ??
      patientByDni.get(cleanDni);

    if (!patientRow) {
      const fullName = `${cleanLast}, ${cleanFirst}`;
      const [insertedPatient] = await db
        .insert(patients)
        .values({
          tenantId,
          documentType: "DNI",
          documentNumber: cleanDni,
          firstName: cleanFirst,
          lastName: cleanLast,
          fullName,
          birthDate: item.birthDate || null,
          phone: item.phone.trim() || null,
          address: item.address.trim() || null,
          district: "Miraflores",
          civilStatus: item.civilStatus.trim() || "Soltera",
          occupation: item.occupation.trim() || null,
          educationLevel: item.educationLevel.trim() || null,
          birthPlace: item.birthPlace.trim() || null,
          religion: item.religion.trim() || null,
          insuranceInfo: "Particular",
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      patientRow = insertedPatient;
      patientByDni.set(cleanDni, insertedPatient);
      patientById.set(insertedPatient.id, insertedPatient);
      summary.patientsCreated += 1;
    } else {
      // Completar teléfono o fecha de nacimiento solo si estaban vacíos en BD
      const updates: Partial<typeof patients.$inferInsert> = {};
      if (!patientRow.birthDate && item.birthDate) {
        updates.birthDate = item.birthDate;
      }
      if (!patientRow.phone && item.phone.trim()) {
        updates.phone = item.phone.trim();
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedBy = ctx.userId;
        updates.updatedAt = new Date();
        const [updatedP] = await db
          .update(patients)
          .set(updates)
          .where(eq(patients.id, patientRow.id))
          .returning();
        if (updatedP) {
          patientRow = updatedP;
          patientByDni.set(cleanDni, updatedP);
          patientById.set(updatedP.id, updatedP);
        }
      }
      summary.patientsLinked += 1;
    }

    affectedMap.set(patientRow.id, {
      id: patientRow.id,
      fullName: patientRow.fullName,
      documentNumber: patientRow.documentNumber,
    });

    // Antecedentes
    if (item.background) {
      const [existingBg] = await db
        .select({ id: patientBackgrounds.id })
        .from(patientBackgrounds)
        .where(
          and(
            eq(patientBackgrounds.tenantId, tenantId),
            eq(patientBackgrounds.patientId, patientRow.id),
            isNull(patientBackgrounds.deletedAt)
          )
        )
        .limit(1);

      if (!existingBg) {
        await db.insert(patientBackgrounds).values({
          tenantId,
          patientId: patientRow.id,
          obstetricFormula: item.background.obstetricFormula || "G0 P0000",
          menarche: item.background.menarche,
          sexualDebutAge: item.background.sexualDebutAge,
          sexualPartnersCount: item.background.sexualPartnersCount,
          catamenialRegimen: item.background.catamenialRegimen || null,
          stiHistory: item.background.stiHistory || "Niega",
          contraceptiveMethod:
            item.background.contraceptiveMethod || "Ninguno / No usa",
          lastMenstrualPeriod: item.background.lastMenstrualPeriod || null,
          papHistory: item.background.papHistory || null,
          vphTestHistory: item.background.vphTestHistory || null,
          hasDiabetes: item.background.hasDiabetes || "Niega",
          hasHypertension: item.background.hasHypertension || "Niega",
          hasAsthma: item.background.hasAsthma || "Niega",
          medicalAllergies: item.background.medicalAllergies || "Niega",
          surgeriesHistory: item.background.surgeriesHistory || "Niega",
          familyHistory: item.background.familyHistory || "Niega",
          otherPathologies: item.background.otherPathologies || "Niega",
          notes: item.background.notes || null,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        });
        summary.backgroundsCreated += 1;
      }
    }

    // Consultas y controles (deduplicados por fecha + diagnóstico)
    const existingConsults = await db
      .select({
        consultationDate: medicalConsultations.consultationDate,
        diagnosis: medicalConsultations.diagnosis,
      })
      .from(medicalConsultations)
      .where(
        and(
          eq(medicalConsultations.tenantId, tenantId),
          eq(medicalConsultations.patientId, patientRow.id),
          isNull(medicalConsultations.deletedAt)
        )
      );

    const existingConsultKeys = new Set(
      existingConsults.map(
        (c) => `${c.consultationDate}|${c.diagnosis.trim().toLowerCase()}`
      )
    );

    for (const cons of item.consultations) {
      const key = `${cons.consultationDate}|${cons.diagnosis.trim().toLowerCase()}`;
      if (existingConsultKeys.has(key)) continue;
      existingConsultKeys.add(key);

      await db.insert(medicalConsultations).values({
        tenantId,
        patientId: patientRow.id,
        doctorId: doctor.id,
        doctorName: doctorDisplayName,
        doctorCmp: doctor.cmp,
        doctorRne: doctor.rne ?? null,
        consultationDate: cons.consultationDate,
        reasonForVisit: cons.reasonForVisit,
        symptoms: cons.symptoms || null,
        vitalSigns: {
          ...(cons.bloodPressure ? { bloodPressure: cons.bloodPressure } : {}),
          ...(cons.weightKg ? { weightKg: cons.weightKg } : {}),
          ...(cons.heightCm ? { heightCm: cons.heightCm } : {}),
        },
        physicalExam: {
          generalExam: [
            cons.generalExam || "Paciente lúcida en aparente regular estado general.",
            cons.abdomenExam ? `Abdomen: ${cons.abdomenExam}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          breastsExam: "No evaluado en registro histórico Word.",
          externalGenitalia:
            cons.externalGenitalia || "No consignado en registro Word.",
          speculoscopy: cons.speculoscopy || "No consignado en registro Word.",
          bimanualPalpation:
            cons.bimanualPalpation || "No consignado en registro Word.",
        },
        diagnosis: cons.diagnosis,
        cie10Code: cons.cie10Code.trim().toUpperCase() || null,
        treatmentPlan: cons.treatmentPlan || "Seguimiento clínico.",
        auxiliaryExams: cons.auxiliaryExams || null,
        prescriptionNotes: cons.prescriptionNotes || null,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      });
      summary.consultationsCreated += 1;
    }

    // Respaldo íntegro del .docx en word_history_documents
    const docxBytes = params.filesByKey.get(item.fileKey);
    if (docxBytes && docxBytes.byteLength > 0) {
      const [existingWord] = await db
        .select({ id: wordHistoryDocuments.id })
        .from(wordHistoryDocuments)
        .where(
          and(
            eq(wordHistoryDocuments.tenantId, tenantId),
            eq(wordHistoryDocuments.patientId, patientRow.id),
            eq(wordHistoryDocuments.fileName, item.fileName),
            isNull(wordHistoryDocuments.deletedAt)
          )
        )
        .limit(1);

      if (!existingWord) {
        await saveWordHistoryDocument(ctx, actorName, {
          patientId: patientRow.id,
          fileName: item.fileName,
          fileBytes: docxBytes,
          extractedText: item.extractedText,
          notes: "Importado desde archivo histórico Word (.docx)",
        });
        summary.wordDocsArchived += 1;
      }
    }
  }

  // 2. Procesar Ecografías (.docx)
  for (const eco of ultrasounds) {
    const cleanDni = eco.documentNumber.trim().toUpperCase();
    const patientRow =
      (eco.existingPatientId ? patientById.get(eco.existingPatientId) : undefined) ??
      (cleanDni ? patientByDni.get(cleanDni) : undefined);

    if (!patientRow) {
      summary.skippedItems.push({
        fileName: eco.fileName,
        reason: cleanDni
          ? `No existe paciente con DNI ${cleanDni}. Impórtela primero o incluya su Historia Clínica en el mismo lote.`
          : "Sin paciente asociada (indique el DNI antes de importar).",
      });
      continue;
    }

    affectedMap.set(patientRow.id, {
      id: patientRow.id,
      fullName: patientRow.fullName,
      documentNumber: patientRow.documentNumber,
    });

    const reportDate = eco.reportDate || getPeruDateString();
    const ultrasoundType = eco.ultrasoundType ?? "TRANSVAGINAL";
    const conclusion =
      eco.conclusion?.trim() || "Estudio ecográfico importado desde Word.";

    const existingEcos = await db
      .select({
        reportDate: ultrasoundReports.reportDate,
        ultrasoundType: ultrasoundReports.ultrasoundType,
        conclusion: ultrasoundReports.conclusion,
      })
      .from(ultrasoundReports)
      .where(
        and(
          eq(ultrasoundReports.tenantId, tenantId),
          eq(ultrasoundReports.patientId, patientRow.id),
          isNull(ultrasoundReports.deletedAt)
        )
      );

    const dupEco = existingEcos.some(
      (e) =>
        e.reportDate === reportDate &&
        e.ultrasoundType === ultrasoundType &&
        e.conclusion.trim().toLowerCase() === conclusion.toLowerCase()
    );
    if (dupEco) {
      summary.skippedItems.push({
        fileName: eco.fileName,
        reason: "Ecografía idéntica ya registrada para esa fecha.",
      });
      continue;
    }

    await db.insert(ultrasoundReports).values({
      tenantId,
      patientId: patientRow.id,
      doctorId: doctor.id,
      doctorName: doctorDisplayName,
      doctorCmp: doctor.cmp,
      doctorRne: doctor.rne ?? null,
      reportDate,
      ultrasoundType,
      indication: eco.indication?.trim() || "Evaluación ecográfica",
      findings: enrichUltrasoundFindings(eco.findings),
      conclusion,
      recommendations:
        eco.recommendations?.trim() || "Correlación clínica y control médico.",
      images: [],
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });

    summary.ultrasoundsCreated += 1;
  }

  summary.affectedPatients = Array.from(affectedMap.values());

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "word_import_batch",
    entityId: summary.affectedPatients[0]?.id ?? ctx.userId,
    changesSummary: {
      patientsCreated: summary.patientsCreated,
      patientsLinked: summary.patientsLinked,
      consultationsCreated: summary.consultationsCreated,
      ultrasoundsCreated: summary.ultrasoundsCreated,
      wordDocsArchived: summary.wordDocsArchived,
    },
  });

  return summary;
}
