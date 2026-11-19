"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { ConsultationPrintView } from "@/components/export/ConsultationPrintView";
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
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { LabOrderItem } from "@/features/laboratorio/laboratorio.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";

interface ConsultationPrintModalProps {
  consultation: MedicalConsultationItem | null;
  patient: PatientDirectoryItem;
  linkedPrescriptions?: MedicalPrescriptionItem[];
  linkedLabOrders?: LabOrderItem[];
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  onClose: () => void;
}

export function ConsultationPrintModal({
  consultation,
  patient,
  linkedPrescriptions = [],
  linkedLabOrders = [],
  showCoverPage,
  onShowCoverPageChange,
  onClose,
}: ConsultationPrintModalProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const sigInfo = consultation
    ? getSignatureForDoctor(consultation.doctorId, consultation.doctorCmp)
    : getSignatureForDoctor(null, null);

  const [signatureOverride, setSignatureOverride] = useState<{
    docId: string;
    value: boolean;
  } | null>(null);

  const effectiveShowSignature =
    consultation && sigInfo.hasSignature
      ? signatureOverride?.docId === consultation.id
        ? signatureOverride.value
        : sigInfo.showByDefault
      : false;

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

        <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            <CoverPageSwitch
              checked={showCoverPage}
              onCheckedChange={onShowCoverPageChange}
            />
            <SignatureToggleSwitch
              checked={effectiveShowSignature}
              onCheckedChange={(checked) => {
                if (!consultation) return;
                setSignatureOverride({ docId: consultation.id, value: checked });
              }}
              hasSignature={sigInfo.hasSignature}
              isOwnDocument={sigInfo.isOwnDocument}
            />
          </div>

          <div className="flex justify-end">
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
        </div>

        {consultation ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <ConsultationPrintView
              consultation={consultation}
              patient={patient}
              linkedPrescriptions={linkedPrescriptions}
              linkedLabOrders={linkedLabOrders}
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
