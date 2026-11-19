import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clinicalAuditLogs,
  colposcopyReports,
  medicalConsultations,
  patients,
  ultrasoundReports,
} from "@/db/schema";
import { env } from "@/env";
import { authenticateDoctorByCredentials } from "@/features/auth/services/auth.service";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import { signPayload } from "@/lib/security/crypto";
import { getPeruDateString } from "@/lib/utils";

const TEST_PORT = 3106;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

const VALID_1X1_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

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

async function uploadTestPng(
  cookie: string,
  patientId: string,
  clinicalModule: "ecografias" | "colposcopia",
  filename: string
): Promise<{ storagePath: string; viewUrl: string }> {
  const form = new FormData();
  form.append("patientId", patientId);
  form.append("module", clinicalModule);
  form.append("file", new Blob([VALID_1X1_PNG], { type: "image/png" }), filename);

  const res = await fetch(`${BASE_URL}/api/clinical-images`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(res.status, 200, `Upload ${clinicalModule} debe devolver 200`);
  const json = (await res.json()) as {
    success: boolean;
    data: { storagePath: string; viewUrl: string };
  };
  assert.equal(json.success, true);
  assert.ok(json.data.storagePath.includes(`/${clinicalModule}/`));
  return json.data;
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

  assert.ok(activePatients.length > 0, "Se requiere al menos 1 paciente activo");

  const primaryPatient =
    activePatients.find((p) => p.dni === "71628493") ?? activePatients[0];
  const secondaryPatient =
    activePatients.find((p) => p.dni === "74195820") ?? primaryPatient;

  const [linkedCons] = await db
    .select({ id: medicalConsultations.id })
    .from(medicalConsultations)
    .where(
      and(
        eq(medicalConsultations.tenantId, TENANT_ID),
        eq(medicalConsultations.patientId, primaryPatient.id),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .limit(1);

  const serverProc = startProductionServer();
  const cleanupPaths = new Set<string>();
  let drPatrickCookie = "";

  try {
    await waitForServerReady(serverProc);
    console.log(`[1/9] Servidor Next listo en ${BASE_URL}`);

    // 1. 401 JSON sin sesión
    const [unauthImg, unauthEco, unauthColpo] = await Promise.all([
      fetch(`${BASE_URL}/api/clinical-images?path=clinical/x`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`${BASE_URL}/api/ecografias?patientId=${primaryPatient.id}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`${BASE_URL}/api/colposcopia?patientId=${primaryPatient.id}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      }),
    ]);

    for (const r of [unauthImg, unauthEco, unauthColpo]) {
      assert.equal(r.status, 401, "API privada sin cookie debe responder 401");
      assert.ok((r.headers.get("content-type") || "").includes("application/json"));
    }
    console.log("[2/9] Bloqueo Zero Trust 401 JSON OK en los 3 endpoints");

    const defaultPwd = process.env.SEED_DEFAULT_PASSWORD || "Cendo123";
    drPatrickCookie = await buildCookieForDoctor("cendoperu@gmail.com", defaultPwd);

    // 2. Seguridad /api/clinical-images (SVG, Path Traversal, Cross-tenant, Upload/Download/Delete)
    const svgForm = new FormData();
    svgForm.append("patientId", primaryPatient.id);
    svgForm.append("module", "ecografias");
    svgForm.append(
      "file",
      new Blob(["<svg><script>alert(1)</script></svg>"], { type: "image/svg+xml" }),
      "bad.svg"
    );
    const badSvgRes = await fetch(`${BASE_URL}/api/clinical-images`, {
      method: "POST",
      headers: { Cookie: drPatrickCookie },
      body: svgForm,
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(badSvgRes.status, 400, "SVG debe ser rechazado con 400");

    const traversalRes = await fetch(
      `${BASE_URL}/api/clinical-images?path=${encodeURIComponent("../../../etc/passwd")}`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(traversalRes.status, 400, "Path traversal debe responder 400");

    const crossTenantPath = `clinical/00000000-0000-0000-0000-000000000099/${primaryPatient.id}/ecografias/11111111-1111-1111-1111-111111111111.png`;
    const crossTenantRes = await fetch(
      `${BASE_URL}/api/clinical-images?path=${encodeURIComponent(crossTenantPath)}`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(crossTenantRes.status, 403, "Acceso cross-tenant debe devolver 403");

    const uploadedTest = await uploadTestPng(
      drPatrickCookie,
      primaryPatient.id,
      "ecografias",
      "test-clinical.png"
    );
    cleanupPaths.add(uploadedTest.storagePath);

    const downloadRes = await fetch(`${BASE_URL}${uploadedTest.viewUrl}`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(downloadRes.status, 200);
    const downloadedBytes = new Uint8Array(await downloadRes.arrayBuffer());
    assert.deepEqual(Array.from(downloadedBytes.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);

    const delImgRes = await fetch(
      `${BASE_URL}/api/clinical-images?path=${encodeURIComponent(uploadedTest.storagePath)}`,
      {
        method: "DELETE",
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(delImgRes.status, 200);
    cleanupPaths.delete(uploadedTest.storagePath);

    const afterDelImgRes = await fetch(`${BASE_URL}${uploadedTest.viewUrl}`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(afterDelImgRes.status, 404);
    console.log("[3/9] Seguridad y ciclo Storage /api/clinical-images OK");

    // 3. CRUD /api/ecografias + cálculo volumen elipsoide + limpieza huérfanas
    const ecoPhoto = await uploadTestPng(
      drPatrickCookie,
      primaryPatient.id,
      "ecografias",
      "eco-idea.png"
    );
    cleanupPaths.add(ecoPhoto.storagePath);

    const todayStr = getPeruDateString();
    const createEcoRes = await fetch(`${BASE_URL}/api/ecografias`, {
      method: "POST",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId: primaryPatient.id,
        consultationId: linkedCons?.id ?? "",
        reportDate: todayStr,
        ultrasoundType: "TRANSVAGINAL",
        indication: "Dismenorrea severa - Prueba E2E",
        findings: {
          uterusPosition: "RVF",
          uterusDimensions: "80 x 40 x 50 mm",
          myometriumStatus: "Heterogéneo leve",
          endometriumThicknessMm: 7.5,
          endometriumPattern: "Secretor",
          slidingSign: "Negativo",
          uterosacralLigaments: "Engrosamiento focal izquierdo",
          douglasPouch: "Obliteración parcial posterior",
        },
        conclusion: "Signos ecográficos de endometriosis profunda (IDEA).",
        recommendations: "Correlación clínica CENDO.",
        images: [
          {
            storagePath: ecoPhoto.storagePath,
            caption: "Útero RVF y ligamento uterosacro",
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(createEcoRes.status, 201, "POST /api/ecografias debe devolver 201");
    const createdEcoJson = (await createEcoRes.json()) as {
      data: UltrasoundReportItem;
    };
    const ecoId = createdEcoJson.data.id;
    assert.equal(createdEcoJson.data.findings.uterusVolumeCc, 83.7, "Volumen elipsoide auto-calculado debe ser 83.7 cc");
    assert.equal(createdEcoJson.data.findings.slidingSign, "Negativo");
    assert.equal(createdEcoJson.data.images.length, 1);

    const listEcoRes = await fetch(
      `${BASE_URL}/api/ecografias?patientId=${primaryPatient.id}`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(listEcoRes.status, 200);
    const listEcoJson = (await listEcoRes.json()) as {
      data: UltrasoundReportItem[];
    };
    assert.ok(listEcoJson.data.some((u) => u.id === ecoId));

    // PATCH removiendo foto -> debe eliminar huérfana de Storage privado
    const patchEcoRes = await fetch(`${BASE_URL}/api/ecografias`, {
      method: "PATCH",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: ecoId,
        patientId: primaryPatient.id,
        consultationId: linkedCons?.id ?? "",
        reportDate: todayStr,
        ultrasoundType: "TRANSVAGINAL",
        indication: "Dismenorrea severa - Prueba E2E actualizada",
        findings: {
          uterusPosition: "AVF",
          uterusDimensions: "70 x 40 x 46 mm",
          slidingSign: "Positivo",
        },
        conclusion: "Actualización de prueba E2E.",
        recommendations: "Control en 6 meses.",
        images: [],
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(patchEcoRes.status, 200);

    const orphanEcoCheck = await fetch(`${BASE_URL}${ecoPhoto.viewUrl}`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(orphanEcoCheck.status, 404, "La foto removida al editar debe limpiarse del Storage");
    cleanupPaths.delete(ecoPhoto.storagePath);

    const delEcoRes = await fetch(`${BASE_URL}/api/ecografias`, {
      method: "DELETE",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: ecoId }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(delEcoRes.status, 200);
    console.log("[4/9] CRUD /api/ecografias + volumen elipsoide + limpieza huérfanas OK");

    // 4. CRUD /api/colposcopia + reloj cervical + sincronización biopsia + limpieza huérfanas
    const colpoPhoto = await uploadTestPng(
      drPatrickCookie,
      primaryPatient.id,
      "colposcopia",
      "colpo-acetic.png"
    );
    cleanupPaths.add(colpoPhoto.storagePath);

    const createColpoRes = await fetch(`${BASE_URL}/api/colposcopia`, {
      method: "POST",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId: primaryPatient.id,
        consultationId: linkedCons?.id ?? "",
        reportDate: todayStr,
        adequateColposcopy: true,
        squamocolumnarJunctionVisible: "Visible",
        transformationZoneType: "Tipo 1",
        matureSquamousEpithelium: true,
        ectopy: false,
        thinAcetowhiteEpithelium: true,
        denseAcetowhiteEpithelium: false,
        irregularBorder: false,
        fineMosaic: true,
        coarseMosaic: false,
        finePunctation: false,
        coarsePunctation: false,
        atypicalVessels: false,
        extendedFindings: {
          nabothCyst: false,
          otherFindings: "Prueba E2E IFCPC",
        },
        schillerTest: "Positivo (Yodo Negativo Focal)",
        cervicalBiopsyTaken: true,
        biopsyClockHours: ["12", "6", "12"],
        images: [
          {
            storagePath: colpoPhoto.storagePath,
            caption: "Ácido Acético al 5%",
          },
        ],
        diagnosis: "Displasia cervical leve (NIC I) en prueba E2E",
        planRecommendations: "Control histopatológico",
        cie10Code: "N87.0",
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(createColpoRes.status, 201, "POST /api/colposcopia debe devolver 201");
    const createdColpoJson = (await createColpoRes.json()) as {
      data: ColposcopyReportItem;
    };
    const colpoId = createdColpoJson.data.id;
    assert.deepEqual(
      createdColpoJson.data.biopsyClockHours,
      ["6", "12"],
      "Las horas del reloj deben deduplicarse y ordenarse numéricamente"
    );

    // PATCH pasando cervicalBiopsyTaken=false + removiendo foto
    const patchColpoRes = await fetch(`${BASE_URL}/api/colposcopia`, {
      method: "PATCH",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: colpoId,
        patientId: primaryPatient.id,
        consultationId: linkedCons?.id ?? "",
        reportDate: todayStr,
        adequateColposcopy: true,
        squamocolumnarJunctionVisible: "Visible",
        transformationZoneType: "Tipo 1",
        matureSquamousEpithelium: true,
        ectopy: false,
        thinAcetowhiteEpithelium: false,
        denseAcetowhiteEpithelium: false,
        irregularBorder: false,
        fineMosaic: false,
        coarseMosaic: false,
        finePunctation: false,
        coarsePunctation: false,
        atypicalVessels: false,
        extendedFindings: {},
        schillerTest: "Negativo (Lugol Caoba Homogéneo)",
        cervicalBiopsyTaken: false,
        biopsyClockHours: ["3"],
        images: [],
        diagnosis: "Colposcopía negativa tras revisión E2E",
        planRecommendations: "Control anual",
        cie10Code: "Z01.4",
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(patchColpoRes.status, 200);
    const patchedColpoJson = (await patchColpoRes.json()) as {
      data: ColposcopyReportItem;
    };
    assert.deepEqual(
      patchedColpoJson.data.biopsyClockHours,
      [],
      "Al desactivar biopsia debe limpiarse biopsyClockHours"
    );

    const orphanColpoCheck = await fetch(`${BASE_URL}${colpoPhoto.viewUrl}`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(orphanColpoCheck.status, 404, "La foto colposcópica removida debe limpiarse del Storage");
    cleanupPaths.delete(colpoPhoto.storagePath);

    const delColpoRes = await fetch(`${BASE_URL}/api/colposcopia`, {
      method: "DELETE",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: colpoId }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(delColpoRes.status, 200);
    console.log("[5/9] CRUD /api/colposcopia + reloj cervical + limpieza huérfanas OK");

    // 5. Asegurar datos base reales de demostración (idempotente) si aún no existen
    const existingEcos = await db
      .select({ id: ultrasoundReports.id })
      .from(ultrasoundReports)
      .where(
        and(
          eq(ultrasoundReports.tenantId, TENANT_ID),
          isNull(ultrasoundReports.deletedAt)
        )
      )
      .limit(1);

    if (existingEcos.length === 0) {
      const seedEcoRes = await fetch(`${BASE_URL}/api/ecografias`, {
        method: "POST",
        headers: {
          Cookie: drPatrickCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: primaryPatient.id,
          consultationId: linkedCons?.id ?? "",
          reportDate: todayStr,
          ultrasoundType: "TRANSVAGINAL",
          indication: "Dismenorrea progresiva • Mapeo ecográfico IDEA",
          findings: {
            uterusPosition: "RVF",
            uterusDimensions: "76 x 44 x 50 mm",
            myometriumStatus:
              "Ligera heterogeneidad difusa de la zona de unión (adenomiosis focal posterior).",
            endometriumThicknessMm: 7.4,
            endometriumPattern: "Secretor",
            rightOvaryDimensions: "30 x 21 mm, morfología conservada.",
            leftOvaryDimensions:
              "42 x 36 mm con imagen quística unilocular en vidrio esmerilado.",
            douglasPouch: "Obliteración parcial posterior.",
            slidingSign: "Negativo",
            uterosacralLigaments:
              "Ligamento uterosacro izquierdo engrosado e hipoecoico (~8 mm).",
            endometriosisFoci:
              "Endometrioma ovárico izquierdo + compromiso de uterosacro izquierdo.",
          },
          conclusion:
            "1. ENDOMETRIOMA OVÁRICO IZQUIERDO (VIDRIO ESMERILADO).\n2. SIGNOS DE ENDOMETRIOSIS PROFUNDA (PROTOCOLO IDEA).",
          recommendations:
            "Continuar terapia hormonal progestágena (Dienogest 2mg) y reevaluación ecográfica en 3 meses.",
          images: [],
        }),
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(seedEcoRes.status, 201);
      console.log(`[6/9] Ecografía demo IDEA creada para ${primaryPatient.firstName}`);
    } else {
      console.log("[6/9] Ecografía demo ya presente en BD (idempotente)");
    }

    const existingColpos = await db
      .select({ id: colposcopyReports.id })
      .from(colposcopyReports)
      .where(
        and(
          eq(colposcopyReports.tenantId, TENANT_ID),
          isNull(colposcopyReports.deletedAt)
        )
      )
      .limit(1);

    if (existingColpos.length === 0) {
      const seedColpoRes = await fetch(`${BASE_URL}/api/colposcopia`, {
        method: "POST",
        headers: {
          Cookie: drPatrickCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: secondaryPatient.id,
          reportDate: todayStr,
          adequateColposcopy: true,
          squamocolumnarJunctionVisible: "Visible",
          transformationZoneType: "Tipo 1",
          matureSquamousEpithelium: true,
          ectopy: true,
          thinAcetowhiteEpithelium: true,
          denseAcetowhiteEpithelium: false,
          irregularBorder: true,
          fineMosaic: true,
          coarseMosaic: false,
          finePunctation: false,
          coarsePunctation: false,
          atypicalVessels: false,
          extendedFindings: {
            inflammation: true,
            otherFindings:
              "Zona acetoblanca tenue en labio anterior y posterior con captación irregular al Lugol.",
          },
          schillerTest: "Positivo (Yodo Negativo Focal)",
          cervicalBiopsyTaken: true,
          biopsyClockHours: ["6", "12"],
          images: [],
          diagnosis: "Displasia cervical leve (NIC I) en estudio colposcópico IFCPC",
          planRecommendations:
            "Remisión de biopsias dirigidas (H6 y H12) a Anatomía Patológica. Control con resultado y tipificación VPH.",
          cie10Code: "N87.0",
        }),
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(seedColpoRes.status, 201);
      console.log(`[7/9] Colposcopía demo IFCPC creada para ${secondaryPatient.firstName}`);
    } else {
      console.log("[7/9] Colposcopía demo ya presente en BD (idempotente)");
    }

    // 6. Auditoría
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
            "ultrasound_report",
            "colposcopy_report",
          ])
        )
      )
      .orderBy(desc(clinicalAuditLogs.createdAt))
      .limit(12);

    assert.ok(auditRows.some((r) => r.entityType === "ultrasound_report"));
    assert.ok(auditRows.some((r) => r.entityType === "colposcopy_report"));
    console.log(`[8/9] Auditoría clinical_audit_logs verificada (${auditRows.length} registros recientes)`);

    // 7. Render SSR /pacientes/[id]
    const ssrRes = await fetch(`${BASE_URL}/pacientes/${primaryPatient.id}`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(ssrRes.status, 200);
    const html = await ssrRes.text();
    assert.ok(html.includes(primaryPatient.lastName));
    assert.ok(html.includes("Chequeos"));
    console.log("[9/9] SSR /pacientes/[id] con TabChequeos integrado OK");

    console.log("\nVALIDACIÓN E2E ETAPA 4A COMPLETADA AL 100%.");
  } finally {
    if (drPatrickCookie && cleanupPaths.size > 0) {
      await Promise.allSettled(
        Array.from(cleanupPaths).map((path) =>
          fetch(`${BASE_URL}/api/clinical-images?path=${encodeURIComponent(path)}`, {
            method: "DELETE",
            headers: { Cookie: drPatrickCookie },
            signal: AbortSignal.timeout(5000),
          })
        )
      );
    }
    if (serverProc.exitCode === null) {
      serverProc.kill("SIGTERM");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[validate-etapa-4a] Error:", err);
    process.exit(1);
  });
