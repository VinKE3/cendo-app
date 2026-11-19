"use client";

import { Printer } from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { ConsultationPrintView } from "@/components/export/ConsultationPrintView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";

interface ConsultationPrintModalProps {
  consultation: MedicalConsultationItem | null;
  patient: PatientDirectoryItem;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  onClose: () => void;
}

export function ConsultationPrintModal({
  consultation,
  patient,
  showCoverPage,
  onShowCoverPageChange,
  onClose,
}: ConsultationPrintModalProps) {
  return (
    <Dialog
      open={Boolean(consultation)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Vista Previa de Consulta Médica (A4 CENDO)</DialogTitle>
          <DialogDescription>
            Formato oficial listo para imprimir o guardar como PDF con membrete
            institucional.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <CoverPageSwitch
            checked={showCoverPage}
            onCheckedChange={onShowCoverPageChange}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!consultation) return;
              printHtmlElement(
                "consultation-print-sheet",
                `Consulta_${patient.fullName}_${consultation.consultationDate}`
              );
            }}
          >
            <Printer className="size-4" />
            Imprimir / Guardar PDF
          </Button>
        </div>

        {consultation ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <ConsultationPrintView
              consultation={consultation}
              patient={patient}
              showCoverPage={showCoverPage}
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
