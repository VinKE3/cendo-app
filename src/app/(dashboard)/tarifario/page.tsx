import { TarifarioView } from "@/components/tarifario/TarifarioView";
import { listCategories } from "@/features/catalog-categories/services/catalog-categories.service";
import { listTariffs } from "@/features/tarifario/services/tarifario.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function TarifarioPage() {
  const doctor = await requireSessionDoctor();
  const [items, categories] = await Promise.all([
    listTariffs(doctor.tenantId),
    listCategories(doctor.tenantId, "tariff"),
  ]);

  const canEdit = doctor.role === "admin" || doctor.role === "moderator";
  const canDelete = doctor.role === "admin";

  return (
    <TarifarioView
      initialItems={items}
      initialCategories={categories}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
