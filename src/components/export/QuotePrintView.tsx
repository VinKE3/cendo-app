"use client";

import { CendoCoverPage } from "@/components/export/CendoCoverPage";
import { CendoFooterWave } from "@/components/export/CendoFooterWave";
import { BrandLogo } from "@/components/layout/BrandLogo";
import type { ProcedureQuoteItem } from "@/features/cotizaciones/cotizaciones.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { formatCurrency, formatPeruDateDisplay } from "@/lib/utils";

interface QuotePrintViewProps {
  quote: ProcedureQuoteItem;
  patient: PatientDirectoryItem;
  clinicAddress?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  showCoverPage?: boolean;
}

export function QuotePrintView({
  quote,
  patient,
  clinicAddress = "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
  clinicEmail = "cendoperu@gmail.com",
  clinicPhone = "985 945 697",
  showCoverPage = true,
}: QuotePrintViewProps) {
  return (
    <div
      id="quote-print-sheet"
      className="mx-auto max-w-[210mm] space-y-6 bg-card font-sans text-xs text-foreground print:space-y-0"
    >
      {showCoverPage ? (
        <CendoCoverPage
          documentTitle="PRESUPUESTO MÉDICO DE PROCEDIMIENTOS"
          patientFullName={patient.fullName}
          documentNumber={`${patient.documentType} ${patient.documentNumber}`}
          doctorName={quote.doctorName.toUpperCase()}
          doctorCredentials="Director Médico CENDO"
          clinicAddress={clinicAddress}
          clinicEmail={clinicEmail}
          clinicPhone={clinicPhone}
        />
      ) : null}

      <section className="page-sheet box-border flex min-h-[297mm] w-[210mm] flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-none print:shadow-none">
        <div className="flex-1 space-y-4 px-[14mm] pt-[10mm] pb-4">
          {/* 1. Membrete */}
          <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-3">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={false} />
              <div>
                <h1 className="font-serif text-lg font-bold tracking-tight text-primary">
                  CENDO • CENTRO DE ENDOMETRIOSIS
                </h1>
                <p className="text-[11px] font-medium text-foreground">
                  Ginecología Especializada • Cirugía Laparoscópica Avanzada
                </p>
                <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                  {clinicAddress} • Central: {clinicPhone}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-l border-border pl-4 text-right">
              <div className="inline-block rounded border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                PRESUPUESTO MÉDICO
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                N° COT-{quote.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="font-mono text-[10px] font-semibold text-foreground">
                Emisión: {formatPeruDateDisplay(quote.quoteDate)}
              </p>
              <p className="font-mono text-[9.5px] font-semibold text-primary">
                Válido hasta: {formatPeruDateDisplay(quote.validUntilDate)} (
                {quote.validityDays} días)
              </p>
            </div>
          </header>

          {/* 2. Titular del presupuesto */}
          <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="col-span-6">
              <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                Paciente / Titular del Presupuesto
              </span>
              <strong className="text-sm font-bold text-foreground">
                {patient.fullName}
              </strong>
            </div>

            <div className="col-span-3">
              <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                {patient.documentType}
              </span>
              <span className="font-mono font-bold text-foreground">
                {patient.documentNumber}
              </span>
            </div>

            <div className="col-span-3 text-right">
              <span className="block text-[9px] font-semibold text-muted-foreground uppercase">
                Teléfono de Contacto
              </span>
              <span className="font-mono font-semibold text-foreground">
                {patient.phone || "—"}
              </span>
            </div>
          </div>

          {/* 3. Tabla de Procedimientos */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  <th className="w-8 px-3 py-2 text-center">#</th>
                  <th className="px-3 py-2">Procedimiento / Servicio Médico</th>
                  <th className="w-28 px-3 py-2">Categoría</th>
                  <th className="w-24 px-3 py-2 text-right">Tarifa Reg.</th>
                  <th className="w-20 px-3 py-2 text-right">Desc.</th>
                  <th className="w-28 px-3 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quote.items.map((item, idx) => (
                  <tr key={`${item.procedureId}-${idx}`}>
                    <td className="px-3 py-2 text-center font-mono font-bold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {item.code}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {item.category}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {formatCurrency(item.regularPrice)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-primary">
                      {item.discountPercent && item.discountPercent > 0
                        ? `${item.discountPercent}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                      {formatCurrency(item.finalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col items-end space-y-1 border-t border-border bg-muted/20 p-3.5">
              <div className="flex w-64 justify-between text-xs text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(quote.subtotal)}
                </span>
              </div>
              {quote.discountTotal > 0 ? (
                <div className="flex w-64 justify-between text-xs font-semibold text-primary">
                  <span>Descuento Especial CENDO:</span>
                  <span className="font-mono">
                    - {formatCurrency(quote.discountTotal)}
                  </span>
                </div>
              ) : null}
              <div className="flex w-64 justify-between border-t border-border pt-1.5 text-sm font-bold text-foreground">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono text-base text-primary">
                  {formatCurrency(quote.total)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Condiciones */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <div>
              <h3 className="text-[10px] font-bold tracking-wider text-foreground uppercase">
                Condiciones de Pago y Programación
              </h3>
              <p className="mt-0.5 leading-relaxed whitespace-pre-line text-foreground">
                {quote.paymentTerms}
              </p>
            </div>
            {quote.notes ? (
              <div className="border-t border-border pt-2">
                <strong className="block text-[10px] font-bold text-muted-foreground uppercase">
                  Observaciones
                </strong>
                <p className="mt-0.5 whitespace-pre-line text-foreground">
                  {quote.notes}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 space-y-2 px-[14mm] pt-2 pb-2">
          <div className="flex items-end justify-between border-t border-border pt-3">
            <div className="space-y-0.5 font-mono text-[8.5px] text-muted-foreground">
              <p>CENDO • Centro de Endometriosis y Ginecología</p>
              <p>
                Tarifa garantizada hasta el{" "}
                {formatPeruDateDisplay(quote.validUntilDate)}
              </p>
            </div>

            <div className="min-w-[210px] space-y-0.5 text-center">
              <div className="flex h-8 items-center justify-center border-b border-border">
                <span className="font-serif text-sm font-bold italic text-primary select-none">
                  {quote.doctorName}
                </span>
              </div>
              <p className="text-[11px] font-bold text-foreground uppercase">
                {quote.doctorName}
              </p>
              <p className="font-mono text-[9.5px] text-muted-foreground">
                CENDO Miraflores • Lima, Perú
              </p>
            </div>
          </div>

          <CendoFooterWave
            address={clinicAddress}
            email={clinicEmail}
            phone={clinicPhone}
          />
        </div>
      </section>
    </div>
  );
}
