"use client";

import { MessageCircle, Pencil, Printer } from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { LabOrderPrintView } from "@/components/export/LabOrderPrintView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LabOrderItem } from "@/features/laboratorio/laboratorio.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";
import { generateLabOrderWhatsAppUrl } from "@/lib/whatsapp-share";

interface LabOrderPrintModalProps {
  labOrder: LabOrderItem | null;
  patient: PatientDirectoryItem;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  canEdit?: boolean;
  onEdit?: (item: LabOrderItem) => void;
  onClose: () => void;
}

export function LabOrderPrintModal({
  labOrder,
  patient,
  showCoverPage,
  onShowCoverPageChange,
  canEdit = false,
  onEdit,
  onClose,
}: LabOrderPrintModalProps) {
  return (
    <Dialog
      open={Boolean(labOrder)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Vista Previa de Orden de Laboratorio / Patología (A4 CENDO)
          </DialogTitle>
          <DialogDescription>
            Formato oficial listo para imprimir, guardar en PDF o enviar por
            WhatsApp a la paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <CoverPageSwitch
            checked={showCoverPage}
            onCheckedChange={onShowCoverPageChange}
          />

          {labOrder ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = generateLabOrderWhatsAppUrl({
                    patientName: patient.fullName,
                    patientPhone: patient.phone,
                    orderDate: labOrder.orderDate,
                    doctorName: labOrder.doctorName,
                    doctorCmp: labOrder.doctorCmp,
                    diagnosis: labOrder.diagnosis,
                    cie10Code: labOrder.cie10Code,
                    urgency: labOrder.urgency,
                    templateType: labOrder.templateType,
                    items: labOrder.items,
                    customTests: labOrder.customTests,
                    patientInstructions: labOrder.patientInstructions,
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
                    onEdit(labOrder);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Editar Orden
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  printHtmlElement(
                    "lab-order-print-sheet",
                    `OrdenLab_${patient.fullName}_${labOrder.orderDate}`
                  );
                }}
              >
                <Printer className="size-4" />
                Imprimir / Guardar PDF
              </Button>
            </div>
          ) : null}
        </div>

        {labOrder ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <LabOrderPrintView
              labOrder={labOrder}
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
