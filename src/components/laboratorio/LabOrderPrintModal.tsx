"use client";

import { useState } from "react";
import { MessageCircle, Pencil, Printer, Receipt } from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { LabOrderPrintView } from "@/components/export/LabOrderPrintView";
import { SignatureToggleSwitch } from "@/components/export/SignatureToggleSwitch";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildLabOrderPdfTitle,
  type LabOrderItem,
} from "@/features/laboratorio/laboratorio.schema";
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
  onQuoteOrder?: (item: LabOrderItem) => void;
  onClose: () => void;
}

export function LabOrderPrintModal({
  labOrder,
  patient,
  showCoverPage,
  onShowCoverPageChange,
  canEdit = false,
  onEdit,
  onQuoteOrder,
  onClose,
}: LabOrderPrintModalProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const sigInfo = labOrder
    ? getSignatureForDoctor(labOrder.doctorId, labOrder.doctorCmp)
    : getSignatureForDoctor(null, null);

  const [signatureOverride, setSignatureOverride] = useState<{
    docId: string;
    value: boolean;
  } | null>(null);

  const effectiveShowSignature =
    labOrder && sigInfo.hasSignature
      ? signatureOverride?.docId === labOrder.id
        ? signatureOverride.value
        : sigInfo.showByDefault
      : false;

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

        <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            <CoverPageSwitch
              checked={showCoverPage}
              onCheckedChange={onShowCoverPageChange}
            />
            <SignatureToggleSwitch
              checked={effectiveShowSignature}
              onCheckedChange={(checked) => {
                if (!labOrder) return;
                setSignatureOverride({ docId: labOrder.id, value: checked });
              }}
              hasSignature={sigInfo.hasSignature}
              isOwnDocument={sigInfo.isOwnDocument}
            />
          </div>

          {labOrder ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
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

              {canEdit && onQuoteOrder ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onQuoteOrder(labOrder);
                  }}
                >
                  <Receipt className="size-3.5 text-primary" />
                  Cotizar Exámenes
                </Button>
              ) : null}

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
                    buildLabOrderPdfTitle(labOrder, patient.fullName)
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
              signatureSrc={sigInfo.signatureSrc}
              showDigitalSignature={effectiveShowSignature}
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
