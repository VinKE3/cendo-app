"use client";

import { useState, type BaseSyntheticEvent, type FormEvent } from "react";
import {
  BookmarkPlus,
  FileCheck2,
  FlaskConical,
  Loader2,
  Printer,
  Save,
  Scissors,
  Settings,
  Sparkles,
} from "lucide-react";
import type { DeepPartial, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Cie10Autocomplete } from "@/components/common/Cie10Autocomplete";
import {
  PatientBackgroundQuickPanel,
  ViewBackgroundButton,
} from "@/components/pacientes/PatientBackgroundQuickPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProcedurePathologyStatus } from "@/db/schema/specialty";
import {
  procedureTemplatePayloadSchema,
  type ProcedureClinicalTemplateItem,
  type ProcedureTemplatePayload,
} from "@/features/clinical-templates/clinical-templates.schema";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import {
  isContraceptiveDeviceProcedure,
  PATHOLOGY_STATUS_LABELS,
  PROCEDURE_TYPE_LABELS,
  resolveSuggestedMacFromProcedure,
  type CreateMinorProcedureInput,
  type MinorProcedureItem,
  type ProcedureType,
} from "@/features/procedimientos/procedimientos.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface MinorProcedureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: MinorProcedureItem | null;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  lastUltrasound?: UltrasoundReportItem | null;
  lastColposcopy?: ColposcopyReportItem | null;
  consultations: MedicalConsultationItem[];
  form: UseFormReturn<CreateMinorProcedureInput>;
  watchedValues: DeepPartial<CreateMinorProcedureInput>;
  isSubmitting: boolean;
  templates: ProcedureClinicalTemplateItem[];
  canEditTemplates?: boolean;
  isSavingTemplate?: boolean;
  procedureTypes: readonly ProcedureType[];
  anesthesiaOptions: readonly string[];
  bleedingOptions: readonly string[];
  hemostasisOptions: readonly string[];
  onSelectProcedureType: (type: ProcedureType) => void;
  onApplyTemplate: (template: ProcedureClinicalTemplateItem) => void;
  onImportFromLastColposcopy: () => void;
  onBuildTemplatePayload: () => ProcedureTemplatePayload;
  onSaveAsTemplate: (
    name: string,
    description: string,
    payload: ProcedureTemplatePayload
  ) => Promise<boolean>;
  onOpenTemplatesManager?: () => void;
  onSetSaveAndPrintIntent: (value: boolean) => void;
  onSubmit: (e?: BaseSyntheticEvent) => void | Promise<void>;
}

const selectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function MinorProcedureModal({
  open,
  onOpenChange,
  editingItem,
  patient,
  background,
  lastUltrasound,
  lastColposcopy,
  consultations,
  form,
  watchedValues,
  isSubmitting,
  templates,
  canEditTemplates = false,
  isSavingTemplate = false,
  procedureTypes,
  anesthesiaOptions,
  bleedingOptions,
  hemostasisOptions,
  onSelectProcedureType,
  onApplyTemplate,
  onImportFromLastColposcopy,
  onBuildTemplatePayload,
  onSaveAsTemplate,
  onOpenTemplatesManager,
  onSetSaveAndPrintIntent,
  onSubmit,
}: MinorProcedureModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const [showBackground, setShowBackground] = useState(false);
  const [pendingTemplate, setPendingTemplate] =
    useState<ProcedureClinicalTemplateItem | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");

  const currentType =
    (watchedValues.procedureType as ProcedureType | undefined) ??
    "BIOPSIA_CERVICAL";
  const isDeviceProc = isContraceptiveDeviceProcedure(currentType);
  const specimenSent = Boolean(
    watchedValues.procedureDetails?.specimenSentToPathology
  );
  const informedConsent =
    watchedValues.procedureDetails?.informedConsentConfirmed ?? true;
  const syncMac = Boolean(watchedValues.syncPatientMac);
  const suggestedMac = resolveSuggestedMacFromProcedure(
    currentType,
    watchedValues.procedureDetails?.deviceInfo
  );

  const handleTemplateClick = (template: ProcedureClinicalTemplateItem) => {
    if (editingItem) {
      setPendingTemplate(template);
      return;
    }
    onApplyTemplate(template);
  };

  const handleSaveTemplateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = tplName.trim();
    if (cleanName.length < 2) {
      toast.error("Ingrese un nombre de al menos 2 caracteres.");
      return;
    }
    const rawPayload = onBuildTemplatePayload();
    const parsed = procedureTemplatePayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ||
          "Complete diagnósticos, técnica e indicaciones antes de guardar como plantilla."
      );
      return;
    }
    const ok = await onSaveAsTemplate(cleanName, tplDesc.trim(), parsed.data);
    if (ok) {
      setSaveTemplateOpen(false);
      setTplName("");
      setTplDesc("");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:pr-8">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <Scissors className="size-5 text-primary" />
                  {editingItem
                    ? "Editar Protocolo de Procedimiento Menor"
                    : "Nuevo Procedimiento Menor & Protocolo de Biopsia"}
                </DialogTitle>
                <DialogDescription>
                  Paciente: <strong>{patient.fullName}</strong> •{" "}
                  {patient.documentType} {patient.documentNumber} ({patient.age}{" "}
                  años)
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ViewBackgroundButton
                  open={showBackground}
                  onToggle={() => setShowBackground((prev) => !prev)}
                  background={background}
                />
                {lastColposcopy ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onImportFromLastColposcopy}
                    title="Importar diagnóstico, CIE-10 y horas de biopsia de la última Colposcopía IFCPC"
                  >
                    <FileCheck2 className="size-3.5 text-primary" />
                    Importar de Colposcopía
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogHeader>

          <PatientBackgroundQuickPanel
            open={showBackground}
            patient={patient}
            background={background}
            lastUltrasound={lastUltrasound}
            lastColposcopy={lastColposcopy}
          />

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Barra de Plantillas Editables de Procedimientos */}
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                  <Sparkles className="size-3.5" />
                  Cargar Protocolo Operatorio Predefinido (1 clic)
                </span>
                {canEditTemplates ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setSaveTemplateOpen(true)}
                    >
                      <BookmarkPlus className="size-3" />
                      Guardar actual como plantilla
                    </Button>
                    {onOpenTemplatesManager ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={onOpenTemplatesManager}
                      >
                        <Settings className="size-3" />
                        Gestionar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {templates.map((tmpl) => {
                  const isActive = tmpl.payload.procedureType === currentType;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateClick(tmpl)}
                      className={cn(
                        "cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      {tmpl.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BLOQUE 1: TIPO DE PROCEDIMIENTO, FECHA Y CONSULTA */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-3.5 md:grid-cols-12">
              <div className="space-y-1 md:col-span-6">
                <label className="text-xs font-medium text-foreground">
                  Tipo de Procedimiento Menor{" "}
                  <span className="text-destructive">*</span>
                </label>
                <select
                  className={selectClassName}
                  value={currentType}
                  onChange={(e) =>
                    onSelectProcedureType(e.target.value as ProcedureType)
                  }
                >
                  {procedureTypes.map((t) => (
                    <option key={t} value={t}>
                      {PROCEDURE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-3">
                <label className="text-xs font-medium text-foreground">
                  Fecha de Realización{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input type="date" {...register("procedureDate")} />
                {errors.procedureDate ? (
                  <p className="text-[11px] text-destructive">
                    {errors.procedureDate.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1 md:col-span-3">
                <label className="text-xs font-medium text-foreground">
                  Consulta Asociada
                </label>
                <select
                  className={selectClassName}
                  {...register("consultationId")}
                >
                  <option value="">Sin consulta vinculada</option>
                  {consultations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatPeruDateDisplay(c.consultationDate)} •{" "}
                      {c.diagnosis.slice(0, 28)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BLOQUE 2: DIAGNÓSTICOS PREOPERATORIO Y POSTOPERATORIO + CIE-10 */}
            <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Diagnóstico Preoperatorio / Indicación{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Ej. Lesión cervical acetoblanca en estudio colposcópico / Solicitud de DIU..."
                  {...register("preOpDiagnosis")}
                />
                {errors.preOpDiagnosis ? (
                  <p className="text-[11px] text-destructive">
                    {errors.preOpDiagnosis.message}
                  </p>
                ) : null}
              </div>

              <Cie10Autocomplete
                diagnosis={watchedValues.postOpDiagnosis ?? ""}
                cie10Code={watchedValues.cie10Code ?? ""}
                required
                diagnosisError={errors.postOpDiagnosis?.message}
                onChange={(diag, code) => {
                  setValue("postOpDiagnosis", diag, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("cie10Code", code, { shouldDirty: true });
                }}
              />
            </div>

            {/* BLOQUE 3: PROTOCOLO OPERATORIO, TÉCNICA, DISPOSITIVO & PATOLOGÍA */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/15 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                  <Scissors className="size-3.5" />
                  Protocolo Operatorio, Asepsia y Trazabilidad
                </h3>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={informedConsent}
                    onChange={(e) =>
                      setValue(
                        "procedureDetails.informedConsentConfirmed",
                        e.target.checked,
                        { shouldDirty: true }
                      )
                    }
                    className="size-3.5 accent-primary"
                  />
                  <span>
                    Consentimiento Informado explicado y firmado (NTS 139-MINSA)
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Anestesia Empleada
                  </label>
                  <select
                    className={selectClassName}
                    {...register("anesthesiaType")}
                  >
                    {anesthesiaOptions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Sangrado Operatorio
                  </label>
                  <select
                    className={selectClassName}
                    {...register("procedureDetails.bleedingAmount")}
                  >
                    {bleedingOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Método de Hemostasia
                  </label>
                  <select
                    className={selectClassName}
                    {...register("procedureDetails.hemostasisMethod")}
                  >
                    {hemostasisOptions.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    ¿Muestra a Patología?
                  </label>
                  <select
                    className={selectClassName}
                    value={specimenSent ? "si" : "no"}
                    onChange={(e) => {
                      const nextSent = e.target.value === "si";
                      setValue(
                        "procedureDetails.specimenSentToPathology",
                        nextSent,
                        { shouldDirty: true }
                      );
                      setValue(
                        "procedureDetails.pathologyStatus",
                        nextSent ? "PENDIENTE" : "NO_APLICA",
                        { shouldDirty: true }
                      );
                    }}
                  >
                    <option value="si">Sí, muestra remitida</option>
                    <option value="no">No requiere patología</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Técnica de Asepsia, Antisepsia y Acto Operatorio{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Textarea
                  rows={2}
                  placeholder="Describa antisepsia, instrumental y técnica empleada..."
                  {...register("procedureDetails.asepsisTechnique")}
                />
                {errors.procedureDetails?.asepsisTechnique ? (
                  <p className="text-[11px] text-destructive">
                    {errors.procedureDetails.asepsisTechnique.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {isDeviceProc
                    ? "Sitio Anatómico / Histerometría / Brazo de Inserción"
                    : "Sitio Anatómico de Biopsia / Zona de Resección"}
                </label>
                <Input
                  placeholder="Ej. Cérvix labio anterior H12 y posterior H6 / Cavidad uterina histerometría 7 cm..."
                  {...register("procedureDetails.biopsySites")}
                />
              </div>

              {/* Trazabilidad de Dispositivo + Sincronización Automática de MAC (DIU / Implante) */}
              {isDeviceProc ? (
                <div className="space-y-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary uppercase">
                      Trazabilidad del Dispositivo Anticonceptivo (DIU /
                      Implante)
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Impreso en protocolo de la paciente
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Marca / Modelo / Lote / Vigencia de Recambio
                    </label>
                    <Input
                      placeholder="Ej. SIU Mirena 52 mg • Lote TU0291 • Vigencia 5 años (Recambio 2031)"
                      {...register("procedureDetails.deviceInfo")}
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 pt-0.5 text-xs font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={syncMac}
                      onChange={(e) =>
                        setValue("syncPatientMac", e.target.checked, {
                          shouldDirty: true,
                        })
                      }
                      className="size-3.5 accent-primary"
                    />
                    <span>
                      Actualizar automáticamente el{" "}
                      <strong>Método Anticonceptivo (MAC)</strong> en
                      Antecedentes de la paciente a:{" "}
                      <strong className="text-primary">
                        {suggestedMac || "Ninguno"}
                      </strong>
                    </span>
                  </label>
                </div>
              ) : null}

              {/* Seguimiento de Muestra en Anatomía Patológica (BIOLAQ) */}
              {specimenSent ? (
                <div className="space-y-2.5 rounded-lg border border-warning/40 bg-warning/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                      <FlaskConical className="size-3.5" />
                      Cadena de Custodia & Seguimiento de Anatomía Patológica
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Trazabilidad BIOLAQ
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="space-y-1 md:col-span-8">
                      <label className="text-xs font-medium text-foreground">
                        Rotulación y Descripción del Espécimen (Frasco Formol
                        10%)
                      </label>
                      <Input
                        placeholder="Ej. Dos fragmentos cervicales en formol al 10% rotulados Biopsia Cervical CENDO..."
                        {...register("procedureDetails.specimenDescription")}
                      />
                    </div>

                    <div className="space-y-1 md:col-span-4">
                      <label className="text-xs font-medium text-foreground">
                        Estado del Resultado Patológico
                      </label>
                      <select
                        className={selectClassName}
                        value={
                          watchedValues.procedureDetails?.pathologyStatus ===
                          "RECIBIDO"
                            ? "RECIBIDO"
                            : "PENDIENTE"
                        }
                        onChange={(e) =>
                          setValue(
                            "procedureDetails.pathologyStatus",
                            e.target.value as ProcedurePathologyStatus,
                            { shouldDirty: true }
                          )
                        }
                      >
                        <option value="PENDIENTE">
                          {PATHOLOGY_STATUS_LABELS.PENDIENTE}
                        </option>
                        <option value="RECIBIDO">
                          {PATHOLOGY_STATUS_LABELS.RECIBIDO}
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-12">
                      <label className="text-xs font-medium text-foreground">
                        Resultado Histopatológico Definitivo (Opcional —
                        completar al recibir informe de laboratorio)
                      </label>
                      <Input
                        placeholder="Ej. BIOLAQ AP-2026: Lesión intraepitelial escamosa de bajo grado (NIC I) — bordes quirúrgicos libres."
                        {...register("procedureDetails.pathologyResultNotes")}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Complicaciones Intraoperatorias / Condición de Egreso{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Ninguna. Procedimiento tolerado adecuadamente."
                  {...register("procedureDetails.complications")}
                />
              </div>
            </div>

            {/* BLOQUE 4: CUIDADOS POST-PROCEDIMIENTO, MEDICACIÓN Y PRÓXIMO CONTROL */}
            <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
              <h3 className="text-xs font-bold text-foreground uppercase">
                Cuidados e Indicaciones Post-Procedimiento
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Indicaciones Escritas para la Paciente{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Textarea
                  rows={4}
                  placeholder="Reposo, abstinencia sexual, cuidados locales y signos de alarma..."
                  {...register("postOpIndications")}
                />
                {errors.postOpIndications ? (
                  <p className="text-[11px] text-destructive">
                    {errors.postOpIndications.message}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1 sm:col-span-8">
                  <label className="text-xs font-medium text-foreground">
                    Medicación Farmacológica Prescrita
                  </label>
                  <Input
                    placeholder="Ej. Paracetamol 500 mg c/8h por 48h condicional al dolor..."
                    {...register("medicationsPrescribed")}
                  />
                </div>

                <div className="space-y-1 sm:col-span-4">
                  <label className="text-xs font-medium text-foreground">
                    Próximo Control en Consultorio
                  </label>
                  <Input type="date" {...register("nextControlDate")} />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t border-border pt-3 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => onSetSaveAndPrintIntent(false)}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Guardar Procedimiento
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => onSetSaveAndPrintIntent(true)}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Printer className="size-4" />
                  )}
                  Guardar e Imprimir Protocolo A4
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación antes de sobrescribir campos al editar */}
      <Dialog
        open={Boolean(pendingTemplate)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Aplicar Plantilla de Procedimiento?</DialogTitle>
            <DialogDescription>
              Está editando un procedimiento existente. Al aplicar la plantilla{" "}
              <strong>{pendingTemplate?.name}</strong> se reemplazarán los
              diagnósticos, técnica e indicaciones del formulario actual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingTemplate(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pendingTemplate) {
                  onApplyTemplate(pendingTemplate);
                }
                setPendingTemplate(null);
              }}
            >
              Sí, Aplicar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal rápido para guardar protocolo actual como plantilla */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar como Plantilla de Procedimiento</DialogTitle>
            <DialogDescription>
              Guarde este protocolo quirúrgico e indicaciones para reutilizarlo
              en 1 clic en futuras pacientes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplateSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Nombre de la Plantilla{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Ej. Cono LEEP + Monsel / Inserción Mirena"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Descripción Breve (Opcional)
              </label>
              <Input
                value={tplDesc}
                onChange={(e) => setTplDesc(e.target.value)}
                placeholder="Ej. Protocolo estándar Dr. Patrick Jacinto"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveTemplateOpen(false)}
                disabled={isSavingTemplate}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingTemplate}>
                {isSavingTemplate ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <BookmarkPlus className="size-4" />
                )}
                Guardar Plantilla
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
