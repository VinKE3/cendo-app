"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { getPeruDateString } from "@/lib/utils";
import {
  deletePrenatalCardAction,
  upsertPrenatalCardAction,
} from "../actions/prenatal.actions";
import {
  buildDefaultPrenatalBaseline,
  calculateGestationalAge,
  calculateNaegeleFPP,
  evaluatePrenatalRisks,
  prenatalVisitItemSchema,
  type MaternalPathologyItem,
  type PrenatalBaselineData,
  type PrenatalCardItem,
  type PrenatalVisitItem,
} from "../prenatal.schema";

export type PrenatalModalTab = "controles" | "basal" | "aro";
export type PrenatalVisitInputMode = "guided" | "matrix";

function addDaysToDateStr(dateStr: string, days: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000);
  if (Number.isNaN(dt.getTime())) return "";
  const ry = dt.getUTCFullYear();
  const rm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const rd = String(dt.getUTCDate()).padStart(2, "0");
  return `${ry}-${rm}-${rd}`;
}

export interface UsePrenatalParams {
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  initialCard: PrenatalCardItem | null;
  onCardChange: (next: PrenatalCardItem | null) => void;
  consultations: MedicalConsultationItem[];
  ultrasounds: UltrasoundReportItem[];
  onFurSynced?: (newFur: string) => void;
}

export function usePrenatal({
  patient,
  background,
  initialCard,
  onCardChange,
  consultations,
  ultrasounds,
  onFurSynced,
}: UsePrenatalParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const obstetricUltrasounds = useMemo(
    () =>
      ultrasounds.filter(
        (u) =>
          u.ultrasoundType === "OBSTETRICA_1T" ||
          u.ultrasoundType === "OBSTETRICA_GENETICA" ||
          u.ultrasoundType === "OBSTETRICA_2T_3T" ||
          u.ultrasoundType === "OBSTETRICA_MORFOLOGICA" ||
          Boolean(u.findings.gestationalAgeByEcho) ||
          Boolean(u.findings.fetalHeartRate)
      ),
    [ultrasounds]
  );

  const firstObstetricEcho = useMemo(
    () =>
      obstetricUltrasounds.length > 0
        ? obstetricUltrasounds[obstetricUltrasounds.length - 1]
        : null,
    [obstetricUltrasounds]
  );

  const latestObstetricEcho = useMemo(
    () => (obstetricUltrasounds.length > 0 ? obstetricUltrasounds[0] : null),
    [obstetricUltrasounds]
  );

  const latestConsultation = useMemo(
    () => (consultations.length > 0 ? consultations[0] : null),
    [consultations]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] =
    useState<PrenatalModalTab>("controles");
  const [visitInputMode, setVisitInputMode] =
    useState<PrenatalVisitInputMode>("guided");
  const [activeVisitNumber, setActiveVisitNumber] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [printingCard, setPrintingCard] = useState<PrenatalCardItem | null>(
    null
  );
  const [showCoverPage, setShowCoverPage] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Draft state inside modal
  const [clinicEstablishment, setClinicEstablishment] = useState(
    initialCard?.clinicEstablishment ||
      "CENDO - Centro de Endometriosis & Ginecología Especializada"
  );
  const [attendingDoctorName, setAttendingDoctorName] = useState(
    initialCard?.attendingDoctorName || "Dr. Patrick José Jacinto Gomero"
  );
  const [draftBaseline, setDraftBaseline] = useState<PrenatalBaselineData>(() =>
    initialCard
      ? initialCard.baseline
      : buildDefaultPrenatalBaseline({
          patient,
          background,
          firstObstetricEcho,
        })
  );
  const [draftVisits, setDraftVisits] = useState<PrenatalVisitItem[]>(
    () => initialCard?.visits ?? []
  );
  const [draftPathologies, setDraftPathologies] = useState<
    MaternalPathologyItem[]
  >(() => initialCard?.maternalPathologies ?? []);
  const [syncFurToBackground, setSyncFurToBackground] = useState(true);

  const buildNewVisitDefault = (
    visitNum: number,
    base: PrenatalBaselineData,
    prevVisits: PrenatalVisitItem[]
  ): PrenatalVisitItem => {
    const ga = calculateGestationalAge(base.fum, todayStr);
    const lastVisit =
      prevVisits.length > 0 ? prevVisits[prevVisits.length - 1] : null;

    // Si hay una consulta de hoy, usar sus signos vitales automáticamente
    const todayCons =
      consultations.find((c) => c.consultationDate === todayStr) ||
      latestConsultation;

    const estimatedWeight =
      todayCons && (todayCons.vitalSigns.weightKg ?? 0) > 0
        ? (todayCons.vitalSigns.weightKg as number)
        : lastVisit && lastVisit.maternalWeightKg > 0
          ? Number((lastVisit.maternalWeightKg + 0.8).toFixed(1))
          : Number((base.usualWeightKg + Math.max(0.5, ga.weeks * 0.25)).toFixed(1));

    const defaultBp =
      todayCons && todayCons.vitalSigns.bloodPressure
        ? todayCons.vitalSigns.bloodPressure
        : lastVisit?.bloodPressure || "110/70";

    const defaultPulse =
      todayCons && (todayCons.vitalSigns.heartRate ?? 0) > 0
        ? (todayCons.vitalSigns.heartRate as number)
        : lastVisit?.maternalPulse || 78;

    const defaultTemp =
      todayCons && (todayCons.vitalSigns.temperature ?? 0) > 0
        ? (todayCons.vitalSigns.temperature as number)
        : 36.6;

    const defaultFcf =
      latestObstetricEcho?.findings.fetalHeartRate &&
      latestObstetricEcho.findings.fetalHeartRate > 0
        ? latestObstetricEcho.findings.fetalHeartRate
        : ga.weeks >= 12
          ? 144
          : 0;

    const nextIntervalDays = ga.weeks >= 36 ? 7 : ga.weeks >= 28 ? 14 : 28;

    return prenatalVisitItemSchema.parse({
      visitNumber: visitNum,
      visitDate: todayStr,
      visitTime: "09:30",
      gestationalAgeWeeks: ga.weeks,
      gestationalAgeDays: ga.days,
      maternalWeightKg: estimatedWeight,
      temperature: defaultTemp,
      bloodPressure: defaultBp,
      maternalPulse: defaultPulse,
      uterineHeightCm: ga.weeks >= 13 ? Math.max(12, ga.weeks - 2) : 0,
      fetusSituation: ga.weeks >= 24 ? "L" : "NA",
      fetusPresentation: ga.weeks >= 24 ? "C" : "NA",
      fetusPosition: ga.weeks >= 24 ? "D" : "NA",
      fetalHeartRate: defaultFcf,
      fetalMovements: ga.weeks >= 18 ? "++" : "NA",
      proteinuria: "-",
      edema: "SE",
      tendonReflex: "++",
      nippleExam: "Formado",
      ironFolicAcidGiven: ga.weeks >= 14,
      calciumGiven: ga.weeks >= 20,
      folicAcidEarlyGiven: ga.weeks < 14,
      counselingGiven: "Integral (PF/NUT/Signos Alarma)",
      ultrasoundGestationalAge:
        latestObstetricEcho?.findings.gestationalAgeByEcho || "NA",
      biophysicalProfileScore: ga.weeks >= 28 ? "10/10" : "NA",
      nextAppointmentDate: addDaysToDateStr(todayStr, nextIntervalDays),
      homeVisit: "NA",
      birthPlanVisit: "Control",
      attentionEstablishment: "CENDO Miraflores",
      attendingDoctorName:
        attendingDoctorName || "Dr. Patrick José Jacinto Gomero",
      sisFormatNumber:
        base.insuranceType === "SIS"
          ? base.insuranceAffiliationCode || "SIS"
          : "Particular",
      notes: "",
    });
  };

  const openModal = (
    tab: PrenatalModalTab = "controles",
    options?: { autoCreateNextVisit?: boolean; targetVisitNumber?: number }
  ) => {
    const base = initialCard
      ? initialCard.baseline
      : buildDefaultPrenatalBaseline({
          patient,
          background,
          firstObstetricEcho,
        });
    const currentVisits = initialCard ? [...initialCard.visits] : [];
    const currentPathologies = initialCard
      ? [...initialCard.maternalPathologies]
      : [];

    setClinicEstablishment(
      initialCard?.clinicEstablishment ||
        "CENDO - Centro de Endometriosis & Ginecología Especializada"
    );
    setAttendingDoctorName(
      initialCard?.attendingDoctorName || "Dr. Patrick José Jacinto Gomero"
    );
    setDraftBaseline(base);
    setDraftPathologies(currentPathologies);
    setActiveModalTab(tab);

    if (options?.targetVisitNumber) {
      const targetNum = options.targetVisitNumber;
      const exists = currentVisits.some((v) => v.visitNumber === targetNum);
      if (!exists) {
        const created = buildNewVisitDefault(targetNum, base, currentVisits);
        const nextList = [...currentVisits, created].sort(
          (a, b) => a.visitNumber - b.visitNumber
        );
        setDraftVisits(nextList);
      } else {
        setDraftVisits(currentVisits);
      }
      setActiveVisitNumber(targetNum);
    } else if (
      options?.autoCreateNextVisit ||
      (tab === "controles" && currentVisits.length === 0)
    ) {
      // Si pide registrar control nuevo o aún hay 0 controles, habilita de inmediato la siguiente atención
      const usedNums = new Set(currentVisits.map((v) => v.visitNumber));
      let nextNum = 1;
      while (usedNums.has(nextNum) && nextNum <= 9) {
        nextNum++;
      }
      if (nextNum <= 9) {
        const created = buildNewVisitDefault(nextNum, base, currentVisits);
        const nextList = [...currentVisits, created].sort(
          (a, b) => a.visitNumber - b.visitNumber
        );
        setDraftVisits(nextList);
        setActiveVisitNumber(nextNum);
      } else {
        setDraftVisits(currentVisits);
        setActiveVisitNumber(9);
      }
    } else {
      setDraftVisits(currentVisits);
      setActiveVisitNumber(
        currentVisits.length > 0
          ? currentVisits[currentVisits.length - 1].visitNumber
          : 1
      );
    }

    setModalOpen(true);
  };

  const handleAddOrSelectVisit = (visitNumber?: number) => {
    const targetNum =
      visitNumber ??
      (() => {
        const used = new Set(draftVisits.map((v) => v.visitNumber));
        for (let i = 1; i <= 9; i++) {
          if (!used.has(i)) return i;
        }
        return 9;
      })();

    const existing = draftVisits.find((v) => v.visitNumber === targetNum);
    if (existing) {
      setActiveVisitNumber(targetNum);
      return;
    }

    const created = buildNewVisitDefault(targetNum, draftBaseline, draftVisits);
    const updated = [...draftVisits, created].sort(
      (a, b) => a.visitNumber - b.visitNumber
    );
    setDraftVisits(updated);
    setActiveVisitNumber(targetNum);
    toast.success(`Atención Prenatal N° ${targetNum} habilitada para edición.`);
  };

  const handleUpdateVisit = (
    visitNumber: number,
    patch: Partial<PrenatalVisitItem>
  ) => {
    setDraftVisits((prev) =>
      prev.map((v) => {
        if (v.visitNumber !== visitNumber) return v;
        const next = { ...v, ...patch };
        // Si cambia la fecha de la atención y hay FUM, recalcular automáticamente la EG de esa visita
        if (patch.visitDate && draftBaseline.fum) {
          const ga = calculateGestationalAge(draftBaseline.fum, patch.visitDate);
          next.gestationalAgeWeeks = ga.weeks;
          next.gestationalAgeDays = ga.days;
        }
        return next;
      })
    );
  };

  const handleRemoveVisit = (visitNumber: number) => {
    setDraftVisits((prev) => {
      const filtered = prev.filter((v) => v.visitNumber !== visitNumber);
      if (activeVisitNumber === visitNumber) {
        setActiveVisitNumber(
          filtered.length > 0 ? filtered[filtered.length - 1].visitNumber : 1
        );
      }
      return filtered;
    });
  };

  const handleSyncFromClinicalRecord = () => {
    const synced = buildDefaultPrenatalBaseline({
      patient,
      background,
      firstObstetricEcho,
    });
    setDraftBaseline((prev) => ({
      ...prev,
      ...synced,
      // Conservar laboratorios ya ingresados manualmente
      hemoglobin1: prev.hemoglobin1 ?? synced.hemoglobin1,
      hemoglobin2: prev.hemoglobin2,
      hemoglobin3: prev.hemoglobin3,
    }));
    toast.success(
      "Datos basales sincronizados desde Filiación, Antecedentes y 1.ª Ecografía Obstétrica."
    );
  };

  const handleImportVitalSignsFromConsultation = (
    cons: MedicalConsultationItem,
    targetVisitNum: number = activeVisitNumber
  ) => {
    const ga = calculateGestationalAge(draftBaseline.fum, cons.consultationDate);
    handleUpdateVisit(targetVisitNum, {
      visitDate: cons.consultationDate,
      gestationalAgeWeeks: ga.weeks,
      gestationalAgeDays: ga.days,
      maternalWeightKg:
        (cons.vitalSigns.weightKg ?? 0) > 0
          ? cons.vitalSigns.weightKg
          : undefined,
      bloodPressure: cons.vitalSigns.bloodPressure || "110/70",
      maternalPulse:
        (cons.vitalSigns.heartRate ?? 0) > 0 ? cons.vitalSigns.heartRate : 78,
      temperature:
        (cons.vitalSigns.temperature ?? 0) > 0
          ? cons.vitalSigns.temperature
          : 36.6,
      nextAppointmentDate:
        cons.nextAppointmentDate ||
        addDaysToDateStr(cons.consultationDate, 28),
    });
    toast.success(
      `Signos vitales de la consulta (${cons.consultationDate}) importados a la Atención N° ${targetVisitNum}.`
    );
  };

  const handleImportEchoIntoVisit = (
    echo: UltrasoundReportItem,
    targetVisitNum: number = activeVisitNumber
  ) => {
    handleUpdateVisit(targetVisitNum, {
      ultrasoundGestationalAge:
        echo.findings.gestationalAgeByEcho || `${echo.reportDate}`,
      fetalHeartRate:
        echo.findings.fetalHeartRate && echo.findings.fetalHeartRate > 0
          ? echo.findings.fetalHeartRate
          : undefined,
    });
    toast.success(
      `Datos de Ecografía (${echo.reportDate}) importados a la Atención N° ${targetVisitNum}.`
    );
  };

  const handleSaveCard = async (andPrint = false) => {
    setIsSubmitting(true);
    try {
      const payload = {
        id: initialCard?.id,
        patientId: patient.id,
        clinicEstablishment,
        attendingDoctorName,
        baseline: {
          ...draftBaseline,
          fpp:
            draftBaseline.fpp ||
            calculateNaegeleFPP(draftBaseline.fum),
        },
        visits: draftVisits,
        maternalPathologies: draftPathologies,
        syncBackgroundFur: syncFurToBackground,
      };

      const res = await upsertPrenatalCardAction(payload);
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo guardar el Carnet Prenatal.");
        return;
      }

      onCardChange(res.data);
      if (syncFurToBackground && res.data.baseline.fum && onFurSynced) {
        onFurSynced(res.data.baseline.fum);
      }

      setModalOpen(false);
      toast.success("Carnet de Control Prenatal MINSA / CLAP guardado.");

      if (andPrint) {
        setPrintingCard(res.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!initialCard) return;
    setIsDeleting(true);
    try {
      const res = await deletePrenatalCardAction({ id: initialCard.id });
      if (!res.success) {
        toast.error(res.error || "No se pudo eliminar el carnet prenatal.");
        return;
      }
      onCardChange(null);
      setDeleteDialogOpen(false);
      toast.success("Carnet de Control Prenatal eliminado.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Live computed metrics for dashboard and modal
  const liveBaseline = modalOpen
    ? draftBaseline
    : initialCard?.baseline ?? draftBaseline;

  const currentGestationalAge = useMemo(
    () => calculateGestationalAge(liveBaseline.fum, todayStr),
    [liveBaseline.fum, todayStr]
  );

  const riskReport = useMemo(() => {
    const visitsForRisk = modalOpen ? draftVisits : initialCard?.visits ?? [];
    const pathologiesForRisk = modalOpen
      ? draftPathologies
      : initialCard?.maternalPathologies ?? [];
    return evaluatePrenatalRisks(
      liveBaseline,
      patient.age,
      visitsForRisk,
      pathologiesForRisk
    );
  }, [
    liveBaseline,
    patient.age,
    modalOpen,
    draftVisits,
    draftPathologies,
    initialCard,
  ]);

  return {
    todayStr,
    modalOpen,
    setModalOpen,
    activeModalTab,
    setActiveModalTab,
    visitInputMode,
    setVisitInputMode,
    activeVisitNumber,
    setActiveVisitNumber,
    isSubmitting,
    printingCard,
    setPrintingCard,
    showCoverPage,
    setShowCoverPage,
    deleteDialogOpen,
    setDeleteDialogOpen,
    isDeleting,
    clinicEstablishment,
    setClinicEstablishment,
    attendingDoctorName,
    setAttendingDoctorName,
    draftBaseline,
    setDraftBaseline,
    draftVisits,
    setDraftVisits,
    draftPathologies,
    setDraftPathologies,
    syncFurToBackground,
    setSyncFurToBackground,
    obstetricUltrasounds,
    firstObstetricEcho,
    latestObstetricEcho,
    latestConsultation,
    currentGestationalAge,
    riskReport,
    openModal,
    handleAddOrSelectVisit,
    handleUpdateVisit,
    handleRemoveVisit,
    handleSyncFromClinicalRecord,
    handleImportVitalSignsFromConsultation,
    handleImportEchoIntoVisit,
    handleSaveCard,
    handleDeleteCard,
  };
}
