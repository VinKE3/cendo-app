import { PatientsDirectoryView } from "@/components/pacientes/PatientsDirectoryView";
import { listPatients } from "@/features/pacientes/services/pacientes.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function PacientesPage() {
  const doctor = await requireSessionDoctor();
  const items = await listPatients(doctor.tenantId);

  const canEdit = doctor.role === "admin" || doctor.role === "moderator";
  const canDelete = doctor.role === "admin";

  return (
    <PatientsDirectoryView
      initialItems={items}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
