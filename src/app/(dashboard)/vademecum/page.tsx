import { VademecumView } from "@/components/vademecum/VademecumView";
import { listCategories } from "@/features/catalog-categories/services/catalog-categories.service";
import { listMedications } from "@/features/vademecum/services/vademecum.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function VademecumPage() {
  const doctor = await requireSessionDoctor();
  const [items, categories] = await Promise.all([
    listMedications(doctor.tenantId),
    listCategories(doctor.tenantId, "vademecum"),
  ]);

  const canEdit = doctor.role === "admin" || doctor.role === "moderator";
  const canDelete = doctor.role === "admin";

  return (
    <VademecumView
      initialItems={items}
      initialCategories={categories}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
