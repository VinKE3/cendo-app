"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Copy,
  FileCheck2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { CervicalClock } from "@/components/colposcopia/CervicalClock";
import { Cie10Autocomplete } from "@/components/common/Cie10Autocomplete";
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
import type { UltrasoundFindingsRecord } from "@/db/schema/specialty";
import {
  colposcopyTemplatePayloadSchema,
  ultrasoundTemplatePayloadSchema,
  type ClinicalTemplateItem,
  type ClinicalTemplateScope,
  type ColposcopyTemplatePayload,
  type CreateClinicalTemplateInput,
  type UltrasoundClinicalTemplateItem,
  type UpdateClinicalTemplateInput,
} from "@/features/clinical-templates/clinical-templates.schema";
import {
  SCHILLER_TEST_OPTIONS,
  SCJ_VISIBILITY_OPTIONS,
  TRANSFORMATION_ZONE_OPTIONS,
  VALID_CLOCK_HOURS,
  type ClockHour,
} from "@/features/colposcopia/colposcopia.schema";
import {
  BIRADS_OPTIONS,
  calculateEllipsoidVolumeCc,
  ENDOMETRIUM_PATTERNS,
  SLIDING_SIGN_OPTIONS,
  ULTRASOUND_TYPE_LABELS,
  ULTRASOUND_TYPE_SHORT_LABELS,
  ULTRASOUND_TYPES,
  UTERUS_POSITIONS,
  type UltrasoundType,
} from "@/features/ecografias/ecografias.schema";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClinicalTemplatesManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: ClinicalTemplateScope;
  templates: ClinicalTemplateItem[];
  canDeleteOfficial: boolean;
  isMutating: boolean;
  onApplyTemplate?: (template: ClinicalTemplateItem) => void;
  onCreateTemplate: (
    input: CreateClinicalTemplateInput
  ) => Promise<{ success: boolean; data?: ClinicalTemplateItem }>;
  onUpdateTemplate: (input: UpdateClinicalTemplateInput) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
  onRestoreOfficialTemplates: (scope?: ClinicalTemplateScope) => Promise<boolean>;
}

const selectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface EcoFormDraft {
  ultrasoundType: UltrasoundType;
  indication: string;
  uterusPosition: "AVF" | "RVF" | "Indiferente";
  uterusDimensions: string;
  uterusVolumeCc: string;
  myometriumStatus: string;
  endometriumThicknessMm: string;
  endometriumPattern: "Trilaminar" | "Secretor" | "Atrófico" | "Engrosado irregular";
  rightOvaryDimensions: string;
  leftOvaryDimensions: string;
  ovariesNotes: string;
  douglasPouch: string;
  slidingSign: "Positivo" | "Negativo" | "Parcial";
  uterosacralLigaments: string;
  endometriosisFoci: string;
  breastPattern: string;
  rightBreastFindings: string;
  leftBreastFindings: string;
  biradsCategory: string;
  gestationalSacsCount: string;
  embryoCrownRumpLengthMm: string;
  gestationalAgeByEcho: string;
  fetalHeartRate: string;
  placentaLocation: string;
  amnioticFluidIndex: string;
  conclusion: string;
  recommendations: string;
}

function buildEmptyEcoDraft(type: UltrasoundType = "TRANSVAGINAL"): EcoFormDraft {
  return {
    ultrasoundType: type,
    indication: "",
    uterusPosition: "AVF",
    uterusDimensions: "",
    uterusVolumeCc: "",
    myometriumStatus: "",
    endometriumThicknessMm: "",
    endometriumPattern: "Trilaminar",
    rightOvaryDimensions: "",
    leftOvaryDimensions: "",
    ovariesNotes: "",
    douglasPouch: "",
    slidingSign: "Positivo",
    uterosacralLigaments: "",
    endometriosisFoci: "",
    breastPattern: "",
    rightBreastFindings: "",
    leftBreastFindings: "",
    biradsCategory: "BI-RADS 1",
    gestationalSacsCount: "1",
    embryoCrownRumpLengthMm: "",
    gestationalAgeByEcho: "",
    fetalHeartRate: "",
    placentaLocation: "",
    amnioticFluidIndex: "",
    conclusion: "",
    recommendations: "",
  };
}

function ecoPayloadToDraft(
  payload: UltrasoundClinicalTemplateItem["payload"]
): EcoFormDraft {
  const f = payload.findings ?? {};
  return {
    ultrasoundType: payload.ultrasoundType,
    indication: payload.indication ?? "",
    uterusPosition: f.uterusPosition ?? "AVF",
    uterusDimensions: f.uterusDimensions ?? "",
    uterusVolumeCc:
      f.uterusVolumeCc !== undefined ? String(f.uterusVolumeCc) : "",
    myometriumStatus: f.myometriumStatus ?? "",
    endometriumThicknessMm:
      f.endometriumThicknessMm !== undefined
        ? String(f.endometriumThicknessMm)
        : "",
    endometriumPattern: f.endometriumPattern ?? "Trilaminar",
    rightOvaryDimensions: f.rightOvaryDimensions ?? "",
    leftOvaryDimensions: f.leftOvaryDimensions ?? "",
    ovariesNotes: f.ovariesNotes ?? "",
    douglasPouch: f.douglasPouch ?? "",
    slidingSign: f.slidingSign ?? "Positivo",
    uterosacralLigaments: f.uterosacralLigaments ?? "",
    endometriosisFoci: f.endometriosisFoci ?? "",
    breastPattern: f.breastPattern ?? "",
    rightBreastFindings: f.rightBreastFindings ?? "",
    leftBreastFindings: f.leftBreastFindings ?? "",
    biradsCategory: f.biradsCategory ?? "BI-RADS 1",
    gestationalSacsCount:
      f.gestationalSacsCount !== undefined
        ? String(f.gestationalSacsCount)
        : "",
    embryoCrownRumpLengthMm:
      f.embryoCrownRumpLengthMm !== undefined
        ? String(f.embryoCrownRumpLengthMm)
        : "",
    gestationalAgeByEcho: f.gestationalAgeByEcho ?? "",
    fetalHeartRate:
      f.fetalHeartRate !== undefined ? String(f.fetalHeartRate) : "",
    placentaLocation: f.placentaLocation ?? "",
    amnioticFluidIndex: f.amnioticFluidIndex ?? "",
    conclusion: payload.conclusion ?? "",
    recommendations: payload.recommendations ?? "",
  };
}

function buildDefaultColpoPayload(): ColposcopyTemplatePayload {
  return {
    adequateColposcopy: true,
    squamocolumnarJunctionVisible: "Visible",
    transformationZoneType: "Tipo 1",
    matureSquamousEpithelium: true,
    ectopy: false,
    thinAcetowhiteEpithelium: false,
    denseAcetowhiteEpithelium: false,
    irregularBorder: false,
    fineMosaic: false,
    coarseMosaic: false,
    finePunctation: false,
    coarsePunctation: false,
    atypicalVessels: false,
    extendedFindings: {
      inadequateReason: "",
      nabothCyst: false,
      cryptOpenings: false,
      deciduosis: false,
      rapidAcetowhite: false,
      thickenedGlands: false,
      sharpBorders: false,
      innerBorderSign: false,
      ridgeSign: false,
      leukoplakia: false,
      erosion: false,
      fragileVessels: false,
      irregularSurface: false,
      exophyticLesion: false,
      necrosis: false,
      nodularTumor: false,
      congenitalTZ: false,
      condyloma: false,
      polyp: false,
      inflammation: false,
      stenosis: false,
      postTreatmentAnomaly: false,
      endometriosisFoci: false,
      otherFindings: "",
    },
    schillerTest: SCHILLER_TEST_OPTIONS[0],
    cervicalBiopsyTaken: false,
    biopsyClockHours: [],
    cie10Code: "Z01.4",
    diagnosis: "",
    planRecommendations: "",
  };
}

function optionalNum(raw: string): number | undefined {
  const clean = raw.trim();
  if (!clean) return undefined;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalInt(raw: string): number | undefined {
  const clean = raw.trim();
  if (!clean) return undefined;
  const parsed = Number.parseInt(clean, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const COLPO_PRIMARY_FLAGS: Array<{
  key: keyof Pick<
    ColposcopyTemplatePayload,
    | "matureSquamousEpithelium"
    | "ectopy"
    | "thinAcetowhiteEpithelium"
    | "irregularBorder"
    | "fineMosaic"
    | "finePunctation"
    | "denseAcetowhiteEpithelium"
    | "coarseMosaic"
    | "coarsePunctation"
    | "atypicalVessels"
  >;
  label: string;
}> = [
  { key: "matureSquamousEpithelium", label: "Epitelio escamoso maduro" },
  { key: "ectopy", label: "Ectopia / Epitelio columnar" },
  { key: "thinAcetowhiteEpithelium", label: "Acetoblanco tenue (G1)" },
  { key: "irregularBorder", label: "Borde irregular (G1)" },
  { key: "fineMosaic", label: "Mosaico fino (G1)" },
  { key: "finePunctation", label: "Punteado fino (G1)" },
  { key: "denseAcetowhiteEpithelium", label: "Acetoblanco denso (G2)" },
  { key: "coarseMosaic", label: "Mosaico grueso (G2)" },
  { key: "coarsePunctation", label: "Punteado grueso (G2)" },
  { key: "atypicalVessels", label: "Vasos atípicos (Invasión)" },
];

const COLPO_EXTENDED_FLAGS: Array<{
  key: keyof Pick<
    NonNullable<ColposcopyTemplatePayload["extendedFindings"]>,
    | "nabothCyst"
    | "cryptOpenings"
    | "rapidAcetowhite"
    | "sharpBorders"
    | "innerBorderSign"
    | "ridgeSign"
    | "thickenedGlands"
    | "leukoplakia"
    | "erosion"
    | "fragileVessels"
    | "inflammation"
    | "polyp"
    | "condyloma"
    | "endometriosisFoci"
  >;
  label: string;
}> = [
  { key: "nabothCyst", label: "Quistes de Naboth" },
  { key: "cryptOpenings", label: "Aberturas glandulares" },
  { key: "rapidAcetowhite", label: "Acetoblanco rápido (G2)" },
  { key: "sharpBorders", label: "Bordes netos (G2)" },
  { key: "innerBorderSign", label: "Signo límite interno (G2)" },
  { key: "ridgeSign", label: "Signo de la cresta (G2)" },
  { key: "thickenedGlands", label: "Orificios engrosados (G2)" },
  { key: "leukoplakia", label: "Leucoplasia" },
  { key: "erosion", label: "Erosión epitelial" },
  { key: "fragileVessels", label: "Vasos frágiles" },
  { key: "inflammation", label: "Inflamación / Cervicitis" },
  { key: "polyp", label: "Pólipo cervical" },
  { key: "condyloma", label: "Condiloma" },
  { key: "endometriosisFoci", label: "Foco endometriosis" },
];

export function ClinicalTemplatesManagerModal({
  open,
  onOpenChange,
  scope,
  templates,
  canDeleteOfficial,
  isMutating,
  onApplyTemplate,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onRestoreOfficialTemplates,
}: ClinicalTemplatesManagerModalProps) {
  const [formMode, setFormMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string>("ALL");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ecoDraft, setEcoDraft] = useState<EcoFormDraft>(() =>
    buildEmptyEcoDraft("TRANSVAGINAL")
  );
  const [colpoDraft, setColpoDraft] = useState<ColposcopyTemplatePayload>(() =>
    buildDefaultColpoPayload()
  );

  const [deleteTarget, setDeleteTarget] =
    useState<ClinicalTemplateItem | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  const scopedTemplates = useMemo(
    () => templates.filter((t) => t.scope === scope),
    [templates, scope]
  );

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedTemplates.filter((item) => {
      if (
        scope === "ULTRASOUND" &&
        modalityFilter !== "ALL" &&
        item.scope === "ULTRASOUND" &&
        item.payload.ultrasoundType !== modalityFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    });
  }, [scopedTemplates, scope, modalityFilter, search]);

  const startCreate = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setEcoDraft(buildEmptyEcoDraft("TRANSVAGINAL"));
    setColpoDraft(buildDefaultColpoPayload());
    setFormMode(true);
  };

  const startEdit = (item: ClinicalTemplateItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
    if (item.scope === "ULTRASOUND") {
      setEcoDraft(ecoPayloadToDraft(item.payload));
    } else {
      setColpoDraft(structuredClone(item.payload));
    }
    setFormMode(true);
  };

  const startDuplicate = (item: ClinicalTemplateItem) => {
    setEditingId(null);
    setName(`Copia de ${item.name}`.slice(0, 118));
    setDescription(item.description);
    if (item.scope === "ULTRASOUND") {
      setEcoDraft(ecoPayloadToDraft(item.payload));
    } else {
      setColpoDraft(structuredClone(item.payload));
    }
    setFormMode(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("Ingrese un nombre de al menos 2 caracteres.");
      return;
    }

    if (scope === "ULTRASOUND") {
      const isGyn =
        ecoDraft.ultrasoundType === "TRANSVAGINAL" ||
        ecoDraft.ultrasoundType === "PELVICA" ||
        ecoDraft.ultrasoundType === "DOPPLER";
      const isBreast = ecoDraft.ultrasoundType === "MAMA_BILATERAL";
      const isObst =
        ecoDraft.ultrasoundType === "OBSTETRICA_1T" ||
        ecoDraft.ultrasoundType === "OBSTETRICA_2T_3T";

      const findings: UltrasoundFindingsRecord = {};
      if (isGyn) {
        findings.uterusPosition = ecoDraft.uterusPosition;
        if (ecoDraft.uterusDimensions.trim()) {
          findings.uterusDimensions = ecoDraft.uterusDimensions.trim();
        }
        const computedVol =
          optionalNum(ecoDraft.uterusVolumeCc) ??
          (ecoDraft.uterusDimensions.trim()
            ? calculateEllipsoidVolumeCc(ecoDraft.uterusDimensions) ?? undefined
            : undefined);
        if (computedVol !== undefined) findings.uterusVolumeCc = computedVol;
        if (ecoDraft.myometriumStatus.trim()) {
          findings.myometriumStatus = ecoDraft.myometriumStatus.trim();
        }
        const endoMm = optionalNum(ecoDraft.endometriumThicknessMm);
        if (endoMm !== undefined) findings.endometriumThicknessMm = endoMm;
        findings.endometriumPattern = ecoDraft.endometriumPattern;
        if (ecoDraft.rightOvaryDimensions.trim()) {
          findings.rightOvaryDimensions = ecoDraft.rightOvaryDimensions.trim();
        }
        if (ecoDraft.leftOvaryDimensions.trim()) {
          findings.leftOvaryDimensions = ecoDraft.leftOvaryDimensions.trim();
        }
        if (ecoDraft.ovariesNotes.trim()) {
          findings.ovariesNotes = ecoDraft.ovariesNotes.trim();
        }
        if (ecoDraft.douglasPouch.trim()) {
          findings.douglasPouch = ecoDraft.douglasPouch.trim();
        }
        findings.slidingSign = ecoDraft.slidingSign;
        if (ecoDraft.uterosacralLigaments.trim()) {
          findings.uterosacralLigaments = ecoDraft.uterosacralLigaments.trim();
        }
        if (ecoDraft.endometriosisFoci.trim()) {
          findings.endometriosisFoci = ecoDraft.endometriosisFoci.trim();
        }
      } else if (isBreast) {
        if (ecoDraft.breastPattern.trim()) {
          findings.breastPattern = ecoDraft.breastPattern.trim();
        }
        if (ecoDraft.rightBreastFindings.trim()) {
          findings.rightBreastFindings = ecoDraft.rightBreastFindings.trim();
        }
        if (ecoDraft.leftBreastFindings.trim()) {
          findings.leftBreastFindings = ecoDraft.leftBreastFindings.trim();
        }
        if (ecoDraft.biradsCategory) {
          findings.biradsCategory = ecoDraft.biradsCategory;
        }
      } else if (isObst) {
        const sacs = optionalInt(ecoDraft.gestationalSacsCount);
        if (sacs !== undefined) findings.gestationalSacsCount = sacs;
        const crl = optionalNum(ecoDraft.embryoCrownRumpLengthMm);
        if (crl !== undefined) findings.embryoCrownRumpLengthMm = crl;
        if (ecoDraft.gestationalAgeByEcho.trim()) {
          findings.gestationalAgeByEcho = ecoDraft.gestationalAgeByEcho.trim();
        }
        const fhr = optionalInt(ecoDraft.fetalHeartRate);
        if (fhr !== undefined) findings.fetalHeartRate = fhr;
        if (ecoDraft.placentaLocation.trim()) {
          findings.placentaLocation = ecoDraft.placentaLocation.trim();
        }
        if (ecoDraft.amnioticFluidIndex.trim()) {
          findings.amnioticFluidIndex = ecoDraft.amnioticFluidIndex.trim();
        }
      }

      const parsed = ultrasoundTemplatePayloadSchema.safeParse({
        ultrasoundType: ecoDraft.ultrasoundType,
        indication: ecoDraft.indication.trim(),
        findings,
        conclusion: ecoDraft.conclusion.trim(),
        recommendations: ecoDraft.recommendations.trim(),
      });

      if (!parsed.success) {
        toast.error(
          parsed.error.issues[0]?.message ||
            "Complete indicación y conclusión ecográfica."
        );
        return;
      }

      if (editingId) {
        const ok = await onUpdateTemplate({
          id: editingId,
          scope: "ULTRASOUND",
          subType: parsed.data.ultrasoundType,
          name: trimmedName,
          description: description.trim() || null,
          payload: parsed.data,
        });
        if (ok) {
          setFormMode(false);
          setEditingId(null);
        }
      } else {
        const res = await onCreateTemplate({
          scope: "ULTRASOUND",
          subType: parsed.data.ultrasoundType,
          name: trimmedName,
          description: description.trim() || null,
          payload: parsed.data,
        });
        if (res.success) {
          setFormMode(false);
          setEditingId(null);
        }
      }
      return;
    }

    const parsedColpo = colposcopyTemplatePayloadSchema.safeParse({
      ...colpoDraft,
      biopsyClockHours: colpoDraft.cervicalBiopsyTaken
        ? colpoDraft.biopsyClockHours
        : [],
    });

    if (!parsedColpo.success) {
      toast.error(
        parsedColpo.error.issues[0]?.message ||
          "Complete diagnóstico, CIE-10 y plan colposcópico."
      );
      return;
    }

    if (editingId) {
      const ok = await onUpdateTemplate({
        id: editingId,
        scope: "COLPOSCOPY",
        subType: "CUSTOM",
        name: trimmedName,
        description: description.trim() || null,
        payload: parsedColpo.data,
      });
      if (ok) {
        setFormMode(false);
        setEditingId(null);
      }
    } else {
      const res = await onCreateTemplate({
        scope: "COLPOSCOPY",
        subType: "CUSTOM",
        name: trimmedName,
        description: description.trim() || null,
        payload: parsedColpo.data,
      });
      if (res.success) {
        setFormMode(false);
        setEditingId(null);
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await onDeleteTemplate(deleteTarget.id);
    if (ok) setDeleteTarget(null);
  };

  const confirmRestore = async () => {
    const ok = await onRestoreOfficialTemplates(scope);
    if (ok) setConfirmRestoreOpen(false);
  };

  const isEcoGyn =
    ecoDraft.ultrasoundType === "TRANSVAGINAL" ||
    ecoDraft.ultrasoundType === "PELVICA" ||
    ecoDraft.ultrasoundType === "DOPPLER";
  const isEcoBreast = ecoDraft.ultrasoundType === "MAMA_BILATERAL";
  const isEcoObst =
    ecoDraft.ultrasoundType === "OBSTETRICA_1T" ||
    ecoDraft.ultrasoundType === "OBSTETRICA_2T_3T";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setFormMode(false);
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5 text-primary" />
              {formMode
                ? editingId
                  ? "Editar Plantilla Clínica"
                  : `Nueva Plantilla de ${scope === "ULTRASOUND" ? "Ecografía" : "Colposcopía"}`
                : `Gestor de Plantillas — ${scope === "ULTRASOUND" ? "Ecografías CENDO" : "Colposcopía IFCPC"}`}
            </DialogTitle>
            <DialogDescription>
              Cree, personalice, duplique o elimine sus plantillas de informes.
              Aplicar o editar una plantilla nunca modifica estudios ya emitidos.
            </DialogDescription>
          </DialogHeader>

          {!formMode ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar plantilla por nombre..."
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmRestoreOpen(true)}
                    disabled={isMutating}
                  >
                    <RotateCcw className="size-3.5" />
                    Restaurar base CENDO
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={startCreate}
                    disabled={isMutating}
                  >
                    <Plus className="size-3.5" />
                    Nueva Plantilla
                  </Button>
                </div>
              </div>

              {scope === "ULTRASOUND" ? (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalityFilter("ALL")}
                    className={cn(
                      "cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      modalityFilter === "ALL"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Todas
                  </button>
                  {ULTRASOUND_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setModalityFilter(t)}
                      className={cn(
                        "cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        modalityFilter === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {ULTRASOUND_TYPE_SHORT_LABELS[t]}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2.5">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((item) => {
                    const canDeleteItem = !item.isOfficial || canDeleteOfficial;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {item.name}
                            </span>
                            {item.isOfficial ? (
                              <Badge
                                variant="secondary"
                                className="font-mono text-[10px]"
                              >
                                <Sparkles className="mr-1 size-2.5 text-primary" />
                                Oficial CENDO
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                Personalizada
                              </Badge>
                            )}
                            {item.scope === "ULTRASOUND" ? (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {ULTRASOUND_TYPE_SHORT_LABELS[
                                  item.payload.ultrasoundType
                                ] || item.payload.ultrasoundType}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                CIE-10 {item.payload.cie10Code}
                              </Badge>
                            )}
                          </div>
                          {item.description ? (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">
                            {item.scope === "ULTRASOUND"
                              ? item.payload.conclusion
                              : item.payload.diagnosis}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          {onApplyTemplate ? (
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => {
                                onApplyTemplate(item);
                                onOpenChange(false);
                              }}
                            >
                              <CheckCircle2 className="size-3.5" />
                              Aplicar
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            onClick={() => startEdit(item)}
                            title="Editar plantilla"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            onClick={() => startDuplicate(item)}
                            title="Duplicar plantilla"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                          {canDeleteItem ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              onClick={() => setDeleteTarget(item)}
                              title="Eliminar plantilla"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No se encontraron plantillas con el filtro seleccionado.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-3.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="ct-name"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Nombre de la Plantilla *
                  </label>
                  <Input
                    id="ct-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      scope === "ULTRASOUND"
                        ? "Ej. Control Post-op Laparoscopía"
                        : "Ej. VPH Vaginal Multifocal"
                    }
                    className="bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="ct-desc"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Descripción Breve (Opcional)
                  </label>
                  <Input
                    id="ct-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Resumen rápido para identificar la plantilla"
                    className="bg-card"
                  />
                </div>
              </div>

              {scope === "ULTRASOUND" ? (
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ct-eco-type"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Modalidad Ecográfica *
                      </label>
                      <select
                        id="ct-eco-type"
                        value={ecoDraft.ultrasoundType}
                        onChange={(e) =>
                          setEcoDraft((prev) => ({
                            ...prev,
                            ultrasoundType: e.target.value as UltrasoundType,
                          }))
                        }
                        className={selectClassName}
                      >
                        {ULTRASOUND_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {ULTRASOUND_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ct-eco-indication"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Indicación Clínica *
                      </label>
                      <Input
                        id="ct-eco-indication"
                        value={ecoDraft.indication}
                        onChange={(e) =>
                          setEcoDraft((prev) => ({
                            ...prev,
                            indication: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {isEcoGyn ? (
                    <div className="space-y-3 border-t border-border pt-3">
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Posición Útero
                          </label>
                          <select
                            value={ecoDraft.uterusPosition}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                uterusPosition: e.target.value as
                                  | "AVF"
                                  | "RVF"
                                  | "Indiferente",
                              }))
                            }
                            className={selectClassName}
                          >
                            {UTERUS_POSITIONS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Dimensiones (mm)
                          </label>
                          <Input
                            value={ecoDraft.uterusDimensions}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                uterusDimensions: e.target.value,
                              }))
                            }
                            placeholder="70 x 40 x 46 mm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Endometrio (mm)
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            value={ecoDraft.endometriumThicknessMm}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                endometriumThicknessMm: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Sliding Sign (IDEA)
                          </label>
                          <select
                            value={ecoDraft.slidingSign}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                slidingSign: e.target.value as
                                  | "Positivo"
                                  | "Negativo"
                                  | "Parcial",
                              }))
                            }
                            className={selectClassName}
                          >
                            {SLIDING_SIGN_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Miometrio
                          </label>
                          <Textarea
                            rows={2}
                            value={ecoDraft.myometriumStatus}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                myometriumStatus: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Patrón Endometrial
                          </label>
                          <select
                            value={ecoDraft.endometriumPattern}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                endometriumPattern: e.target.value as
                                  | "Trilaminar"
                                  | "Secretor"
                                  | "Atrófico"
                                  | "Engrosado irregular",
                              }))
                            }
                            className={selectClassName}
                          >
                            {ENDOMETRIUM_PATTERNS.map((pat) => (
                              <option key={pat} value={pat}>
                                {pat}
                              </option>
                            ))}
                          </select>
                          <label className="mt-2 block text-xs font-semibold text-foreground">
                            Fondo de Saco de Douglas
                          </label>
                          <Input
                            value={ecoDraft.douglasPouch}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                douglasPouch: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Ovario Derecho
                          </label>
                          <Input
                            value={ecoDraft.rightOvaryDimensions}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                rightOvaryDimensions: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Ovario Izquierdo
                          </label>
                          <Input
                            value={ecoDraft.leftOvaryDimensions}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                leftOvaryDimensions: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Ligamentos Uterosacros (IDEA)
                          </label>
                          <Input
                            value={ecoDraft.uterosacralLigaments}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                uterosacralLigaments: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-foreground">
                            Focos Endometriosis Profunda
                          </label>
                          <Input
                            value={ecoDraft.endometriosisFoci}
                            onChange={(e) =>
                              setEcoDraft((prev) => ({
                                ...prev,
                                endometriosisFoci: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isEcoBreast ? (
                    <div className="grid grid-cols-1 gap-2.5 border-t border-border pt-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          Categoría ACR BI-RADS
                        </label>
                        <select
                          value={ecoDraft.biradsCategory}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              biradsCategory: e.target.value,
                            }))
                          }
                          className={selectClassName}
                        >
                          {BIRADS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          Patrón Fibroglandular
                        </label>
                        <Input
                          value={ecoDraft.breastPattern}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              breastPattern: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          Mama Derecha
                        </label>
                        <Textarea
                          rows={2}
                          value={ecoDraft.rightBreastFindings}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              rightBreastFindings: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          Mama Izquierda
                        </label>
                        <Textarea
                          rows={2}
                          value={ecoDraft.leftBreastFindings}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              leftBreastFindings: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  {isEcoObst ? (
                    <div className="grid grid-cols-1 gap-2.5 border-t border-border pt-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          Edad Gestacional Eco
                        </label>
                        <Input
                          value={ecoDraft.gestationalAgeByEcho}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              gestationalAgeByEcho: e.target.value,
                            }))
                          }
                          placeholder="7 semanas 5 días"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          LCN / CRL (mm)
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={ecoDraft.embryoCrownRumpLengthMm}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              embryoCrownRumpLengthMm: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          FCF (lpm)
                        </label>
                        <Input
                          type="number"
                          value={ecoDraft.fetalHeartRate}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              fetalHeartRate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-xs font-semibold text-foreground">
                          Placenta / Corion
                        </label>
                        <Input
                          value={ecoDraft.placentaLocation}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              placentaLocation: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          Líquido Amniótico
                        </label>
                        <Input
                          value={ecoDraft.amnioticFluidIndex}
                          onChange={(e) =>
                            setEcoDraft((prev) => ({
                              ...prev,
                              amnioticFluidIndex: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-foreground">
                        Conclusión Diagnóstica *
                      </label>
                      <Textarea
                        rows={3}
                        value={ecoDraft.conclusion}
                        onChange={(e) =>
                          setEcoDraft((prev) => ({
                            ...prev,
                            conclusion: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-foreground">
                        Recomendaciones
                      </label>
                      <Textarea
                        rows={3}
                        value={ecoDraft.recommendations}
                        onChange={(e) =>
                          setEcoDraft((prev) => ({
                            ...prev,
                            recommendations: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="flex items-end pb-1">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={colpoDraft.adequateColposcopy}
                          onChange={(e) =>
                            setColpoDraft((prev) => ({
                              ...prev,
                              adequateColposcopy: e.target.checked,
                            }))
                          }
                        />
                        Colposcopía Adecuada
                      </label>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-foreground">
                        ZSC
                      </label>
                      <select
                        value={colpoDraft.squamocolumnarJunctionVisible}
                        onChange={(e) =>
                          setColpoDraft((prev) => ({
                            ...prev,
                            squamocolumnarJunctionVisible: e.target
                              .value as (typeof SCJ_VISIBILITY_OPTIONS)[number],
                          }))
                        }
                        className={selectClassName}
                      >
                        {SCJ_VISIBILITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-foreground">
                        Zona Transformación
                      </label>
                      <select
                        value={colpoDraft.transformationZoneType}
                        onChange={(e) =>
                          setColpoDraft((prev) => ({
                            ...prev,
                            transformationZoneType: e.target
                              .value as (typeof TRANSFORMATION_ZONE_OPTIONS)[number],
                          }))
                        }
                        className={selectClassName}
                      >
                        {TRANSFORMATION_ZONE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-foreground">
                        Test de Schiller
                      </label>
                      <select
                        value={colpoDraft.schillerTest}
                        onChange={(e) =>
                          setColpoDraft((prev) => ({
                            ...prev,
                            schillerTest: e.target.value,
                          }))
                        }
                        className={selectClassName}
                      >
                        {SCHILLER_TEST_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border pt-3">
                    <span className="block text-xs font-semibold text-foreground">
                      Hallazgos IFCPC Pre-marcados
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                      {COLPO_PRIMARY_FLAGS.map((item) => (
                        <label
                          key={item.key}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-xs text-foreground"
                        >
                          <input
                            type="checkbox"
                            className="size-3.5 accent-primary"
                            checked={Boolean(colpoDraft[item.key])}
                            onChange={(e) =>
                              setColpoDraft((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                      {COLPO_EXTENDED_FLAGS.map((item) => (
                        <label
                          key={item.key}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-xs text-foreground"
                        >
                          <input
                            type="checkbox"
                            className="size-3.5 accent-primary"
                            checked={Boolean(
                              colpoDraft.extendedFindings?.[item.key]
                            )}
                            onChange={(e) =>
                              setColpoDraft((prev) => ({
                                ...prev,
                                extendedFindings: {
                                  ...prev.extendedFindings,
                                  [item.key]: e.target.checked,
                                },
                              }))
                            }
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-12">
                    <div className="flex flex-col items-center space-y-2 sm:col-span-5">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={colpoDraft.cervicalBiopsyTaken}
                          onChange={(e) =>
                            setColpoDraft((prev) => ({
                              ...prev,
                              cervicalBiopsyTaken: e.target.checked,
                              biopsyClockHours: e.target.checked
                                ? prev.biopsyClockHours
                                : [],
                            }))
                          }
                        />
                        Biopsia Cervical Dirigida
                      </label>
                      <CervicalClock
                        selectedHours={colpoDraft.biopsyClockHours}
                        onChange={(hours) => {
                          const valid = hours.filter((h): h is ClockHour =>
                            (VALID_CLOCK_HOURS as readonly string[]).includes(h)
                          );
                          setColpoDraft((prev) => ({
                            ...prev,
                            cervicalBiopsyTaken:
                              valid.length > 0 ? true : prev.cervicalBiopsyTaken,
                            biopsyClockHours: valid,
                          }));
                        }}
                        size="sm"
                        showLegend={false}
                      />
                    </div>

                    <div className="space-y-2.5 sm:col-span-7">
                      <Cie10Autocomplete
                        diagnosis={colpoDraft.diagnosis}
                        cie10Code={colpoDraft.cie10Code}
                        onChange={(diag, code) =>
                          setColpoDraft((prev) => ({
                            ...prev,
                            diagnosis: diag,
                            cie10Code: code,
                          }))
                        }
                        required
                      />
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          Diagnóstico Colposcópico *
                        </label>
                        <Textarea
                          rows={2}
                          value={colpoDraft.diagnosis}
                          onChange={(e) =>
                            setColpoDraft((prev) => ({
                              ...prev,
                              diagnosis: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          Plan / Recomendaciones *
                        </label>
                        <Textarea
                          rows={2}
                          value={colpoDraft.planRecommendations}
                          onChange={(e) =>
                            setColpoDraft((prev) => ({
                              ...prev,
                              planRecommendations: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormMode(false);
                    setEditingId(null);
                  }}
                  disabled={isMutating}
                >
                  Volver al Listado
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {isMutating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileCheck2 className="size-4" />
                  )}
                  {editingId ? "Guardar Cambios" : "Crear Plantilla"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación Restaurar Oficiales */}
      <Dialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Restaurar Plantillas Oficiales CENDO?</DialogTitle>
            <DialogDescription>
              Se volverán a activar y restablecer las plantillas base oficiales
              de{" "}
              <strong className="text-foreground">
                {scope === "ULTRASOUND" ? "Ecografía" : "Colposcopía"}
              </strong>{" "}
              con su redacción original CENDO. Sus plantillas personalizadas no
              serán modificadas ni eliminadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRestoreOpen(false)}
              disabled={isMutating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void confirmRestore()}
              disabled={isMutating}
            >
              {isMutating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              Sí, Restaurar Oficiales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación Eliminar Plantilla */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar Plantilla Clínica?</DialogTitle>
            <DialogDescription>
              Se archivará la plantilla{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong>.
              Los informes clínicos ya emitidos a pacientes permanecen intactos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isMutating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={isMutating}
            >
              {isMutating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Sí, Eliminar Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
