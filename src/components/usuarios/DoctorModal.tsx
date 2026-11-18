"use client";

import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  ClinicalRole,
  CreateDoctorInput,
  DoctorListItem,
  DoctorTitle,
  UpdateDoctorInput,
} from "@/features/usuarios/usuarios.schema";

interface DoctorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDoctor: DoctorListItem | null;
  createForm: UseFormReturn<CreateDoctorInput>;
  editForm: UseFormReturn<UpdateDoctorInput>;
  doctorTitles: readonly DoctorTitle[];
  clinicalRoles: readonly ClinicalRole[];
  specialties: string[];
  isSubmitting: boolean;
  onCreateSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onEditSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

const ROLE_LABELS: Record<ClinicalRole, string> = {
  director: "Director Médico (Admin)",
  doctor: "Médico Especialista",
  assistant: "Asistente / Admisión",
};

export function DoctorModal({
  open,
  onOpenChange,
  editingDoctor,
  createForm,
  editForm,
  doctorTitles,
  clinicalRoles,
  specialties,
  isSubmitting,
  onCreateSubmit,
  onEditSubmit,
}: DoctorModalProps) {
  const isEditing = Boolean(editingDoctor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Editar Especialista / Credenciales"
              : "Registrar Nuevo Especialista CENDO"}
          </DialogTitle>
          <DialogDescription>
            Las credenciales CMP y RNE se incrustan dinámicamente en recetas e informes A4.
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <form id="doctor-edit-form" onSubmit={onEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Título</label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  {...editForm.register("doctorTitle")}
                >
                  {doctorTitles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="block text-xs font-medium">Nombre Completo</label>
                <Input {...editForm.register("fullName")} />
                {editForm.formState.errors.fullName ? (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.fullName.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">CMP</label>
                <Input className="font-mono" {...editForm.register("cmp")} />
                {editForm.formState.errors.cmp ? (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.cmp.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">RNE</label>
                <Input className="font-mono" {...editForm.register("rne")} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Rol Institucional</label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  {...editForm.register("clinicalRole")}
                >
                  {clinicalRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium">Especialidad</label>
              <Input list="cendo-specialties" {...editForm.register("specialty")} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Correo Institucional</label>
                <Input
                  type="email"
                  className="font-mono"
                  {...editForm.register("email")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">
                  Nueva Contraseña (opcional)
                </label>
                <Input
                  type="password"
                  placeholder="Dejar vacío para mantener actual"
                  {...editForm.register("newPassword")}
                />
                {editForm.formState.errors.newPassword ? (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.newPassword.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Teléfono</label>
                <Input className="font-mono" {...editForm.register("phone")} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs select-none">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border accent-primary"
                    {...editForm.register("isActive")}
                  />
                  Cuenta habilitada para iniciar sesión
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium">Sede / Dirección</label>
              <Input {...editForm.register("clinicAddress")} />
            </div>
          </form>
        ) : (
          <form id="doctor-create-form" onSubmit={onCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Título</label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  {...createForm.register("doctorTitle")}
                >
                  {doctorTitles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="block text-xs font-medium">Nombre Completo</label>
                <Input {...createForm.register("fullName")} />
                {createForm.formState.errors.fullName ? (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.fullName.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">CMP</label>
                <Input className="font-mono" {...createForm.register("cmp")} />
                {createForm.formState.errors.cmp ? (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.cmp.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">RNE</label>
                <Input className="font-mono" {...createForm.register("rne")} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Rol Institucional</label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  {...createForm.register("clinicalRole")}
                >
                  {clinicalRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium">Especialidad</label>
              <Input list="cendo-specialties" {...createForm.register("specialty")} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Correo Institucional</label>
                <Input
                  type="email"
                  className="font-mono"
                  {...createForm.register("email")}
                />
                {createForm.formState.errors.email ? (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Contraseña Inicial</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  {...createForm.register("password")}
                />
                {createForm.formState.errors.password ? (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Teléfono</label>
                <Input className="font-mono" {...createForm.register("phone")} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">Sede / Dirección</label>
                <Input {...createForm.register("clinicAddress")} />
              </div>
            </div>
          </form>
        )}

        <datalist id="cendo-specialties">
          {specialties.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={isEditing ? "doctor-edit-form" : "doctor-create-form"}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Guardando..."
              : isEditing
                ? "Guardar Cambios"
                : "Crear Cuenta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
