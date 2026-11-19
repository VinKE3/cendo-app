import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clinicalAuditLogs, clinicalTemplates, patients } from "@/db/schema";
import { env } from "@/env";
import { authenticateDoctorByCredentials } from "@/features/auth/services/auth.service";
import type {
  ClinicalTemplateItem,
  ColposcopyClinicalTemplateItem,
  UltrasoundClinicalTemplateItem,
} from "@/features/clinical-templates/clinical-templates.schema";
import type { DoctorConfigProfile } from "@/features/configuracion/configuracion.schema";
import { signPayload } from "@/lib/security/crypto";
import {
  generateAppointmentReminderWhatsAppUrl,
  generateTariffWhatsAppUrl,
} from "@/lib/whatsapp-share";

const TEST_PORT = 3107;
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
      // Esperar arranque del puerto
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  throw new Error(`Timeout esperando a ${BASE_URL}:\n${logs}`);
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
  const [samplePatient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.tenantId, TENANT_ID), isNull(patients.deletedAt)))
    .limit(1);

  assert.ok(samplePatient, "Debe existir al menos un paciente activo en BD.");

  const defaultPwd = process.env.SEED_DEFAULT_PASSWORD || "Cendo123";
  const patrickCookie = await buildCookieForDoctor(
    "cendoperu@gmail.com",
    defaultPwd
  );
  const carlosCookie = await buildCookieForDoctor(
    "cbenavides@cendo.pe",
    defaultPwd
  );

  const serverProc = startProductionServer();
  const createdTemplateIds: string[] = [];
  let originalConfig: DoctorConfigProfile | null = null;

  try {
    await waitForServerReady(serverProc);
    console.log(`[1/7] Servidor Next listo en ${BASE_URL}`);

    // 2. Bloqueo 401 JSON sin sesión en /api/clinical-templates
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"] as const) {
      const res = await fetch(`${BASE_URL}/api/clinical-templates`, {
        method,
        headers:
          method === "GET" ? undefined : { "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify({}),
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(
        res.status,
        401,
        `/api/clinical-templates (${method}) sin sesión debe responder 401`
      );
      const json = (await res.json()) as { success?: boolean };
      assert.equal(json.success, false);
    }
    console.log("[2/7] Bloqueo Zero Trust 401 JSON OK en /api/clinical-templates");

    // 3. Verificar auto-seed de las 11 plantillas oficiales CENDO
    const listAllRes = await fetch(`${BASE_URL}/api/clinical-templates`, {
      headers: { Cookie: patrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(listAllRes.status, 200);
    const listAllJson = (await listAllRes.json()) as {
      success: boolean;
      data: ClinicalTemplateItem[];
    };
    assert.equal(listAllJson.success, true);

    const officialAll = listAllJson.data.filter((t) => t.isOfficial);
    const officialEco = officialAll.filter((t) => t.scope === "ULTRASOUND");
    const officialColpo = officialAll.filter((t) => t.scope === "COLPOSCOPY");
    assert.equal(officialEco.length, 7, "Deben existir 7 oficiales de Ecografía");
    assert.equal(officialColpo.length, 4, "Deben existir 4 oficiales de Colposcopía");
    console.log("[3/7] Auto-seed verificado: 11 plantillas oficiales CENDO (7 Eco + 4 Colpo)");

    // 4. CRUD de plantilla personalizada Eco + Colpo + auditoría
    const baseEco = officialEco[0] as UltrasoundClinicalTemplateItem;
    const createEcoRes = await fetch(`${BASE_URL}/api/clinical-templates`, {
      method: "POST",
      headers: {
        Cookie: carlosCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: "ULTRASOUND",
        subType: baseEco.payload.ultrasoundType,
        name: "TEST Plantilla Eco Personalizada",
        description: "Validación automática E2E",
        payload: baseEco.payload,
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(createEcoRes.status, 201);
    const createEcoJson = (await createEcoRes.json()) as {
      success: boolean;
      data: UltrasoundClinicalTemplateItem;
    };
    const customEcoId = createEcoJson.data.id;
    createdTemplateIds.push(customEcoId);

    const patchEcoRes = await fetch(`${BASE_URL}/api/clinical-templates`, {
      method: "PATCH",
      headers: {
        Cookie: carlosCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: customEcoId,
        scope: "ULTRASOUND",
        subType: baseEco.payload.ultrasoundType,
        name: "TEST Plantilla Eco Editada",
        description: "Editada por médico moderator",
        payload: {
          ...baseEco.payload,
          conclusion: "1. CONCLUSIÓN PERSONALIZADA DE PRUEBA E2E.",
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(patchEcoRes.status, 200);
    const patchEcoJson = (await patchEcoRes.json()) as {
      data: UltrasoundClinicalTemplateItem;
    };
    assert.equal(patchEcoJson.data.name, "TEST Plantilla Eco Editada");

    const baseColpo = officialColpo[0] as ColposcopyClinicalTemplateItem;
    const createColpoRes = await fetch(`${BASE_URL}/api/clinical-templates`, {
      method: "POST",
      headers: {
        Cookie: carlosCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scope: "COLPOSCOPY",
        subType: "CUSTOM",
        name: "TEST Plantilla Colpo Viva",
        description: "Debe persistir tras restaurar oficiales",
        payload: baseColpo.payload,
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(createColpoRes.status, 201);
    const createColpoJson = (await createColpoRes.json()) as {
      data: ColposcopyClinicalTemplateItem;
    };
    const customColpoId = createColpoJson.data.id;
    createdTemplateIds.push(customColpoId);

    const delEcoRes = await fetch(
      `${BASE_URL}/api/clinical-templates?id=${encodeURIComponent(customEcoId)}`,
      {
        method: "DELETE",
        headers: { Cookie: carlosCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(delEcoRes.status, 200);

    // Moderator NO puede borrar oficial
    const carlosDelOfficialRes = await fetch(
      `${BASE_URL}/api/clinical-templates?id=${encodeURIComponent(baseColpo.id)}`,
      {
        method: "DELETE",
        headers: { Cookie: carlosCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(
      carlosDelOfficialRes.status,
      400,
      "Moderator no debe poder eliminar plantillas oficiales CENDO"
    );

    // Moderator SÍ puede editar una oficial
    const carlosEditOfficialRes = await fetch(
      `${BASE_URL}/api/clinical-templates`,
      {
        method: "PATCH",
        headers: {
          Cookie: carlosCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: baseColpo.id,
          scope: "COLPOSCOPY",
          subType: baseColpo.subType,
          name: baseColpo.name,
          description: "Editada temporalmente por moderator",
          payload: baseColpo.payload,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(carlosEditOfficialRes.status, 200);

    // Admin SÍ puede eliminar una oficial y PUT la restaura sin borrar personalizadas
    const adminDelOfficialRes = await fetch(
      `${BASE_URL}/api/clinical-templates?id=${encodeURIComponent(baseColpo.id)}`,
      {
        method: "DELETE",
        headers: { Cookie: patrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(adminDelOfficialRes.status, 200);

    const restoreRes = await fetch(`${BASE_URL}/api/clinical-templates`, {
      method: "PUT",
      headers: {
        Cookie: patrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scope: "COLPOSCOPY" }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(restoreRes.status, 200);
    const restoreJson = (await restoreRes.json()) as {
      success: boolean;
      data: ClinicalTemplateItem[];
    };
    const restoredOfficials = restoreJson.data.filter((t) => t.isOfficial);
    assert.equal(restoredOfficials.length, 4);
    assert.ok(
      restoreJson.data.some((t) => t.id === customColpoId),
      "La plantilla personalizada debe permanecer intacta tras restaurar oficiales"
    );

    // Limpiar la plantilla personalizada temporal de colposcopía
    const cleanupColpoRes = await fetch(
      `${BASE_URL}/api/clinical-templates?id=${encodeURIComponent(customColpoId)}`,
      {
        method: "DELETE",
        headers: { Cookie: patrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(cleanupColpoRes.status, 200);

    const auditRows = await db
      .select({ action: clinicalAuditLogs.action })
      .from(clinicalAuditLogs)
      .where(
        and(
          eq(clinicalAuditLogs.tenantId, TENANT_ID),
          eq(clinicalAuditLogs.entityType, "clinical_template"),
          inArray(clinicalAuditLogs.entityId, [
            customEcoId,
            baseColpo.id,
            "COLPOSCOPY",
          ])
        )
      )
      .orderBy(desc(clinicalAuditLogs.createdAt))
      .limit(10);
    assert.ok(
      auditRows.length >= 4,
      "Debe existir registro de auditoría completo de plantillas"
    );
    console.log(
      "[4/7] CRUD plantillas + RBAC oficiales + Restauración sin pérdida OK"
    );

    // 5. Verificar googleMapsUrl en /api/configuracion (validez + bloqueo XSS + restauración)
    const getCfgRes = await fetch(`${BASE_URL}/api/configuracion`, {
      headers: { Cookie: patrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(getCfgRes.status, 200);
    const getCfgJson = (await getCfgRes.json()) as {
      data: { profile: DoctorConfigProfile };
    };
    originalConfig = getCfgJson.data.profile;

    const validPatchRes = await fetch(`${BASE_URL}/api/configuracion`, {
      method: "PATCH",
      headers: {
        Cookie: patrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        doctorTitle: originalConfig.doctorTitle,
        fullName: originalConfig.fullName,
        specialty: originalConfig.specialty,
        cmp: originalConfig.cmp,
        rne: originalConfig.rne,
        phone: originalConfig.phone,
        clinicAddress: originalConfig.clinicAddress,
        googleMapsUrl: "https://maps.app.goo.gl/cendoTest",
        showSignatureByDefault: originalConfig.showSignatureByDefault,
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(validPatchRes.status, 200);
    const validPatchJson = (await validPatchRes.json()) as {
      data: { profile: DoctorConfigProfile };
    };
    assert.equal(
      validPatchJson.data.profile.googleMapsUrl,
      "https://maps.app.goo.gl/cendoTest"
    );

    const badUrlPatchRes = await fetch(`${BASE_URL}/api/configuracion`, {
      method: "PATCH",
      headers: {
        Cookie: patrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        doctorTitle: originalConfig.doctorTitle,
        fullName: originalConfig.fullName,
        specialty: originalConfig.specialty,
        cmp: originalConfig.cmp,
        rne: originalConfig.rne,
        phone: originalConfig.phone,
        clinicAddress: originalConfig.clinicAddress,
        googleMapsUrl: "javascript:alert(1)",
        showSignatureByDefault: originalConfig.showSignatureByDefault,
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(
      badUrlPatchRes.status,
      422,
      "Esquema javascript: debe rechazarse con 422"
    );
    console.log("[5/7] /api/configuracion googleMapsUrl válido + bloqueo XSS OK");

    // 6. Verificar mensajes WhatsApp (Citas corto sin Calendar + Tarifario directo)
    const apptWaUrl = generateAppointmentReminderWhatsAppUrl(
      {
        patientName: "PACIENTE PRUEBA CENDO",
        patientPhone: "987654321",
        doctorName: "Dr. Patrick Jacinto",
        appointmentDate: "2026-11-25",
        appointmentTime: "10:30",
        durationMinutes: 30,
        appointmentType: "CONSULTA_PRIMERA_VEZ",
        reason: "Evaluación ginecológica especializada",
      },
      {
        clinicAddress: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
        phone: "985 945 697",
        googleMapsUrl: "https://maps.app.goo.gl/cendoTest",
      }
    );
    const decodedApptMsg = decodeURIComponent(apptWaUrl);
    assert.ok(decodedApptMsg.includes("Av. Alfredo Benavides"));
    assert.ok(decodedApptMsg.includes("https://maps.app.goo.gl/cendoTest"));
    assert.equal(
      decodedApptMsg.includes("calendar.google.com"),
      false,
      "El mensaje WhatsApp de citas no debe incluir el enlace largo de Google Calendar"
    );

    const tariffWaUrl = generateTariffWhatsAppUrl(
      [
        {
          code: "ECO-TV",
          name: "Ecografía Transvaginal Doppler",
          category: "Ecografía",
          price: 180,
        },
        {
          code: "COLPO-DX",
          name: "Colposcopía Digital IFCPC",
          category: "Procedimiento",
          price: 250,
        },
      ],
      {
        clinicAddress: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
        phone: "985 945 697",
        googleMapsUrl: "https://maps.app.goo.gl/cendoTest",
      }
    );
    const decodedTariffMsg = decodeURIComponent(tariffWaUrl);
    assert.ok(decodedTariffMsg.includes("ECO-TV"));
    assert.ok(decodedTariffMsg.includes("S/"));
    assert.ok(decodedTariffMsg.includes("Total referencial"));
    console.log(
      "[6/7] WhatsApp Citas corto (sin link Calendar) & WhatsApp Tarifario OK"
    );

    // 7. Verificar SSR 200 en rutas afectadas
    for (const route of [
      `/pacientes/${samplePatient.id}`,
      "/tarifario",
      "/agenda",
      "/configuracion",
    ]) {
      const ssrRes = await fetch(`${BASE_URL}${route}`, {
        headers: { Cookie: patrickCookie },
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(ssrRes.status, 200, `SSR ${route} debe responder 200`);
    }
    console.log(
      "[7/7] SSR /pacientes/[id], /tarifario, /agenda y /configuracion en 200 OK"
    );
    console.log("\nVALIDACIÓN E2E PAQUETE MEJORAS 4A COMPLETADA AL 100%.");
  } finally {
    if (originalConfig) {
      await fetch(`${BASE_URL}/api/configuracion`, {
        method: "PATCH",
        headers: {
          Cookie: patrickCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorTitle: originalConfig.doctorTitle,
          fullName: originalConfig.fullName,
          specialty: originalConfig.specialty,
          cmp: originalConfig.cmp,
          rne: originalConfig.rne,
          phone: originalConfig.phone,
          clinicAddress: originalConfig.clinicAddress,
          googleMapsUrl: originalConfig.googleMapsUrl,
          showSignatureByDefault: originalConfig.showSignatureByDefault,
        }),
        signal: AbortSignal.timeout(10000),
      }).catch(() => undefined);
    }

    if (createdTemplateIds.length > 0) {
      await db
        .delete(clinicalTemplates)
        .where(inArray(clinicalTemplates.id, createdTemplateIds))
        .catch(() => undefined);
    }

    serverProc.kill();
    await new Promise((r) => setTimeout(r, 400));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[validate-mejoras-4a] Error:", err);
  process.exit(1);
});
