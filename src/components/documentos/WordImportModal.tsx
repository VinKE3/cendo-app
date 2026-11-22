"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  MAX_WORD_DOCX_BYTES,
  MAX_WORD_IMPORT_BATCH_FILES,
  type WordImportCommitSummary,
  type WordImportPreviewItem,
} from "@/features/documentos/documentos.schema";
import {
  ULTRASOUND_TYPE_LABELS,
  ULTRASOUND_TYPES,
  type UltrasoundType,
} from "@/features/ecografias/ecografias.schema";
import { cn } from "@/lib/utils";

interface WordImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportCompleted?: (summary: WordImportCommitSummary) => void;
}

type ModalStep = "PICK" | "PREVIEW" | "DONE";

export function WordImportModal({
  open,
  onOpenChange,
  onImportCompleted,
}: WordImportModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileMapRef = useRef<Map<string, File>>(new Map());

  const [step, setStep] = useState<ModalStep>("PICK");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewItems, setPreviewItems] = useState<WordImportPreviewItem[]>([]);
  const [expandedTextKeys, setExpandedTextKeys] = useState<Set<string>>(
    new Set()
  );
  const [summary, setSummary] = useState<WordImportCommitSummary | null>(null);

  const resetModal = () => {
    setStep("PICK");
    setPreviewItems([]);
    setExpandedTextKeys(new Set());
    setSummary(null);
    fileMapRef.current.clear();
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && (isParsing || isCommitting)) return;
    if (!nextOpen) resetModal();
    onOpenChange(nextOpen);
  };

  const handleFilesSelected = async (rawList: FileList | null) => {
    if (!rawList || rawList.length === 0) return;
    const files = Array.from(rawList).filter((f) =>
      f.name.toLowerCase().endsWith(".docx")
    );

    if (files.length === 0) {
      toast.error("Seleccione archivos Word en formato .docx.");
      return;
    }

    if (files.length > MAX_WORD_IMPORT_BATCH_FILES) {
      toast.error(
        `Máximo ${MAX_WORD_IMPORT_BATCH_FILES} archivos .docx por lote.`
      );
      return;
    }

    const tooLarge = files.find((f) => f.size > MAX_WORD_DOCX_BYTES);
    if (tooLarge) {
      toast.error(`"${tooLarge.name}" supera el límite de 10 MB.`);
      return;
    }

    setIsParsing(true);
    try {
      const formData = new FormData();
      const newMap = new Map<string, File>();

      files.forEach((file, idx) => {
        const key = `${crypto.randomUUID()}-${idx}`;
        newMap.set(key, file);
        const modYear = new Date(file.lastModified).getFullYear();
        formData.append("files", file);
        formData.append("fileKeys", key);
        formData.append("years", String(modYear));
      });

      const res = await fetch("/api/word-import/parse", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: WordImportPreviewItem[];
      };

      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || "No se pudieron analizar los archivos Word.");
        return;
      }

      fileMapRef.current = newMap;
      setPreviewItems(json.data);
      setStep("PREVIEW");
    } catch {
      toast.error("Error de red analizando los archivos Word.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    void handleFilesSelected(e.dataTransfer.files);
  };

  const updatePreviewItem = (
    fileKey: string,
    patch: Partial<WordImportPreviewItem>
  ) => {
    setPreviewItems((prev) =>
      prev.map((it) => (it.fileKey === fileKey ? { ...it, ...patch } : it))
    );
  };

  const updateConsultationField = (
    fileKey: string,
    consultIndex: number,
    patch: Partial<WordImportPreviewItem["consultations"][number]>
  ) => {
    setPreviewItems((prev) =>
      prev.map((it) => {
        if (it.fileKey !== fileKey) return it;
        return {
          ...it,
          consultations: it.consultations.map((c, i) =>
            i === consultIndex ? { ...c, ...patch } : c
          ),
        };
      })
    );
  };

  const toggleExpandText = (fileKey: string) => {
    setExpandedTextKeys((prev) => {
      const next = new Set(prev);
      if (next.has(fileKey)) next.delete(fileKey);
      else next.add(fileKey);
      return next;
    });
  };

  const includedCount = previewItems.filter(
    (it) =>
      it.included &&
      (it.kind === "HISTORIA_CLINICA" || it.kind === "ECOGRAFIA")
  ).length;

  const handleCommitImport = async () => {
    const selected = previewItems.filter(
      (it) =>
        it.included &&
        (it.kind === "HISTORIA_CLINICA" || it.kind === "ECOGRAFIA")
    );

    if (selected.length === 0) {
      toast.error("Marque al menos 1 archivo válido para importar.");
      return;
    }

    // Validar DNIs antes de enviar
    for (const item of selected) {
      const dni = item.documentNumber.trim();
      if (dni.length < 6) {
        toast.error(
          `Indique un DNI válido (mín. 6 caracteres) para "${item.fileName}".`
        );
        return;
      }
      if (
        item.kind === "HISTORIA_CLINICA" &&
        (!item.firstName.trim() || !item.lastName.trim())
      ) {
        toast.error(
          `Complete nombres y apellidos para "${item.fileName}".`
        );
        return;
      }
    }

    setIsCommitting(true);
    try {
      const formData = new FormData();
      const payloadItems = selected.map((it) => ({
        fileKey: it.fileKey,
        fileName: it.fileName,
        kind: it.kind,
        included: true,
        documentNumber: it.documentNumber,
        firstName: it.firstName,
        lastName: it.lastName,
        birthDate: it.birthDate,
        phone: it.phone,
        civilStatus: it.civilStatus,
        educationLevel: it.educationLevel,
        occupation: it.occupation,
        birthPlace: it.birthPlace,
        address: it.address,
        religion: it.religion,
        existingPatientId: it.existingPatientId,
        extractedText: it.extractedText,
        background: it.background,
        consultations: it.consultations,
        ultrasoundType: it.ultrasoundType,
        reportDate: it.reportDate,
        indication: it.indication,
        findings: it.findings,
        conclusion: it.conclusion,
        recommendations: it.recommendations,
      }));

      formData.append("payload", JSON.stringify({ items: payloadItems }));
      for (const item of selected) {
        const blob = fileMapRef.current.get(item.fileKey);
        if (blob) {
          formData.append(`file:${item.fileKey}`, blob);
        }
      }

      const res = await fetch("/api/word-import/commit", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: WordImportCommitSummary;
      };

      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || "No se pudo completar la importación Word.");
        return;
      }

      setSummary(json.data);
      setStep("DONE");
      toast.success("Importación Word completada.");
      onImportCompleted?.(json.data);
    } catch {
      toast.error("Error de red confirmando importación Word.");
    } finally {
      setIsCommitting(false);
    }
  };

  const hcCount = previewItems.filter((i) => i.kind === "HISTORIA_CLINICA").length;
  const ecoCount = previewItems.filter((i) => i.kind === "ECOGRAFIA").length;
  const emptyCount = previewItems.filter(
    (i) => i.kind === "EMPTY_TEMPLATE" || i.kind === "UNKNOWN"
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-4 text-primary" />
            Importador Inteligente de Word CENDO (.docx)
          </DialogTitle>
          <DialogDescription>
            Importe en lote hasta <strong>20 archivos .docx</strong> (Historias
            Clínicas y/o Ecografías). Las plantillas vacías se omiten
            automáticamente y puede revisar cada dato antes de guardar.
          </DialogDescription>
        </DialogHeader>

        {step === "PICK" ? (
          <div className="space-y-4 py-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                isDragOver
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/20"
              )}
            >
              {isParsing ? (
                <>
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Analizando estructuras Word (.docx)...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Extrayendo filiación, antecedentes, consultas y medidas ecográficas.
                  </p>
                </>
              ) : (
                <>
                  <FileText className="size-10 text-primary/80" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Arrastra aquí hasta 20 archivos .docx (HC o Ecografías)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Detecta automáticamente los 3 estilos de Historia Clínica
                      CENDO y los informes de Ecografía Pélvica/TV y de Mama.
                    </p>
                  </div>

                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      void handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                  >
                    <FileUp className="size-4" />
                    Seleccionar Archivos .docx
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {step === "PREVIEW" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">{hcCount} Historia(s) Clínica(s)</Badge>
                <Badge variant="secondary">{ecoCount} Ecografía(s)</Badge>
                {emptyCount > 0 ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    {emptyCount} omitida(s) / plantilla vacía
                  </Badge>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={resetModal}
                disabled={isCommitting}
              >
                Elegir otros archivos
              </Button>
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {previewItems.map((item) => {
                const canToggle =
                  item.kind === "HISTORIA_CLINICA" || item.kind === "ECOGRAFIA";
                const textExpanded = expandedTextKeys.has(item.fileKey);

                return (
                  <div
                    key={item.fileKey}
                    className={cn(
                      "space-y-3 rounded-xl border p-3.5 text-xs transition-colors",
                      item.included && canToggle
                        ? "border-primary/40 bg-card"
                        : "border-border bg-muted/20 opacity-80"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex cursor-pointer items-center gap-2 font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={item.included}
                          disabled={!canToggle || isCommitting}
                          onChange={(e) =>
                            updatePreviewItem(item.fileKey, {
                              included: e.target.checked,
                            })
                          }
                          className="size-4 rounded border-border accent-primary"
                        />
                        <span className="truncate">{item.fileName}</span>
                      </label>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.kind === "HISTORIA_CLINICA" ? (
                          <Badge variant="default" className="text-[10px]">
                            HC • {item.styleLabel || "Estándar"}
                          </Badge>
                        ) : item.kind === "ECOGRAFIA" ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Ecografía
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {item.kind === "EMPTY_TEMPLATE"
                              ? "Plantilla Vacía (Omitida)"
                              : "Formato No Reconocido"}
                          </Badge>
                        )}

                        {item.existingPatientId ? (
                          <Badge
                            variant="outline"
                            className="border-success/50 bg-success/10 text-[10px] text-success"
                          >
                            Vinculada: {item.existingPatientName}
                          </Badge>
                        ) : item.batchMatchedDni ? (
                          <Badge
                            variant="outline"
                            className="border-primary/50 bg-primary/10 text-[10px] text-primary"
                          >
                            Se vinculará a HC del lote
                          </Badge>
                        ) : item.kind === "HISTORIA_CLINICA" ? (
                          <Badge variant="outline" className="text-[10px]">
                            <UserPlus className="mr-1 size-2.5" />
                            Nueva Paciente
                          </Badge>
                        ) : null}

                        {item.extractedText ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => toggleExpandText(item.fileKey)}
                          >
                            {textExpanded ? "Ocultar Word" : "Ver texto"}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {item.warnings.length > 0 ? (
                      <div className="flex flex-wrap items-start gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11px] text-foreground">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                        <div className="space-y-0.5">
                          {item.warnings.map((w, idx) => (
                            <p key={idx}>{w}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {item.kind === "HISTORIA_CLINICA" && item.included ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                          <div className="space-y-1 sm:col-span-2">
                            <span className="block text-[10px] font-medium text-muted-foreground">
                              DNI *
                            </span>
                            <Input
                              value={item.documentNumber}
                              onChange={(e) =>
                                updatePreviewItem(item.fileKey, {
                                  documentNumber: e.target.value,
                                })
                              }
                              className="h-8 font-mono text-xs"
                              placeholder="8 dígitos"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-3">
                            <span className="block text-[10px] font-medium text-muted-foreground">
                              Apellidos *
                            </span>
                            <Input
                              value={item.lastName}
                              onChange={(e) =>
                                updatePreviewItem(item.fileKey, {
                                  lastName: e.target.value,
                                })
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-3">
                            <span className="block text-[10px] font-medium text-muted-foreground">
                              Nombres *
                            </span>
                            <Input
                              value={item.firstName}
                              onChange={(e) =>
                                updatePreviewItem(item.fileKey, {
                                  firstName: e.target.value,
                                })
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <span className="block text-[10px] font-medium text-muted-foreground">
                              F. Nacimiento
                            </span>
                            <Input
                              type="date"
                              value={item.birthDate}
                              onChange={(e) =>
                                updatePreviewItem(item.fileKey, {
                                  birthDate: e.target.value,
                                })
                              }
                              className="h-8 font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <span className="block text-[10px] font-medium text-muted-foreground">
                              Teléfono
                            </span>
                            <Input
                              value={item.phone}
                              onChange={(e) =>
                                updatePreviewItem(item.fileKey, {
                                  phone: e.target.value,
                                })
                              }
                              placeholder="Opcional"
                              className="h-8 font-mono text-xs"
                            />
                          </div>
                        </div>

                        {item.consultations.length > 0 ? (
                          <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2.5">
                            <p className="font-mono text-[10px] font-semibold text-muted-foreground uppercase">
                              {item.consultations.length} Consulta(s) / Control(es) detectados
                            </p>
                            {item.consultations.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center"
                              >
                                <div className="sm:col-span-3">
                                  <Input
                                    type="date"
                                    value={c.consultationDate}
                                    onChange={(e) =>
                                      updateConsultationField(item.fileKey, cIdx, {
                                        consultationDate: e.target.value,
                                      })
                                    }
                                    className="h-7 bg-card font-mono text-[11px]"
                                  />
                                </div>
                                <div className="sm:col-span-4">
                                  <Input
                                    value={c.reasonForVisit}
                                    onChange={(e) =>
                                      updateConsultationField(item.fileKey, cIdx, {
                                        reasonForVisit: e.target.value,
                                      })
                                    }
                                    placeholder="Motivo"
                                    className="h-7 bg-card text-[11px]"
                                  />
                                </div>
                                <div className="sm:col-span-5">
                                  <Input
                                    value={c.diagnosis}
                                    onChange={(e) =>
                                      updateConsultationField(item.fileKey, cIdx, {
                                        diagnosis: e.target.value,
                                      })
                                    }
                                    placeholder="Diagnóstico"
                                    className="h-7 bg-card text-[11px]"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {item.kind === "ECOGRAFIA" && item.included ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <div className="space-y-1 sm:col-span-2">
                          <span className="block text-[10px] font-medium text-muted-foreground">
                            DNI Paciente *
                          </span>
                          <Input
                            value={item.documentNumber}
                            onChange={(e) =>
                              updatePreviewItem(item.fileKey, {
                                documentNumber: e.target.value,
                              })
                            }
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-4">
                          <span className="block text-[10px] font-medium text-muted-foreground">
                            Tipo de Ecografía
                          </span>
                          <select
                            value={item.ultrasoundType ?? "TRANSVAGINAL"}
                            onChange={(e) =>
                              updatePreviewItem(item.fileKey, {
                                ultrasoundType: e.target.value as UltrasoundType,
                              })
                            }
                            className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs outline-none focus-visible:border-ring"
                          >
                            {ULTRASOUND_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {ULTRASOUND_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <span className="block text-[10px] font-medium text-muted-foreground">
                            Fecha Estudio
                          </span>
                          <Input
                            type="date"
                            value={item.reportDate ?? ""}
                            onChange={(e) =>
                              updatePreviewItem(item.fileKey, {
                                reportDate: e.target.value,
                              })
                            }
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-4">
                          <span className="block text-[10px] font-medium text-muted-foreground">
                            Conclusión extraída
                          </span>
                          <Input
                            value={item.conclusion ?? ""}
                            onChange={(e) =>
                              updatePreviewItem(item.fileKey, {
                                conclusion: e.target.value,
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    ) : null}

                    {textExpanded && item.extractedText ? (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2.5">
                        <pre className="whitespace-pre-wrap font-sans text-[11px] text-muted-foreground">
                          {item.extractedText}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === "DONE" && summary ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
              <CheckCircle2 className="size-6 shrink-0 text-success" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">
                  Importación Word finalizada con éxito
                </p>
                <p className="text-muted-foreground">
                  Los datos se estructuraron en PostgreSQL y los archivos .docx
                  quedaron guardados en el Storage privado.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <span className="block font-mono text-lg font-bold text-primary">
                  {summary.patientsCreated}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Pacientes nuevas
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <span className="block font-mono text-lg font-bold text-foreground">
                  {summary.patientsLinked}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Vinculadas
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <span className="block font-mono text-lg font-bold text-foreground">
                  {summary.consultationsCreated}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Consultas
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <span className="block font-mono text-lg font-bold text-foreground">
                  {summary.ultrasoundsCreated}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Ecografías
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <span className="block font-mono text-lg font-bold text-foreground">
                  {summary.wordDocsArchived}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Respaldos .docx
                </span>
              </div>
            </div>

            {summary.skippedItems.length > 0 ? (
              <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  Elementos omitidos ({summary.skippedItems.length}):
                </p>
                {summary.skippedItems.map((sk, i) => (
                  <p key={i} className="text-muted-foreground">
                    • <strong>{sk.fileName}:</strong> {sk.reason}
                  </p>
                ))}
              </div>
            ) : null}

            {summary.affectedPatients.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Abrir Historia Clínica:
                </p>
                <div className="flex flex-wrap gap-2">
                  {summary.affectedPatients.map((p) => (
                    <Link
                      key={p.id}
                      href={`/pacientes/${p.id}`}
                      onClick={() => handleClose(false)}
                    >
                      <Button type="button" variant="outline" size="xs">
                        <Activity className="size-3 text-primary" />
                        {p.fullName} ({p.documentNumber})
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          {step === "PICK" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isParsing}
            >
              Cancelar
            </Button>
          ) : step === "PREVIEW" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isCommitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleCommitImport()}
                disabled={isCommitting || includedCount === 0}
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importando lote...
                  </>
                ) : (
                  `Confirmar Importación (${includedCount})`
                )}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => handleClose(false)}>
              Finalizar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
