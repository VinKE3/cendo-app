import { db } from "@/db";
import { clinicalAuditLogs } from "@/db/schema";
import { getClientIp } from "@/lib/security/get-client-ip";
import type { SessionPayload } from "@/lib/security/action-guard";

export async function recordAuditLog(params: {
  ctx: SessionPayload;
  actorName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW";
  entityType: string;
  entityId: string;
  changesSummary?: Record<string, unknown>;
}) {
  if (!params.ctx.tenantId) return;

  try {
    const ipAddress = await getClientIp();
    await db.insert(clinicalAuditLogs).values({
      tenantId: params.ctx.tenantId,
      actorId: params.ctx.userId,
      actorName: params.actorName,
      actorRole: params.ctx.role,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changesSummary: params.changesSummary,
      ipAddress,
    });
  } catch (err) {
    console.error("[Clinical Audit Log Error]:", err);
  }
}
