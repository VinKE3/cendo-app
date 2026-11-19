"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Eye,
  Pencil,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { TablePagination } from "@/components/common/TablePagination";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  usePacientes,
  type CoverageFilter,
  type PatientSortBy,
} from "@/features/pacientes/hooks/use-pacientes";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { resolveInsurance } from "@/lib/clinical/catalogs";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
import { PatientModal } from "./PatientModal";

interface PatientsDirectoryViewProps {
  initialItems: PatientDirectoryItem[];
  canEdit: boolean;
  canDelete: boolean;
}

function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim()[0] ?? "";
  const l = lastName.trim()[0] ?? "";
  return `${f}${l}`.toUpperCase() || "PC";
}

function hasAlertAllergy(allergies?: string | null): boolean {
  if (!allergies) return false;
  const clean = allergies.trim().toLowerCase();
  return clean !== "" && !clean.startsWith("niega") && clean !== "ninguna" && clean !== "no refiere";
}

export function PatientsDirectoryView({
  initialItems,
  canEdit,
  canDelete,
}: PatientsDirectoryViewProps) {
  const {
    items,
    filteredCount,
    totalCount,
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
    isSubmitting,
    openCreateModal,
    openEditModal,
    submitWithRedirect,
    onSubmit,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    requestDelete,
    confirmDelete,
  } = usePacientes(initialItems);

  const filterPills: Array<{ id: CoverageFilter; label: string; count: number }> = [
    { id: "ALL", label: "Todas", count: stats.total },
    { id: "PARTICULAR", label: "Particular", count: stats.particularCount },
    { id: "INSURED", label: "Seguro / EPS", count: stats.insuredCount },
    { id: "ALLERGIES", label: "Con Alergias", count: stats.allergiesCount },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera compacta estilo Linear / Supabase */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              DIRECTORIO CLÍNICO • {totalCount} PACIENTES ACTIVAS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pacientes e Historias Clínicas
          </h1>
        </div>

        {canEdit ? (
          <Button type="button" onClick={openCreateModal}>
            <Plus className="size-4" />
            Registrar Paciente
          </Button>
        ) : null}
      </div>

      {/* Barra de búsqueda + filtros + orden */}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por DNI, apellidos, teléfono o distrito..."
              className="bg-card pl-9"
            />
          </div>

          <select
            aria-label="Ordenar directorio"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as PatientSortBy)}
            className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="recent">Más recientes</option>
            <option value="alpha">Alfabético (A-Z)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filterPills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setCoverageFilter(pill.id)}
              className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                coverageFilter === pill.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {pill.label}{" "}
              <span className="ml-0.5 font-mono text-[10px] opacity-80">
                ({pill.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Densa de Pacientes */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Documento</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="w-28">Edad / F. Nac.</TableHead>
              <TableHead className="w-48">Contacto</TableHead>
              <TableHead className="w-44">Cobertura / FO</TableHead>
              <TableHead className="w-36">Próxima Cita</TableHead>
              <TableHead className="w-36 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((patient) => {
                const insurance = resolveInsurance(patient.insuranceInfo);
                const allergyAlert = hasAlertAllergy(patient.medicalAllergies);

                return (
                  <TableRow key={patient.id} className="group">
                    <TableCell className="align-middle">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {patient.documentNumber}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {patient.documentType}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs whitespace-normal align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-mono text-xs font-bold text-primary">
                          {getInitials(patient.firstName, patient.lastName)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/pacientes/${patient.id}`}
                            className="block truncate font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {patient.fullName}
                          </Link>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {patient.district}
                            {patient.occupation ? ` • ${patient.occupation}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="flex flex-col font-mono tabular-nums">
                        <span className="text-xs font-semibold text-foreground">
                          {patient.age} años
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatPeruDateDisplay(patient.birthDate)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-48 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-foreground">
                          <Phone className="size-3 text-muted-foreground" />
                          {patient.phone || "—"}
                        </span>
                        {patient.email ? (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {patient.email}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          <Shield className="size-2.5" />
                          {insurance.shortLabel ?? insurance.label}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {patient.obstetricFormula}
                        </Badge>
                        {allergyAlert ? (
                          <Badge
                            variant="destructive"
                            title={`Alergias: ${patient.medicalAllergies}`}
                            className="text-[10px]"
                          >
                            <AlertTriangle className="size-2.5" />
                            Alergia
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      {patient.nextAppointmentDate ? (
                        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-foreground">
                          <Calendar className="size-3 text-primary" />
                          <span>
                            {formatPeruDateDisplay(patient.nextAppointmentDate)}
                            {patient.nextAppointmentTime
                              ? ` ${patient.nextAppointmentTime.slice(0, 5)}`
                              : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {patient.consultationsCount > 0
                            ? `${patient.consultationsCount} consulta(s)`
                            : "Sin citas"}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Link href={`/pacientes/${patient.id}`}>
                          <Button type="button" variant="outline" size="xs">
                            <Eye className="size-3" />
                            Historia
                          </Button>
                        </Link>
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEditModal(patient)}
                            aria-label={`Editar ${patient.fullName}`}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={deletingId === patient.id}
                            onClick={() => requestDelete(patient)}
                            aria-label={`Eliminar ${patient.fullName}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {filteredCount === 0 && totalCount > 0
                    ? "No hay pacientes que coincidan con la búsqueda o filtro aplicado."
                    : "Aún no hay pacientes registradas en esta sede."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        onPageChange={pagination.setCurrentPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="pacientes"
      />

      <PatientModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        form={form}
        computedAge={computedAge}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onSubmitIntent={submitWithRedirect}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar Historia Clínica</DialogTitle>
            <DialogDescription>
              ¿Confirma archivar el registro de{" "}
              <strong className="text-foreground">{deleteTarget?.fullName}</strong> (
              <span className="font-mono">
                {deleteTarget?.documentType} {deleteTarget?.documentNumber}
              </span>
              )? La acción quedará auditada y la historia dejará de mostrarse en el
              directorio activo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? "Archivando..." : "Confirmar Archivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
