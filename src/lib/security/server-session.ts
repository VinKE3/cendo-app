import { redirect } from "next/navigation";
import { getAuthenticatedContext } from "@/lib/security/action-guard";
import {
  getSessionDoctorProfile,
  type AuthenticatedDoctor,
} from "@/features/auth/services/auth.service";

export async function requireSessionDoctor(): Promise<AuthenticatedDoctor> {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    redirect("/login");
  }

  const doctor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
  if (!doctor) {
    redirect("/login");
  }

  return doctor;
}
