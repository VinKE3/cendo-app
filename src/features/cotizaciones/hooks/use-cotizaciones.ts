"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { QuoteItemRecord } from "@/db/schema/clinical";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type { ProcedureTariffItem } from "@/features/tarifario/tarifario.schema";
import { usePagination } from "@/hooks/use-pagination";
import { getPeruDateString, shiftPeruDate } from "@/lib/utils";
import {
  createQuoteAction,
  deleteQuoteAction,
  updateQuoteAction,
} from "../actions/cotizaciones.actions";
import {
  computeQuoteFinancials,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_QUOTE_NOTES,
  roundCurrency,
  VALIDITY_DAY_OPTIONS,
  type ProcedureQuoteItem,
} from "../cotizaciones.schema";

const pgUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const quoteModalFormSchema = z.object({
  consultationId: z.string().trim(),
  quoteDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione fecha válida (YYYY-MM-DD)."),
  validityDays: z.number().int().min(1).max(180),
  paymentTerms: z
    .string()
    .trim()
    .min(5, "Indique las condiciones de pago.")
    .max(1200),
  notes: z.string().trim().max(2000),
});

export type QuoteModalFormValues = z.infer<typeof quoteModalFormSchema>;

export interface CustomQuoteDraft {
  code: string;
  name: string;
  category: string;
  price: string;
}

const DEFAULT_CUSTOM_DRAFT: CustomQuoteDraft = {
  code: "EXT-01",
  name: "",
  category: "Adicional",
  price: "",
};

export interface UseCotizacionesParams {
  patient: PatientDirectoryItem;
  quotes: ProcedureQuoteItem[];
  onQuotesChange: (next: ProcedureQuoteItem[]) => void;
  tariffs: ProcedureTariffItem[];
  consultations: MedicalConsultationItem[];
}

export function useCotizaciones({
  patient,
  quotes,
  onQuotesChange,
  tariffs,
  consultations,
}: UseCotizacionesParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcedureQuoteItem | null>(
    null
  );
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [saveAndPrintIntent, setSaveAndPrintIntent] = useState(false);

  const [printingItem, setPrintingItem] = useState<ProcedureQuoteItem | null>(
    null
  );
  const [showCoverPage, setShowCoverPage] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ProcedureQuoteItem | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [draftItems, setDraftItems] = useState<QuoteItemRecord[]>([]);
  const [tariffSearch, setTariffSearch] = useState("");
  const [customDraft, setCustomDraft] =
    useState<CustomQuoteDraft>(DEFAULT_CUSTOM_DRAFT);

  const form = useForm<QuoteModalFormValues>({
    resolver: zodResolver(quoteModalFormSchema),
    defaultValues: {
      consultationId: "",
      quoteDate: todayStr,
      validityDays: 30,
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      notes: DEFAULT_QUOTE_NOTES,
    },
  });

  const watchedConsultationId = useWatch({
    control: form.control,
    name: "consultationId",
  });
  const watchedQuoteDate = useWatch({
    control: form.control,
    name: "quoteDate",
  });
  const watchedValidityDays = useWatch({
    control: form.control,
    name: "validityDays",
  });

  const computedValidUntilDate = useMemo(() => {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(watchedQuoteDate || "")
      ? watchedQuoteDate
      : todayStr;
    const days = Math.max(1, Math.min(180, Number(watchedValidityDays) || 30));
    return shiftPeruDate(base, days);
  }, [watchedQuoteDate, watchedValidityDays, todayStr]);

  const financials = useMemo(
    () => computeQuoteFinancials(draftItems),
    [draftItems]
  );

  const activeTariffs = useMemo(
    () => tariffs.filter((t) => t.active),
    [tariffs]
  );

  const filteredTariffs = useMemo(() => {
    const q = tariffSearch.trim().toLowerCase();
    if (!q) return activeTariffs;
    return activeTariffs.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [activeTariffs, tariffSearch]);

  const filteredQuotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter(
      (quote) =>
        quote.doctorName.toLowerCase().includes(q) ||
        quote.notes.toLowerCase().includes(q) ||
        quote.items.some(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            it.code.toLowerCase().includes(q)
        )
    );
  }, [quotes, search]);

  const pagination = usePagination(filteredQuotes, 10);

  const setSearch = (val: string) => {
    setSearchState(val);
    pagination.setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setSourceLabel(null);
    setSaveAndPrintIntent(false);
    setDraftItems([]);
    setTariffSearch("");
    setCustomDraft(DEFAULT_CUSTOM_DRAFT);
    form.reset({
      consultationId: consultations[0]?.id ?? "",
      quoteDate: todayStr,
      validityDays: 30,
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      notes: DEFAULT_QUOTE_NOTES,
    });
    setDialogOpen(true);
  };

  const openEditModal = (item: ProcedureQuoteItem) => {
    setEditingItem(item);
    setSourceLabel(null);
    setSaveAndPrintIntent(false);
    setDraftItems(item.items.map((it) => ({ ...it })));
    setTariffSearch("");
    setCustomDraft(DEFAULT_CUSTOM_DRAFT);
    form.reset({
      consultationId: item.consultationId ?? "",
      quoteDate: item.quoteDate,
      validityDays: item.validityDays,
      paymentTerms: item.paymentTerms || DEFAULT_PAYMENT_TERMS,
      notes: item.notes,
    });
    setDialogOpen(true);
  };

  const openDuplicateModal = (item: ProcedureQuoteItem) => {
    setEditingItem(null);
    setSaveAndPrintIntent(false);
    setTariffSearch("");
    setCustomDraft(DEFAULT_CUSTOM_DRAFT);

    const tariffById = new Map(activeTariffs.map((t) => [t.id, t]));
    let updatedCount = 0;

    const refreshedItems: QuoteItemRecord[] = item.items.map((oldIt) => {
      const currentTariff = tariffById.get(oldIt.procedureId);
      if (currentTariff) {
        const livePrice = Number(currentTariff.price);
        if (Math.abs(livePrice - oldIt.regularPrice) > 0.009) {
          updatedCount += 1;
        }
        const discount = Number(oldIt.discountPercent ?? 0);
        return {
          procedureId: currentTariff.id,
          code: currentTariff.code,
          name: currentTariff.name,
          category: currentTariff.category,
          regularPrice: livePrice,
          discountPercent: discount,
          finalPrice: roundCurrency(livePrice * (1 - discount / 100)),
        };
      }
      return { ...oldIt };
    });

    setDraftItems(refreshedItems);
    setSourceLabel(
      updatedCount > 0
        ? `Renovación basada en presupuesto del ${item.quoteDate} (${updatedCount} tarifa(s) actualizadas al precio vigente).`
        : `Renovación basada en presupuesto del ${item.quoteDate} (tarifas vigentes).`
    );

    if (updatedCount > 0) {
      toast.info(
        `Se actualizaron ${updatedCount} tarifa(s) al tarifario vigente CENDO.`
      );
    }

    form.reset({
      consultationId: "",
      quoteDate: todayStr,
      validityDays: item.validityDays || 30,
      paymentTerms: item.paymentTerms || DEFAULT_PAYMENT_TERMS,
      notes: item.notes || DEFAULT_QUOTE_NOTES,
    });
    setDialogOpen(true);
  };

  const openFromConsultation = (consultation: MedicalConsultationItem) => {
    setEditingItem(null);
    setSourceLabel(
      `Cotización asociada a consulta del ${consultation.consultationDate} (${consultation.diagnosis})`
    );
    setSaveAndPrintIntent(false);
    setDraftItems([]);
    setTariffSearch("");
    setCustomDraft(DEFAULT_CUSTOM_DRAFT);
    form.reset({
      consultationId: consultation.id,
      quoteDate: consultation.consultationDate || todayStr,
      validityDays: 30,
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      notes: DEFAULT_QUOTE_NOTES,
    });
    setDialogOpen(true);
  };

  const addTariffItem = (tariff: ProcedureTariffItem) => {
    if (draftItems.some((it) => it.procedureId === tariff.id)) {
      toast.info(`"${tariff.name}" ya está incluido en el presupuesto.`);
      return;
    }
    const price = roundCurrency(Number(tariff.price));
    setDraftItems((prev) => [
      ...prev,
      {
        procedureId: tariff.id,
        code: tariff.code,
        name: tariff.name,
        category: tariff.category,
        regularPrice: price,
        discountPercent: 0,
        finalPrice: price,
      },
    ]);
  };

  const addCustomItem = () => {
    const cleanName = customDraft.name.trim();
    const numericPrice = roundCurrency(Number(customDraft.price));
    if (cleanName.length < 2) {
      toast.error("Ingrese la descripción del concepto adicional.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error("Ingrese un precio mayor a S/ 0.00.");
      return;
    }
    setDraftItems((prev) => [
      ...prev,
      {
        procedureId: `custom-${Date.now()}-${prev.length}`,
        code: customDraft.code.trim().toUpperCase() || "EXT-01",
        name: cleanName,
        category: customDraft.category.trim() || "Adicional",
        regularPrice: numericPrice,
        discountPercent: 0,
        finalPrice: numericPrice,
      },
    ]);
    setCustomDraft(DEFAULT_CUSTOM_DRAFT);
  };

  const updateItemDiscount = (index: number, rawPercent: number) => {
    const safeDiscount = Math.max(
      0,
      Math.min(100, Number.isFinite(rawPercent) ? rawPercent : 0)
    );
    setDraftItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const discountPercent = roundCurrency(safeDiscount);
        return {
          ...it,
          discountPercent,
          finalPrice: roundCurrency(
            it.regularPrice * (1 - discountPercent / 100)
          ),
        };
      })
    );
  };

  const removeDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (draftItems.length === 0) {
      toast.error("Agregue al menos 1 procedimiento o servicio a cotizar.");
      return;
    }

    const validConsultationId =
      values.consultationId && pgUuidRegex.test(values.consultationId)
        ? values.consultationId
        : null;

    const payload = {
      patientId: patient.id,
      consultationId: validConsultationId,
      quoteDate: values.quoteDate,
      validityDays: Number(values.validityDays) || 30,
      items: draftItems,
      paymentTerms: values.paymentTerms,
      notes: values.notes,
    };

    if (editingItem) {
      const res = await updateQuoteAction({
        id: editingItem.id,
        ...payload,
      });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar el presupuesto.");
        return;
      }

      const saved = res.data;
      onQuotesChange(
        quotes.map((row) => (row.id === saved.id ? saved : row))
      );
      setDialogOpen(false);
      setEditingItem(null);
      toast.success("Presupuesto médico actualizado.");
      if (saveAndPrintIntent) {
        setPrintingItem(saved);
      }
      return;
    }

    const res = await createQuoteAction(payload);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo emitir el presupuesto.");
      return;
    }

    const created = res.data;
    onQuotesChange([created, ...quotes]);
    setDialogOpen(false);
    toast.success("Presupuesto médico generado.");
    if (saveAndPrintIntent) {
      setPrintingItem(created);
    }
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    try {
      const res = await deleteQuoteAction({ id: target.id });
      if (!res.success) {
        toast.error(res.error || "No se pudo archivar el presupuesto.");
        return;
      }
      onQuotesChange(quotes.filter((q) => q.id !== target.id));
      toast.success("Presupuesto archivado.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    items: pagination.paginatedItems,
    totalCount: quotes.length,
    filteredCount: filteredQuotes.length,
    pagination,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    editingItem,
    sourceLabel,
    form,
    isSubmitting: form.formState.isSubmitting,
    watchedConsultationId,
    computedValidUntilDate,
    validityOptions: VALIDITY_DAY_OPTIONS,
    draftItems: financials.items,
    financials,
    tariffSearch,
    setTariffSearch,
    filteredTariffs,
    customDraft,
    setCustomDraft,
    openCreateModal,
    openEditModal,
    openDuplicateModal,
    openFromConsultation,
    addTariffItem,
    addCustomItem,
    updateItemDiscount,
    removeDraftItem,
    setSaveAndPrintIntent,
    onSubmit,
    printingItem,
    setPrintingItem,
    showCoverPage,
    setShowCoverPage,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    confirmDelete,
  };
}
