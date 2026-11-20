"use client";

import { useState } from "react";
import { Activity, Pencil, Printer } from "lucide-react";
import { CoverPageSwitch } from "@/components/export/CoverPageSwitch";
import { PrenatalPrintView } from "@/components/export/PrenatalPrintView";
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
import type { PrenatalCardItem } from "@/features/prenatal/prenatal.schema";
import { printHtmlElement } from "@/lib/pdfGenerator";

interface PrenatalPrintModalProps {
  card: PrenatalCardItem | null;
  patient: PatientDirectoryItem;
  showCoverPage: boolean;
  onShowCoverPageChange: (value: boolean) => void;
  canEdit?: boolean;
  onEditBasal?: () => void;
  onRegisterVisit?: () => void;
  onClose: () => void;
}

export function PrenatalPrintModal({
  card,
  patient,
  showCoverPage,
  onShowCoverPageChange,
  canEdit = false,
  onEditBasal,
  onRegisterVisit,
  onClose,
}: PrenatalPrintModalProps) {
  const { getSignatureForDoctor } = useSignatureSettings();
  const sigInfo = card
    ? getSignatureForDoctor(card.attendingDoctorId, card.doctorCmp)
    : getSignatureForDoctor(null, null);

  const [signatureOverride, setSignatureOverride] = useState<{
    docId: string;
    value: boolean;
  } | null>(null);

  const effectiveShowSignature =
    card && sigInfo.hasSignature
      ? signatureOverride?.docId === card.id
        ? signatureOverride.value
        : sigInfo.showByDefault
      : false;

  return (
    <Dialog
      open={Boolean(card)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Vista Previa — Carnet de Atención Materno Perinatal (MINSA / CLAP)
          </DialogTitle>
          <DialogDescription>
            Formato oficial de 2 caras (Anverso Basal + Reverso de 9 Atenciones
            Prenatales) con tipografía uniforme, carátula opcional y firma
            digital.
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
                if (!card) return;
                setSignatureOverride({ docId: card.id, value: checked });
              }}
              hasSignature={sigInfo.hasSignature}
              isOwnDocument={sigInfo.isOwnDocument}
            />
          </div>

          {card ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-2">
              {canEdit && onRegisterVisit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onRegisterVisit();
                  }}
                >
                  <Activity className="size-3.5 text-primary" />+ Registrar
                  Control Prenatal
                </Button>
              ) : null}

              {canEdit && onEditBasal ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEditBasal();
                  }}
                >
                  <Pencil className="size-3.5" />
                  Editar Carnet
                </Button>
              ) : null}

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  printHtmlElement(
                    "prenatal-print-root",
                    `Carnet_Prenatal_MINSA_${patient.fullName.replace(/\s+/g, "_")}`
                  );
                }}
              >
                <Printer className="size-4" />
                Imprimir / Guardar PDF A4 (2 Caras)
              </Button>
            </div>
          ) : null}
        </div>

        {card ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3">
            <PrenatalPrintView
              card={card}
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
