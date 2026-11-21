import { DashboardShell } from "@/components/layout/DashboardShell";
import { listCie10Codes } from "@/features/cie10/services/cie10.service";
import { listTenantSignatureDirectory } from "@/features/configuracion/services/configuracion.service";
import { getTodayAppointmentsCount } from "@/features/dashboard/services/dashboard.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const doctor = await requireSessionDoctor();
  const [todayAppointmentsCount, signatureDirectory, cie10Catalog] =
    await Promise.all([
      getTodayAppointmentsCount(doctor.tenantId),
      listTenantSignatureDirectory(doctor.tenantId),
      listCie10Codes(doctor.tenantId),
    ]);

  return (
    <DashboardShell
      doctor={doctor}
      todayAppointmentsCount={todayAppointmentsCount}
      initialSignatureDirectory={signatureDirectory}
      initialCie10Catalog={cie10Catalog}
    >
      {children}
    </DashboardShell>
  );
}
