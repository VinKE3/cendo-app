import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { clinicalAuditLogs } from "@/db/schema";
import { env } from "@/env";
import { authenticateDoctorByCredentials } from "@/features/auth/services/auth.service";
import type {
  DoctorConfigProfile,
  DoctorSignatureEntry,
} from "@/features/configuracion/configuracion.schema";
import { signPayload } from "@/lib/security/crypto";

const TEST_PORT = 3105;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const DR_PATRICK_ID = "a0000000-0000-0000-0000-000000000001";
const DR_CARLOS_ID = "a0000000-0000-0000-0000-000000000002";
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

// PNG transparente válido de 1x1 píxel (magic bytes 89 50 4E 47)
const VALID_1X1_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

function startProductionServer(): ChildProcess {
  const nextBin = require.resolve("next/dist/bin/next");
  return spawn(process.execPath, [nextBin, "start", "-p", String(TEST_PORT), "-H", "127.0.0.1"], {
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
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
      throw new Error(`El servidor Next terminó prematuramente (exit ${serverProc.exitCode}):\n${logs}`);
    }
    try {
      const res = await fetch(`${BASE_URL}/login`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return;
    } catch {
      // Seguir esperando hasta que escuche el puerto
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  throw new Error(`Timeout esperando a ${BASE_URL}:\n${logs}`);
}

async function buildCookieForDoctor(email: string, password: string): Promise<string> {
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
  const serverProc = startProductionServer();
  let drPatrickCookie = "";
  let drPatrickNeedsRestore = false;

  try {
    await waitForServerReady(serverProc);
    console.log(`[1/10] Servidor Next listo en ${BASE_URL}`);

    // 1. Sin cookie -> bloqueado (401 directo o 307 a /login en proxy.ts, nunca 200 ni imagen)
    const unauthRes = await fetch(`${BASE_URL}/api/configuracion/firma`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const unauthLocation = unauthRes.headers.get("location") || "";
    const isBlockedUnauth =
      unauthRes.status === 401 ||
      ((unauthRes.status === 307 || unauthRes.status === 302) &&
        unauthLocation.includes("/login"));
    assert.ok(
      isBlockedUnauth,
      `GET /api/configuracion/firma sin sesión debe bloquearse (401 o redirect a /login), recibió ${unauthRes.status}`
    );
    console.log(`[2/10] Bloqueo Zero Trust sin sesión OK (${unauthRes.status})`);

    const defaultPwd = process.env.SEED_DEFAULT_PASSWORD || "Cendo123";
    drPatrickCookie = await buildCookieForDoctor("cendoperu@gmail.com", defaultPwd);
    const drCarlosCookie = await buildCookieForDoctor("cbenavides@cendo.pe", defaultPwd);

    // 2. GET /api/configuracion como Dr. Patrick
    const cfgRes = await fetch(`${BASE_URL}/api/configuracion`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(cfgRes.status, 200, "GET /api/configuracion debe responder 200");
    const cfgJson = (await cfgRes.json()) as {
      success: boolean;
      data: {
        profile: DoctorConfigProfile;
        signatureDirectory: DoctorSignatureEntry[];
      };
    };
    assert.equal(cfgJson.success, true);
    assert.equal(cfgJson.data.profile.cmp, "61693");
    assert.equal(cfgJson.data.profile.hasSignature, true);
    assert.equal(cfgJson.data.profile.showSignatureByDefault, true);
    console.log("[3/10] Perfil Dr. Patrick en /api/configuracion OK (CMP 61693, hasSignature=true)");

    // 3. GET /configuracion SSR
    const pageRes = await fetch(`${BASE_URL}/configuracion`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(pageRes.status, 200, "GET /configuracion debe responder 200");
    const pageHtml = await pageRes.text();
    assert.ok(pageHtml.includes("Patrick"), "SSR /configuracion debe contener nombre del Dr. Patrick");
    assert.ok(pageHtml.includes("61693"), "SSR /configuracion debe contener CMP 61693");
    console.log("[4/10] SSR /configuracion renderizado OK");

    // 4. GET /api/configuracion/firma como Dr. Patrick (PNG real de informe.pdf)
    const sigRes = await fetch(`${BASE_URL}/api/configuracion/firma`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(sigRes.status, 200, "GET /api/configuracion/firma debe responder 200");
    const contentType = sigRes.headers.get("content-type") || "";
    assert.ok(contentType.includes("image/png"), `Content-Type inesperado: ${contentType}`);
    const sigBuf = new Uint8Array(await sigRes.arrayBuffer());
    assert.ok(sigBuf.byteLength > 1000, `Tamaño de firma demasiado pequeño: ${sigBuf.byteLength}`);
    assert.deepEqual(
      Array.from(sigBuf.slice(0, 4)),
      [0x89, 0x50, 0x4e, 0x47],
      "Los bytes iniciales de la firma deben ser PNG válido"
    );
    console.log(`[5/10] Firma privada Dr. Patrick servida correctamente (${sigBuf.byteLength} bytes PNG)`);

    // 5. UUID inválido -> 400
    const badIdRes = await fetch(`${BASE_URL}/api/configuracion/firma?doctorId=invalid-id`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(badIdRes.status, 400, "doctorId inválido debe devolver 400");

    // 6. Médico sin firma -> 404
    const missingSigRes = await fetch(
      `${BASE_URL}/api/configuracion/firma?doctorId=${DR_CARLOS_ID}`,
      {
        headers: { Cookie: drPatrickCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(missingSigRes.status, 404, "Médico sin firma debe devolver 404");
    console.log("[6/10] Validación UUID (400) y médico sin firma (404) OK");

    // 7. Toggle showSignatureByDefault: false -> verificar -> restaurar true
    const patchPayload = {
      doctorTitle: cfgJson.data.profile.doctorTitle,
      fullName: cfgJson.data.profile.fullName,
      specialty: cfgJson.data.profile.specialty,
      cmp: cfgJson.data.profile.cmp,
      rne: cfgJson.data.profile.rne,
      phone: cfgJson.data.profile.phone,
      clinicAddress: cfgJson.data.profile.clinicAddress,
      showSignatureByDefault: false,
    };

    drPatrickNeedsRestore = true;
    const patchFalseRes = await fetch(`${BASE_URL}/api/configuracion`, {
      method: "PATCH",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchPayload),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(patchFalseRes.status, 200, "PATCH showSignatureByDefault=false debe responder 200");

    const verifyFalseRes = await fetch(`${BASE_URL}/api/configuracion`, {
      headers: { Cookie: drPatrickCookie },
      signal: AbortSignal.timeout(15000),
    });
    const verifyFalseJson = (await verifyFalseRes.json()) as {
      data: { profile: DoctorConfigProfile };
    };
    assert.equal(verifyFalseJson.data.profile.showSignatureByDefault, false);

    const patchTrueRes = await fetch(`${BASE_URL}/api/configuracion`, {
      method: "PATCH",
      headers: {
        Cookie: drPatrickCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...patchPayload, showSignatureByDefault: true }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(patchTrueRes.status, 200, "Restaurar showSignatureByDefault=true debe responder 200");
    drPatrickNeedsRestore = false;
    console.log("[7/10] PATCH preferencia showSignatureByDefault=false -> true OK");

    // 8. Rechazo de SVG malicioso por magic bytes -> 400
    const svgForm = new FormData();
    svgForm.append(
      "file",
      new Blob(["<svg><script>alert(1)</script></svg>"], { type: "image/svg+xml" }),
      "xss.svg"
    );
    const badFileRes = await fetch(`${BASE_URL}/api/configuracion/firma`, {
      method: "POST",
      headers: { Cookie: drPatrickCookie },
      body: svgForm,
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(badFileRes.status, 400, "SVG debe ser rechazado con 400 por verificación de magic bytes");
    console.log("[8/10] Rechazo de archivo SVG malicioso OK (400)");

    // 9. Ciclo completo Dr. Carlos: POST PNG 1x1 -> GET 200 -> Patrick intacto -> DELETE -> GET 404
    const carlosForm = new FormData();
    carlosForm.append("file", new Blob([VALID_1X1_PNG], { type: "image/png" }), "carlos.png");

    const carlosUploadRes = await fetch(`${BASE_URL}/api/configuracion/firma`, {
      method: "POST",
      headers: { Cookie: drCarlosCookie },
      body: carlosForm,
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(carlosUploadRes.status, 200, "Upload PNG Dr. Carlos debe responder 200");
    const carlosUploadJson = (await carlosUploadRes.json()) as {
      success: boolean;
      data: { hasSignature: boolean };
    };
    assert.equal(carlosUploadJson.data.hasSignature, true);

    const carlosGetRes = await fetch(`${BASE_URL}/api/configuracion/firma`, {
      headers: { Cookie: drCarlosCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(carlosGetRes.status, 200);
    const carlosBytes = new Uint8Array(await carlosGetRes.arrayBuffer());
    assert.deepEqual(Array.from(carlosBytes.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);

    // Verificar que la firma de Dr. Patrick NO fue sobrescrita
    const patrickCheckRes = await fetch(
      `${BASE_URL}/api/configuracion/firma?doctorId=${DR_PATRICK_ID}`,
      {
        headers: { Cookie: drCarlosCookie },
        signal: AbortSignal.timeout(15000),
      }
    );
    assert.equal(patrickCheckRes.status, 200);
    const patrickCheckBuf = await patrickCheckRes.arrayBuffer();
    assert.ok(patrickCheckBuf.byteLength > 1000, "La firma del Dr. Patrick debe seguir intacta");

    const carlosDelRes = await fetch(`${BASE_URL}/api/configuracion/firma`, {
      method: "DELETE",
      headers: { Cookie: drCarlosCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(carlosDelRes.status, 200);
    const carlosDelJson = (await carlosDelRes.json()) as {
      data: { hasSignature: boolean };
    };
    assert.equal(carlosDelJson.data.hasSignature, false);

    const carlosAfterDelRes = await fetch(`${BASE_URL}/api/configuracion/firma`, {
      headers: { Cookie: drCarlosCookie },
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(carlosAfterDelRes.status, 404, "Después de eliminar, GET debe responder 404");
    console.log("[9/10] Aislamiento y ciclo POST/GET/DELETE Dr. Carlos OK (estado limpio)");

    // 10. Auditoría en clinical_audit_logs
    const recentLogs = await db
      .select({
        action: clinicalAuditLogs.action,
        entityType: clinicalAuditLogs.entityType,
        entityId: clinicalAuditLogs.entityId,
      })
      .from(clinicalAuditLogs)
      .where(
        and(
          eq(clinicalAuditLogs.tenantId, TENANT_ID),
          inArray(clinicalAuditLogs.entityType, ["profile_signature", "profile_settings"])
        )
      )
      .orderBy(desc(clinicalAuditLogs.createdAt))
      .limit(10);

    const hasSigAudit = recentLogs.some((l) => l.entityType === "profile_signature");
    const hasSettingsAudit = recentLogs.some((l) => l.entityType === "profile_settings");
    assert.ok(hasSigAudit, "Debe existir auditoría para profile_signature");
    assert.ok(hasSettingsAudit, "Debe existir auditoría para profile_settings");
    console.log(`[10/10] Auditoría clinical_audit_logs verificada (${recentLogs.length} registros recientes)`);

    console.log("\nVALIDACIÓN E2E CONFIGURACIÓN & FIRMA COMPLETADA AL 100%.");
  } finally {
    if (drPatrickNeedsRestore && drPatrickCookie) {
      try {
        await fetch(`${BASE_URL}/api/configuracion`, {
          method: "PATCH",
          headers: {
            Cookie: drPatrickCookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            doctorTitle: "Dr.",
            fullName: "Patrick José Jacinto Gomero",
            specialty: "Ginecología y Obstetricia - Endometriosis y Colposcopía",
            cmp: "61693",
            rne: "38657",
            phone: "985 945 697",
            clinicAddress: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
            showSignatureByDefault: true,
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        // Mejor esfuerzo en cleanup
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
    console.error("[validate-configuracion-firma] Error:", err);
    process.exit(1);
  });
