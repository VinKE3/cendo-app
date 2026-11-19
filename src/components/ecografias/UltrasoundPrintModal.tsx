"use client";

import { useState } from "react";
import { MessageCircle, Pencil, Printer } from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { SignatureToggleSwitch } from "@/components/export/SignatureToggleSwitch";
import { UltrasoundPrintView } from "@/components/export/UltrasoundPrintView";
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
  ULTRASOUND_TYPE_LABELS,
  type UltrasoundReportItem,
} from "@/features/ecografias/ecografias.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";
import { generateUltrasoundWhatsAppUrl } from "@/lib/whatsapp-share";

interface UltrasoundPrintModalProps {
  report: UltrasoundReportItem | null;
  patient: PatientDirectoryItem;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  canEdit?: boolean;
  onEdit?: (item: UltrasoundReportItem) => void;
  onClose: () => void;
}

export function UltrasoundPrintModal({
  report,
  patient,
  showCoverPage,
  onShowCoverPageChange,
  canEdit = false,
  onEdit,
  onClose,
}: UltrasoundPrintModalProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const sigInfo = report
    ? getSignatureForDoctor(report.doctorId, report.doctorCmp)
    : getSignatureForDoctor(null, null);

  const [signatureOverride, setSignatureOverride] = useState<{
    docId: string;
    value: boolean;
  } | null>(null);

  const effectiveShowSignature =
    report && sigInfo.hasSignature
      ? signatureOverride?.docId === report.id
        ? signatureOverride.value
        : sigInfo.showByDefault
      : false;

  return (
    <Dialog
      open={Boolean(report)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Vista Previa de Informe Ecográfico Oficial (A4 CENDO)
          </DialogTitle>
          <DialogDescription>
            Formato oficial con carátula opcional, firma médica y anexo
            fotográfico completo listo para imprimir o compartir por WhatsApp.
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
                if (!report) return;
                setSignatureOverride({ docId: report.id, value: checked });
              }}
              hasSignature={sigInfo.hasSignature}
              isOwnDocument={sigInfo.isOwnDocument}
            />
          </div>

          {report ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = generateUltrasoundWhatsAppUrl({
                    patientName: patient.fullName,
                    patientPhone: patient.phone,
                    reportDate: report.reportDate,
                    doctorName: report.doctorName,
                    doctorCmp: report.doctorCmp,
                    ultrasoundTypeLabel:
                      ULTRASOUND_TYPE_LABELS[report.ultrasoundType] ||
                      report.ultrasoundType,
                    indication: report.indication,
                    conclusion: report.conclusion,
                    recommendations: report.recommendations,
                    biradsCategory: report.findings.biradsCategory,
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
                    onEdit(report);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Editar Ecografía
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  printHtmlElement(
                    "ultrasound-print-sheet",
                    `Ecografia_${patient.fullName}_${report.reportDate}`
                  );
                }}
              >
                <Printer className="size-4" />
                Imprimir / Guardar PDF
              </Button>
            </div>
          ) : null}
        </div>

        {report ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <UltrasoundPrintView
              report={report}
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
