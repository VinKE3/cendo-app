"use client";

import type { BaseSyntheticEvent } from "react";
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
  PatientDirectoryItem,
  PatientInput,
} from "@/features/pacientes/pacientes.schema";
import {
  CIVIL_STATUS_CATALOG,
  DOCUMENT_TYPE_OPTIONS,
  EDUCATION_LEVEL_CATALOG,
  INSURANCE_CATALOG,
  LIMA_DISTRICTS,
} from "@/lib/clinical/catalogs";

interface PatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: PatientDirectoryItem | null;
  form: UseFormReturn<PatientInput>;
  computedAge: number;
  isSubmitting: boolean;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  onSubmitIntent?: (redirectToHistory: boolean) => void;
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function PatientModal({
  open,
  onOpenChange,
  editingItem,
  form,
  computedAge,
  isSubmitting,
  onSubmit,
  onSubmitIntent,
}: PatientModalProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const docType = watch("documentType");
  const currentDistrict = watch("district");
  const currentCivilStatus = watch("civilStatus");
  const currentEducation = watch("educationLevel");
  const currentInsurance = watch("insuranceInfo");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Editar Filiación de Paciente" : "Registrar Nueva Paciente"}
          </DialogTitle>
          <DialogDescription>
            Datos de filiación e identificación clínica en sede Miraflores. La edad y el
            nombre completo se normalizan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form id="patient-form" onSubmit={onSubmit} className="space-y-4">
          {/* Bloque 1: Identificación */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="patient-doc-type" className="block text-xs font-medium">
                Tipo de Documento
              </label>
              <select
                id="patient-doc-type"
                className={selectClassName}
                {...register("documentType")}
              >
                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.documentType ? (
                <p className="text-xs text-destructive">{errors.documentType.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="patient-doc-number" className="block text-xs font-medium">
                N° Documento <span className="text-destructive">*</span>
              </label>
              <Input
                id="patient-doc-number"
                placeholder={docType === "DNI" ? "72961954" : "001234567"}
                maxLength={docType === "DNI" ? 8 : 20}
                className="font-mono uppercase"
                aria-invalid={Boolean(errors.documentNumber)}
                {...register("documentNumber")}
              />
              {errors.documentNumber ? (
                <p className="text-xs text-destructive">{errors.documentNumber.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="patient-birthdate" className="block text-xs font-medium">
                  Fecha de Nacimiento <span className="text-destructive">*</span>
                </label>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  {computedAge} años
                </span>
              </div>
              <Input
                id="patient-birthdate"
                type="date"
                className="font-mono"
                aria-invalid={Boolean(errors.birthDate)}
                {...register("birthDate")}
              />
              {errors.birthDate ? (
                <p className="text-xs text-destructive">{errors.birthDate.message}</p>
              ) : null}
            </div>
          </div>

          {/* Bloque 2: Nombres y Apellidos */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="patient-lastname" className="block text-xs font-medium">
                Apellidos <span className="text-destructive">*</span>
              </label>
              <Input
                id="patient-lastname"
                placeholder="Ej. MENDOZA CHÁVEZ"
                className="uppercase"
                aria-invalid={Boolean(errors.lastName)}
                {...register("lastName")}
              />
              {errors.lastName ? (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="patient-firstname" className="block text-xs font-medium">
                Nombres <span className="text-destructive">*</span>
              </label>
              <Input
                id="patient-firstname"
                placeholder="Ej. FIORELLA BEATRÍZ"
                className="uppercase"
                aria-invalid={Boolean(errors.firstName)}
                {...register("firstName")}
              />
              {errors.firstName ? (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              ) : null}
            </div>
          </div>

          {/* Bloque 3: Contacto y Cobertura */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="patient-phone" className="block text-xs font-medium">
                Teléfono / WhatsApp <span className="text-destructive">*</span>
              </label>
              <Input
                id="patient-phone"
                placeholder="987 654 321"
                className="font-mono"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
              {errors.phone ? (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="patient-email" className="block text-xs font-medium">
                Correo Electrónico
              </label>
              <Input
                id="patient-email"
                type="email"
                placeholder="paciente@correo.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="patient-insurance" className="block text-xs font-medium">
                Seguro / Cobertura
              </label>
              <select
                id="patient-insurance"
                className={selectClassName}
                {...register("insuranceInfo")}
              >
                {currentInsurance &&
                !INSURANCE_CATALOG.some((ins) => ins.label === currentInsurance) ? (
                  <option value={currentInsurance}>{currentInsurance}</option>
                ) : null}
                {INSURANCE_CATALOG.map((ins) => (
                  <option key={ins.id} value={ins.label}>
                    {ins.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bloque 4: Ubicación */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="patient-district" className="block text-xs font-medium">
                Distrito
              </label>
              <select
                id="patient-district"
                className={selectClassName}
                {...register("district")}
              >
                {currentDistrict &&
                !(LIMA_DISTRICTS as readonly string[]).includes(currentDistrict) ? (
                  <option value={currentDistrict}>{currentDistrict}</option>
                ) : null}
                {LIMA_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="patient-address" className="block text-xs font-medium">
                Dirección Domiciliaria
              </label>
              <Input
                id="patient-address"
                placeholder="Av. Alfredo Benavides 2975, Dpto 402"
                {...register("address")}
              />
            </div>
          </div>

          {/* Bloque 5: Filiación Socio-Demográfica (MINSA / CLAP) */}
          <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="patient-civil-status" className="block text-xs font-medium">
                Estado Civil
              </label>
              <select
                id="patient-civil-status"
                className={selectClassName}
                {...register("civilStatus")}
              >
                {currentCivilStatus &&
                !CIVIL_STATUS_CATALOG.some((cs) => cs.label === currentCivilStatus) ? (
                  <option value={currentCivilStatus}>{currentCivilStatus}</option>
                ) : null}
                {CIVIL_STATUS_CATALOG.map((cs) => (
                  <option key={cs.id} value={cs.label}>
                    {cs.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="patient-education" className="block text-xs font-medium">
                Grado de Instrucción
              </label>
              <select
                id="patient-education"
                className={selectClassName}
                {...register("educationLevel")}
              >
                {currentEducation &&
                !EDUCATION_LEVEL_CATALOG.some((ed) => ed.label === currentEducation) ? (
                  <option value={currentEducation}>{currentEducation}</option>
                ) : null}
                {EDUCATION_LEVEL_CATALOG.map((ed) => (
                  <option key={ed.id} value={ed.label}>
                    {ed.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="patient-occupation" className="block text-xs font-medium">
                Ocupación
              </label>
              <Input
                id="patient-occupation"
                placeholder="Ej. Arquitecta / Docente"
                {...register("occupation")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="patient-birthplace" className="block text-xs font-medium">
                Lugar de Nacimiento
              </label>
              <Input
                id="patient-birthplace"
                placeholder="Lima, Perú"
                {...register("birthPlace")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="patient-religion" className="block text-xs font-medium">
                Religión
              </label>
              <Input
                id="patient-religion"
                placeholder="Católica"
                {...register("religion")}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            {!editingItem && onSubmitIntent ? (
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => onSubmitIntent(true)}
              >
                {isSubmitting ? "Guardando..." : "Guardar y Abrir Historia"}
              </Button>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => onSubmitIntent?.(false)}
            >
              {isSubmitting
                ? "Guardando..."
                : editingItem
                  ? "Guardar Cambios"
                  : "Registrar Paciente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
