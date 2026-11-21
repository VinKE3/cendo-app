import { and, count, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  colposcopyReports,
  medicationsVademecum,
  medicalAppointments,
  patients,
  proceduresTariff,
  ultrasoundReports,
} from "@/db/schema";
import { calculateAge, getPeruDateString } from "@/lib/utils";
import { searchCie10InDb } from "@/features/cie10/services/cie10.service";

export async function getTodayAppointmentsCount(tenantId: string): Promise<number> {
  const todayPeru = getPeruDateString();
  const [row] = await db
    .select({ value: count() })
    .from(medicalAppointments)
    .where(
      and(
        eq(medicalAppointments.tenantId, tenantId),
        eq(medicalAppointments.appointmentDate, todayPeru),
        isNull(medicalAppointments.deletedAt)
      )
    );
  return Number(row?.value ?? 0);
}

export async function getDashboardOverview(tenantId: string) {
  const todayPeru = getPeruDateString();

  const [
    [patientsTotalRow],
    [colpoTotalRow],
    [ecoTotalRow],
    [tariffTotalRow],
    [vademecumTotalRow],
    todayAppointments,
    recentPatientsRows,
    topTariffs,
    topMedications,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(patients)
      .where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt))),
    db
      .select({ value: count() })
      .from(colposcopyReports)
      .where(
        and(eq(colposcopyReports.tenantId, tenantId), isNull(colposcopyReports.deletedAt))
      ),
    db
      .select({ value: count() })
      .from(ultrasoundReports)
      .where(
        and(eq(ultrasoundReports.tenantId, tenantId), isNull(ultrasoundReports.deletedAt))
      ),
    db
      .select({ value: count() })
      .from(proceduresTariff)
      .where(
        and(
          eq(proceduresTariff.tenantId, tenantId),
          eq(proceduresTariff.active, true),
          isNull(proceduresTariff.deletedAt)
        )
      ),
    db
      .select({ value: count() })
      .from(medicationsVademecum)
      .where(
        and(
          eq(medicationsVademecum.tenantId, tenantId),
          isNull(medicationsVademecum.deletedAt)
        )
      ),
    db
      .select({
        id: medicalAppointments.id,
        patientId: medicalAppointments.patientId,
        patientName: patients.fullName,
        patientDoc: patients.documentNumber,
        doctorName: medicalAppointments.doctorName,
        appointmentTime: medicalAppointments.appointmentTime,
        appointmentType: medicalAppointments.appointmentType,
        reason: medicalAppointments.reason,
        status: medicalAppointments.status,
      })
      .from(medicalAppointments)
      .innerJoin(patients, eq(medicalAppointments.patientId, patients.id))
      .where(
        and(
          eq(medicalAppointments.tenantId, tenantId),
          eq(medicalAppointments.appointmentDate, todayPeru),
          isNull(medicalAppointments.deletedAt),
          isNull(patients.deletedAt)
        )
      )
      .orderBy(medicalAppointments.appointmentTime)
      .limit(8),
    db
      .select({
        id: patients.id,
        fullName: patients.fullName,
        documentType: patients.documentType,
        documentNumber: patients.documentNumber,
        birthDate: patients.birthDate,
        phone: patients.phone,
        updatedAt: patients.updatedAt,
      })
      .from(patients)
      .where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)))
      .orderBy(desc(patients.updatedAt))
      .limit(5),
    db
      .select({
        id: proceduresTariff.id,
        code: proceduresTariff.code,
        name: proceduresTariff.name,
        category: proceduresTariff.category,
        price: proceduresTariff.price,
      })
      .from(proceduresTariff)
      .where(
        and(
          eq(proceduresTariff.tenantId, tenantId),
          eq(proceduresTariff.active, true),
          isNull(proceduresTariff.deletedAt)
        )
      )
      .orderBy(proceduresTariff.code)
      .limit(6),
    db
      .select({
        id: medicationsVademecum.id,
        genericName: medicationsVademecum.genericName,
        atcCode: medicationsVademecum.atcCode,
        therapeuticGroup: medicationsVademecum.therapeuticGroup,
        commercialBrands: medicationsVademecum.commercialBrands,
      })
      .from(medicationsVademecum)
      .where(
        and(
          eq(medicationsVademecum.tenantId, tenantId),
          isNull(medicationsVademecum.deletedAt)
        )
      )
      .orderBy(medicationsVademecum.genericName)
      .limit(4),
  ]);

  return {
    todayPeru,
    metrics: {
      patientsCount: Number(patientsTotalRow?.value ?? 0),
      todayAppointmentsCount: todayAppointments.length,
      studiesCount: Number(colpoTotalRow?.value ?? 0) + Number(ecoTotalRow?.value ?? 0),
      activeTariffsCount: Number(tariffTotalRow?.value ?? 0),
      medicationsCount: Number(vademecumTotalRow?.value ?? 0),
    },
    todayAppointments,
    recentPatients: recentPatientsRows.map((p) => ({
      ...p,
      age: calculateAge(p.birthDate),
    })),
    topTariffs: topTariffs.map((t) => ({
      ...t,
      price: Number(t.price),
    })),
    topMedications,
  };
}

export async function globalClinicalSearch(tenantId: string, query: string) {
  const clean = query.trim();
  const pattern = `%${clean}%`;

  const [matchedPatients, matchedTariffs, matchedMeds, matchedCie10] =
    await Promise.all([
      db
        .select({
          id: patients.id,
          fullName: patients.fullName,
          documentType: patients.documentType,
          documentNumber: patients.documentNumber,
          phone: patients.phone,
        })
        .from(patients)
        .where(
          and(
            eq(patients.tenantId, tenantId),
            isNull(patients.deletedAt),
            clean
              ? or(
                  ilike(patients.fullName, pattern),
                  ilike(patients.documentNumber, pattern),
                  ilike(patients.phone, pattern)
                )
              : undefined
          )
        )
        .orderBy(desc(patients.updatedAt))
        .limit(6),
      db
        .select({
          id: proceduresTariff.id,
          code: proceduresTariff.code,
          name: proceduresTariff.name,
          category: proceduresTariff.category,
          price: proceduresTariff.price,
        })
        .from(proceduresTariff)
        .where(
          and(
            eq(proceduresTariff.tenantId, tenantId),
            eq(proceduresTariff.active, true),
            isNull(proceduresTariff.deletedAt),
            clean
              ? or(
                  ilike(proceduresTariff.name, pattern),
                  ilike(proceduresTariff.code, pattern),
                  ilike(proceduresTariff.category, pattern)
                )
              : undefined
          )
        )
        .orderBy(proceduresTariff.code)
        .limit(8),
      db
        .select({
          id: medicationsVademecum.id,
          genericName: medicationsVademecum.genericName,
          atcCode: medicationsVademecum.atcCode,
          therapeuticGroup: medicationsVademecum.therapeuticGroup,
          commercialBrands: medicationsVademecum.commercialBrands,
        })
        .from(medicationsVademecum)
        .where(
          and(
            eq(medicationsVademecum.tenantId, tenantId),
            isNull(medicationsVademecum.deletedAt),
            clean
              ? or(
                  ilike(medicationsVademecum.genericName, pattern),
                  ilike(medicationsVademecum.atcCode, pattern),
                  ilike(medicationsVademecum.therapeuticGroup, pattern)
                )
              : undefined
          )
        )
        .orderBy(medicationsVademecum.genericName)
        .limit(6),
      searchCie10InDb(tenantId, clean, 6),
    ]);

  return {
    patients: matchedPatients,
    tariffs: matchedTariffs.map((t) => ({ ...t, price: Number(t.price) })),
    medications: matchedMeds,
    cie10: matchedCie10,
  };
}
