import { Suspense } from "react";
import { AgendaView } from "@/components/agenda/AgendaView";
import {
  listActiveDoctorsForAgenda,
  listAppointments,
  listPatientsForAgendaSelect,
} from "@/features/agenda/services/agenda.service";
import { listCategories } from "@/features/catalog-categories/services/catalog-categories.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function AgendaPage() {
  const doctor = await requireSessionDoctor();

  const [appointments, appointmentTypes, doctors, patients] = await Promise.all([
    listAppointments(doctor.tenantId),
    listCategories(doctor.tenantId, "appointment_type"),
    listActiveDoctorsForAgenda(doctor.tenantId),
    listPatientsForAgendaSelect(doctor.tenantId),
  ]);

  const canEdit = doctor.role === "admin" || doctor.role === "moderator";
  const canDelete = doctor.role === "admin";

  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Cargando agenda médica...
        </div>
      }
    >
      <AgendaView
        initialAppointments={appointments}
        initialAppointmentTypes={appointmentTypes}
        doctors={doctors}
        initialPatients={patients}
        currentDoctorId={doctor.id}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </Suspense>
  );
}
