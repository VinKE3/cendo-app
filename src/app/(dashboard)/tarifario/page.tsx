import { TarifarioView } from "@/components/tarifario/TarifarioView";
import { listCategories } from "@/features/catalog-categories/services/catalog-categories.service";
import { getOwnConfigProfile } from "@/features/configuracion/services/configuracion.service";
import { listTariffs } from "@/features/tarifario/services/tarifario.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function TarifarioPage() {
  const doctor = await requireSessionDoctor();
  const [items, categories, profile] = await Promise.all([
    listTariffs(doctor.tenantId),
    listCategories(doctor.tenantId, "tariff"),
    getOwnConfigProfile(doctor.tenantId, doctor.id),
  ]);

  const canEdit = doctor.role === "admin" || doctor.role === "moderator";
  const canDelete = doctor.role === "admin";

  const clinicInfo = profile
    ? {
        clinicAddress: profile.clinicAddress,
        phone: profile.phone,
        googleMapsUrl: profile.googleMapsUrl,
      }
    : undefined;

  return (
    <TarifarioView
      initialItems={items}
      initialCategories={categories}
      clinicInfo={clinicInfo}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
