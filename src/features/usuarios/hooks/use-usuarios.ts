"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination";
import {
  CLINICAL_ROLES,
  COMMON_SPECIALTIES,
  DOCTOR_TITLES,
  createDoctorSchema,
  updateDoctorSchema,
  type CreateDoctorInput,
  type DoctorListItem,
  type UpdateDoctorInput,
} from "../usuarios.schema";
import {
  createDoctorAction,
  deleteDoctorAction,
  updateDoctorAction,
} from "../actions/usuarios.actions";

export function useUsuarios(initialDoctors: DoctorListItem[], currentUserId: string) {
  const [doctors, setDoctors] = useState<DoctorListItem[]>(initialDoctors);
  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorListItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const createForm = useForm<CreateDoctorInput>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: {
      fullName: "",
      doctorTitle: "Dr.",
      specialty: COMMON_SPECIALTIES[0],
      cmp: "",
      rne: "",
      clinicalRole: "doctor",
      email: "",
      password: "",
      phone: "",
      clinicAddress: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
      isActive: true,
    },
  });

  const editForm = useForm<UpdateDoctorInput>({
    resolver: zodResolver(updateDoctorSchema),
    defaultValues: {
      id: "",
      fullName: "",
      doctorTitle: "Dr.",
      specialty: COMMON_SPECIALTIES[0],
      cmp: "",
      rne: "",
      clinicalRole: "doctor",
      email: "",
      newPassword: "",
      phone: "",
      clinicAddress: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
      isActive: true,
    },
  });

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (doc) =>
        doc.fullName.toLowerCase().includes(q) ||
        doc.email.toLowerCase().includes(q) ||
        doc.cmp.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q)
    );
  }, [doctors, search]);

  const pagination = usePagination(filteredDoctors);

  const setSearch = (value: string) => {
    setSearchState(value);
    pagination.resetPage();
  };

  const openCreateModal = () => {
    setEditingDoctor(null);
    createForm.reset({
      fullName: "",
      doctorTitle: "Dr.",
      specialty: COMMON_SPECIALTIES[0],
      cmp: "",
      rne: "",
      clinicalRole: "doctor",
      email: "",
      password: "",
      phone: "",
      clinicAddress: "Av. Alfredo Benavides N° 2975, Of. 405, Miraflores - Lima",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditModal = (doc: DoctorListItem) => {
    setEditingDoctor(doc);
    editForm.reset({
      id: doc.id,
      fullName: doc.fullName,
      doctorTitle: (DOCTOR_TITLES as readonly string[]).includes(doc.doctorTitle)
        ? (doc.doctorTitle as CreateDoctorInput["doctorTitle"])
        : "Dr.",
      specialty: doc.specialty,
      cmp: doc.cmp,
      rne: doc.rne,
      clinicalRole: doc.clinicalRole,
      email: doc.email,
      newPassword: "",
      phone: doc.phone,
      clinicAddress: doc.clinicAddress,
      isActive: doc.isActive,
    });
    setDialogOpen(true);
  };

  const onCreateSubmit = createForm.handleSubmit(async (values) => {
    const res = await createDoctorAction(values);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo crear el usuario.");
      return;
    }
    setDoctors((prev) => [...prev, res.data!]);
    toast.success(`Cuenta creada para ${res.data.doctorTitle} ${res.data.fullName}.`);
    setDialogOpen(false);
  });

  const onEditSubmit = editForm.handleSubmit(async (values) => {
    const res = await updateDoctorAction(values);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo actualizar el usuario.");
      return;
    }
    setDoctors((prev) => prev.map((d) => (d.id === values.id ? res.data! : d)));
    toast.success(`Perfil de ${res.data.doctorTitle} ${res.data.fullName} actualizado.`);
    setDialogOpen(false);
    setEditingDoctor(null);
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const res = await deleteDoctorAction({ id });
    setDeletingId(null);

    if (!res.success) {
      toast.error(res.error || "No se pudo eliminar el usuario.");
      return;
    }
    setDoctors((prev) => prev.filter((d) => d.id !== id));
    toast.success("Usuario desactivado y removido del directorio.");
  };

  return {
    doctors: pagination.paginatedItems,
    totalCount: doctors.length,
    pagination,
    currentUserId,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    editingDoctor,
    createForm,
    editForm,
    isSubmitting: editingDoctor
      ? editForm.formState.isSubmitting
      : createForm.formState.isSubmitting,
    deletingId,
    doctorTitles: DOCTOR_TITLES,
    clinicalRoles: CLINICAL_ROLES,
    specialties: COMMON_SPECIALTIES,
    openCreateModal,
    openEditModal,
    onCreateSubmit,
    onEditSubmit,
    handleDelete,
  };
}
