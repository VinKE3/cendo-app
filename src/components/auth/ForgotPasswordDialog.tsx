"use client";

import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForgotPassword } from "@/features/auth/hooks/use-forgot-password";

export function ForgotPasswordDialog() {
  const { open, setOpen, form, onSubmit } = useForgotPassword();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="cursor-pointer text-xs font-medium text-primary hover:underline"
          />
        }
      >
        ¿Olvidó su clave?
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperación de Contraseña</DialogTitle>
          <DialogDescription>
            Protocolo de Seguridad Médica (Ley N° 29733 y normativa SUSALUD).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          Por confidencialidad clínica, el restablecimiento de claves es autorizado
          exclusivamente por la{" "}
          <span className="font-semibold text-foreground">
            Dirección Médica de CENDO (Dr. Patrick Jacinto)
          </span>
          . Ingrese su correo institucional para enviar la solicitud directa.
        </div>

        <form id="forgot-password-form" onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="forgot-email"
              className="block text-xs font-medium text-foreground"
            >
              Correo Electrónico Institucional
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                placeholder="medico@cendo.pe"
                className="pl-8 font-mono text-sm"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </div>
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="items-center sm:justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            Canal verificado
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="forgot-password-form">
              <MessageCircle className="size-4" />
              Solicitar por WhatsApp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
