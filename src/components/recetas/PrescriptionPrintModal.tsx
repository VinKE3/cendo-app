"use client";

import { MessageCircle, Pencil, Printer } from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import {
  PrescriptionPrintView,
  type PrescriptionPaperFormat,
} from "@/components/export/PrescriptionPrintView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";
import { generatePrescriptionWhatsAppUrl } from "@/lib/whatsapp-share";

interface PrescriptionPrintModalProps {
  prescription: MedicalPrescriptionItem | null;
  patient: PatientDirectoryItem;
  patientAllergies?: string | null;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  paperFormat: PrescriptionPaperFormat;
  onPaperFormatChange: (value: PrescriptionPaperFormat) => void;
  canEdit?: boolean;
  onEdit?: (item: MedicalPrescriptionItem) => void;
  onClose: () => void;
}

export function PrescriptionPrintModal({
  prescription,
  patient,
  patientAllergies,
  showCoverPage,
  onShowCoverPageChange,
  paperFormat,
  onPaperFormatChange,
  canEdit = false,
  onEdit,
  onClose,
}: PrescriptionPrintModalProps) {
  return (
    <Dialog
      open={Boolean(prescription)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Vista Previa de Receta Médica Oficial (CENDO)</DialogTitle>
          <DialogDescription>
            Formato oficial A4/A5 listo para imprimir, guardar en PDF o enviar
            por WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <CoverPageSwitch
              checked={showCoverPage}
              onCheckedChange={onShowCoverPageChange}
            />

            <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5 text-xs">
              {(["A4", "A5"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onPaperFormatChange(fmt)}
                  className={
                    paperFormat === fmt
                      ? "rounded px-2.5 py-1 font-mono font-bold bg-primary text-primary-foreground"
                      : "rounded px-2.5 py-1 font-mono text-muted-foreground hover:text-foreground"
                  }
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {prescription ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = generatePrescriptionWhatsAppUrl({
                    patientName: patient.fullName,
                    patientPhone: patient.phone,
                    prescriptionDate: prescription.prescriptionDate,
                    doctorName: prescription.doctorName,
                    doctorCmp: prescription.doctorCmp,
                    diagnosis: prescription.diagnosis,
                    cie10Code: prescription.cie10Code,
                    items: prescription.items,
                    generalIndications: prescription.generalIndications,
                    nextAppointmentDate: prescription.nextAppointmentDate,
                  });
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <MessageCircle className="size-4 text-success" />
                WhatsApp
              </Button>

              {canEdit && onEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(prescription);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Editar Receta
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  printHtmlElement(
                    "prescription-print-sheet",
                    `Receta_${patient.fullName}_${prescription.prescriptionDate}`
                  );
                }}
              >
                <Printer className="size-4" />
                Imprimir / Guardar PDF
              </Button>
            </div>
          ) : null}
        </div>

        {prescription ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <PrescriptionPrintView
              prescription={prescription}
              patient={patient}
              patientAllergies={patientAllergies}
              showCoverPage={showCoverPage}
              paperFormat={paperFormat}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
