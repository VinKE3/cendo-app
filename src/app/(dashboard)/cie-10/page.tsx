import { Cie10View } from "@/components/cie10/Cie10View";
import { listCategories } from "@/features/catalog-categories/services/catalog-categories.service";
import { listCie10Codes } from "@/features/cie10/services/cie10.service";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function Cie10Page() {
  const doctor = await requireSessionDoctor();
  const [items, categories] = await Promise.all([
    listCie10Codes(doctor.tenantId),
    listCategories(doctor.tenantId, "cie10"),
  ]);

  const canEdit = doctor.role === "admin" || doctor.role === "moderator";
  const canDelete = doctor.role === "admin";

  return (
    <Cie10View
      initialItems={items}
      initialCategories={categories}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
