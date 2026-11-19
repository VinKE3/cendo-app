import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clinicalAuditLogs,
  medicalConsultations,
  minorProcedures,
  patientBackgrounds,
  patients,
} from "@/db/schema";
import { env } from "@/env";
import { authenticateDoctorByCredentials } from "@/features/auth/services/auth.service";
import type { ClinicalTemplateItem } from "@/features/clinical-templates/clinical-templates.schema";
import type { MinorProcedureItem } from "@/features/procedimientos/procedimientos.schema";
import { signPayload } from "@/lib/security/crypto";
import { getPeruDateString } from "@/lib/utils";

const TEST_PORT = 3109;
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

  const danielaPatient =
    activePatients.find((p) => p.dni === "74195820") ?? activePatients[0];
  const otherPatient =
    activePatients.find((p) => p.id !== danielaPatient.id) ?? activePatients[1];

  const [[otherConsultation], [otherBgBefore], existingDanielaProcs] =
    await Promise.all([
      db
        .select({ id: medicalConsultations.id })
        .from(medicalConsultations)
        .where(
          and(
            eq(medicalConsultations.tenantId, TENANT_ID),
            eq(medicalConsultations.patientId, otherPatient.id),
            isNull(medicalConsultations.deletedAt)
          )
        )
        .limit(1),
      db
        .select({
          id: patientBackgrounds.id,
          contraceptiveMethod: patientBackgrounds.contraceptiveMethod,
        })
        .from(patientBackgrounds)
        .where(
          and(
            eq(patientBackgrounds.tenantId, TENANT_ID),
            eq(patientBackgrounds.patientId, otherPatient.id),
            isNull(patientBackgrounds.deletedAt)
          )
        )
        .limit(1),
      db
        .select({ id: minorProcedures.id })
        .from(minorProcedures)
        .where(
          and(
            eq(minorProcedures.tenantId, TENANT_ID),
            eq(minorProcedures.patientId, danielaPatient.id),
            isNull(minorProcedures.deletedAt)
          )
        ),
    ]);

  const serverProc = startProductionServer();
  const cleanupProcIds = new Set<string>();
  let drPatrickCookie = "";

  try {
    await waitForServerReady(serverProc);
    console.log(`[1/7] Servidor Next listo en ${BASE_URL}`);

    // 1. 401 JSON sin sesión
    const [unauthGet, unauthPost] = await Promise.all([
      fetch(`${BASE_URL}/api/procedimientos?patientId=${danielaPatient.id}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`${BASE_URL}/api/procedimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      }),
    ]);

    for (const r of [unauthGet, unauthPost]) {
      assert.equal(r.status, 401, "Endpoint sin sesión debe responder 401");
      assert.ok((r.headers.get("content-type") || "").includes("application/json"));
    }
    console.log("[2/7] Bloqueo Zero Trust 401 JSON OK en /api/procedimientos");

    const defaultPwd = process.env.SEED_DEFAULT_PASSWORD || "Cendo123";
    drPatrickCookie = await buildCookieForDoctor("cendoperu@gmail.com", defaultPwd);

    // 2. Auto-seed de las 9 plantillas oficiales de Procedimientos Menores
    const tmplRes = await fetch(
      `${BASE_URL}/api/clinical-templates?scope=PROCEDURE`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(tmplRes.status, 200);
    const tmplJson = (await tmplRes.json()) as {
      success: boolean;
      data: ClinicalTemplateItem[];
    };
    assert.equal(tmplJson.success, true);
    const procTemplates = tmplJson.data.filter((t) => t.scope === "PROCEDURE");
    assert.ok(
      procTemplates.length >= 9,
      `Se esperaban al menos 9 plantillas oficiales de procedimientos (recibidas: ${procTemplates.length})`
    );
    console.log(
      `[3/7] Plantillas clínicas PROCEDURE auto-sembradas OK (${procTemplates.length} protocolos oficiales)`
    );

    // 3. Anti-IDOR: consulta de otro paciente en procedimiento de Daniela -> 400
    const todayStr = getPeruDateString();
    if (otherConsultation) {
      const idorRes = await fetch(`${BASE_URL}/api/procedimientos`, {
        method: "POST",
        headers: {
          Cookie: drPatrickCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: danielaPatient.id,
          consultationId: otherConsultation.id,
          procedureDate: todayStr,
          procedureType: "BIOPSIA_CERVICAL",
          preOpDiagnosis: "Prueba Anti-IDOR",
          postOpDiagnosis: "Biopsia cervical dirigida",
          cie10Code: "N87.0",
          anesthesiaType: "Local (Lidocaína 2%)",
          procedureDetails: {
            asepsisTechnique: "Antisepsia local.",
            specimenSentToPathology: true,
            bleedingAmount: "Mínimo (< 10 ml)",
            hemostasisMethod: "Solución de Monsel",
            complications: "Ninguna.",
          },
          postOpIndications: "Reposo relativo.",
        }),
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(
        idorRes.status,
        400,
        "Referencia a consulta de otra paciente debe rechazarse con 400 (Anti-IDOR)"
      );
    }

    // 4. CRUD /api/procedimientos + seguimiento de Patología (PENDIENTE -> RECIBIDO)
    const createPayload = {
      patientId: danielaPatient.id,
      consultationId: "",
      procedureDate: todayStr,
      procedureType: "CONO_LEEP" as const,
      preOpDiagnosis: "LIE de Alto Grado (NIC II)",
      postOpDiagnosis: "Conización cervical electroquirúrgica con asa LEEP",
      cie10Code: "N87.1",
      anesthesiaType: "Infiltración Paracervical (Lidocaína 2%)",
      procedureDetails: {
        asepsisTechnique:
          "Antisepsia vulvovaginal rigurosa e infiltración paracervical con lidocaína 2%.",
        biopsySites: "Zona de transformación cervical completa.",
        specimenSentToPathology: true,
        specimenDescription:
          "Cono cervical en formol 10% con reparo horario en H12.",
        bleedingAmount: "Escaso (10 - 30 ml)",
        hemostasisMethod: "Electrocoagulación + Solución de Monsel",
        complications: "Ninguna. Lecho hemostático.",
        informedConsentConfirmed: true,
        deviceInfo: "",
        pathologyStatus: "PENDIENTE" as const,
        pathologyResultNotes: "",
      },
      postOpIndications: "Reposo relativo por 72h y abstinencia sexual por 4 semanas.",
      medicationsPrescribed: "Ketorolaco 10 mg c/8h por 3 días.",
      nextControlDate: "",
      syncPatientMac: false,
    };

    const createRes = await fetch(`${BASE_URL}/api/procedimientos`, {
      method: "POST",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createPayload),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(createRes.status, 201);
    const createdJson = (await createRes.json()) as {
      success: boolean;
      data: MinorProcedureItem;
    };
    const tempProc = createdJson.data;
    cleanupProcIds.add(tempProc.id);
    assert.equal(tempProc.procedureDetails.pathologyStatus, "PENDIENTE");

    const patchRes = await fetch(`${BASE_URL}/api/procedimientos`, {
      method: "PATCH",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...createPayload,
        id: tempProc.id,
        procedureDetails: {
          ...createPayload.procedureDetails,
          pathologyStatus: "RECIBIDO",
          pathologyResultNotes:
            "BIOLAQ AP-2026: NIC II confirmado con márgenes quirúrgicos libres.",
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(patchRes.status, 200);
    const patchedJson = (await patchRes.json()) as {
      success: boolean;
      data: MinorProcedureItem;
    };
    assert.equal(
      patchedJson.data.procedureDetails.pathologyStatus,
      "RECIBIDO"
    );
    console.log(
      "[4/7] Anti-IDOR 400 + CRUD /api/procedimientos + seguimiento Patología (PENDIENTE -> RECIBIDO) OK"
    );

    // 5. Inserción de Implante con sincronización automática de MAC en patient_backgrounds
    const macProcRes = await fetch(`${BASE_URL}/api/procedimientos`, {
      method: "POST",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId: otherPatient.id,
        consultationId: "",
        procedureDate: todayStr,
        procedureType: "INSERCION_IMPLANTE",
        preOpDiagnosis: "Solicitud de anticoncepción subdérmica",
        postOpDiagnosis: "Inserción de implante subdérmico Nexplanon 68 mg",
        cie10Code: "Z30.0",
        anesthesiaType: "Local (Lidocaína 2%)",
        procedureDetails: {
          asepsisTechnique: "Antisepsia en brazo izquierdo e infiltración con lidocaína 2%.",
          biopsySites: "Cara interna brazo izquierdo.",
          specimenSentToPathology: false,
          specimenDescription: "",
          bleedingAmount: "Mínimo (< 10 ml)",
          hemostasisMethod: "Compresión",
          complications: "Ninguna.",
          informedConsentConfirmed: true,
          deviceInfo: "Implante Nexplanon 68 mg • Vigencia 3 años",
          pathologyStatus: "NO_APLICA",
          pathologyResultNotes: "",
        },
        postOpIndications: "Vendaje compresivo por 24 horas.",
        medicationsPrescribed: "Paracetamol 500 mg condicional.",
        nextControlDate: "",
        syncPatientMac: true,
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(macProcRes.status, 201);
    const macProcJson = (await macProcRes.json()) as {
      success: boolean;
      data: MinorProcedureItem & { syncedMac?: string | null };
    };
    cleanupProcIds.add(macProcJson.data.id);
    assert.equal(macProcJson.data.syncedMac, "Implante subdérmico");

    const [bgAfter] = await db
      .select({ contraceptiveMethod: patientBackgrounds.contraceptiveMethod })
      .from(patientBackgrounds)
      .where(
        and(
          eq(patientBackgrounds.tenantId, TENANT_ID),
          eq(patientBackgrounds.patientId, otherPatient.id),
          isNull(patientBackgrounds.deletedAt)
        )
      )
      .limit(1);
    assert.equal(bgAfter?.contraceptiveMethod, "Implante subdérmico");

    // Restaurar MAC original del paciente de prueba
    if (otherBgBefore) {
      await db
        .update(patientBackgrounds)
        .set({ contraceptiveMethod: otherBgBefore.contraceptiveMethod })
        .where(eq(patientBackgrounds.id, otherBgBefore.id));
    }
    console.log(
      "[5/7] Sincronización automática de MAC en patient_backgrounds (DIU/Implante) verificada OK"
    );

    // 6. Auditoría clínica + SSR /pacientes/[id]?tab=procedimientos
    const auditRows = await db
      .select({
        entityType: clinicalAuditLogs.entityType,
        action: clinicalAuditLogs.action,
      })
      .from(clinicalAuditLogs)
      .where(
        and(
          eq(clinicalAuditLogs.tenantId, TENANT_ID),
          eq(clinicalAuditLogs.entityType, "minor_procedure")
        )
      )
      .orderBy(desc(clinicalAuditLogs.createdAt))
      .limit(10);

    assert.ok(auditRows.some((r) => r.action === "CREATE"));
    assert.ok(auditRows.some((r) => r.action === "UPDATE"));

    const ssrRes = await fetch(
      `${BASE_URL}/pacientes/${danielaPatient.id}?tab=procedimientos`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(ssrRes.status, 200);
    const html = await ssrRes.text();
    assert.ok(html.includes(danielaPatient.lastName));
    assert.ok(html.includes("Procedimientos Menores"));
    console.log(
      "[6/7] Auditoría minor_procedure y SSR /pacientes/[id]?tab=procedimientos OK"
    );

    // 7. Limpiar temporales y sembrar 1 procedimiento demo idempotente en Daniela Castro
    for (const procId of cleanupProcIds) {
      const delRes = await fetch(
        `${BASE_URL}/api/procedimientos?id=${encodeURIComponent(procId)}`,
        {
          method: "DELETE",
          headers: { Cookie: drPatrickCookie },
          signal: AbortSignal.timeout(15000),
        }
      );
      assert.equal(delRes.status, 200);
    }
    cleanupProcIds.clear();

    if (existingDanielaProcs.length === 0) {
      const seedRes = await fetch(`${BASE_URL}/api/procedimientos`, {
        method: "POST",
        headers: {
          Cookie: drPatrickCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: danielaPatient.id,
          consultationId: "",
          procedureDate: todayStr,
          procedureType: "BIOPSIA_CERVICAL",
          preOpDiagnosis:
            "Displasia cervical leve (NIC I) en estudio colposcópico IFCPC (ZT Tipo 1)",
          postOpDiagnosis:
            "Biopsia cervical dirigida tomada con pinza Tischler-Morgan en H6 y H12",
          cie10Code: "N87.0",
          anesthesiaType: "Local (Lidocaína 2%)",
          procedureDetails: {
            asepsisTechnique:
              "Asepsia y antisepsia vulvovaginal con clorhexidina acuosa al 2%. Visualización colposcópica tras ácido acético al 5% y test de Schiller.",
            biopsySites:
              "Cérvix uterino en labio anterior (hora 12:00) y labio posterior (hora 6:00) según mapeo horario IFCPC.",
            specimenSentToPathology: true,
            specimenDescription:
              "Dos fragmentos tisulares de cérvix (H6 y H12) en formol tamponado al 10% remitidos a Anatomía Patológica (BIOLAQ).",
            bleedingAmount: "Mínimo (< 10 ml)",
            hemostasisMethod: "Solución de Monsel",
            complications:
              "Ninguna. Hemostasia satisfactoria; paciente egresa estable.",
            informedConsentConfirmed: true,
            deviceInfo: "",
            pathologyStatus: "PENDIENTE",
            pathologyResultNotes: "",
          },
          postOpIndications: `1. No realizar esfuerzos físicos intensos por 72 horas.
2. Abstinencia sexual estricta por 7 a 10 días.
3. No utilizar tampones ni duchas vaginales.
4. Es normal observar flujo oscuro o grumos color café (efecto de la solución de Monsel).
5. Acudir ante sangrado mayor a una menstruación o fiebre > 38 °C.`,
          medicationsPrescribed:
            "Paracetamol 500 mg vía oral cada 8 horas por 48 horas condicional a dolor.",
          nextControlDate: "",
          syncPatientMac: false,
        }),
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(seedRes.status, 201);
      console.log(
        `[7/7] Temporales limpiados y Biopsia Cervical demo sembrada para ${danielaPatient.firstName}`
      );
    } else {
      console.log(
        "[7/7] Temporales limpiados; Procedimiento Menor demo ya presente (idempotente)"
      );
    }

    console.log("\nVALIDACIÓN E2E PROCEDIMIENTOS MENORES COMPLETADA AL 100%.");
  } finally {
    if (drPatrickCookie) {
      for (const procId of cleanupProcIds) {
        await fetch(
          `${BASE_URL}/api/procedimientos?id=${encodeURIComponent(procId)}`,
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
    console.error("[validate-procedimientos] Error:", err);
    process.exit(1);
  });
