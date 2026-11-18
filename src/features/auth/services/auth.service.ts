import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { clinics, profiles } from "@/db/schema";
import { verifyPassword } from "@/lib/security/password";
import type { UserRole } from "@/lib/security/action-guard";

export interface AuthenticatedDoctor {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  doctorTitle: string;
  specialty: string;
  cmp: string;
  rne: string;
  role: UserRole;
  clinicalRole: string;
  clinicName: string;
  clinicAddress: string;
  phone: string;
  contactEmail: string;
  avatarUrl: string | null;
  signatureUrl: string | null;
}

function normalizeUserRole(role: string): UserRole {
  if (role === "admin" || role === "moderator" || role === "user") {
    return role;
  }
  return "user";
}

export async function authenticateDoctorByCredentials(
  email: string,
  password: string
): Promise<AuthenticatedDoctor | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const [row] = await db
    .select({
      profile: profiles,
      clinicActive: clinics.isActive,
    })
    .from(profiles)
    .innerJoin(clinics, eq(profiles.tenantId, clinics.id))
    .where(
      and(
        sql`LOWER(TRIM(${profiles.email})) = ${normalizedEmail}`,
        eq(profiles.isActive, true),
        eq(clinics.isActive, true),
        isNull(profiles.deletedAt),
        isNull(clinics.deletedAt)
      )
    )
    .limit(1);

  if (!row) return null;

  const isPasswordValid = await verifyPassword(password, row.profile.passwordHash);
  if (!isPasswordValid) return null;

  return {
    id: row.profile.id,
    tenantId: row.profile.tenantId,
    email: row.profile.email,
    fullName: row.profile.fullName,
    doctorTitle: row.profile.doctorTitle,
    specialty: row.profile.specialty,
    cmp: row.profile.cmp,
    rne: row.profile.rne,
    role: normalizeUserRole(row.profile.role),
    clinicalRole: row.profile.clinicalRole,
    clinicName: row.profile.clinicName,
    clinicAddress: row.profile.clinicAddress,
    phone: row.profile.phone,
    contactEmail: row.profile.contactEmail,
    avatarUrl: row.profile.avatarUrl,
    signatureUrl: row.profile.signatureUrl,
  };
}

export async function getSessionDoctorProfile(
  userId: string,
  tenantId?: string
): Promise<AuthenticatedDoctor | null> {
  if (!tenantId) return null;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, userId),
        eq(profiles.tenantId, tenantId),
        eq(profiles.isActive, true),
        isNull(profiles.deletedAt)
      )
    )
    .limit(1);

  if (!profile) return null;

  return {
    id: profile.id,
    tenantId: profile.tenantId,
    email: profile.email,
    fullName: profile.fullName,
    doctorTitle: profile.doctorTitle,
    specialty: profile.specialty,
    cmp: profile.cmp,
    rne: profile.rne,
    role: normalizeUserRole(profile.role),
    clinicalRole: profile.clinicalRole,
    clinicName: profile.clinicName,
    clinicAddress: profile.clinicAddress,
    phone: profile.phone,
    contactEmail: profile.contactEmail,
    avatarUrl: profile.avatarUrl,
    signatureUrl: profile.signatureUrl,
  };
}
