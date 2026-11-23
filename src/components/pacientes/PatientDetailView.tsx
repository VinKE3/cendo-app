"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Baby,
  Calendar,
  FileText,
  FlaskConical,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Pill,
  Scissors,
  Shield,
  Stethoscope,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  usePatientDetail,
  type PatientDetailTab,
} from "@/features/pacientes/hooks/use-patient-detail";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import type { ClinicalCheckupItem } from "@/features/chequeos/chequeos.schema";
import type { ClinicalTemplateItem } from "@/features/clinical-templates/clinical-templates.schema";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type {
  ConsultationFormContext,
  MedicalConsultationItem,
} from "@/features/consultas/consultas.schema";
import type { ProcedureQuoteItem } from "@/features/cotizaciones/cotizaciones.schema";
import type {
  PatientDocumentItem,
  WordHistoryDocumentItem,
} from "@/features/documentos/documentos.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type {
  LabOrderItem,
  LabOrderTemplateItem,
} from "@/features/laboratorio/laboratorio.schema";
import type { PatientDetailData } from "@/features/pacientes/pacientes.schema";
import type { PrenatalCardItem } from "@/features/prenatal/prenatal.schema";
import type { MinorProcedureItem } from "@/features/procedimientos/procedimientos.schema";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import type { ProcedureTariffItem } from "@/features/tarifario/tarifario.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
import { TabChequeos } from "../chequeos/TabChequeos";
import { TabConsultas } from "../consultas/TabConsultas";
import { TabDocumentos } from "../documentos/TabDocumentos";
import { WordImportModal } from "../documentos/WordImportModal";
import {
  TabLaboratorioCotizaciones,
  type TabLabCotizHandle,
} from "../laboratorio/TabLaboratorioCotizaciones";
import { TabControlPrenatal } from "../prenatal/TabControlPrenatal";
import { TabProcedimientos } from "../procedimientos/TabProcedimientos";
import { TabRecetas, type TabRecetasHandle } from "../recetas/TabRecetas";
import { PatientBackgroundModal } from "./PatientBackgroundModal";
import { PatientModal } from "./PatientModal";

interface PatientDetailViewProps {
  initialDetail: PatientDetailData;
  initialConsultations: MedicalConsultationItem[];
  initialConsultationReasons: CatalogCategoryItem[];
  initialPrescriptions: MedicalPrescriptionItem[];
  initialLabOrders: LabOrderItem[];
  initialLabTemplates: LabOrderTemplateItem[];
  initialQuotes: ProcedureQuoteItem[];
  initialUltrasounds: UltrasoundReportItem[];
  initialColposcopies: ColposcopyReportItem[];
  initialCheckups: ClinicalCheckupItem[];
  initialPatientDocuments: PatientDocumentItem[];
  initialWordHistories?: WordHistoryDocumentItem[];
  initialProcedures: MinorProcedureItem[];
  initialPrenatalCard: PrenatalCardItem | null;
  initialClinicalTemplates: ClinicalTemplateItem[];
  initialTariffs: ProcedureTariffItem[];
  consultationFormContext: ConsultationFormContext;
  canEdit: boolean;
  canDelete?: boolean;
}

function isPositiveClinicalValue(value?: string | null): boolean {
  if (!value) return false;
  const clean = value.trim().toLowerCase();
  return (
    clean !== "" &&
    !clean.startsWith("niega") &&
    clean !== "ninguna" &&
    clean !== "ninguno" &&
    clean !== "no refiere"
  );
}

function normalizeWhatsappNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}

export function PatientDetailView({
  initialDetail,
  initialConsultations,
  initialConsultationReasons,
  initialPrescriptions,
  initialLabOrders,
  initialLabTemplates,
  initialQuotes,
  initialUltrasounds,
  initialColposcopies,
  initialCheckups,
  initialPatientDocuments,
  initialWordHistories = [],
  initialProcedures,
  initialPrenatalCard,
  initialClinicalTemplates,
  initialTariffs,
  consultationFormContext,
  canEdit,
  canDelete = false,
}: PatientDetailViewProps) {
  const router = useRouter();
  const recetasRef = useRef<TabRecetasHandle>(null);
  const labCotizRef = useRef<TabLabCotizHandle>(null);
  const [wordImportOpen, setWordImportOpen] = useState(false);
  const [consultationsList, setConsultationsList] =
    useState<MedicalConsultationItem[]>(initialConsultations);
  const [prescriptionsList, setPrescriptionsList] =
    useState<MedicalPrescriptionItem[]>(initialPrescriptions);
  const [labOrdersList, setLabOrdersList] =
    useState<LabOrderItem[]>(initialLabOrders);
  const [labTemplatesList, setLabTemplatesList] =
    useState<LabOrderTemplateItem[]>(initialLabTemplates);
  const [quotesList, setQuotesList] =
    useState<ProcedureQuoteItem[]>(initialQuotes);
  const [ultrasoundsList, setUltrasoundsList] =
    useState<UltrasoundReportItem[]>(initialUltrasounds);
  const [colposcopiesList, setColposcopiesList] =
    useState<ColposcopyReportItem[]>(initialColposcopies);
  const [checkupsList, setCheckupsList] =
    useState<ClinicalCheckupItem[]>(initialCheckups);
  const [documentsList, setDocumentsList] =
    useState<PatientDocumentItem[]>(initialPatientDocuments);
  const [wordHistoriesList, setWordHistoriesList] =
    useState<WordHistoryDocumentItem[]>(initialWordHistories);
  const [proceduresList, setProceduresList] =
    useState<MinorProcedureItem[]>(initialProcedures);
  const [prenatalCardState, setPrenatalCardState] =
    useState<PrenatalCardItem | null>(initialPrenatalCard);

  const [prevServerSyncKey, setPrevServerSyncKey] = useState({
    initialConsultations,
    initialUltrasounds,
    initialPatientDocuments,
    initialWordHistories,
  });
  if (
    prevServerSyncKey.initialConsultations !== initialConsultations ||
    prevServerSyncKey.initialUltrasounds !== initialUltrasounds ||
    prevServerSyncKey.initialPatientDocuments !== initialPatientDocuments ||
    prevServerSyncKey.initialWordHistories !== initialWordHistories
  ) {
    setPrevServerSyncKey({
      initialConsultations,
      initialUltrasounds,
      initialPatientDocuments,
      initialWordHistories,
    });
    setConsultationsList(initialConsultations);
    setUltrasoundsList(initialUltrasounds);
    setDocumentsList(initialPatientDocuments);
    setWordHistoriesList(initialWordHistories);
  }

  const {
    patient,
    background,
    setBackground,
    counts,
    activeTab,
    setActiveTab,
    currentFurCalculation,
    patientDialogOpen,
    setPatientDialogOpen,
    patientForm,
    computedPatientAge,
    isSubmittingPatient,
    openEditPatientModal,
    onSubmitPatient,
    backgroundDialogOpen,
    setBackgroundDialogOpen,
    backgroundForm,
    watchedMac,
    customMacText,
    setCustomMacText,
    availableMacOptions,
    modalFurCalculation,
    isSubmittingBackground,
    openEditBackgroundModal,
    onSubmitBackground,
  } = usePatientDetail(initialDetail);

  const hasAllergies = isPositiveClinicalValue(background?.medicalAllergies);
  const hasDiabetes = isPositiveClinicalValue(background?.hasDiabetes);
  const hasHta = isPositiveClinicalValue(background?.hasHypertension);
  const hasAsthma = isPositiveClinicalValue(background?.hasAsthma);
  const waNumber = normalizeWhatsappNumber(patient.phone);

  const handleEmitPrescriptionFromConsultation = (
    cons: MedicalConsultationItem
  ) => {
    setActiveTab("recetas");
    recetasRef.current?.openFromConsultation(cons);
  };

  const handleOpenLinkedPrescription = (rx: MedicalPrescriptionItem) => {
    setActiveTab("recetas");
    recetasRef.current?.openPrintPreview(rx);
  };

  const handleEditLinkedPrescription = (rx: MedicalPrescriptionItem) => {
    setActiveTab("recetas");
    recetasRef.current?.openEdit(rx);
  };

  const handlePrescriptionCreatedFromConsultation = (
    rx: MedicalPrescriptionItem
  ) => {
    setPrescriptionsList((prev) => [rx, ...prev]);
  };

  const handleLabOrderCreatedFromConsultation = (ord: LabOrderItem) => {
    setLabOrdersList((prev) => [ord, ...prev]);
  };

  const handleEmitLabOrderFromConsultation = (
    cons: MedicalConsultationItem
  ) => {
    setActiveTab("laboratorio");
    labCotizRef.current?.openLabFromConsultation(cons);
  };

  const handleOpenLinkedLabOrder = (ord: LabOrderItem) => {
    setActiveTab("laboratorio");
    labCotizRef.current?.openLabPrintPreview(ord);
  };

  const handleEditLinkedLabOrder = (ord: LabOrderItem) => {
    setActiveTab("laboratorio");
    labCotizRef.current?.openLabEdit(ord);
  };

  const handleEmitQuoteFromConsultation = (cons: MedicalConsultationItem) => {
    setActiveTab("laboratorio");
    labCotizRef.current?.openQuoteFromConsultation(cons);
  };

  const handleEmitBiopsyOrderFromColposcopy = (colpo: ColposcopyReportItem) => {
    setActiveTab("laboratorio");
    labCotizRef.current?.openBiopsyFromColposcopy(colpo);
  };

  const handleEmitPathologyOrderFromProcedure = (proc: MinorProcedureItem) => {
    setActiveTab("laboratorio");
    labCotizRef.current?.openPathologyFromProcedure(proc);
  };

  const handleEmitPrescriptionFromProcedure = (proc: MinorProcedureItem) => {
    setActiveTab("recetas");
    recetasRef.current?.openFromProcedure(proc);
  };

  const handleMacSyncedFromProcedure = (newMac: string) => {
    setBackground((prev) =>
      prev
        ? { ...prev, contraceptiveMethod: newMac }
        : {
            id: "temp-bg",
            patientId: patient.id,
            obstetricFormula: "G0 P0000",
            obstetricFormulaDetails: "",
            menarche: 12,
            sexualDebutAge: 18,
            sexualPartnersCount: 1,
            catamenialRegimen: "28/4",
            stiHistory: "Niega ITS",
            contraceptiveMethod: newMac,
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
            updatedAt: new Date().toISOString(),
          }
    );
  };

  const handleFurSyncedFromPrenatal = (newFur: string) => {
    setBackground((prev) =>
      prev ? { ...prev, lastMenstrualPeriod: newFur } : prev
    );
  };

  const handleEmitPrenatalPrescription = (card: PrenatalCardItem) => {
    setActiveTab("recetas");
    recetasRef.current?.openFromPrenatal(card);
  };

  const handleEmitPrenatalLabOrder = (card: PrenatalCardItem) => {
    setActiveTab("laboratorio");
    labCotizRef.current?.openPrenatalBattery(card);
  };

  const liveCounts = {
    ...counts,
    consultations: consultationsList.length,
    ultrasounds: ultrasoundsList.length,
    colposcopies: colposcopiesList.length,
    checkups: checkupsList.length,
    procedures: proceduresList.length,
    prenatalCards: prenatalCardState ? 1 : 0,
    documents: documentsList.length + wordHistoriesList.length,
    prescriptions: prescriptionsList.length,
    labOrders: labOrdersList.length,
    quotes: quotesList.length,
  };

  const tabs: Array<{
    id: PatientDetailTab;
    label: string;
    icon: typeof User;
    count?: number;
    phaseNote?: string;
  }> = [
    { id: "resumen", label: "Resumen & Antecedentes", icon: User },
    {
      id: "consultas",
      label: "Consultas",
      icon: Stethoscope,
      count: liveCounts.consultations,
      phaseNote: "Fase 3: Acto Médico Transaccional",
    },
    {
      id: "chequeos",
      label: "Chequeos",
      icon: Activity,
      count: liveCounts.ultrasounds + liveCounts.colposcopies + liveCounts.checkups,
      phaseNote: "Fase 4: Ecografías + Colposcopía Digital IFCPC integradas",
    },
    {
      id: "procedimientos",
      label: "Procedimientos",
      icon: Scissors,
      count: liveCounts.procedures,
      phaseNote: "Fase 4: Procedimientos Menores",
    },
    {
      id: "prenatal",
      label: "Control Prenatal",
      icon: Baby,
      count: liveCounts.prenatalCards,
      phaseNote: "Fase 4: Carnet Perinatal MINSA / CLAP",
    },
    {
      id: "recetas",
      label: "Recetas",
      icon: Pill,
      count: liveCounts.prescriptions,
      phaseNote: "Fase 3: Prescripción e Impresión A4",
    },
    {
      id: "laboratorio",
      label: "Laboratorio & Cotiz.",
      icon: FlaskConical,
      count: liveCounts.labOrders + liveCounts.quotes,
      phaseNote: "Fase 3: Órdenes de Lab y Presupuestos",
    },
    {
      id: "documentos",
      label: "Documentos",
      icon: FileText,
      count: liveCounts.documents,
      phaseNote: "Fase 5: Archivos Privados & Word",
    },
  ];

  const activeTabMeta = tabs.find((t) => t.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Navegación superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/pacientes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver al Directorio de Pacientes
        </Link>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/agenda?new=1&patientId=${patient.id}`}>
              <Button type="button" variant="outline" size="sm">
                <Calendar className="size-3.5" />
                Agendar Cita
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openEditPatientModal}
            >
              <Pencil className="size-3.5" />
              Editar Filiación
            </Button>
            <Button type="button" size="sm" onClick={openEditBackgroundModal}>
              <Activity className="size-3.5" />
              Actualizar Antecedentes
            </Button>
          </div>
        ) : null}
      </div>

      {/* Banner Clínico Fijo con Alertas Inmediatas */}
      <Card className="border border-border bg-card">
        <CardContent className="pt-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="flex items-start gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-mono text-base font-bold text-primary">
                {`${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase()}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {patient.fullName}
                  </h1>
                  <Badge variant="outline" className="font-mono text-xs">
                    {patient.documentType} {patient.documentNumber}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="size-3" />
                    {patient.insuranceInfo}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">
                    {patient.birthDate
                      ? `${patient.age} años (${formatPeruDateDisplay(patient.birthDate)})`
                      : "Edad / F. Nac. por completar"}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Phone className="size-3" />
                    {patient.phone || "Sin teléfono"}
                  </span>
                  {waNumber ? (
                    <a
                      href={`https://wa.me/${waNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-success hover:underline"
                    >
                      <MessageCircle className="size-3" />
                      WhatsApp
                    </a>
                  ) : null}
                  {patient.email ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" />
                      {patient.email}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {patient.district}
                  </span>
                </div>
              </div>
            </div>

            {/* Alertas Clínicas Críticas */}
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
                <span className="block font-mono text-[10px] text-muted-foreground uppercase">
                  Fórmula Obstétrica
                </span>
                <span className="font-mono text-xs font-bold text-primary">
                  {background?.obstetricFormula || patient.obstetricFormula || "G0 P0000"}
                </span>
              </div>

              {background?.lastMenstrualPeriod ? (
                <div className="rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5">
                  <span className="block font-mono text-[10px] text-muted-foreground uppercase">
                    FUR • Amenorrea
                  </span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {formatPeruDateDisplay(background.lastMenstrualPeriod)}
                    {currentFurCalculation && !currentFurCalculation.error
                      ? ` (${currentFurCalculation.weeks}s ${currentFurCalculation.remainingDays}d)`
                      : ""}
                  </span>
                </div>
              ) : null}

              {hasAllergies ? (
                <Badge variant="destructive" className="px-2.5 py-1 text-xs">
                  <AlertTriangle className="size-3.5" />
                  RAM / Alergia: {background?.medicalAllergies}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-success/40 bg-success/10 text-xs text-success"
                >
                  Sin alergias conocidas
                </Badge>
              )}

              {hasDiabetes ? (
                <Badge variant="outline" className="border-warning/50 bg-warning/10 text-xs">
                  DM: {background?.hasDiabetes}
                </Badge>
              ) : null}
              {hasHta ? (
                <Badge variant="outline" className="border-warning/50 bg-warning/10 text-xs">
                  HTA: {background?.hasHypertension}
                </Badge>
              ) : null}
              {hasAsthma ? (
                <Badge variant="outline" className="border-warning/50 bg-warning/10 text-xs">
                  Asma: {background?.hasAsthma}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navegación por pestañas (8 módulos integrados; Colposcopía y Ecografías unificados en Chequeos) */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" ? (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 font-mono text-[10px]",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Contenido de la pestaña activa */}
      {activeTab === "resumen" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Columna 1: Datos de Filiación (4 cols) */}
          <Card className="border border-border bg-card lg:col-span-4">
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <User className="size-4 text-primary" />
                  Datos de Filiación
                </CardTitle>
                <CardDescription>Identificación y domicilio</CardDescription>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={openEditPatientModal}
                >
                  Editar
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Fecha de Nacimiento
                  </span>
                  <p className="mt-0.5 font-mono font-semibold text-foreground">
                    {formatPeruDateDisplay(patient.birthDate)}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Edad Actual
                  </span>
                  <p className="mt-0.5 font-mono font-semibold text-foreground">
                    {patient.age} años
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Lugar de Nacimiento
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {patient.birthPlace || "Lima, Perú"}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Religión
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {patient.religion || "Católica"}
                  </p>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                  Grado de Instrucción
                </span>
                <p className="mt-0.5 font-medium text-foreground">
                  {patient.educationLevel}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                <div>
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Estado Civil
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {patient.civilStatus}
                  </p>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Ocupación
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {patient.occupation || "No especificada"}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                  Dirección y Distrito
                </span>
                <p className="mt-0.5 leading-relaxed font-medium text-foreground">
                  {patient.address
                    ? `${patient.address} (${patient.district})`
                    : patient.district}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Columna 2: Antecedentes Gineco-Obstétricos y Generales (8 cols) */}
          <Card className="border border-border bg-card lg:col-span-8">
            <CardHeader className="flex-row items-center justify-between border-b border-border">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="size-4 text-primary" />
                  Antecedentes Gineco-Obstétricos y Generales
                </CardTitle>
                <CardDescription>
                  Historial obstétrico, método anticonceptivo, FUR y comorbilidades CENDO
                </CardDescription>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={openEditBackgroundModal}
                >
                  <Pencil className="size-3" />
                  Actualizar
                </Button>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {/* Fila 1: FO, MAC, FUR */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Fórmula Obstétrica
                  </span>
                  <p className="mt-1 font-mono text-lg font-bold text-primary">
                    {background?.obstetricFormula || "G0 P0000"}
                  </p>
                  <span className="block text-[10px] text-muted-foreground">
                    Gestas • T / P / A / V
                  </span>
                  {background?.obstetricFormulaDetails ? (
                    <p className="mt-1 border-t border-border/60 pt-1 text-[11px] leading-snug text-foreground">
                      {background.obstetricFormulaDetails}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    MAC Actual
                  </span>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {background?.contraceptiveMethod || "Ninguno"}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    Método anticonceptivo
                  </span>
                </div>

                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-foreground uppercase">
                    <Calendar className="size-3 text-warning" />
                    FUR (Última Regla)
                  </span>
                  <p className="mt-1 font-mono text-sm font-bold text-foreground">
                    {background?.lastMenstrualPeriod
                      ? formatPeruDateDisplay(background.lastMenstrualPeriod)
                      : "No especificada"}
                  </p>
                  {currentFurCalculation && !currentFurCalculation.error ? (
                    <p className="mt-0.5 font-mono text-[10px] font-semibold text-foreground">
                      {currentFurCalculation.text}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Fila 2: Menarquia, RC, IRS, NPS */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Menarquia
                  </span>
                  <p className="mt-0.5 font-mono font-semibold text-foreground">
                    {background?.menarche ? `${background.menarche} años` : "No precisa"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Régimen Catamenial
                  </span>
                  <p className="mt-0.5 font-mono font-semibold text-foreground">
                    {background?.catamenialRegimen || "28/4"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    IRS (Inicio Sexual)
                  </span>
                  <p className="mt-0.5 font-mono font-semibold text-foreground">
                    {background?.sexualDebutAge
                      ? `${background.sexualDebutAge} años`
                      : "No precisa"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    NPS (N° Parejas)
                  </span>
                  <p className="mt-0.5 font-mono font-semibold text-foreground">
                    {background?.sexualPartnersCount ?? "No precisa"}
                  </p>
                </div>
              </div>

              {/* Fila 3: ITS, PAP, VPH */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Antecedentes ITS
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {background?.stiHistory || "Niega ITS"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Historial PAP
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {background?.papHistory || "No refiere"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Prueba Molecular VPH
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {background?.vphTestHistory || "No realizado"}
                  </p>
                </div>
              </div>

              {/* Fila 4: Alergias y Patológicos */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  className={cn(
                    "rounded-lg border p-3",
                    hasAllergies
                      ? "border-destructive/40 bg-destructive/10"
                      : "border-border bg-muted/20"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-semibold uppercase",
                      hasAllergies ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    <AlertTriangle className="size-3" />
                    Alergias Medicamentosas / RAMs
                  </span>
                  <p className="mt-1 font-semibold text-foreground">
                    {background?.medicalAllergies || "Niega"}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Comorbilidades (DM / HTA / Asma)
                  </span>
                  <p className="mt-1 font-medium text-foreground">
                    DM: {background?.hasDiabetes || "Niega"} • HTA:{" "}
                    {background?.hasHypertension || "Niega"} • Asma:{" "}
                    {background?.hasAsthma || "Niega"}
                  </p>
                </div>
              </div>

              {/* Fila 5: Cirugías, Familiares, Otras Patologías y Notas */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Cirugías Previas
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {background?.surgeriesHistory || "Niega"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Antecedentes Familiares
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {background?.familyHistory || "No refiere"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Otras Patologías / Endometriosis
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {background?.otherPathologies || "Niega"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                    Notas Clínicas Persistentes
                  </span>
                  <p className="mt-0.5 font-medium text-foreground">
                    {background?.notes || "Sin observaciones adicionales."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className={activeTab === "consultas" ? "block" : "hidden"}>
        <TabConsultas
          patient={patient}
          background={background}
          lastUltrasound={ultrasoundsList[0] ?? null}
          lastColposcopy={colposcopiesList[0] ?? null}
          initialConsultations={initialConsultations}
          initialReasons={initialConsultationReasons}
          formContext={consultationFormContext}
          prescriptions={prescriptionsList}
          labOrders={labOrdersList}
          labTemplates={labTemplatesList}
          canEdit={canEdit}
          canDelete={canDelete}
          onConsultationsChange={setConsultationsList}
          onPrescriptionsChange={setPrescriptionsList}
          onLabOrdersChange={setLabOrdersList}
          onLabTemplatesChange={setLabTemplatesList}
          onPrescriptionCreated={handlePrescriptionCreatedFromConsultation}
          onLabOrderCreated={handleLabOrderCreatedFromConsultation}
          onEmitPrescriptionFromConsultation={
            handleEmitPrescriptionFromConsultation
          }
          onOpenLinkedPrescription={handleOpenLinkedPrescription}
          onEditLinkedPrescription={handleEditLinkedPrescription}
          onEmitLabOrderFromConsultation={handleEmitLabOrderFromConsultation}
          onOpenLinkedLabOrder={handleOpenLinkedLabOrder}
          onEditLinkedLabOrder={handleEditLinkedLabOrder}
          onEmitQuoteFromConsultation={handleEmitQuoteFromConsultation}
        />
      </div>

      <div className={activeTab === "chequeos" ? "block" : "hidden"}>
        <TabChequeos
          patient={patient}
          background={background}
          ultrasounds={ultrasoundsList}
          onUltrasoundsChange={setUltrasoundsList}
          colposcopies={colposcopiesList}
          onColposcopiesChange={setColposcopiesList}
          checkups={checkupsList}
          onCheckupsChange={setCheckupsList}
          patientDocuments={documentsList}
          onPatientDocumentsChange={setDocumentsList}
          initialClinicalTemplates={initialClinicalTemplates}
          consultations={consultationsList}
          canEdit={canEdit}
          canDelete={canDelete}
          onEmitBiopsyOrderFromColposcopy={handleEmitBiopsyOrderFromColposcopy}
        />
      </div>

      <div className={activeTab === "procedimientos" ? "block" : "hidden"}>
        <TabProcedimientos
          patient={patient}
          background={background}
          procedures={proceduresList}
          onProceduresChange={setProceduresList}
          consultations={consultationsList}
          ultrasounds={ultrasoundsList}
          colposcopies={colposcopiesList}
          initialClinicalTemplates={initialClinicalTemplates}
          canEdit={canEdit}
          canDelete={canDelete}
          onEmitPathologyOrderFromProcedure={
            handleEmitPathologyOrderFromProcedure
          }
          onEmitPrescriptionFromProcedure={handleEmitPrescriptionFromProcedure}
          onMacSynced={handleMacSyncedFromProcedure}
        />
      </div>

      <div className={activeTab === "prenatal" ? "block" : "hidden"}>
        <TabControlPrenatal
          patient={patient}
          background={background}
          prenatalCard={prenatalCardState}
          onPrenatalCardChange={setPrenatalCardState}
          consultations={consultationsList}
          ultrasounds={ultrasoundsList}
          canEdit={canEdit}
          canDelete={canDelete}
          onFurSynced={handleFurSyncedFromPrenatal}
          onEmitPrenatalPrescription={handleEmitPrenatalPrescription}
          onEmitPrenatalLabOrder={handleEmitPrenatalLabOrder}
        />
      </div>

      <div className={activeTab === "recetas" ? "block" : "hidden"}>
        <TabRecetas
          ref={recetasRef}
          patient={patient}
          background={background}
          prescriptions={prescriptionsList}
          onPrescriptionsChange={setPrescriptionsList}
          vademecumOptions={consultationFormContext.vademecumOptions}
          consultations={consultationsList}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>

      <div className={activeTab === "laboratorio" ? "block" : "hidden"}>
        <TabLaboratorioCotizaciones
          ref={labCotizRef}
          patient={patient}
          background={background}
          labOrders={labOrdersList}
          onLabOrdersChange={setLabOrdersList}
          labTemplates={labTemplatesList}
          onLabTemplatesChange={setLabTemplatesList}
          quotes={quotesList}
          onQuotesChange={setQuotesList}
          tariffs={initialTariffs}
          consultations={consultationsList}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>

      <div className={activeTab === "documentos" ? "block" : "hidden"}>
        <TabDocumentos
          patient={patient}
          documents={documentsList}
          onDocumentsChange={setDocumentsList}
          wordHistories={wordHistoriesList}
          onWordHistoriesChange={setWordHistoriesList}
          canEdit={canEdit}
          canDelete={canDelete}
          onOpenWordImport={() => setWordImportOpen(true)}
        />
      </div>

      <WordImportModal
        open={wordImportOpen}
        onOpenChange={setWordImportOpen}
        onImportCompleted={() => router.refresh()}
      />

      {activeTab !== "resumen" &&
      activeTab !== "consultas" &&
      activeTab !== "chequeos" &&
      activeTab !== "procedimientos" &&
      activeTab !== "prenatal" &&
      activeTab !== "recetas" &&
      activeTab !== "laboratorio" &&
      activeTab !== "documentos" ? (
        <Card className="border border-border bg-card">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold">
                {activeTabMeta?.label}
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {activeTabMeta?.phaseNote}
              </Badge>
            </div>
            <CardDescription>
              Módulo enlazado a la historia clínica de {patient.fullName} (
              <span className="font-mono">{activeTabMeta?.count ?? 0}</span> registros
              en PostgreSQL).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            Esta pestaña ya recibe el conteo real desde Supabase/PostgreSQL y se
            habilitará interactivamente en la siguiente fase de migración modular.
          </CardContent>
        </Card>
      ) : null}

      <PatientModal
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        editingItem={patient}
        form={patientForm}
        computedAge={computedPatientAge}
        isSubmitting={isSubmittingPatient}
        onSubmit={onSubmitPatient}
      />

      <PatientBackgroundModal
        open={backgroundDialogOpen}
        onOpenChange={setBackgroundDialogOpen}
        patientName={patient.fullName}
        form={backgroundForm}
        watchedMac={watchedMac}
        customMacText={customMacText}
        onCustomMacTextChange={setCustomMacText}
        availableMacOptions={availableMacOptions}
        furCalculation={modalFurCalculation}
        isSubmitting={isSubmittingBackground}
        onSubmit={onSubmitBackground}
      />
    </div>
  );
}
