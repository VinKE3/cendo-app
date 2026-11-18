"use client";

import { Pencil, Plus, Search, Trash2, UserCheck } from "lucide-react";
import { TablePagination } from "@/components/common/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUsuarios } from "@/features/usuarios/hooks/use-usuarios";
import type { DoctorListItem } from "@/features/usuarios/usuarios.schema";
import { cn } from "@/lib/utils";
import { DoctorModal } from "./DoctorModal";

interface UsuariosViewProps {
  initialDoctors: DoctorListItem[];
  currentUserId: string;
}

export function UsuariosView({ initialDoctors, currentUserId }: UsuariosViewProps) {
  const {
    doctors,
    totalCount,
    pagination,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    editingDoctor,
    createForm,
    editForm,
    isSubmitting,
    deletingId,
    doctorTitles,
    clinicalRoles,
    specialties,
    openCreateModal,
    openEditModal,
    onCreateSubmit,
    onEditSubmit,
    handleDelete,
  } = useUsuarios(initialDoctors, currentUserId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              EQUIPO MÉDICO • {totalCount} CUENTAS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Directorio Médico, Roles y Accesos
          </h1>
        </div>

        <Button type="button" onClick={openCreateModal}>
          <Plus className="size-4" />
          Nuevo Especialista
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar médico, correo o CMP..."
          className="bg-card pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Especialista</TableHead>
              <TableHead>Credenciales</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.length > 0 ? (
              doctors.map((doc) => {
                const isDirector = doc.clinicalRole === "director";
                const isSelf = doc.id === currentUserId;

                return (
                  <TableRow key={doc.id}>
                    <TableCell className="whitespace-normal">
                      <p className="font-semibold text-foreground">
                        {doc.doctorTitle} {doc.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {doc.email} • {doc.phone}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <p className="font-semibold text-foreground">CMP {doc.cmp}</p>
                      <p className="text-muted-foreground">
                        {doc.rne ? `RNE ${doc.rne}` : "Sin RNE"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isDirector ? "default" : "secondary"}
                        className="font-mono text-[10px] uppercase"
                      >
                        {doc.clinicalRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px]",
                          doc.isActive
                            ? "border-success/40 bg-success/10 text-success"
                            : "text-muted-foreground"
                        )}
                      >
                        {doc.isActive ? "ACTIVO" : "INACTIVO"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditModal(doc)}
                          aria-label={`Editar ${doc.fullName}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {!isDirector && !isSelf ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={deletingId === doc.id}
                            onClick={() => handleDelete(doc.id)}
                            aria-label={`Eliminar ${doc.fullName}`}
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
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No hay especialistas que coincidan con la búsqueda.
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
        itemLabel="especialistas"
      />

      <DoctorModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingDoctor={editingDoctor}
        createForm={createForm}
        editForm={editForm}
        doctorTitles={doctorTitles}
        clinicalRoles={clinicalRoles}
        specialties={specialties}
        isSubmitting={isSubmitting}
        onCreateSubmit={onCreateSubmit}
        onEditSubmit={onEditSubmit}
      />
    </div>
  );
}
