export const CLINICAL_IMAGE_MODULES = ["ecografias", "colposcopia"] as const;
export type ClinicalImageModule = (typeof CLINICAL_IMAGE_MODULES)[number];

export const CLINICAL_IMAGE_PATH_REGEX =
  /^clinical\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(ecografias|colposcopia)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/i;

/**
 * Construye la URL autenticada de mismo origen para mostrar e imprimir
 * imágenes médicas almacenadas en el bucket privado `clinical-images`.
 */
export function buildClinicalImageViewUrl(storagePath: string): string {
  return `/api/clinical-images?path=${encodeURIComponent(storagePath)}`;
}

/**
 * Valida estrictamente que una ruta de imagen pertenece a la sede, paciente y módulo indicados.
 */
export function isValidPatientClinicalImagePath(
  storagePath: string,
  tenantId: string,
  patientId: string,
  clinicalModule: ClinicalImageModule
): boolean {
  if (!storagePath || storagePath.includes("..") || storagePath.includes("\\")) {
    return false;
  }

  const match = storagePath.match(CLINICAL_IMAGE_PATH_REGEX);
  if (!match) return false;

  const [, pathTenantId, pathPatientId, pathModule] = match;
  return (
    pathTenantId.toLowerCase() === tenantId.toLowerCase() &&
    pathPatientId.toLowerCase() === patientId.toLowerCase() &&
    pathModule.toLowerCase() === clinicalModule
  );
}
