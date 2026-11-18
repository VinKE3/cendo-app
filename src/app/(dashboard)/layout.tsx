import { DashboardShell } from "@/components/layout/DashboardShell";
import { getTodayAppointmentsCount } from "@/features/dashboard/services/dashboard.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const doctor = await requireSessionDoctor();
  const todayAppointmentsCount = await getTodayAppointmentsCount(doctor.tenantId);

  return (
    <DashboardShell doctor={doctor} todayAppointmentsCount={todayAppointmentsCount}>
      {children}
    </DashboardShell>
  );
}
