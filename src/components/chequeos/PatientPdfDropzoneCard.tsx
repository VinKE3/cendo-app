"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  Eye,
  FileText,
  FileUp,
  Loader2,
  Trash2,
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
  buildPatientDocumentViewUrl,
  MAX_PATIENT_PDF_BYTES,
  PATIENT_DOCUMENT_SHORT_LABELS,
  PATIENT_DOCUMENT_TYPE_LABELS,
  PATIENT_DOCUMENT_TYPES,
  type PatientDocumentItem,
  type PatientDocumentType,
} from "@/features/documentos/documentos.schema";
import { cn, formatPeruDateDisplay, getPeruDateString } from "@/lib/utils";

interface PatientPdfDropzoneCardProps {
  documents: PatientDocumentItem[];
  isUploading: boolean;
  deletingDocId?: string | null;
  canDelete?: boolean;
  compact?: boolean;
  selectedDocIds?: string[];
  onToggleSelectDoc?: (doc: PatientDocumentItem) => void;
  onUploadPdf: (params: {
    file: File;
    documentType: PatientDocumentType;
    title: string;
    documentDate?: string;
    attachToDraftDossier?: boolean;
  }) => Promise<{ success: boolean; data?: PatientDocumentItem }>;
  onDeletePdf?: (documentId: string) => Promise<boolean>;
}

const selectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function PatientPdfDropzoneCard({
  documents,
  isUploading,
  deletingDocId,
  canDelete = false,
  compact = false,
  selectedDocIds,
  onToggleSelectDoc,
  onUploadPdf,
  onDeletePdf,
}: PatientPdfDropzoneCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [docType, setDocType] =
    useState<PatientDocumentType>("PLACAS_ECO_MAMA");
  const [title, setTitle] = useState("");
  const [docDate, setDocDate] = useState(() => getPeruDateString());
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<PatientDocumentItem | null>(null);

  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error(`"${file.name}" no es un archivo PDF válido.`);
      return;
    }
    if (file.size > MAX_PATIENT_PDF_BYTES) {
      toast.error("El PDF supera el máximo permitido de 15 MB.");
      return;
    }

    const fallbackTitle =
      title.trim() ||
      `${PATIENT_DOCUMENT_SHORT_LABELS[docType]} — ${file.name
        .replace(/\.pdf$/i, "")
        .replace(/[_-]+/g, " ")
        .trim()}`.slice(0, 150);

    const res = await onUploadPdf({
      file,
      documentType: docType,
      title: fallbackTitle,
      documentDate: docDate,
      attachToDraftDossier: true,
    });

    if (res.success) {
      setTitle("");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const firstFile = e.dataTransfer.files?.[0];
    void handleFilePicked(firstFile);
  };

  return (
    <div className="space-y-3">
      {/* Zona de carga rápida Drag & Drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border border-dashed p-3 transition-colors",
          isDragOver
            ? "border-primary bg-primary/10"
            : "border-border bg-muted/20"
        )}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
          <div className="space-y-1 sm:col-span-5">
            <label className="block text-[11px] font-semibold text-foreground">
              Tipo de PDF Externo
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as PatientDocumentType)}
              className={selectClassName}
              disabled={isUploading}
            >
              {PATIENT_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PATIENT_DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 sm:col-span-4">
            <label className="block text-[11px] font-semibold text-foreground">
              Etiqueta / Título (Opcional)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Placas VINNO Mama / BIOLAQ PAP"
              className="h-8 bg-card text-xs"
              disabled={isUploading}
            />
          </div>

          <div className="space-y-1 sm:col-span-3">
            <label className="block text-[11px] font-semibold text-foreground">
              Fecha del Examen
            </label>
            <Input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="h-8 bg-card font-mono text-xs"
              disabled={isUploading}
            />
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Arrastra aquí el PDF del ecógrafo <strong className="text-foreground">VINNO</strong> o{" "}
            <strong className="text-foreground">BIOLAQ</strong> (máx. 15 MB).
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              e.target.value = "";
              void handleFilePicked(picked);
            }}
          />

          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="bg-card"
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileUp className="size-3.5 text-primary" />
            )}
            {isUploading ? "Subiendo PDF..." : "Adjuntar PDF"}
          </Button>
        </div>
      </div>

      {/* Listado de PDFs externos persistentes */}
      {documents.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center text-xs text-muted-foreground">
          No hay PDFs externos adjuntos aún para esta paciente.
        </div>
      ) : (
        <div
          className={cn(
            "space-y-1.5",
            compact && "max-h-48 overflow-y-auto pr-1"
          )}
        >
          {documents.map((doc) => {
            const isChecked = selectedDocIds
              ? selectedDocIds.includes(doc.id)
              : false;
            return (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                  isChecked
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card"
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {onToggleSelectDoc ? (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelectDoc(doc)}
                      aria-label={`Incluir ${doc.title} en Dossier`}
                      className="size-3.5 shrink-0 cursor-pointer accent-primary"
                    />
                  ) : (
                    <FileText className="size-4 shrink-0 text-primary" />
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold text-foreground">
                        {doc.title}
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[9.5px]"
                      >
                        {PATIENT_DOCUMENT_SHORT_LABELS[doc.documentType]}
                      </Badge>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {formatPeruDateDisplay(doc.documentDate)} •{" "}
                      {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      window.open(
                        buildPatientDocumentViewUrl(doc.id),
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    title="Abrir PDF original"
                    aria-label={`Ver ${doc.title}`}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  {canDelete && onDeletePdf ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={deletingDocId === doc.id}
                      onClick={() => setDeleteTarget(doc)}
                      title="Archivar documento PDF"
                      aria-label={`Eliminar ${doc.title}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmación de eliminación */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Archivar Documento PDF?</DialogTitle>
            <DialogDescription>
              Se eliminará{" "}
              <strong className="text-foreground">{deleteTarget?.title}</strong>{" "}
              del expediente de la paciente y de cualquier chequeo en edición.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deletingDocId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(deletingDocId)}
              onClick={async () => {
                if (!deleteTarget || !onDeletePdf) return;
                const ok = await onDeletePdf(deleteTarget.id);
                if (ok) setDeleteTarget(null);
              }}
            >
              {deletingDocId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Sí, Archivar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
