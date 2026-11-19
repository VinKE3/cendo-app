"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileText,
  Lock,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
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
import {
  LAB_TEMPLATE_TYPES,
  type LabOrderTemplateItem,
  type LabTemplateType,
} from "@/features/laboratorio/laboratorio.schema";

interface LabTemplatesManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: LabOrderTemplateItem[];
  onSelectTemplate?: (tmpl: LabOrderTemplateItem) => void;
  onCreateTemplate: (input: {
    code?: string;
    title: string;
    category: string;
    templateType: LabTemplateType;
    sampleType: string;
    fixativeTransport: string;
    suggestedDiagnosis: string;
    cie10Code: string;
    defaultTests: string[];
    clinicalNotes: string;
  }) => Promise<boolean>;
  onUpdateTemplate: (input: {
    id: string;
    code?: string;
    title: string;
    category: string;
    templateType: LabTemplateType;
    sampleType: string;
    fixativeTransport: string;
    suggestedDiagnosis: string;
    cie10Code: string;
    defaultTests: string[];
    clinicalNotes: string;
  }) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function LabTemplatesManagerModal({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}: LabTemplatesManagerModalProps) {
  const [formMode, setFormMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Anatomía Patológica");
  const [templateType, setTemplateType] = useState<LabTemplateType>("CUSTOM");
  const [sampleType, setSampleType] = useState("");
  const [fixativeTransport, setFixativeTransport] = useState(
    "Formol tamponado al 10%"
  );
  const [suggestedDiagnosis, setSuggestedDiagnosis] = useState("");
  const [cie10Code, setCie10Code] = useState("Z01.4");
  const [testsText, setTestsText] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  const startCreate = () => {
    setEditingId(null);
    setTitle("");
    setCategory("Anatomía Patológica");
    setTemplateType("CUSTOM");
    setSampleType("Tejido / Muestra en frasco rotulado");
    setFixativeTransport("Formol tamponado al 10%");
    setSuggestedDiagnosis("Estudio especializado de muestra ginecológica");
    setCie10Code("Z01.4");
    setTestsText("Estudio histopatológico / citológico especializado");
    setClinicalNotes(
      "Muestra remitida desde consultorio CENDO con cadena de custodia."
    );
    setFormMode(true);
  };

  const startEdit = (tmpl: LabOrderTemplateItem) => {
    setEditingId(tmpl.id);
    setTitle(tmpl.title);
    setCategory(tmpl.category);
    setTemplateType(tmpl.templateType);
    setSampleType(tmpl.sampleType);
    setFixativeTransport(tmpl.fixativeTransport);
    setSuggestedDiagnosis(tmpl.suggestedDiagnosis);
    setCie10Code(tmpl.cie10Code);
    setTestsText(tmpl.defaultTests.join("\n"));
    setClinicalNotes(tmpl.clinicalNotes);
    setFormMode(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const tests = testsText
      .split(/\r?\n/)
      .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
      .filter(Boolean);

    if (title.trim().length < 3) return;
    if (tests.length === 0) return;

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category: category.trim() || "Personalizada",
        templateType,
        sampleType: sampleType.trim(),
        fixativeTransport: fixativeTransport.trim(),
        suggestedDiagnosis: suggestedDiagnosis.trim(),
        cie10Code: cie10Code.trim().toUpperCase(),
        defaultTests: tests,
        clinicalNotes: clinicalNotes.trim(),
      };

      const ok = editingId
        ? await onUpdateTemplate({ id: editingId, ...payload })
        : await onCreateTemplate(payload);

      if (ok) {
        setFormMode(false);
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteTemplate(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4 text-primary" />
            Plantillas de Laboratorio y Remisión a Patología
          </DialogTitle>
          <DialogDescription>
            Administre sus plantillas personalizadas. Las plantillas oficiales
            CENDO están protegidas contra eliminación accidental, pero pueden
            editarse.
          </DialogDescription>
        </DialogHeader>

        {formMode ? (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="space-y-1 sm:col-span-8">
                <label className="block font-medium">
                  Título de Plantilla *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Remisión Biopsia Endometrial + Patología"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-4">
                <label className="block font-medium">Tipo de Formato</label>
                <select
                  value={templateType}
                  onChange={(e) =>
                    setTemplateType(e.target.value as LabTemplateType)
                  }
                  className={selectClassName}
                >
                  {LAB_TEMPLATE_TYPES.filter((t) => t !== "GENERAL").map(
                    (type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-6">
                <label className="block font-medium">Categoría *</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-6">
                <label className="block font-medium">CIE-10 Sugerido</label>
                <Input
                  value={cie10Code}
                  onChange={(e) => setCie10Code(e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                />
              </div>

              <div className="space-y-1 sm:col-span-6">
                <label className="block font-medium">
                  Tipo de Muestra / Sitio
                </label>
                <Input
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:col-span-6">
                <label className="block font-medium">
                  Fijador / Medio de Transporte
                </label>
                <Input
                  value={fixativeTransport}
                  onChange={(e) => setFixativeTransport(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:col-span-12">
                <label className="block font-medium">
                  Diagnóstico Sugerido
                </label>
                <Input
                  value={suggestedDiagnosis}
                  onChange={(e) => setSuggestedDiagnosis(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:col-span-12">
                <label className="block font-medium">
                  Exámenes Incluidos (1 por línea) *
                </label>
                <Textarea
                  rows={4}
                  value={testsText}
                  onChange={(e) => setTestsText(e.target.value)}
                  placeholder="Un análisis por línea..."
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-12">
                <label className="block font-medium">
                  Notas e Indicaciones de Envío
                </label>
                <Textarea
                  rows={2}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormMode(false)}
                disabled={saving}
              >
                Volver a la lista
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                <CheckCircle2 className="size-3.5" />
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar Cambios"
                    : "Crear Plantilla"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {templates.length} plantillas registradas en PostgreSQL
              </span>
              <Button type="button" size="sm" onClick={startCreate}>
                <Plus className="size-3.5" />
                Nueva Plantilla
              </Button>
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <FileText className="size-3.5 text-primary" />
                      <strong className="text-sm text-foreground">
                        {tmpl.title}
                      </strong>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {tmpl.templateType}
                      </Badge>
                      {tmpl.isOfficial ? (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Lock className="size-2.5" />
                          Oficial CENDO
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">
                      {tmpl.category} •{" "}
                      <strong>{tmpl.defaultTests.length} exámenes</strong>
                      {tmpl.fixativeTransport
                        ? ` • ${tmpl.fixativeTransport}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {onSelectTemplate ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          onSelectTemplate(tmpl);
                          onOpenChange(false);
                        }}
                      >
                        Usar ahora
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => startEdit(tmpl)}
                      aria-label="Editar plantilla"
                    >
                      <Pencil className="size-3.5" />
                    </Button>

                    {!tmpl.isOfficial ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={deletingId === tmpl.id}
                        onClick={() => handleDelete(tmpl.id)}
                        aria-label="Eliminar plantilla"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
