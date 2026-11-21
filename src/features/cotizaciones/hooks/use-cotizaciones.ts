"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { QuoteItemRecord } from "@/db/schema/clinical";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { LabOrderItem } from "@/features/laboratorio/laboratorio.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import {
  formatProviderOptionLabel,
  getDefaultProviderCost,
  type ProcedureTariffItem,
} from "@/features/tarifario/tarifario.schema";
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

function normalizeMatchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const LAB_TO_TARIFF_RULES: ReadonlyArray<{
  testPatterns: readonly RegExp[];
  tariffCodes: readonly string[];
  tariffNameKeywords: readonly string[];
}> = [
  {
    testPatterns: [/biopsia.*cervix|cervix.*endocervix/i],
    tariffCodes: ["CENDO-01"],
    tariffNameKeywords: ["biopsia cervix"],
  },
  {
    testPatterns: [/biopsia.*mama|tru-?cut.*mama|core.*mama/i],
    tariffCodes: ["CENDO-02"],
    tariffNameKeywords: ["biopsia de mama"],
  },
  {
    testPatterns: [/pap.*base\s*liquida|base\s*liquida|thinprep/i],
    tariffCodes: ["MOL-PAPLIQ"],
    tariffNameKeywords: ["pap base liquida"],
  },
  {
    testPatterns: [/vph.*28\s*gen/i],
    tariffCodes: ["MOL-VPH28"],
    tariffNameKeywords: ["vph 28"],
  },
  {
    testPatterns: [/vph.*14\s*gen/i],
    tariffCodes: ["MOL-VPH14"],
    tariffNameKeywords: ["vph 14"],
  },
  {
    testPatterns: [/vph.*15\s*gen/i],
    tariffCodes: ["MOL-VPH15"],
    tariffNameKeywords: ["vph 15"],
  },
  {
    testPatterns: [/vph.*23\s*gen/i],
    tariffCodes: ["MOL-VPH23"],
    tariffNameKeywords: ["vph 23"],
  },
  {
    testPatterns: [/vph.*35\s*gen/i],
    tariffCodes: ["MOL-VPH35"],
    tariffNameKeywords: ["vph 35"],
  },
  {
    testPatterns: [/panel.*its/i],
    tariffCodes: ["MOL-ITS", "CENDO-36"],
    tariffNameKeywords: ["panel de its", "panel ets"],
  },
  {
    testPatterns: [/panel.*ets/i],
    tariffCodes: ["CENDO-36", "MOL-ITS"],
    tariffNameKeywords: ["panel ets"],
  },
  {
    testPatterns: [/papanicolaou|\bpap\b|citologia.*cervix/i],
    tariffCodes: ["CENDO-37"],
    tariffNameKeywords: ["pap"],
  },
  {
    testPatterns: [/cultivo.*secrecion\s*vaginal/i],
    tariffCodes: ["CENDO-22"],
    tariffNameKeywords: ["cultivo secrecion vaginal"],
  },
  {
    testPatterns: [/urocultivo/i],
    tariffCodes: ["CENDO-43"],
    tariffNameKeywords: ["urocultivo"],
  },
  {
    testPatterns: [/examen.*orina|\bego\b/i],
    tariffCodes: ["CENDO-31"],
    tariffNameKeywords: ["examen de orina"],
  },
  {
    testPatterns: [/hemograma/i],
    tariffCodes: ["LAB-16"],
    tariffNameKeywords: ["hemograma"],
  },
  {
    testPatterns: [/grupo\s*sanguineo|factor\s*rh/i],
    tariffCodes: ["LAB-12"],
    tariffNameKeywords: ["grupo sanguineo"],
  },
  {
    testPatterns: [/glucosa/i],
    tariffCodes: ["LAB-1282"],
    tariffNameKeywords: ["glucosa"],
  },
  {
    testPatterns: [/\brpr\b|vdrl|sifilis/i],
    tariffCodes: ["LAB-538"],
    tariffNameKeywords: ["rpr"],
  },
  {
    testPatterns: [/\bvih\b|\bhiv\b/i],
    tariffCodes: ["LAB-466"],
    tariffNameKeywords: ["hiv"],
  },
  {
    testPatterns: [/hepatitis\s*b|hbsag/i],
    tariffCodes: ["LAB-14"],
    tariffNameKeywords: ["hepatitis b"],
  },
  {
    testPatterns: [/estradiol/i],
    tariffCodes: ["LAB-193"],
    tariffNameKeywords: ["estradiol"],
  },
  {
    testPatterns: [/\blh\b|luteinizante/i],
    tariffCodes: ["LAB-201"],
    tariffNameKeywords: ["lh"],
  },
  {
    testPatterns: [/\bfsh\b|foliculo\s*estimulante/i],
    tariffCodes: ["LAB-535"],
    tariffNameKeywords: ["fsh"],
  },
  {
    testPatterns: [/prolactina/i],
    tariffCodes: ["LAB-243"],
    tariffNameKeywords: ["prolactina"],
  },
  {
    testPatterns: [/progesterona/i],
    tariffCodes: ["LAB-242"],
    tariffNameKeywords: ["progesterona"],
  },
  {
    testPatterns: [/testosterona/i],
    tariffCodes: ["LAB-260"],
    tariffNameKeywords: ["testosterona"],
  },
  {
    testPatterns: [/perfil\s*hormonal\s*femenino/i],
    tariffCodes: ["LAB-2797"],
    tariffNameKeywords: ["perfil hormonal femenino"],
  },
  {
    testPatterns: [/\bcea\b|carcinoembrionario/i],
    tariffCodes: ["LAB-96"],
    tariffNameKeywords: ["cea"],
  },
  {
    testPatterns: [/\bafp\b|alfafetoproteina|alfa-fetoproteina/i],
    tariffCodes: ["LAB-65"],
    tariffNameKeywords: ["afp"],
  },
  {
    testPatterns: [/ca[\s-]*125/i],
    tariffCodes: ["LAB-930"],
    tariffNameKeywords: ["ca 125"],
  },
  {
    testPatterns: [/perfil\s*lipidico/i],
    tariffCodes: ["LAB-227"],
    tariffNameKeywords: ["perfil lipidico"],
  },
];

const LAB_PROFILE_BUNDLES: ReadonlyArray<{
  tariffCode: string;
  tariffNameKeyword: string;
  explicitRegex: RegExp;
  componentPatterns: readonly RegExp[];
  minMatches: number;
}> = [
  {
    tariffCode: "PERF-GEST",
    tariffNameKeyword: "perfil de gestante",
    explicitRegex: /perfil\s*(de\s*)?gestante/i,
    componentPatterns: [
      /hemograma/i,
      /grupo\s*sanguineo|factor\s*rh/i,
      /glucosa/i,
      /\brpr\b|vdrl|sifilis/i,
      /urocultivo/i,
      /\bvih\b|\bhiv\b/i,
      /hepatitis\s*b|hbsag/i,
    ],
    minMatches: 5,
  },
  {
    tariffCode: "PERF-HORM",
    tariffNameKeyword: "perfil hormonal",
    explicitRegex: /^perfil\s*hormonal(\s*\(cendo\))?$/i,
    componentPatterns: [
      /estradiol/i,
      /\blh\b|luteinizante/i,
      /\bfsh\b|foliculo/i,
      /prolactina/i,
      /progesterona/i,
      /testosterona/i,
    ],
    minMatches: 5,
  },
  {
    tariffCode: "PERF-TUM",
    tariffNameKeyword: "perfil tumoral",
    explicitRegex: /perfil\s*tumoral/i,
    componentPatterns: [
      /\bcea\b|carcinoembrionario/i,
      /\bafp\b|alfafetoproteina|alfa-fetoproteina/i,
      /ca[\s-]*125/i,
    ],
    minMatches: 3,
  },
  {
    tariffCode: "PERF-GEN",
    tariffNameKeyword: "perfil general",
    explicitRegex: /perfil\s*general/i,
    componentPatterns: [
      /hemograma/i,
      /perfil\s*lipidico/i,
      /glucosa/i,
      /urocultivo/i,
    ],
    minMatches: 4,
  },
];

function buildDraftItemFromTariff(
  tariff: ProcedureTariffItem,
  requestedLabName?: string
): QuoteItemRecord {
  const price = roundCurrency(Number(tariff.price));
  const providers = tariff.providerCosts ?? [];
  const matchedProvider = requestedLabName
    ? providers.find(
        (p) =>
          formatProviderOptionLabel(p).toLowerCase() ===
            requestedLabName.trim().toLowerCase() ||
          p.laboratoryName.trim().toLowerCase() ===
            requestedLabName.trim().toLowerCase()
      )
    : undefined;
  const chosenProvider = matchedProvider ?? getDefaultProviderCost(providers);
  return {
    procedureId: tariff.id,
    code: tariff.code,
    name: tariff.name,
    category: tariff.category,
    regularPrice: price,
    discountPercent: 0,
    finalPrice: price,
    ...(chosenProvider
      ? {
          selectedLabName: formatProviderOptionLabel(chosenProvider),
          providerCost: roundCurrency(Number(chosenProvider.cost)),
        }
      : {}),
  };
}

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
        const built = buildDraftItemFromTariff(
          currentTariff,
          oldIt.selectedLabName
        );
        return {
          ...built,
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
    setDraftItems((prev) => [...prev, buildDraftItemFromTariff(tariff)]);
  };

  const openFromLabOrder = (order: LabOrderItem) => {
    setEditingItem(null);
    setSaveAndPrintIntent(false);
    setTariffSearch("");
    setCustomDraft(DEFAULT_CUSTOM_DRAFT);

    const requestLabels: string[] = [
      ...order.items.map((it) => it.testName),
      ...order.customTests
        .split(/[\r\n,;]+/)
        .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
        .filter(Boolean),
    ];

    if (
      order.templateType !== "GENERAL" &&
      requestLabels.length === 0 &&
      order.specimenDetails?.anatomicalSite
    ) {
      requestLabels.push(order.specimenDetails.anatomicalSite);
    }

    const findTariffByCodesOrName = (
      codes: readonly string[],
      nameKeywords: readonly string[]
    ): ProcedureTariffItem | undefined => {
      for (const code of codes) {
        const byCode = activeTariffs.find(
          (t) => t.code.trim().toUpperCase() === code.toUpperCase()
        );
        if (byCode) return byCode;
      }
      for (const kw of nameKeywords) {
        const normKw = normalizeMatchText(kw);
        const byName = activeTariffs.find((t) =>
          normalizeMatchText(t.name).includes(normKw)
        );
        if (byName) return byName;
      }
      return undefined;
    };

    const normalizedRequests = requestLabels.map((raw) => ({
      raw,
      norm: normalizeMatchText(raw),
      consumed: false,
    }));

    const matchedTariffs: ProcedureTariffItem[] = [];
    const pushTariff = (tariff: ProcedureTariffItem | undefined) => {
      if (!tariff) return;
      if (matchedTariffs.some((existing) => existing.id === tariff.id)) return;
      matchedTariffs.push(tariff);
    };

    // 1. Detectar perfiles completos CENDO (ej. Perfil de Gestante S/ 200 vs suma individual)
    for (const bundle of LAB_PROFILE_BUNDLES) {
      const availableIdx = normalizedRequests
        .map((r, idx) => ({ r, idx }))
        .filter(({ r }) => !r.consumed);

      const hasExplicit = availableIdx.some(({ r }) =>
        bundle.explicitRegex.test(r.norm)
      );
      const matchedIndices = new Set<number>();
      for (const pattern of bundle.componentPatterns) {
        const hit = availableIdx.find(({ r }) => pattern.test(r.norm));
        if (hit) matchedIndices.add(hit.idx);
      }

      if (hasExplicit || matchedIndices.size >= bundle.minMatches) {
        const bundleTariff = findTariffByCodesOrName(
          [bundle.tariffCode],
          [bundle.tariffNameKeyword]
        );
        if (bundleTariff) {
          pushTariff(bundleTariff);
          for (const idx of matchedIndices) {
            normalizedRequests[idx]!.consumed = true;
          }
          if (hasExplicit) {
            for (const { r, idx } of availableIdx) {
              if (bundle.explicitRegex.test(r.norm)) {
                normalizedRequests[idx]!.consumed = true;
              }
            }
          }
        }
      }
    }

    // 2. Emparejar exámenes individuales restantes
    const unmatched: string[] = [];
    for (const req of normalizedRequests) {
      if (req.consumed) continue;

      let matched: ProcedureTariffItem | undefined;
      for (const rule of LAB_TO_TARIFF_RULES) {
        if (rule.testPatterns.some((rx) => rx.test(req.norm))) {
          matched = findTariffByCodesOrName(
            rule.tariffCodes,
            rule.tariffNameKeywords
          );
          if (matched) break;
        }
      }

      if (!matched) {
        const reqWords = req.norm
          .split(" ")
          .filter((w) => w.length >= 4 && !["para", "con", "los", "las", "del", "tipo"].includes(w));
        matched = activeTariffs.find((t) => {
          const tNorm = normalizeMatchText(t.name);
          return (
            tNorm === req.norm ||
            (req.norm.length >= 6 && tNorm.includes(req.norm)) ||
            (reqWords.length >= 2 &&
              reqWords.every((word) => tNorm.includes(word)))
          );
        });
      }

      if (matched) {
        req.consumed = true;
        pushTariff(matched);
      } else {
        unmatched.push(req.raw);
      }
    }

    if (order.templateType !== "GENERAL" && matchedTariffs.length === 0) {
      const siteNorm = normalizeMatchText(
        order.specimenDetails?.anatomicalSite ?? ""
      );
      if (siteNorm.includes("mama")) {
        pushTariff(findTariffByCodesOrName(["CENDO-02"], ["biopsia de mama"]));
      } else {
        pushTariff(findTariffByCodesOrName(["CENDO-01"], ["biopsia cervix"]));
      }
    }

    const nextItems = matchedTariffs.map((t) => buildDraftItemFromTariff(t));
    setDraftItems(nextItems);

    setSourceLabel(
      `Cotización generada desde orden de ${
        order.templateType !== "GENERAL" ? "Anatomía Patológica" : "Laboratorio"
      } (${order.orderDate})`
    );

    if (unmatched.length > 0) {
      toast.info(
        `${unmatched.length} estudio(s) sin tarifa CENDO exacta (${unmatched
          .slice(0, 3)
          .join(", ")}${unmatched.length > 3 ? "..." : ""}). Puede agregarlos manualmente como concepto adicional.`
      );
      if (unmatched.length === 1) {
        setCustomDraft({
          code: "EXT-01",
          name: unmatched[0]!,
          category: "Laboratorio",
          price: "",
        });
      }
    }

    form.reset({
      consultationId: order.consultationId ?? "",
      quoteDate: todayStr,
      validityDays: 30,
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      notes: DEFAULT_QUOTE_NOTES,
    });
    setDialogOpen(true);
  };

  const updateItemProvider = (index: number, selectedLabLabel: string) => {
    setDraftItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const tariff = tariffs.find((t) => t.id === it.procedureId);
        if (!tariff) return it;
        const matched = (tariff.providerCosts ?? []).find(
          (p) =>
            formatProviderOptionLabel(p).toLowerCase() ===
            selectedLabLabel.trim().toLowerCase()
        );
        if (!matched) return it;
        return {
          ...it,
          selectedLabName: formatProviderOptionLabel(matched),
          providerCost: roundCurrency(Number(matched.cost)),
        };
      })
    );
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
    openFromLabOrder,
    addTariffItem,
    addCustomItem,
    updateItemDiscount,
    updateItemProvider,
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
