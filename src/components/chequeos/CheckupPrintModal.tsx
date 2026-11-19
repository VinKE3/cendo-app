"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  FileDown,
  FileText,
  MessageCircle,
  Pencil,
  Printer,
} from "lucide-react";
import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CheckupPrintView } from "@/components/export/CheckupPrintView";
import { ColposcopyPrintView } from "@/components/export/ColposcopyPrintView";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { SignatureToggleSwitch } from "@/components/export/SignatureToggleSwitch";
import { UltrasoundPrintView } from "@/components/export/UltrasoundPrintView";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
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
import type { CheckupDossierItemRecord } from "@/db/schema/clinical";
import {
  autoOrderDossierItems,
  type ClinicalCheckupItem,
} from "@/features/chequeos/chequeos.schema";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import {
  buildPatientDocumentViewUrl,
  PATIENT_DOCUMENT_SHORT_LABELS,
  type PatientDocumentItem,
} from "@/features/documentos/documentos.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";
import { formatPeruDateDisplay } from "@/lib/utils";
import { generateCheckupWhatsAppUrl } from "@/lib/whatsapp-share";

interface CheckupPrintModalProps {
  checkup: ClinicalCheckupItem | null;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  ultrasounds: UltrasoundReportItem[];
  colposcopies: ColposcopyReportItem[];
  patientDocuments: PatientDocumentItem[];
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
  background,
  ultrasounds,
  colposcopies,
  patientDocuments,
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

  // Resuelve todas las piezas del chequeo (incluyendo estudios creados posteriormente en la ficha)
  const resolvedItems = useMemo<CheckupDossierItemRecord[]>(() => {
    if (!checkup) return [];
    const merged: CheckupDossierItemRecord[] = [
      ...(checkup.dossierConfig.items ?? []),
    ];
    const hasRef = (kind: CheckupDossierItemRecord["kind"], refId: string) =>
      merged.some((item) => item.kind === kind && item.refId === refId);

    for (const eco of ultrasounds) {
      if (!hasRef("ULTRASOUND", eco.id)) {
        merged.push({
          kind: "ULTRASOUND",
          refId: eco.id,
          label: `Ecografía (${formatPeruDateDisplay(eco.reportDate)})`,
        });
      }
    }
    for (const colpo of colposcopies) {
      if (!hasRef("COLPOSCOPY", colpo.id)) {
        merged.push({
          kind: "COLPOSCOPY",
          refId: colpo.id,
          label: `Colposcopía IFCPC (${formatPeruDateDisplay(colpo.reportDate)})`,
        });
      }
    }
    for (const doc of patientDocuments) {
      if (!hasRef("DOCUMENT", doc.id)) {
        merged.push({
          kind: "DOCUMENT",
          refId: doc.id,
          label: `PDF: ${doc.title}`,
        });
      }
    }

    return autoOrderDossierItems(merged, ultrasounds, patientDocuments);
  }, [checkup, ultrasounds, colposcopies, patientDocuments]);

  const printableStudiesCount = useMemo(
    () =>
      resolvedItems.filter(
        (item) =>
          (item.kind === "ULTRASOUND" &&
            ultrasounds.some((u) => u.id === item.refId)) ||
          (item.kind === "COLPOSCOPY" &&
            colposcopies.some((c) => c.id === item.refId))
      ).length,
    [resolvedItems, ultrasounds, colposcopies]
  );

  const credentials = checkup
    ? [
        checkup.doctorCmp ? `CMP ${checkup.doctorCmp}` : "",
        checkup.doctorRne ? `RNE ${checkup.doctorRne}` : "",
      ]
        .filter(Boolean)
        .join(" • ")
    : "";

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
            Visualice e imprima todos los informes del chequeo en conjunto
            (Ecografías + Colposcopía de 2 páginas) o descargue el Dossier PDF
            unificado con los PDFs externos intercalados.
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
                  Incluir hoja de Resumen Ejecutivo al inicio del Chequeo (
                  {resolvedItems.length} piezas integradas)
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
                      dossierItemsCount: resolvedItems.length,
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
                      "checkup-dossier-print-sheet",
                      `Chequeo_Integral_${patient.fullName}_${checkup.checkupDate}`
                    );
                  }}
                >
                  <Printer className="size-4" />
                  Imprimir Chequeo A4 ({printableStudiesCount || 1})
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {checkup ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <div
              id="checkup-dossier-print-sheet"
              className="mx-auto max-w-[210mm] space-y-6 font-sans text-xs text-foreground print:space-y-0"
            >
              {/* 1. Carátula Oficial CENDO del Chequeo Integral */}
              {showCoverPage ? (
                <CendoCoverPage
                  documentTitle={
                    checkup.dossierConfig.coverTitle || "CHEQUEO GINECOLÓGICO"
                  }
                  patientFullName={patient.fullName}
                  documentNumber={`${patient.documentType} ${patient.documentNumber}`}
                  doctorName={checkup.doctorName.toUpperCase()}
                  doctorSpecialty={sigInfo.doctorSpecialty}
                  doctorCredentials={credentials || "CMP 61693 • RNE 38657"}
                />
              ) : null}

              {/* 2. Hoja de Resumen Ejecutivo (cuando se marca el check o si no hay estudios individuales) */}
              {effectiveIncludeSummary || printableStudiesCount === 0 ? (
                <CheckupPrintView
                  checkup={checkup}
                  patient={patient}
                  showCoverPage={false}
                  signatureSrc={sigInfo.signatureSrc}
                  showDigitalSignature={effectiveShowSignature}
                />
              ) : null}

              {/* 3. Todos los Estudios Vinculados al Chequeo (Ecografías + Colposcopías de 2 páginas) */}
              {resolvedItems.map((item) => {
                if (item.kind === "ULTRASOUND") {
                  const eco = ultrasounds.find((u) => u.id === item.refId);
                  if (!eco) return null;
                  return (
                    <UltrasoundPrintView
                      key={`dossier-eco-${eco.id}`}
                      report={eco}
                      patient={patient}
                      showCoverPage={false}
                      signatureSrc={sigInfo.signatureSrc}
                      showDigitalSignature={effectiveShowSignature}
                    />
                  );
                }

                if (item.kind === "COLPOSCOPY") {
                  const colpo = colposcopies.find((c) => c.id === item.refId);
                  if (!colpo) return null;
                  return (
                    <ColposcopyPrintView
                      key={`dossier-colpo-${colpo.id}`}
                      report={colpo}
                      patient={patient}
                      background={background}
                      showCoverPage={false}
                      signatureSrc={sigInfo.signatureSrc}
                      showDigitalSignature={effectiveShowSignature}
                    />
                  );
                }

                if (item.kind === "DOCUMENT") {
                  const doc = patientDocuments.find((d) => d.id === item.refId);
                  if (!doc) return null;
                  return (
                    <div
                      key={`dossier-doc-${doc.id}`}
                      className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="size-5 text-warning" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              Anexo PDF Externo Intercalado: {doc.title}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {PATIENT_DOCUMENT_SHORT_LABELS[doc.documentType]}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Este PDF externo ({doc.fileName}) se fusiona
                            automáticamente en esta posición al pulsar{" "}
                            <strong>Descargar Dossier PDF Completo</strong>.
                          </p>
                        </div>
                      </div>
                      <a
                        href={buildPatientDocumentViewUrl(doc.id, false)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button type="button" variant="outline" size="xs">
                          <ExternalLink className="size-3.5" />
                          Ver PDF
                        </Button>
                      </a>
                    </div>
                  );
                }

                return null;
              })}
            </div>
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
