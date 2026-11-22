import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedContext } from "@/lib/security/action-guard";
import {
  getSessionDoctorProfile,
  type AuthenticatedDoctor,
} from "@/features/auth/services/auth.service";

const resolveSessionDoctor = cache(async (): Promise<AuthenticatedDoctor | null> => {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    return null;
  }

  return getSessionDoctorProfile(ctx.userId, ctx.tenantId);
});

export async function requireSessionDoctor(): Promise<AuthenticatedDoctor> {
  const doctor = await resolveSessionDoctor();
  if (!doctor) {
    redirect("/login");
  }

  return doctor;
}
