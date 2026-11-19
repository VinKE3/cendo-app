import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { db } from "@/db";
import {
  clinicalAuditLogs,
  clinicalCheckups,
  colposcopyReports,
  patients,
  ultrasoundReports,
} from "@/db/schema";
import { env } from "@/env";
import { authenticateDoctorByCredentials } from "@/features/auth/services/auth.service";
import type { ClinicalCheckupItem } from "@/features/chequeos/chequeos.schema";
import type { PatientDocumentItem } from "@/features/documentos/documentos.schema";
import { signPayload } from "@/lib/security/crypto";
import { getPeruDateString } from "@/lib/utils";

const TEST_PORT = 3108;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

function startProductionServer(): ChildProcess {
  const nextBin = require.resolve("next/dist/bin/next");
  return spawn(
    process.execPath,
    [nextBin, "start", "-p", String(TEST_PORT), "-H", "127.0.0.1"],
    {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
}

async function waitForServerReady(serverProc: ChildProcess): Promise<void> {
  const deadline = Date.now() + 30000;
  let logs = "";
  serverProc.stdout?.on("data", (chunk: Buffer) => {
    logs += chunk.toString("utf8");
  });
  serverProc.stderr?.on("data", (chunk: Buffer) => {
    logs += chunk.toString("utf8");
  });

  while (Date.now() < deadline) {
    if (serverProc.exitCode !== null) {
      throw new Error(
        `Next server exited early (${serverProc.exitCode}):\n${logs}`
      );
    }
    try {
      const res = await fetch(`${BASE_URL}/login`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return;
    } catch {
      // Wait for port binding
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  throw new Error(`Timeout waiting for ${BASE_URL}:\n${logs}`);
}

async function buildCookieForDoctor(
  email: string,
  password: string
): Promise<string> {
  const doctor = await authenticateDoctorByCredentials(email, password);
  assert.ok(doctor, `No se pudo autenticar a ${email}`);
  const token = await signPayload(
    JSON.stringify({
      userId: doctor.id,
      role: doctor.role,
      tenantId: doctor.tenantId,
    }),
    env.AUTH_SECRET
  );
  return `session_token=${token}`;
}

async function buildSyntheticPdfBytes(
  label: string,
  pageCount: number
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i += 1) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`${label} - Pagina ${i} de ${pageCount}`, {
      x: 50,
      y: 760,
      size: 16,
      font,
    });
  }
  return doc.save();
}

async function main() {
  const activePatients = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dni: patients.documentNumber,
    })
    .from(patients)
    .where(and(eq(patients.tenantId, TENANT_ID), isNull(patients.deletedAt)));

  assert.ok(activePatients.length >= 2, "Se requieren al menos 2 pacientes activos");

  const primaryPatient =
    activePatients.find((p) => p.dni === "71628493") ?? activePatients[0];
  const secondaryPatient =
    activePatients.find((p) => p.id !== primaryPatient.id) ?? activePatients[1];

  const [primaryEcos, primaryColpos, existingPrimaryCheckups] =
    await Promise.all([
      db
        .select({
          id: ultrasoundReports.id,
          ultrasoundType: ultrasoundReports.ultrasoundType,
          conclusion: ultrasoundReports.conclusion,
        })
        .from(ultrasoundReports)
        .where(
          and(
            eq(ultrasoundReports.tenantId, TENANT_ID),
            eq(ultrasoundReports.patientId, primaryPatient.id),
            isNull(ultrasoundReports.deletedAt)
          )
        ),
      db
        .select({
          id: colposcopyReports.id,
          diagnosis: colposcopyReports.diagnosis,
        })
        .from(colposcopyReports)
        .where(
          and(
            eq(colposcopyReports.tenantId, TENANT_ID),
            eq(colposcopyReports.patientId, primaryPatient.id),
            isNull(colposcopyReports.deletedAt)
          )
        ),
      db
        .select({ id: clinicalCheckups.id })
        .from(clinicalCheckups)
        .where(
          and(
            eq(clinicalCheckups.tenantId, TENANT_ID),
            eq(clinicalCheckups.patientId, primaryPatient.id),
            isNull(clinicalCheckups.deletedAt)
          )
        ),
    ]);

  const serverProc = startProductionServer();
  const cleanupDocIds = new Set<string>();
  const cleanupCheckupIds = new Set<string>();
  let drPatrickCookie = "";

  try {
    await waitForServerReady(serverProc);
    console.log(`[1/7] Servidor Next listo en ${BASE_URL}`);

    // 1. 401 JSON sin sesión en los 3 endpoints de Etapa 4B
    const fakeUuid = "00000000-0000-4000-8000-000000000999";
    const [unauthDocs, unauthCheq, unauthDossier] = await Promise.all([
      fetch(`${BASE_URL}/api/patient-documents?patientId=${primaryPatient.id}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`${BASE_URL}/api/chequeos?patientId=${primaryPatient.id}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`${BASE_URL}/api/chequeos/${fakeUuid}/dossier`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      }),
    ]);

    for (const r of [unauthDocs, unauthCheq, unauthDossier]) {
      assert.equal(r.status, 401, "API privada sin sesión debe devolver 401");
      assert.ok((r.headers.get("content-type") || "").includes("application/json"));
    }
    console.log("[2/7] Bloqueo Zero Trust 401 JSON OK en los 3 endpoints 4B");

    const defaultPwd = process.env.SEED_DEFAULT_PASSWORD || "Cendo123";
    drPatrickCookie = await buildCookieForDoctor("cendoperu@gmail.com", defaultPwd);

    // 2. /api/patient-documents: rechazo no-PDF + upload 2 PDFs válidos + descarga binaria
    const badForm = new FormData();
    badForm.append("patientId", primaryPatient.id);
    badForm.append("documentType", "EXTERNO");
    badForm.append("title", "Archivo falso");
    badForm.append(
      "file",
      new Blob(["NO ES UN PDF"], { type: "text/plain" }),
      "fake.txt"
    );
    const badPdfRes = await fetch(`${BASE_URL}/api/patient-documents`, {
      method: "POST",
      headers: { Cookie: drPatrickCookie },
      body: badForm,
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(badPdfRes.status, 400, "Archivo no-PDF debe ser rechazado con 400");

    const pdf1Bytes = await buildSyntheticPdfBytes("PLACAS VINNO E35 MAMA", 2);
    const pdf2Bytes = await buildSyntheticPdfBytes("RESULTADO BIOLAQ PAP", 1);
    const todayStr = getPeruDateString();

    const uploadPdf = async (
      patientId: string,
      docType: string,
      title: string,
      fileName: string,
      bytes: Uint8Array
    ): Promise<PatientDocumentItem> => {
      const form = new FormData();
      form.append("patientId", patientId);
      form.append("documentType", docType);
      form.append("title", title);
      form.append("documentDate", todayStr);
      form.append(
        "file",
        new Blob([Buffer.from(bytes)], { type: "application/pdf" }),
        fileName
      );
      const res = await fetch(`${BASE_URL}/api/patient-documents`, {
        method: "POST",
        headers: { Cookie: drPatrickCookie },
        body: form,
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(res.status, 201, `Upload ${title} debe devolver 201`);
      const json = (await res.json()) as {
        success: boolean;
        data: PatientDocumentItem;
      };
      assert.equal(json.success, true);
      cleanupDocIds.add(json.data.id);
      return json.data;
    };

    const docMama = await uploadPdf(
      primaryPatient.id,
      "PLACAS_ECO_MAMA",
      "Placas Eco Mama Test 4B",
      "placas-mama-4b.pdf",
      pdf1Bytes
    );
    const docPap = await uploadPdf(
      primaryPatient.id,
      "LABORATORIO_PAP",
      "Resultado PAP BIOLAQ Test 4B",
      "biolaq-pap-4b.pdf",
      pdf2Bytes
    );

    const downloadDocRes = await fetch(
      `${BASE_URL}/api/patient-documents?id=${encodeURIComponent(docMama.id)}`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(downloadDocRes.status, 200);
    assert.ok(
      (downloadDocRes.headers.get("content-type") || "").includes("application/pdf")
    );
    const docMagic = Buffer.from(await downloadDocRes.arrayBuffer())
      .subarray(0, 5)
      .toString("ascii");
    assert.equal(docMagic, "%PDF-");
    console.log(
      "[3/7] /api/patient-documents OK (rechaza no-PDF 400, sube a lab-reports, descarga %PDF-)"
    );

    // 3. Anti-IDOR: documento de paciente B en chequeo de paciente A -> debe rechazar 400
    const secondaryPdfBytes = await buildSyntheticPdfBytes("DOC PACIENTE B", 1);
    const secondaryDoc = await uploadPdf(
      secondaryPatient.id,
      "EXTERNO",
      "PDF Privado Paciente B",
      "paciente-b.pdf",
      secondaryPdfBytes
    );

    const idorRes = await fetch(`${BASE_URL}/api/chequeos`, {
      method: "POST",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId: primaryPatient.id,
        consultationId: "",
        checkupDate: todayStr,
        status: "EN_PROCESO",
        reasonForConsultation: "Prueba Anti-IDOR Etapa 4B",
        conclusions: "Prueba de aislamiento inter-paciente.",
        dossierConfig: {
          coverTitle: "CHEQUEO GINECOLÓGICO",
          includeCoverPage: true,
          includeSummarySheet: false,
          showDigitalSignature: true,
          items: [
            {
              kind: "DOCUMENT",
              refId: secondaryDoc.id,
              label: "Documento Ajeno",
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(
      idorRes.status,
      400,
      "Referencia a estudio/PDF de otro paciente debe rechazarse con 400 (Anti-IDOR)"
    );

    // 4. CRUD /api/chequeos con estudios existentes + 2 PDFs externos
    const dossierItems: Array<{
      kind: "ULTRASOUND" | "COLPOSCOPY" | "DOCUMENT";
      refId: string;
      label: string;
    }> = [];

    if (primaryEcos[0]) {
      dossierItems.push({
        kind: "ULTRASOUND",
        refId: primaryEcos[0].id,
        label: `Ecografía (${primaryEcos[0].ultrasoundType})`,
      });
    }
    dossierItems.push({
      kind: "DOCUMENT",
      refId: docMama.id,
      label: docMama.title,
    });
    if (primaryColpos[0]) {
      dossierItems.push({
        kind: "COLPOSCOPY",
        refId: primaryColpos[0].id,
        label: "Colposcopía Digital IFCPC",
      });
    }
    dossierItems.push({
      kind: "DOCUMENT",
      refId: docPap.id,
      label: docPap.title,
    });

    const createPayload = {
      patientId: primaryPatient.id,
      consultationId: "",
      checkupDate: todayStr,
      status: "EN_PROCESO" as const,
      reasonForConsultation: "Chequeo ginecológico preventivo integral E2E 4B",
      breastUltrasoundBirads: "BI-RADS 2 (Hallazgo Benigno)",
      breastUltrasoundFindings:
        "Estudio ecográfico mamario bilateral integrado al Dossier.",
      breastLesionMeasurements: "Sin nódulos sospechosos",
      transvaginalUltrasoundFindings:
        primaryEcos[0]?.conclusion ?? "Útero y anexos sin alteraciones.",
      uterusMeasurements: "72 x 42 x 46 mm",
      endometriumThicknessMm: 7.4,
      ovariesFindings: "Ovarios de morfología conservada.",
      colposcopyFindings:
        primaryColpos[0]?.diagnosis ?? "Zona de transformación normal.",
      colposcopyResult: "Normal (Sin LIE)",
      papResult: "Negativo para lesión intraepitelial o malignidad (NILM)",
      vphResult: "No detectado (14 genotipos AR)",
      conclusions:
        "Chequeo ginecológico integral completo con evolución clínica favorable.",
      cie10Code: "Z01.4",
      medicalPrescription: "Control ginecológico anual de rutina.",
      dossierConfig: {
        coverTitle: "CHEQUEO GINECOLÓGICO",
        includeCoverPage: true,
        includeSummarySheet: false,
        showDigitalSignature: true,
        items: dossierItems,
      },
    };

    const createCheqRes = await fetch(`${BASE_URL}/api/chequeos`, {
      method: "POST",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createPayload),
      signal: AbortSignal.timeout(15000),
    });

    assert.equal(createCheqRes.status, 201, "POST /api/chequeos debe devolver 201");
    const createdCheqJson = (await createCheqRes.json()) as {
      success: boolean;
      data: ClinicalCheckupItem;
    };
    const tempCheckup = createdCheqJson.data;
    cleanupCheckupIds.add(tempCheckup.id);

    const listCheqRes = await fetch(
      `${BASE_URL}/api/chequeos?patientId=${primaryPatient.id}`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(listCheqRes.status, 200);

    const patchCheqRes = await fetch(`${BASE_URL}/api/chequeos`, {
      method: "PATCH",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...createPayload,
        id: tempCheckup.id,
        status: "COMPLETO",
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(patchCheqRes.status, 200);
    console.log(
      `[4/7] Anti-IDOR 400 + CRUD /api/chequeos OK (${dossierItems.length} piezas en Dossier)`
    );

    // 5. Generación binaria Dossier PDF Unificado (default vs ?summary=1&sig=0)
    const dossierDefaultRes = await fetch(
      `${BASE_URL}/api/chequeos/${encodeURIComponent(tempCheckup.id)}/dossier`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(dossierDefaultRes.status, 200);
    assert.ok(
      (dossierDefaultRes.headers.get("content-type") || "").includes("application/pdf")
    );
    const defaultHeaderPages = Number(
      dossierDefaultRes.headers.get("x-dossier-pages") ?? "0"
    );
    const defaultBytes = new Uint8Array(await dossierDefaultRes.arrayBuffer());
    const parsedDefaultPdf = await PDFDocument.load(defaultBytes);
    const defaultPages = parsedDefaultPdf.getPageCount();
    assert.equal(defaultPages, defaultHeaderPages);
    const minExpectedPages =
      1 + // Carátula CENDO
      (primaryEcos[0] ? 1 : 0) +
      2 + // docMama (2 páginas)
      (primaryColpos[0] ? 1 : 0) +
      1; // docPap (1 página)
    assert.ok(
      defaultPages >= minExpectedPages,
      `El dossier debe tener al menos ${minExpectedPages} páginas (tuvo ${defaultPages})`
    );

    const dossierSummaryRes = await fetch(
      `${BASE_URL}/api/chequeos/${encodeURIComponent(tempCheckup.id)}/dossier?summary=1&sig=0`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(dossierSummaryRes.status, 200);
    const summaryBytes = new Uint8Array(await dossierSummaryRes.arrayBuffer());
    const parsedSummaryPdf = await PDFDocument.load(summaryBytes);
    assert.equal(
      parsedSummaryPdf.getPageCount(),
      defaultPages + 1,
      "?summary=1 debe insertar 1 hoja resumen ejecutiva adicional"
    );
    console.log(
      `[5/7] Dossier PDF Unificado validado (${defaultPages} págs base / ${parsedSummaryPdf.getPageCount()} págs con resumen)`
    );

    // 6. Auditoría clínica + SSR /pacientes/[id]
    const auditRows = await db
      .select({
        entityType: clinicalAuditLogs.entityType,
        action: clinicalAuditLogs.action,
      })
      .from(clinicalAuditLogs)
      .where(
        and(
          eq(clinicalAuditLogs.tenantId, TENANT_ID),
          inArray(clinicalAuditLogs.entityType, [
            "patient_document",
            "clinical_checkup",
            "checkup_dossier",
          ])
        )
      )
      .orderBy(desc(clinicalAuditLogs.createdAt))
      .limit(20);

    assert.ok(auditRows.some((r) => r.entityType === "patient_document"));
    assert.ok(auditRows.some((r) => r.entityType === "clinical_checkup"));
    assert.ok(
      auditRows.some(
        (r) => r.entityType === "checkup_dossier" && r.action === "VIEW"
      )
    );

    const ssrRes = await fetch(`${BASE_URL}/pacientes/${primaryPatient.id}`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(ssrRes.status, 200);
    const html = await ssrRes.text();
    assert.ok(html.includes(primaryPatient.lastName));
    assert.ok(html.includes("Chequeo Integral &amp; Dossier PDF") || html.includes("Chequeos"));
    console.log("[6/7] Auditoría 4B y SSR /pacientes/[id] verificados OK");

    // 7. Limpiar temporales y sembrar 1 chequeo demo idempotente en Gabriela
    for (const chkId of cleanupCheckupIds) {
      await fetch(`${BASE_URL}/api/chequeos?id=${encodeURIComponent(chkId)}`, {
        method: "DELETE",
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      });
    }
    cleanupCheckupIds.clear();

    for (const docId of cleanupDocIds) {
      await fetch(
        `${BASE_URL}/api/patient-documents?id=${encodeURIComponent(docId)}`,
        {
          method: "DELETE",
          headers: { Cookie: drPatrickCookie },
          signal: AbortSignal.timeout(15000),
        }
      );
    }
    cleanupDocIds.clear();

    if (existingPrimaryCheckups.length === 0) {
      const demoItems: Array<{
        kind: "ULTRASOUND" | "COLPOSCOPY";
        refId: string;
        label: string;
      }> = [];
      if (primaryEcos[0]) {
        demoItems.push({
          kind: "ULTRASOUND",
          refId: primaryEcos[0].id,
          label: "Ecografía Ginecológica Especializada (IDEA)",
        });
      }
      if (primaryColpos[0]) {
        demoItems.push({
          kind: "COLPOSCOPY",
          refId: primaryColpos[0].id,
          label: "Colposcopía Digital IFCPC",
        });
      }
      const seedRes = await fetch(`${BASE_URL}/api/chequeos`, {
        method: "POST",
        headers: {
          Cookie: drPatrickCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: primaryPatient.id,
          consultationId: "",
          checkupDate: todayStr,
          status: "EN_PROCESO",
          reasonForConsultation:
            "Chequeo ginecológico preventivo integral y mapeo ecográfico",
          breastUltrasoundBirads: "No realizado en este chequeo",
          breastLesionMeasurements: "Pendiente de evaluación mamaria",
          transvaginalUltrasoundFindings:
            primaryEcos[0]?.conclusion ??
            "Control ecográfico transvaginal en seguimiento.",
          colposcopyFindings:
            primaryColpos[0]?.diagnosis ??
            "Pendiente de programar control colposcópico.",
          papResult: "Pendiente de resultado BIOLAQ",
          vphResult: "Pendiente según indicación",
          conclusions:
            "Chequeo ginecológico en seguimiento con estudios ecográficos integrados.",
          cie10Code: "Z01.4",
          medicalPrescription:
            "Adjuntar placas ecográficas y resultados externos cuando estén disponibles para emitir Dossier PDF completo.",
          dossierConfig: {
            coverTitle: "CHEQUEO GINECOLÓGICO",
            includeCoverPage: true,
            includeSummarySheet: false,
            showDigitalSignature: true,
            items: demoItems,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(seedRes.status, 201);
      console.log(
        `[7/7] Temporales limpiados y Chequeo Integral demo sembrado para ${primaryPatient.firstName}`
      );
    } else {
      console.log(
        "[7/7] Temporales limpiados; Chequeo Integral demo ya presente (idempotente)"
      );
    }

    console.log("\nVALIDACIÓN E2E ETAPA 4B COMPLETADA AL 100%.");
  } finally {
    if (drPatrickCookie) {
      for (const chkId of cleanupCheckupIds) {
        await fetch(
          `${BASE_URL}/api/chequeos?id=${encodeURIComponent(chkId)}`,
          {
            method: "DELETE",
            headers: { Cookie: drPatrickCookie },
            signal: AbortSignal.timeout(5000),
          }
        ).catch(() => {});
      }
      for (const docId of cleanupDocIds) {
        await fetch(
          `${BASE_URL}/api/patient-documents?id=${encodeURIComponent(docId)}`,
          {
            method: "DELETE",
            headers: { Cookie: drPatrickCookie },
            signal: AbortSignal.timeout(5000),
          }
        ).catch(() => {});
      }
    }
    if (serverProc.exitCode === null) {
      serverProc.kill("SIGTERM");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[validate-etapa-4b] Error:", err);
    process.exit(1);
  });
