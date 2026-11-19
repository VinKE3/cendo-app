"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createClinicalTemplateAction,
  deleteClinicalTemplateAction,
  restoreOfficialClinicalTemplatesAction,
  updateClinicalTemplateAction,
} from "../actions/clinical-templates.actions";
import type {
  ClinicalTemplateItem,
  ClinicalTemplateScope,
  ColposcopyClinicalTemplateItem,
  CreateClinicalTemplateInput,
  ProcedureClinicalTemplateItem,
  UltrasoundClinicalTemplateItem,
  UpdateClinicalTemplateInput,
} from "../clinical-templates.schema";

function sortTemplates(list: ClinicalTemplateItem[]): ClinicalTemplateItem[] {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function useClinicalTemplates(initialTemplates: ClinicalTemplateItem[]) {
  const [templates, setTemplates] = useState<ClinicalTemplateItem[]>(
    () => sortTemplates(initialTemplates)
  );
  const [isMutating, setIsMutating] = useState(false);

  const ultrasoundTemplates = useMemo(
    () =>
      templates.filter(
        (t): t is UltrasoundClinicalTemplateItem => t.scope === "ULTRASOUND"
      ),
    [templates]
  );

  const colposcopyTemplates = useMemo(
    () =>
      templates.filter(
        (t): t is ColposcopyClinicalTemplateItem => t.scope === "COLPOSCOPY"
      ),
    [templates]
  );

  const procedureTemplates = useMemo(
    () =>
      templates.filter(
        (t): t is ProcedureClinicalTemplateItem => t.scope === "PROCEDURE"
      ),
    [templates]
  );

  const createTemplate = async (
    input: CreateClinicalTemplateInput
  ): Promise<{ success: boolean; data?: ClinicalTemplateItem }> => {
    setIsMutating(true);
    try {
      const res = await createClinicalTemplateAction(input);
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo guardar la plantilla clínica.");
        return { success: false };
      }

      const created = res.data;
      setTemplates((prev) => sortTemplates([...prev, created]));
      toast.success(`Plantilla "${created.name}" guardada.`);
      return { success: true, data: created };
    } finally {
      setIsMutating(false);
    }
  };

  const updateTemplate = async (
    input: UpdateClinicalTemplateInput
  ): Promise<boolean> => {
    setIsMutating(true);
    try {
      const res = await updateClinicalTemplateAction(input);
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar la plantilla clínica.");
        return false;
      }

      const updated = res.data;
      setTemplates((prev) =>
        sortTemplates(
          prev.map((item) => (item.id === updated.id ? updated : item))
        )
      );
      toast.success(`Plantilla "${updated.name}" actualizada.`);
      return true;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    setIsMutating(true);
    try {
      const res = await deleteClinicalTemplateAction({ id });
      if (!res.success) {
        toast.error(res.error || "No se pudo eliminar la plantilla.");
        return false;
      }

      setTemplates((prev) => prev.filter((item) => item.id !== id));
      toast.success("Plantilla clínica eliminada.");
      return true;
    } finally {
      setIsMutating(false);
    }
  };

  const restoreOfficialTemplates = async (
    scope?: ClinicalTemplateScope
  ): Promise<boolean> => {
    setIsMutating(true);
    try {
      const res = await restoreOfficialClinicalTemplatesAction(
        scope ? { scope } : {}
      );
      if (!res.success || !res.data) {
        toast.error(
          res.error || "No se pudieron restaurar las plantillas oficiales."
        );
        return false;
      }

      const restoredItems = res.data;
      setTemplates((prev) => {
        if (!scope) {
          return sortTemplates(restoredItems);
        }
        const untouched = prev.filter((item) => item.scope !== scope);
        return sortTemplates([...untouched, ...restoredItems]);
      });

      toast.success(
        scope === "ULTRASOUND"
          ? "Plantillas oficiales CENDO de Ecografía restauradas."
          : scope === "COLPOSCOPY"
            ? "Plantillas oficiales CENDO de Colposcopía restauradas."
            : scope === "PROCEDURE"
              ? "Plantillas oficiales CENDO de Procedimientos Menores restauradas."
              : "Plantillas oficiales CENDO restauradas."
      );
      return true;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    templates,
    ultrasoundTemplates,
    colposcopyTemplates,
    procedureTemplates,
    isMutating,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    restoreOfficialTemplates,
  };
}
