"use client";

import { useState } from "react";
import { FlaskConical, MessageCircle, Pencil, Printer } from "lucide-react";
import { ColposcopyPrintView } from "@/components/export/ColposcopyPrintView";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
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
  classifyColposcopyFindings,
  type ColposcopyReportItem,
} from "@/features/colposcopia/colposcopia.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";
import { generateColposcopyWhatsAppUrl } from "@/lib/whatsapp-share";

interface ColposcopyPrintModalProps {
  report: ColposcopyReportItem | null;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  canEdit?: boolean;
  onEdit?: (item: ColposcopyReportItem) => void;
  onEmitBiopsyOrder?: (item: ColposcopyReportItem) => void;
  onClose: () => void;
}

export function ColposcopyPrintModal({
  report,
  patient,
  background,
  showCoverPage,
  onShowCoverPageChange,
  canEdit = false,
  onEdit,
  onEmitBiopsyOrder,
  onClose,
}: ColposcopyPrintModalProps) {
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

  const classification = report
    ? classifyColposcopyFindings({
        thinAcetowhiteEpithelium: report.thinAcetowhiteEpithelium,
        irregularBorder: report.irregularBorder,
        fineMosaic: report.fineMosaic,
        finePunctation: report.finePunctation,
        denseAcetowhiteEpithelium: report.denseAcetowhiteEpithelium,
        coarseMosaic: report.coarseMosaic,
        coarsePunctation: report.coarsePunctation,
        atypicalVessels: report.atypicalVessels,
        extendedFindings: report.extendedFindings,
      })
    : null;

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
            Vista Previa de Colposcopía Digital IFCPC (A4 CENDO)
          </DialogTitle>
          <DialogDescription>
            Formato oficial con reloj cervical, firma médica y galería
            fotográfica anexa.
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
              {canEdit && report.cervicalBiopsyTaken && onEmitBiopsyOrder ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEmitBiopsyOrder(report);
                  }}
                >
                  <FlaskConical className="size-3.5 text-primary" />
                  Emitir Orden de Biopsia
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = generateColposcopyWhatsAppUrl({
                    patientName: patient.fullName,
                    patientPhone: patient.phone,
                    reportDate: report.reportDate,
                    doctorName: report.doctorName,
                    doctorCmp: report.doctorCmp,
                    classificationLabel:
                      classification?.label || "Colposcopía Digital",
                    transformationZoneType: report.transformationZoneType,
                    schillerTest: report.schillerTest,
                    cervicalBiopsyTaken: report.cervicalBiopsyTaken,
                    biopsyClockHours: report.biopsyClockHours,
                    diagnosis: report.diagnosis,
                    cie10Code: report.cie10Code,
                    planRecommendations: report.planRecommendations,
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
                  Editar Colposcopía
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  printHtmlElement(
                    "colposcopy-print-sheet",
                    `Colposcopia_${patient.fullName}_${report.reportDate}`
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
            <ColposcopyPrintView
              report={report}
              patient={patient}
              background={background}
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
