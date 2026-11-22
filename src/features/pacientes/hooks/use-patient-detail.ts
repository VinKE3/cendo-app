"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  calculateGestationalAgeFromFur,
  CONTRACEPTIVE_CATALOG,
  resolveContraceptive,
} from "@/lib/clinical/catalogs";
import { calculateAge } from "@/lib/utils";
import {
  updatePatientAction,
  upsertPatientBackgroundAction,
} from "../actions/pacientes.actions";
import {
  patientBackgroundInputSchema,
  patientInputSchema,
  type PatientBackgroundInput,
  type PatientBackgroundItem,
  type PatientDetailData,
  type PatientDirectoryItem,
  type PatientInput,
} from "../pacientes.schema";
import { buildDefaultPatientValues } from "./use-pacientes";

export type PatientDetailTab =
  | "resumen"
  | "consultas"
  | "chequeos"
  | "procedimientos"
  | "prenatal"
  | "recetas"
  | "laboratorio"
  | "documentos";

const VALID_TABS: PatientDetailTab[] = [
  "resumen",
  "consultas",
  "chequeos",
  "procedimientos",
  "prenatal",
  "recetas",
  "laboratorio",
  "documentos",
];

function resolveTabFromQuery(rawTab: string | null): PatientDetailTab {
  if (!rawTab) return "resumen";
  if (rawTab === "colposcopia" || rawTab === "ecografias") {
    return "chequeos";
  }
  return VALID_TABS.includes(rawTab as PatientDetailTab)
    ? (rawTab as PatientDetailTab)
    : "resumen";
}

function buildDefaultBackgroundValues(
  patientId: string,
  bg: PatientBackgroundItem | null
): PatientBackgroundInput {
  if (bg) {
    return {
      patientId,
      obstetricFormula: bg.obstetricFormula || "G0 P0000",
      menarche: bg.menarche ?? 12,
      sexualDebutAge: bg.sexualDebutAge ?? 18,
      sexualPartnersCount: bg.sexualPartnersCount ?? 1,
      catamenialRegimen: bg.catamenialRegimen || "28/4",
      stiHistory: bg.stiHistory || "Niega ITS",
      contraceptiveMethod: resolveContraceptive(bg.contraceptiveMethod).label,
      lastMenstrualPeriod: bg.lastMenstrualPeriod || "",
      papHistory: bg.papHistory || "No refiere",
      vphTestHistory: bg.vphTestHistory || "No realizado",
      hasDiabetes: bg.hasDiabetes || "Niega",
      hasHypertension: bg.hasHypertension || "Niega",
      hasAsthma: bg.hasAsthma || "Niega",
      medicalAllergies: bg.medicalAllergies || "Niega",
      surgeriesHistory: bg.surgeriesHistory || "Niega",
      familyHistory: bg.familyHistory || "No refiere",
      otherPathologies: bg.otherPathologies || "Niega",
      notes: bg.notes || "",
    };
  }

  return {
    patientId,
    obstetricFormula: "G0 P0000",
    menarche: 12,
    sexualDebutAge: 18,
    sexualPartnersCount: 1,
    catamenialRegimen: "28/4",
    stiHistory: "Niega ITS",
    contraceptiveMethod: "Ninguno",
    lastMenstrualPeriod: "",
    papHistory: "No refiere",
    vphTestHistory: "No realizado",
    hasDiabetes: "Niega",
    hasHypertension: "Niega",
    hasAsthma: "Niega",
    medicalAllergies: "Niega",
    surgeriesHistory: "Niega",
    familyHistory: "No refiere",
    otherPathologies: "Niega",
    notes: "",
  };
}

export function usePatientDetail(initialDetail: PatientDetailData) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [patient, setPatient] = useState<PatientDirectoryItem>(initialDetail.patient);
  const [background, setBackground] = useState<PatientBackgroundItem | null>(
    initialDetail.background
  );
  const [prevInitialDetail, setPrevInitialDetail] = useState(initialDetail);
  if (prevInitialDetail !== initialDetail) {
    setPrevInitialDetail(initialDetail);
    setPatient(initialDetail.patient);
    setBackground(initialDetail.background);
  }
  const counts = initialDetail.counts;

  const activeTab: PatientDetailTab = resolveTabFromQuery(searchParams.get("tab"));

  const setActiveTab = (tab: PatientDetailTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (tab === "resumen") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }
    const qs = nextParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Modal de filiación
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const patientForm = useForm<PatientInput>({
    resolver: zodResolver(patientInputSchema),
    defaultValues: buildDefaultPatientValues(patient),
  });
  const watchedBirthDate = useWatch({
    control: patientForm.control,
    name: "birthDate",
  });
  const computedPatientAge = useMemo(
    () => calculateAge(watchedBirthDate),
    [watchedBirthDate]
  );

  const openEditPatientModal = () => {
    patientForm.reset(buildDefaultPatientValues(patient));
    setPatientDialogOpen(true);
  };

  const onSubmitPatient = patientForm.handleSubmit(async (values) => {
    const res = await updatePatientAction({ ...values, id: patient.id });
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudieron actualizar los datos de filiación.");
      return;
    }
    setPatient(res.data);
    setPatientDialogOpen(false);
    toast.success("Datos de filiación actualizados.");
  });

  // Modal de antecedentes gineco-obstétricos
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);
  const [customMacText, setCustomMacText] = useState("");
  const backgroundForm = useForm<PatientBackgroundInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(patientBackgroundInputSchema) as any,
    defaultValues: buildDefaultBackgroundValues(patient.id, background),
  });

  const watchedMac = useWatch({
    control: backgroundForm.control,
    name: "contraceptiveMethod",
  });
  const watchedFur = useWatch({
    control: backgroundForm.control,
    name: "lastMenstrualPeriod",
  });

  const modalFurCalculation = useMemo(
    () => calculateGestationalAgeFromFur(watchedFur),
    [watchedFur]
  );

  const currentFurCalculation = useMemo(
    () => calculateGestationalAgeFromFur(background?.lastMenstrualPeriod),
    [background?.lastMenstrualPeriod]
  );

  const availableMacOptions = useMemo(() => {
    const standardLabels = CONTRACEPTIVE_CATALOG.filter((c) => c.id !== "OTRO").map(
      (c) => c.label
    );
    const resolved = resolveContraceptive(background?.contraceptiveMethod);
    if (
      resolved.id === "OTRO" &&
      resolved.label &&
      !standardLabels.includes(resolved.label)
    ) {
      return [resolved.label, ...standardLabels];
    }
    return standardLabels;
  }, [background?.contraceptiveMethod]);

  const openEditBackgroundModal = () => {
    backgroundForm.reset(buildDefaultBackgroundValues(patient.id, background));
    setCustomMacText("");
    setBackgroundDialogOpen(true);
  };

  const onSubmitBackground = backgroundForm.handleSubmit(async (values) => {
    const finalMac =
      values.contraceptiveMethod === "__OTRO__"
        ? customMacText.trim() || "Otro"
        : values.contraceptiveMethod;

    const res = await upsertPatientBackgroundAction({
      ...values,
      patientId: patient.id,
      contraceptiveMethod: finalMac,
    });

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudieron guardar los antecedentes.");
      return;
    }

    const saved = res.data;
    setBackground(saved);
    setPatient((prev) => ({
      ...prev,
      obstetricFormula: saved.obstetricFormula,
      medicalAllergies: saved.medicalAllergies,
      lastMenstrualPeriod: saved.lastMenstrualPeriod,
    }));
    setBackgroundDialogOpen(false);
    toast.success("Antecedentes gineco-obstétricos actualizados.");
  });

  return {
    patient,
    background,
    setBackground,
    counts,
    activeTab,
    setActiveTab,
    currentFurCalculation,
    // Patient modal
    patientDialogOpen,
    setPatientDialogOpen,
    patientForm,
    computedPatientAge,
    isSubmittingPatient: patientForm.formState.isSubmitting,
    openEditPatientModal,
    onSubmitPatient,
    // Background modal
    backgroundDialogOpen,
    setBackgroundDialogOpen,
    backgroundForm,
    watchedMac,
    customMacText,
    setCustomMacText,
    availableMacOptions,
    modalFurCalculation,
    isSubmittingBackground: backgroundForm.formState.isSubmitting,
    openEditBackgroundModal,
    onSubmitBackground,
  };
}
