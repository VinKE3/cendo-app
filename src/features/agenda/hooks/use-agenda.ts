"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import { useCatalogCategories } from "@/features/catalog-categories/hooks/use-catalog-categories";
import { DOCUMENT_TYPES } from "@/features/pacientes/pacientes.schema";
import { usePagination } from "@/hooks/use-pagination";
import { getPeruDateString, shiftPeruDate } from "@/lib/utils";
import { generateAppointmentReminderWhatsAppUrl } from "@/lib/whatsapp-share";
import {
  APPOINTMENT_STATUSES,
  formatMinutesToTime,
  isValidTimeHHmm,
  parseTimeToMinutes,
  type AgendaAppointmentItem,
  type AgendaDoctorOption,
  type AgendaPatientOption,
  type AppointmentStatus,
} from "../agenda.schema";
import {
  createAppointmentAction,
  deleteAppointmentAction,
  patchAppointmentQuickAction,
  updateAppointmentAction,
} from "../actions/agenda.actions";

export type AgendaViewMode = "day" | "week" | "upcoming";

const pgUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const appointmentModalFormSchema = z
  .object({
    patientMode: z.enum(["existing", "new"]),
    patientId: z.string(),
    quickDocumentType: z.enum(DOCUMENT_TYPES),
    quickDocumentNumber: z.string().trim(),
    quickFirstName: z.string().trim(),
    quickLastName: z.string().trim(),
    quickBirthDate: z.string().trim(),
    quickPhone: z.string().trim(),
    quickInsuranceInfo: z.string().trim(),
    doctorId: z.string().trim().regex(pgUuidRegex, "Seleccione un especialista válido."),
    appointmentDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione una fecha válida."),
    appointmentTime: z
      .string()
      .trim()
      .refine(isValidTimeHHmm, "Ingrese una hora válida (HH:mm)."),
    durationMinutes: z.coerce
      .number({ error: "Duración inválida." })
      .int()
      .min(10, "Duración mínima: 10 minutos.")
      .max(240, "Duración máxima: 240 minutos."),
    appointmentType: z
      .string()
      .trim()
      .min(2, "Seleccione un tipo de atención válido.")
      .max(120),
    reason: z.string().trim().max(300),
    status: z.enum(APPOINTMENT_STATUSES),
    notes: z.string().trim().max(1000),
  })
  .superRefine((data, ctx) => {
    const start = parseTimeToMinutes(data.appointmentTime);
    if (start + data.durationMinutes > 24 * 60) {
      ctx.addIssue({
        code: "custom",
        path: ["durationMinutes"],
        message: "La cita no puede exceder las 24:00 del mismo día.",
      });
    }

    if (data.patientMode === "existing") {
      if (!pgUuidRegex.test(data.patientId.trim())) {
        ctx.addIssue({
          code: "custom",
          path: ["patientId"],
          message: "Seleccione una paciente registrada.",
        });
      }
      return;
    }

    const docNum = data.quickDocumentNumber.trim().toUpperCase();
    if (data.quickDocumentType === "DNI") {
      if (!/^\d{8}$/.test(docNum)) {
        ctx.addIssue({
          code: "custom",
          path: ["quickDocumentNumber"],
          message: "El DNI peruano debe tener exactamente 8 dígitos numéricos.",
        });
      }
    } else if (!/^[A-Z0-9]{6,12}$/.test(docNum)) {
      ctx.addIssue({
        code: "custom",
        path: ["quickDocumentNumber"],
        message: "El CE / Pasaporte debe tener 6 a 12 caracteres alfanuméricos.",
      });
    }

    if (data.quickLastName.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["quickLastName"],
        message: "Ingrese los apellidos (mínimo 2 letras).",
      });
    }
    if (data.quickFirstName.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["quickFirstName"],
        message: "Ingrese los nombres (mínimo 2 letras).",
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.quickBirthDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["quickBirthDate"],
        message: "Seleccione la fecha de nacimiento.",
      });
    }
    if (data.quickPhone.trim().length < 6) {
      ctx.addIssue({
        code: "custom",
        path: ["quickPhone"],
        message: "Ingrese un teléfono o celular válido (mínimo 6 dígitos).",
      });
    }
  });

export type AgendaModalFormValues = z.infer<typeof appointmentModalFormSchema>;

export interface UseAgendaParams {
  initialAppointments: AgendaAppointmentItem[];
  initialAppointmentTypes: CatalogCategoryItem[];
  doctors: AgendaDoctorOption[];
  initialPatients: AgendaPatientOption[];
  currentDoctorId: string;
}

export function useAgenda({
  initialAppointments,
  initialAppointmentTypes,
  doctors,
  initialPatients,
  currentDoctorId,
}: UseAgendaParams) {
  const searchParams = useSearchParams();
  const todayStr = useMemo(() => getPeruDateString(), []);

  const initialQueryPatientId = searchParams.get("patientId") ?? "";
  const initialShouldOpenNew =
    searchParams.get("new") === "1" &&
    initialPatients.some((p) => p.id === initialQueryPatientId);

  const defaultDoctorId = useMemo(() => {
    if (doctors.some((d) => d.id === currentDoctorId)) return currentDoctorId;
    return doctors[0]?.id ?? currentDoctorId;
  }, [doctors, currentDoctorId]);

  const [items, setItems] = useState<AgendaAppointmentItem[]>(initialAppointments);
  const [patients, setPatients] = useState<AgendaPatientOption[]>(initialPatients);

  const typeManager = useCatalogCategories({
    scope: "appointment_type",
    initialCategories: initialAppointmentTypes,
    onRenameSuccess: (oldName, newName) => {
      const oldClean = oldName.trim().toLowerCase();
      setItems((prev) =>
        prev.map((row) =>
          row.appointmentType.trim().toLowerCase() === oldClean
            ? { ...row, appointmentType: newName }
            : row
        )
      );
      const currentModalType = form.getValues("appointmentType");
      if (currentModalType.trim().toLowerCase() === oldClean) {
        form.setValue("appointmentType", newName);
      }
    },
  });

  const [viewMode, setViewModeState] = useState<AgendaViewMode>("day");
  const [selectedDate, setSelectedDateState] = useState<string>(todayStr);
  const [selectedDoctorId, setSelectedDoctorIdState] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatusState] = useState<string>("ALL");
  const [search, setSearchState] = useState("");

  const [dialogOpen, setDialogOpen] = useState<boolean>(initialShouldOpenNew);
  const [editingItem, setEditingItem] = useState<AgendaAppointmentItem | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  const [postSaveAppointment, setPostSaveAppointment] =
    useState<AgendaAppointmentItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AgendaAppointmentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const buildDefaults = (
    item?: AgendaAppointmentItem | null,
    preselectedPatientId?: string
  ): AgendaModalFormValues => {
    if (item) {
      return {
        patientMode: "existing",
        patientId: item.patientId,
        quickDocumentType: "DNI",
        quickDocumentNumber: "",
        quickFirstName: "",
        quickLastName: "",
        quickBirthDate: "1995-01-01",
        quickPhone: "",
        quickInsuranceInfo: "Particular",
        doctorId: item.doctorId || defaultDoctorId,
        appointmentDate: item.appointmentDate,
        appointmentTime: item.appointmentTime.slice(0, 5),
        durationMinutes: item.durationMinutes,
        appointmentType: item.appointmentType,
        reason: item.reason,
        status: item.status,
        notes: item.notes,
      };
    }

    return {
      patientMode: "existing",
      patientId: preselectedPatientId ?? "",
      quickDocumentType: "DNI",
      quickDocumentNumber: "",
      quickFirstName: "",
      quickLastName: "",
      quickBirthDate: "1996-01-01",
      quickPhone: "",
      quickInsuranceInfo: "Particular",
      doctorId: defaultDoctorId,
      appointmentDate: selectedDate || todayStr,
      appointmentTime: "10:00",
      durationMinutes: 30,
      appointmentType: preselectedPatientId
        ? typeManager.categoryNames.find((n) =>
            n.toLowerCase().includes("control ginecológico")
          ) ??
          typeManager.categoryNames[0] ??
          "Control Ginecológico Periódico"
        : typeManager.categoryNames.find((n) =>
            n.toLowerCase().includes("primera vez")
          ) ??
          typeManager.categoryNames[0] ??
          "Consulta Ginecológica (Primera Vez)",
      reason: "",
      status: "CONFIRMADA",
      notes: "Llegar con 10 minutos de anticipación.",
    };
  };

  const form = useForm<AgendaModalFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(appointmentModalFormSchema) as any,
    defaultValues: buildDefaults(
      null,
      initialShouldOpenNew ? initialQueryPatientId : ""
    ),
  });

  const watchedPatientMode = useWatch({
    control: form.control,
    name: "patientMode",
  });
  const watchedPatientId = useWatch({
    control: form.control,
    name: "patientId",
  });
  const watchedQuickDoc = useWatch({
    control: form.control,
    name: "quickDocumentNumber",
  });
  const watchedDoctorId = useWatch({
    control: form.control,
    name: "doctorId",
  });
  const watchedDate = useWatch({
    control: form.control,
    name: "appointmentDate",
  });

  const selectedPatientObj = useMemo(
    () => patients.find((p) => p.id === watchedPatientId) ?? null,
    [patients, watchedPatientId]
  );

  const matchingPatients = useMemo(() => {
    const q = patientSearchQuery.trim().toLowerCase();
    if (!q) return patients.slice(0, 8);
    const cleanQ = q.replace(/\s+/g, "");
    return patients
      .filter((p) => {
        const phoneClean = p.phone.replace(/\s+/g, "");
        return (
          p.fullName.toLowerCase().includes(q) ||
          p.documentNumber.toLowerCase().includes(q) ||
          phoneClean.includes(cleanQ)
        );
      })
      .slice(0, 12);
  }, [patients, patientSearchQuery]);

  const detectedExistingByQuickDoc = useMemo(() => {
    if (watchedPatientMode !== "new") return null;
    const clean = (watchedQuickDoc ?? "").trim().toUpperCase();
    if (clean.length < 6) return null;
    return patients.find((p) => p.documentNumber.toUpperCase() === clean) ?? null;
  }, [watchedPatientMode, watchedQuickDoc, patients]);

  const occupiedSlots = useMemo(() => {
    if (!watchedDoctorId || !watchedDate) return [];
    return items
      .filter(
        (appt) =>
          appt.doctorId === watchedDoctorId &&
          appt.appointmentDate === watchedDate &&
          appt.status !== "CANCELADA" &&
          appt.status !== "NO_ASISTIO" &&
          appt.id !== editingItem?.id
      )
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
      .map((appt) => {
        const start = parseTimeToMinutes(appt.appointmentTime);
        const end = start + appt.durationMinutes;
        return {
          id: appt.id,
          range: `${formatMinutesToTime(start)} – ${formatMinutesToTime(end)}`,
          patientName: appt.patientName,
        };
      });
  }, [items, watchedDoctorId, watchedDate, editingItem?.id]);

  // Base filtrada por rango de fecha y médico (para calcular contadores por estado)
  const rangeScopedItems = useMemo(() => {
    const weekEnd = shiftPeruDate(selectedDate, 6);

    return items.filter((appt) => {
      if (viewMode === "day") {
        if (appt.appointmentDate !== selectedDate) return false;
      } else if (viewMode === "week") {
        if (appt.appointmentDate < selectedDate || appt.appointmentDate > weekEnd) {
          return false;
        }
      } else {
        // upcoming: desde hoy en Perú en adelante
        if (appt.appointmentDate < todayStr) return false;
      }

      if (selectedDoctorId !== "ALL" && appt.doctorId !== selectedDoctorId) {
        return false;
      }

      return true;
    });
  }, [items, viewMode, selectedDate, todayStr, selectedDoctorId]);

  const statusCounts = useMemo(() => {
    const counts: Record<AppointmentStatus, number> = {
      PENDIENTE: 0,
      CONFIRMADA: 0,
      EN_ESPERA: 0,
      ATENDIDA: 0,
      CANCELADA: 0,
      NO_ASISTIO: 0,
    };
    for (const appt of rangeScopedItems) {
      counts[appt.status] = (counts[appt.status] ?? 0) + 1;
    }
    return {
      ALL: rangeScopedItems.length,
      ...counts,
    };
  }, [rangeScopedItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return [...rangeScopedItems]
      .filter((appt) => {
        if (selectedStatus !== "ALL" && appt.status !== selectedStatus) {
          return false;
        }
        if (!q) return true;
        return (
          appt.patientName.toLowerCase().includes(q) ||
          appt.patientDocumentNumber.toLowerCase().includes(q) ||
          appt.patientPhone.toLowerCase().includes(q) ||
          appt.reason.toLowerCase().includes(q) ||
          appt.doctorName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const byDate = a.appointmentDate.localeCompare(b.appointmentDate);
        if (byDate !== 0) return byDate;
        return a.appointmentTime.localeCompare(b.appointmentTime);
      });
  }, [rangeScopedItems, selectedStatus, search]);

  const pagination = usePagination(filteredItems);

  const setViewMode = (mode: AgendaViewMode) => {
    setViewModeState(mode);
    pagination.resetPage();
  };

  const setSelectedDate = (date: string) => {
    setSelectedDateState(date || todayStr);
    pagination.resetPage();
  };

  const shiftSelectedDate = (days: number) => {
    setSelectedDateState((prev) => shiftPeruDate(prev, days));
    pagination.resetPage();
  };

  const goToToday = () => {
    setSelectedDateState(todayStr);
    pagination.resetPage();
  };

  const setSelectedDoctorId = (doctorId: string) => {
    setSelectedDoctorIdState(doctorId);
    pagination.resetPage();
  };

  const setSelectedStatus = (status: string) => {
    setSelectedStatusState(status);
    pagination.resetPage();
  };

  const setSearch = (value: string) => {
    setSearchState(value);
    pagination.resetPage();
  };

  const openCreateModal = (preselectedPatientId?: string) => {
    setEditingItem(null);
    setPatientSearchQuery("");
    form.reset(buildDefaults(null, preselectedPatientId));
    setDialogOpen(true);
  };

  const openEditModal = (appt: AgendaAppointmentItem) => {
    setEditingItem(appt);
    setPatientSearchQuery("");
    form.reset(buildDefaults(appt));
    setDialogOpen(true);
  };

  const selectRegisteredPatient = (patient: AgendaPatientOption) => {
    form.setValue("patientMode", "existing", { shouldValidate: true });
    form.setValue("patientId", patient.id, { shouldValidate: true });
    setPatientSearchQuery("");
    const currentType = form.getValues("appointmentType");
    if (currentType.toLowerCase().includes("primera vez")) {
      const followUpType = typeManager.categoryNames.find((n) =>
        n.toLowerCase().includes("control ginecológico")
      );
      if (followUpType) {
        form.setValue("appointmentType", followUpType);
      }
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (editingItem) {
      const res = await updateAppointmentAction({
        id: editingItem.id,
        patientId: values.patientId,
        doctorId: values.doctorId,
        appointmentDate: values.appointmentDate,
        appointmentTime: values.appointmentTime,
        durationMinutes: values.durationMinutes,
        appointmentType: values.appointmentType,
        reason: values.reason,
        status: values.status as AppointmentStatus,
        notes: values.notes,
        reminderSent: editingItem.reminderSent,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar la cita médica.");
        return;
      }

      const saved = res.data;
      const nextItems = items.map((row) => (row.id === saved.id ? saved : row));
      setItems(nextItems);
      typeManager.syncUsageCounts(nextItems.map((i) => i.appointmentType));
      setDialogOpen(false);
      setEditingItem(null);
      setPostSaveAppointment(saved);
      toast.success(`Cita de ${saved.patientName} actualizada.`);
      return;
    }

    const payload =
      values.patientMode === "new"
        ? {
            quickPatient: {
              documentType: values.quickDocumentType,
              documentNumber: values.quickDocumentNumber,
              firstName: values.quickFirstName,
              lastName: values.quickLastName,
              birthDate: values.quickBirthDate,
              phone: values.quickPhone,
              insuranceInfo: values.quickInsuranceInfo || "Particular",
            },
            doctorId: values.doctorId,
            appointmentDate: values.appointmentDate,
            appointmentTime: values.appointmentTime,
            durationMinutes: values.durationMinutes,
            appointmentType: values.appointmentType,
            reason: values.reason,
            status: values.status as AppointmentStatus,
            notes: values.notes,
          }
        : {
            patientId: values.patientId,
            doctorId: values.doctorId,
            appointmentDate: values.appointmentDate,
            appointmentTime: values.appointmentTime,
            durationMinutes: values.durationMinutes,
            appointmentType: values.appointmentType,
            reason: values.reason,
            status: values.status as AppointmentStatus,
            notes: values.notes,
          };

    const res = await createAppointmentAction(payload);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo agendar la cita médica.");
      return;
    }

    const { appointment: saved, createdPatient } = res.data;
    const nextItems = [...items, saved];
    setItems(nextItems);
    typeManager.syncUsageCounts(nextItems.map((i) => i.appointmentType));
    if (createdPatient) {
      setPatients((prev) =>
        [...prev, createdPatient].sort((a, b) =>
          a.fullName.localeCompare(b.fullName, "es")
        )
      );
    }
    setSelectedDateState(saved.appointmentDate);
    setDialogOpen(false);
    setPostSaveAppointment(saved);
    toast.success(`Cita agendada para ${saved.patientName}.`);
  });

  const handleQuickStatusChange = async (
    appt: AgendaAppointmentItem,
    nextStatus: AppointmentStatus
  ) => {
    if (appt.status === nextStatus) return;
    setUpdatingStatusId(appt.id);
    const res = await patchAppointmentQuickAction({
      id: appt.id,
      status: nextStatus,
    });
    setUpdatingStatusId(null);

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo cambiar el estado de la cita.");
      return;
    }

    setItems((prev) =>
      prev.map((row) => (row.id === appt.id ? res.data! : row))
    );
    toast.success("Estado de cita actualizado.");
  };

  const getDoctorClinicInfo = (doctorId: string | null) => {
    const doc = doctors.find((d) => d.id === doctorId) ?? doctors[0];
    return doc
      ? { clinicAddress: doc.clinicAddress, phone: doc.phone }
      : undefined;
  };

  const handleSendWhatsAppReminder = async (
    appt: AgendaAppointmentItem,
    canEdit: boolean
  ) => {
    const url = generateAppointmentReminderWhatsAppUrl(
      {
        id: appt.id,
        patientName: appt.patientName,
        patientDocument: `${appt.patientDocumentType} ${appt.patientDocumentNumber}`,
        patientPhone: appt.patientPhone,
        doctorName: appt.doctorName,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        durationMinutes: appt.durationMinutes,
        appointmentType: appt.appointmentType,
        reason: appt.reason,
        notes: appt.notes,
      },
      getDoctorClinicInfo(appt.doctorId)
    );

    window.open(url, "_blank", "noopener,noreferrer");

    if (canEdit && !appt.reminderSent) {
      const res = await patchAppointmentQuickAction({
        id: appt.id,
        reminderSent: true,
      });
      if (res.success && res.data) {
        setItems((prev) =>
          prev.map((row) => (row.id === appt.id ? res.data! : row))
        );
      }
    }
  };

  const requestDelete = (appt: AgendaAppointmentItem) => {
    setDeleteTarget(appt);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    const res = await deleteAppointmentAction({ id: target.id });
    setDeletingId(null);

    if (!res.success) {
      toast.error(res.error || "No se pudo archivar la cita.");
      return;
    }

    const nextItems = items.filter((row) => row.id !== target.id);
    setItems(nextItems);
    typeManager.syncUsageCounts(nextItems.map((i) => i.appointmentType));
    setDeleteTarget(null);
    toast.success(`Cita de ${target.patientName} archivada.`);
  };

  return {
    todayStr,
    items: pagination.paginatedItems,
    filteredCount: filteredItems.length,
    statusCounts,
    pagination,
    doctors,
    patients,
    appointmentTypes: typeManager.categoryNames,
    typeManager,
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    shiftSelectedDate,
    goToToday,
    selectedDoctorId,
    setSelectedDoctorId,
    selectedStatus,
    setSelectedStatus,
    search,
    setSearch,
    // Modal state
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    isSubmitting: form.formState.isSubmitting,
    watchedPatientMode,
    selectedPatientObj,
    patientSearchQuery,
    setPatientSearchQuery,
    matchingPatients,
    detectedExistingByQuickDoc,
    occupiedSlots,
    openCreateModal,
    openEditModal,
    selectRegisteredPatient,
    onSubmit,
    // Row actions & dialogs
    updatingStatusId,
    handleQuickStatusChange,
    handleSendWhatsAppReminder,
    getDoctorClinicInfo,
    postSaveAppointment,
    setPostSaveAppointment,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    requestDelete,
    confirmDelete,
  };
}
