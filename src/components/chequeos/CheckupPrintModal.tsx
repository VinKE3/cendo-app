"use client";

import { useState } from "react";
import {
  FileDown,
  MessageCircle,
  Pencil,
  Printer,
} from "lucide-react";
import { CheckupPrintView } from "@/components/export/CheckupPrintView";
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
import type { ClinicalCheckupItem } from "@/features/chequeos/chequeos.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";
import { generateCheckupWhatsAppUrl } from "@/lib/whatsapp-share";

interface CheckupPrintModalProps {
  checkup: ClinicalCheckupItem | null;
  patient: PatientDirectoryItem;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  canEdit?: boolean;
  onEdit?: (item: ClinicalCheckupItem) => void;
  onDownloadDossier: (
    checkupId: string,
    opts?: { sig?: boolean; cover?: boolean; summary?: boolean }
  ) => void;
  onClose: () => void;
}

export function CheckupPrintModal({
  checkup,
  patient,
  showCoverPage,
  onShowCoverPageChange,
  canEdit = false,
  onEdit,
  onDownloadDossier,
  onClose,
}: CheckupPrintModalProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const sigInfo = checkup
    ? getSignatureForDoctor(checkup.doctorId, checkup.doctorCmp)
    : getSignatureForDoctor(null, null);

  const [signatureOverride, setSignatureOverride] = useState<{
    docId: string;
    value: boolean;
  } | null>(null);
  const [summaryOverride, setSummaryOverride] = useState<{
    docId: string;
    value: boolean;
  } | null>(null);

  const effectiveShowSignature =
    checkup && sigInfo.hasSignature
      ? signatureOverride?.docId === checkup.id
        ? signatureOverride.value
        : sigInfo.showByDefault
      : false;

  const effectiveIncludeSummary = checkup
    ? summaryOverride?.docId === checkup.id
      ? summaryOverride.value
      : checkup.dossierConfig.includeSummarySheet
    : false;

  return (
    <Dialog
      open={Boolean(checkup)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Vista Previa — Chequeo Integral & Dossier PDF Unificado
          </DialogTitle>
          <DialogDescription>
            Descargue el expediente PDF completo (carátula + estudios CENDO +
            PDFs externos intercalados) o imprima la ficha resumen ejecutiva.
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
                if (!checkup) return;
                setSignatureOverride({ docId: checkup.id, value: checked });
              }}
              hasSignature={sigInfo.hasSignature}
              isOwnDocument={sigInfo.isOwnDocument}
            />
          </div>

          {checkup ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground select-none">
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  checked={effectiveIncludeSummary}
                  onChange={(e) =>
                    setSummaryOverride({
                      docId: checkup.id,
                      value: e.target.checked,
                    })
                  }
                />
                <span>
                  Incluir hoja de Resumen Ejecutivo al inicio del Dossier PDF (
                  {checkup.dossierConfig.items.length} piezas vinculadas)
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    onDownloadDossier(checkup.id, {
                      sig: effectiveShowSignature,
                      cover: showCoverPage,
                      summary: effectiveIncludeSummary,
                    })
                  }
                >
                  <FileDown className="size-4" />
                  Descargar Dossier PDF Completo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = generateCheckupWhatsAppUrl({
                      patientName: patient.fullName,
                      patientPhone: patient.phone,
                      checkupDate: checkup.checkupDate,
                      doctorName: checkup.doctorName,
                      doctorCmp: checkup.doctorCmp,
                      reasonForConsultation: checkup.reasonForConsultation,
                      breastBirads: checkup.breastUltrasoundBirads,
                      colposcopyResult: checkup.colposcopyResult,
                      papResult: checkup.papResult,
                      vphResult: checkup.vphResult,
                      conclusions: checkup.conclusions,
                      cie10Code: checkup.cie10Code,
                      medicalPrescription: checkup.medicalPrescription,
                      dossierItemsCount: checkup.dossierConfig.items.length,
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
                      onEdit(checkup);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Editar Chequeo
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    printHtmlElement(
                      "checkup-print-sheet",
                      `Resumen_Chequeo_${patient.fullName}_${checkup.checkupDate}`
                    );
                  }}
                >
                  <Printer className="size-4" />
                  Imprimir Resumen A4
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {checkup ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <CheckupPrintView
              checkup={checkup}
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
