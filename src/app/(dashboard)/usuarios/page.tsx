import { redirect } from "next/navigation";
import { UsuariosView } from "@/components/usuarios/UsuariosView";
import { listDoctors } from "@/features/usuarios/services/usuarios.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function UsuariosPage() {
  const doctor = await requireSessionDoctor();
  if (doctor.role !== "admin") {
    redirect("/dashboard");
  }

  const doctors = await listDoctors(doctor.tenantId);

  return <UsuariosView initialDoctors={doctors} currentUserId={doctor.id} />;
}
