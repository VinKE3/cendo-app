import { redirect } from "next/navigation";
import { ConfiguracionView } from "@/components/configuracion/ConfiguracionView";
import { getOwnConfigProfile } from "@/features/configuracion/services/configuracion.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function ConfiguracionPage() {
  const doctor = await requireSessionDoctor();
  const profile = await getOwnConfigProfile(doctor.tenantId, doctor.id);

  if (!profile) {
    redirect("/dashboard");
  }

  return <ConfiguracionView initialProfile={profile} />;
}
