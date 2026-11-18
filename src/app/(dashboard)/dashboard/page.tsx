import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { getDashboardOverview } from "@/features/dashboard/services/dashboard.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function DashboardPage() {
  const doctor = await requireSessionDoctor();
  const overview = await getDashboardOverview(doctor.tenantId);

  return (
    <DashboardOverview
      doctorTitle={doctor.doctorTitle}
      doctorName={doctor.fullName}
      todayPeru={overview.todayPeru}
      metrics={overview.metrics}
      todayAppointments={overview.todayAppointments}
      recentPatients={overview.recentPatients}
      topTariffs={overview.topTariffs}
      topMedications={overview.topMedications}
    />
  );
}
