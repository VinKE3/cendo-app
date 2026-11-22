"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileImage,
  FileText,
  FileUp,
  FlaskConical,
  Loader2,
  Scan,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PatientPdfDropzoneCard } from "@/components/chequeos/PatientPdfDropzoneCard";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildPatientDocumentViewUrl,
  buildWordHistoryViewUrl,
  type PatientDocumentItem,
  type PatientDocumentType,
  type WordHistoryDocumentItem,
} from "@/features/documentos/documentos.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface TabDocumentosProps {
  patient: PatientDirectoryItem;
  documents: PatientDocumentItem[];
  onDocumentsChange: (next: PatientDocumentItem[]) => void;
  wordHistories: WordHistoryDocumentItem[];
  onWordHistoriesChange: (next: WordHistoryDocumentItem[]) => void;
  canEdit: boolean;
  canDelete: boolean;
  onOpenWordImport?: () => void;
}

type DocumentFilter = "ALL" | "LAB" | "ECO" | "IMAGE" | "OTHER";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function TabDocumentos({
  patient,
  documents,
  onDocumentsChange,
  wordHistories,
  onWordHistoriesChange,
  canEdit,
  canDelete,
  onOpenWordImport,
}: TabDocumentosProps) {
  const [filter, setFilter] = useState<DocumentFilter>("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const [previewImageDoc, setPreviewImageDoc] =
    useState<PatientDocumentItem | null>(null);
  const [readingWordDoc, setReadingWordDoc] =
    useState<WordHistoryDocumentItem | null>(null);
  const [deleteWordTarget, setDeleteWordTarget] =
    useState<WordHistoryDocumentItem | null>(null);
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (filter === "ALL") return true;
      if (filter === "LAB") {
        return (
          doc.documentType === "LABORATORIO_PAP" ||
          doc.documentType === "LABORATORIO_VPH" ||
          doc.documentType === "LABORATORIO_OTRO"
        );
      }
      if (filter === "ECO") {
        return (
          doc.documentType === "PLACAS_ECO_MAMA" ||
          doc.documentType === "PLACAS_ECO_TV" ||
          doc.documentType === "PLACAS_ECO_OTRA"
        );
      }
      if (filter === "IMAGE") {
        return (
          doc.documentType === "IMAGEN_RESONANCIA" ||
          doc.mimeType.startsWith("image/")
        );
      }
      return doc.documentType === "EXTERNO";
    });
  }, [documents, filter]);

  const handleUploadDocument = async (params: {
    file: File;
    documentType: PatientDocumentType;
    title: string;
    documentDate?: string;
  }): Promise<{ success: boolean; data?: PatientDocumentItem }> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("patientId", patient.id);
      formData.append("documentType", params.documentType);
      formData.append("title", params.title.trim());
      if (params.documentDate?.trim()) {
        formData.append("documentDate", params.documentDate.trim());
      }
      formData.append("file", params.file);

      const res = await fetch("/api/patient-documents", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: PatientDocumentItem;
      };

      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || "No se pudo guardar el archivo.");
        return { success: false };
      }

      onDocumentsChange([json.data, ...documents]);
      toast.success(`"${json.data.title}" guardado en el expediente.`);
      return { success: true, data: json.data };
    } catch {
      toast.error("Error de red al subir el documento.");
      return { success: false };
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string): Promise<boolean> => {
    setDeletingDocId(documentId);
    try {
      const res = await fetch(
        `/api/patient-documents?id=${encodeURIComponent(documentId)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast.error(json.error || "No se pudo eliminar el documento.");
        return false;
      }
      onDocumentsChange(documents.filter((d) => d.id !== documentId));
      toast.success("Documento archivado.");
      return true;
    } catch {
      toast.error("Error de red eliminando documento.");
      return false;
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleConfirmDeleteWord = async () => {
    if (!deleteWordTarget) return;
    setDeletingWordId(deleteWordTarget.id);
    try {
      const res = await fetch(
        `/api/word-histories?id=${encodeURIComponent(deleteWordTarget.id)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast.error(json.error || "No se pudo archivar el archivo Word.");
        return;
      }
      onWordHistoriesChange(
        wordHistories.filter((w) => w.id !== deleteWordTarget.id)
      );
      toast.success("Historia Word archivada.");
      setDeleteWordTarget(null);
    } catch {
      toast.error("Error de red al eliminar historia Word.");
    } finally {
      setDeletingWordId(null);
    }
  };

  const filterPills: Array<{
    id: DocumentFilter;
    label: string;
    icon: typeof FileText;
  }> = [
    { id: "ALL", label: `Todos (${documents.length})`, icon: FileText },
    { id: "LAB", label: "Lab (PAP/VPH)", icon: FlaskConical },
    { id: "ECO", label: "Placas Eco", icon: Scan },
    { id: "IMAGE", label: "Imágenes / RMN", icon: FileImage },
    { id: "OTHER", label: "Otros", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Repositorio de Documentos Externos (PDFs e Imágenes Clínicas) */}
      <Card className="border border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="size-4 text-primary" />
                Documentos Externos, Resultados de Laboratorio &amp; Placas
              </CardTitle>
              <CardDescription>
                Sube aquí resultados de <strong>PAP / VPH (BIOLINK / BIOLAQ)</strong>,
                placas del ecógrafo <strong>VINNO</strong> o capturas de{" "}
                <strong>Resonancia Magnética</strong>. Todo lo subido queda listo para
                unirse al <strong>Dossier PDF</strong> en Chequeos.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {documents.length} archivo{documents.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {filterPills.map((pill) => {
              const Icon = pill.icon;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilter(pill.id)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    filter === pill.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3" />
                  {pill.label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <PatientPdfDropzoneCard
            documents={filteredDocuments}
            isUploading={isUploading}
            deletingDocId={deletingDocId}
            canDelete={canEdit || canDelete}
            allowImages
            onPreviewDocument={(doc) => setPreviewImageDoc(doc)}
            onUploadPdf={handleUploadDocument}
            onDeletePdf={handleDeleteDocument}
          />
        </CardContent>
      </Card>

      {/* 2. Historias Clínicas Word Migradas (.docx) */}
      <Card className="border border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="size-4 text-primary" />
                Historias Clínicas Word Migradas (.docx)
              </CardTitle>
              <CardDescription>
                Respaldo original de los archivos Word importados para{" "}
                <strong>{patient.fullName}</strong>. Puede leer el texto íntegro
                o descargar el documento original.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {wordHistories.length} Word
              </Badge>
              {canEdit && onOpenWordImport ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenWordImport}
                >
                  <FileUp className="size-3.5 text-primary" />
                  Importar Word (.docx)
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {wordHistories.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
              Esta paciente no tiene archivos Word (.docx) importados aún.
            </div>
          ) : (
            <div className="space-y-2">
              {wordHistories.map((word) => (
                <div
                  key={word.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-foreground">
                        {word.fileName}
                      </p>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        DOCX • {formatBytes(word.fileSize)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Archivado el {formatPeruDateDisplay(word.createdAt.slice(0, 10))}
                      {word.notes ? ` • ${word.notes}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setReadingWordDoc(word)}
                    >
                      <Eye className="size-3" />
                      Leer Texto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        window.open(
                          buildWordHistoryViewUrl(word.id, true),
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      <Download className="size-3" />
                      Descargar
                    </Button>
                    {canEdit || canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteWordTarget(word)}
                        aria-label={`Archivar ${word.fileName}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visor de Imagen Externa */}
      <Dialog
        open={Boolean(previewImageDoc)}
        onOpenChange={(open) => {
          if (!open) setPreviewImageDoc(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewImageDoc?.title}</DialogTitle>
            <DialogDescription>
              {previewImageDoc
                ? `${formatPeruDateDisplay(previewImageDoc.documentDate)} • ${formatBytes(previewImageDoc.fileSize)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {previewImageDoc ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildPatientDocumentViewUrl(previewImageDoc.id)}
                alt={previewImageDoc.title}
                className="max-h-[70vh] w-auto rounded-md object-contain"
              />
            </div>
          ) : null}
          <DialogFooter>
            {previewImageDoc ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(
                    buildPatientDocumentViewUrl(previewImageDoc.id, true),
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <Download className="size-4" />
                Descargar Original
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => setPreviewImageDoc(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lector de Texto Word */}
      <Dialog
        open={Boolean(readingWordDoc)}
        onOpenChange={(open) => {
          if (!open) setReadingWordDoc(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{readingWordDoc?.fileName}</DialogTitle>
            <DialogDescription>
              Contenido íntegro extraído de la Historia Clínica Word original.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-muted/20 p-4">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
              {readingWordDoc?.extractedText || "Sin texto extraído disponible."}
            </pre>
          </div>
          <DialogFooter>
            {readingWordDoc ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(
                    buildWordHistoryViewUrl(readingWordDoc.id, true),
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <Download className="size-4" />
                Descargar .docx
              </Button>
            ) : null}
            <Button type="button" onClick={() => setReadingWordDoc(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación de historia Word */}
      <Dialog
        open={Boolean(deleteWordTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteWordTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar Historia Word</DialogTitle>
            <DialogDescription>
              ¿Confirma archivar{" "}
              <strong className="text-foreground">
                {deleteWordTarget?.fileName}
              </strong>
              ? Las consultas y antecedentes ya importados en la ficha clínica
              se conservarán intactos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteWordTarget(null)}
              disabled={Boolean(deletingWordId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDeleteWord()}
              disabled={Boolean(deletingWordId)}
            >
              {deletingWordId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Archivar .docx
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
