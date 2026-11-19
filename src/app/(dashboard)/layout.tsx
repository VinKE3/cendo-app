import { DashboardShell } from "@/components/layout/DashboardShell";
import { listTenantSignatureDirectory } from "@/features/configuracion/services/configuracion.service";
import { getTodayAppointmentsCount } from "@/features/dashboard/services/dashboard.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const doctor = await requireSessionDoctor();
  const [todayAppointmentsCount, signatureDirectory] = await Promise.all([
    getTodayAppointmentsCount(doctor.tenantId),
    listTenantSignatureDirectory(doctor.tenantId),
  ]);

  return (
    <DashboardShell
      doctor={doctor}
      todayAppointmentsCount={todayAppointmentsCount}
      initialSignatureDirectory={signatureDirectory}
    >
      {children}
    </DashboardShell>
  );
}
