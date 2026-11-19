import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PatientDetailView } from "@/components/pacientes/PatientDetailView";
import { listCategories } from "@/features/catalog-categories/services/catalog-categories.service";
import {
  getConsultationFormContext,
  listConsultationsByPatient,
} from "@/features/consultas/services/consultas.service";
import { getPatientDetail } from "@/features/pacientes/services/pacientes.service";
import { listPrescriptionsByPatient } from "@/features/recetas/services/recetas.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const doctor = await requireSessionDoctor();
  const { id } = await params;

  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    notFound();
  }

  const detail = await getPatientDetail(doctor.tenantId, parsedId.data);
  if (!detail) {
    notFound();
  }

  const [consultations, consultationReasons, prescriptions] = await Promise.all([
    listConsultationsByPatient(doctor.tenantId, parsedId.data),
    listCategories(doctor.tenantId, "consultation_reason"),
    listPrescriptionsByPatient(doctor.tenantId, parsedId.data),
  ]);
  const consultationFormContext = await getConsultationFormContext(
    doctor.tenantId,
    parsedId.data
  );

  const canEdit = doctor.role === "admin" || doctor.role === "moderator";
  const canDelete = doctor.role === "admin";

  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Cargando historia clínica...
        </div>
      }
    >
      <PatientDetailView
        initialDetail={detail}
        initialConsultations={consultations}
        initialConsultationReasons={consultationReasons}
        initialPrescriptions={prescriptions}
        consultationFormContext={consultationFormContext}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </Suspense>
  );
}
