"use client";

import { useState } from "react";
import {
  FlaskConical,
  MessageCircle,
  Pencil,
  Pill,
  Printer,
} from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { MinorProcedurePrintView } from "@/components/export/MinorProcedurePrintView";
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
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import {
  isContraceptiveDeviceProcedure,
  PROCEDURE_TYPE_LABELS,
  type MinorProcedureItem,
} from "@/features/procedimientos/procedimientos.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";
import { generateMinorProcedureWhatsAppUrl } from "@/lib/whatsapp-share";

interface MinorProcedurePrintModalProps {
  procedure: MinorProcedureItem | null;
  patient: PatientDirectoryItem;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  canEdit?: boolean;
  onEdit?: (item: MinorProcedureItem) => void;
  onEmitPathologyOrder?: (item: MinorProcedureItem) => void;
  onEmitPrescription?: (item: MinorProcedureItem) => void;
  onClose: () => void;
}

export function MinorProcedurePrintModal({
  procedure,
  patient,
  showCoverPage,
  onShowCoverPageChange,
  canEdit = false,
  onEdit,
  onEmitPathologyOrder,
  onEmitPrescription,
  onClose,
}: MinorProcedurePrintModalProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const sigInfo = procedure
    ? getSignatureForDoctor(procedure.doctorId, procedure.doctorCmp)
    : getSignatureForDoctor(null, null);

  const [signatureOverride, setSignatureOverride] = useState<{
    docId: string;
    value: boolean;
  } | null>(null);

  const effectiveShowSignature =
    procedure && sigInfo.hasSignature
      ? signatureOverride?.docId === procedure.id
        ? signatureOverride.value
        : sigInfo.showByDefault
      : false;

  return (
    <Dialog
      open={Boolean(procedure)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Vista Previa — Protocolo de Procedimiento Menor & Biopsia
          </DialogTitle>
          <DialogDescription>
            Imprima el protocolo operatorio A4 con firma digital, envíe
            cuidados postoperatorios por WhatsApp o emita la orden de Anatomía
            Patológica / Receta.
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
                if (!procedure) return;
                setSignatureOverride({ docId: procedure.id, value: checked });
              }}
              hasSignature={sigInfo.hasSignature}
              isOwnDocument={sigInfo.isOwnDocument}
            />
          </div>

          {procedure ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-2">
              {canEdit &&
              !isContraceptiveDeviceProcedure(procedure.procedureType) &&
              onEmitPathologyOrder ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEmitPathologyOrder(procedure);
                  }}
                >
                  <FlaskConical className="size-3.5 text-primary" />
                  Emitir Solicitud de Patología
                </Button>
              ) : null}

              {canEdit && onEmitPrescription ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEmitPrescription(procedure);
                  }}
                >
                  <Pill className="size-3.5 text-primary" />
                  Emitir Receta Post-Op
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = generateMinorProcedureWhatsAppUrl({
                    patientName: patient.fullName,
                    patientPhone: patient.phone,
                    procedureDate: procedure.procedureDate,
                    doctorName: procedure.doctorName,
                    doctorCmp: procedure.doctorCmp,
                    procedureTypeLabel:
                      PROCEDURE_TYPE_LABELS[procedure.procedureType] ||
                      procedure.procedureType,
                    postOpDiagnosis: procedure.postOpDiagnosis,
                    cie10Code: procedure.cie10Code,
                    anesthesiaType: procedure.anesthesiaType,
                    specimenSentToPathology:
                      procedure.procedureDetails.specimenSentToPathology,
                    specimenDescription:
                      procedure.procedureDetails.specimenDescription,
                    deviceInfo: procedure.procedureDetails.deviceInfo,
                    postOpIndications: procedure.postOpIndications,
                    medicationsPrescribed: procedure.medicationsPrescribed,
                    nextControlDate: procedure.nextControlDate,
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
                    onEdit(procedure);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  printHtmlElement(
                    "procedure-print-sheet",
                    `Protocolo_${procedure.procedureType}_${patient.fullName}_${procedure.procedureDate}`
                  );
                }}
              >
                <Printer className="size-4" />
                Imprimir Protocolo A4
              </Button>
            </div>
          ) : null}
        </div>

        {procedure ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <MinorProcedurePrintView
              procedure={procedure}
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
