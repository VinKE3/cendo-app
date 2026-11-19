"use client";

import { useState } from "react";
import { MessageCircle, Pencil, Printer } from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { QuotePrintView } from "@/components/export/QuotePrintView";
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
import type { ProcedureQuoteItem } from "@/features/cotizaciones/cotizaciones.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";
import { generateQuoteWhatsAppUrl } from "@/lib/whatsapp-share";

interface QuotePrintModalProps {
  quote: ProcedureQuoteItem | null;
  patient: PatientDirectoryItem;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  canEdit?: boolean;
  onEdit?: (item: ProcedureQuoteItem) => void;
  onClose: () => void;
}

export function QuotePrintModal({
  quote,
  patient,
  showCoverPage,
  onShowCoverPageChange,
  canEdit = false,
  onEdit,
  onClose,
}: QuotePrintModalProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const sigInfo = quote
    ? getSignatureForDoctor(quote.doctorId, null)
    : getSignatureForDoctor(null, null);

  const [signatureOverride, setSignatureOverride] = useState<{
    docId: string;
    value: boolean;
  } | null>(null);

  const effectiveShowSignature =
    quote && sigInfo.hasSignature
      ? signatureOverride?.docId === quote.id
        ? signatureOverride.value
        : sigInfo.showByDefault
      : false;

  return (
    <Dialog
      open={Boolean(quote)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Vista Previa de Presupuesto Médico Oficial (A4 CENDO)
          </DialogTitle>
          <DialogDescription>
            Formato listo para imprimir, guardar como PDF o enviar por WhatsApp.
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
                if (!quote) return;
                setSignatureOverride({ docId: quote.id, value: checked });
              }}
              hasSignature={sigInfo.hasSignature}
              isOwnDocument={sigInfo.isOwnDocument}
            />
          </div>

          {quote ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = generateQuoteWhatsAppUrl({
                    patientName: patient.fullName,
                    patientPhone: patient.phone,
                    quoteDate: quote.quoteDate,
                    validUntilDate: quote.validUntilDate,
                    validityDays: quote.validityDays,
                    doctorName: quote.doctorName,
                    items: quote.items,
                    subtotal: quote.subtotal,
                    discountTotal: quote.discountTotal,
                    total: quote.total,
                    paymentTerms: quote.paymentTerms,
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
                    onEdit(quote);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Editar Presupuesto
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  printHtmlElement(
                    "quote-print-sheet",
                    `Presupuesto_${patient.fullName}_${quote.quoteDate}`
                  );
                }}
              >
                <Printer className="size-4" />
                Imprimir / Guardar PDF
              </Button>
            </div>
          ) : null}
        </div>

        {quote ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4">
            <QuotePrintView
              quote={quote}
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
