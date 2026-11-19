"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination";
import {
  resolveCivilStatus,
  resolveEducationLevel,
  resolveInsurance,
} from "@/lib/clinical/catalogs";
import { calculateAge } from "@/lib/utils";
import {
  createPatientAction,
  deletePatientAction,
  updatePatientAction,
} from "../actions/pacientes.actions";
import {
  DOCUMENT_TYPES,
  patientInputSchema,
  type PatientDirectoryItem,
  type PatientInput,
} from "../pacientes.schema";

export type CoverageFilter = "ALL" | "PARTICULAR" | "INSURED" | "ALLERGIES";
export type PatientSortBy = "recent" | "alpha";

export function buildDefaultPatientValues(
  item?: PatientDirectoryItem | null
): PatientInput {
  if (item) {
    const docType = (DOCUMENT_TYPES as readonly string[]).includes(item.documentType)
      ? (item.documentType as PatientInput["documentType"])
      : "DNI";

    return {
      documentType: docType,
      documentNumber: item.documentNumber,
      firstName: item.firstName,
      lastName: item.lastName,
      birthDate: item.birthDate || "1995-01-01",
      phone: item.phone,
      email: item.email,
      address: item.address,
      district: item.district || "Miraflores",
      civilStatus: resolveCivilStatus(item.civilStatus).label,
      occupation: item.occupation,
      educationLevel: resolveEducationLevel(item.educationLevel).label,
      birthPlace: item.birthPlace || "Lima, Perú",
      religion: item.religion || "Católica",
      insuranceInfo: resolveInsurance(item.insuranceInfo).label,
    };
  }

  return {
    documentType: "DNI",
    documentNumber: "",
    firstName: "",
    lastName: "",
    birthDate: "1996-01-01",
    phone: "",
    email: "",
    address: "",
    district: "Miraflores",
    civilStatus: "Soltera",
    occupation: "",
    educationLevel: "Superior Universitaria Completa",
    birthPlace: "Lima, Perú",
    religion: "Católica",
    insuranceInfo: "Particular",
  };
}

function hasPositiveAllergy(value?: string | null): boolean {
  if (!value) return false;
  const clean = value.trim().toLowerCase();
  return clean !== "" && !clean.startsWith("niega") && clean !== "ninguna" && clean !== "no refiere";
}

export function usePacientes(initialItems: PatientDirectoryItem[]) {
  const router = useRouter();
  const [items, setItems] = useState<PatientDirectoryItem[]>(initialItems);
  const [search, setSearchState] = useState("");
  const [coverageFilter, setCoverageFilterState] = useState<CoverageFilter>("ALL");
  const [sortBy, setSortByState] = useState<PatientSortBy>("recent");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PatientDirectoryItem | null>(null);
  const [openAfterCreate, setOpenAfterCreate] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PatientDirectoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<PatientInput>({
    resolver: zodResolver(patientInputSchema),
    defaultValues: buildDefaultPatientValues(),
  });

  const watchedBirthDate = useWatch({
    control: form.control,
    name: "birthDate",
  });
  const computedAge = useMemo(() => calculateAge(watchedBirthDate), [watchedBirthDate]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (coverageFilter === "PARTICULAR") {
        if (!item.insuranceInfo.toLowerCase().includes("particular")) return false;
      } else if (coverageFilter === "INSURED") {
        if (item.insuranceInfo.toLowerCase().includes("particular")) return false;
      } else if (coverageFilter === "ALLERGIES") {
        if (!hasPositiveAllergy(item.medicalAllergies)) return false;
      }

      if (!q) return true;

      return (
        item.documentNumber.toLowerCase().includes(q) ||
        item.fullName.toLowerCase().includes(q) ||
        item.firstName.toLowerCase().includes(q) ||
        item.lastName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.occupation.toLowerCase().includes(q)
      );
    });

    if (sortBy === "alpha") {
      return [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
    }

    return [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [items, search, coverageFilter, sortBy]);

  const pagination = usePagination(filteredItems);

  const stats = useMemo(() => {
    const particularCount = items.filter((i) =>
      i.insuranceInfo.toLowerCase().includes("particular")
    ).length;
    const insuredCount = items.length - particularCount;
    const allergiesCount = items.filter((i) =>
      hasPositiveAllergy(i.medicalAllergies)
    ).length;

    return {
      total: items.length,
      particularCount,
      insuredCount,
      allergiesCount,
    };
  }, [items]);

  const setSearch = (value: string) => {
    setSearchState(value);
    pagination.resetPage();
  };

  const setCoverageFilter = (value: CoverageFilter) => {
    setCoverageFilterState(value);
    pagination.resetPage();
  };

  const setSortBy = (value: PatientSortBy) => {
    setSortByState(value);
    pagination.resetPage();
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setOpenAfterCreate(false);
    form.reset(buildDefaultPatientValues());
    setDialogOpen(true);
  };

  const openEditModal = (item: PatientDirectoryItem) => {
    setEditingItem(item);
    setOpenAfterCreate(false);
    form.reset(buildDefaultPatientValues(item));
    setDialogOpen(true);
  };

  const submitWithRedirect = (shouldRedirectToHistory: boolean) => {
    setOpenAfterCreate(shouldRedirectToHistory);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (editingItem) {
      const res = await updatePatientAction({ ...values, id: editingItem.id });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar la paciente.");
        return;
      }
      setItems((prev) =>
        prev.map((row) => (row.id === editingItem.id ? res.data! : row))
      );
      toast.success(`Historia de ${res.data.fullName} actualizada.`);
      setDialogOpen(false);
      setEditingItem(null);
      return;
    }

    const res = await createPatientAction(values);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo registrar la paciente.");
      return;
    }

    const created = res.data;
    setItems((prev) => [created, ...prev]);
    toast.success(`Paciente ${created.fullName} registrada.`);
    setDialogOpen(false);
    setEditingItem(null);

    if (openAfterCreate) {
      router.push(`/pacientes/${created.id}`);
    }
  });

  const requestDelete = (item: PatientDirectoryItem) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    const res = await deletePatientAction({ id: target.id });
    setDeletingId(null);

    if (!res.success) {
      toast.error(res.error || "No se pudo eliminar la historia clínica.");
      return;
    }

    setItems((prev) => prev.filter((row) => row.id !== target.id));
    setDeleteTarget(null);
    toast.success(`Historia clínica de ${target.fullName} archivada.`);
  };

  return {
    items: pagination.paginatedItems,
    filteredCount: filteredItems.length,
    totalCount: items.length,
    stats,
    pagination,
    search,
    setSearch,
    coverageFilter,
    setCoverageFilter,
    sortBy,
    setSortBy,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    computedAge,
    isSubmitting: form.formState.isSubmitting,
    openCreateModal,
    openEditModal,
    submitWithRedirect,
    onSubmit,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    requestDelete,
    confirmDelete,
  };
}
