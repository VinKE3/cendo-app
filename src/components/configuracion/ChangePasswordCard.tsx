"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/features/configuracion/configuracion.schema";
import { cn } from "@/lib/utils";

export function ChangePasswordCard() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const watched = useWatch({ control: form.control });
  const newPwd = watched.newPassword ?? "";
  const confirmPwd = watched.confirmPassword ?? "";

  const rules = [
    { label: "8+ caracteres", ok: newPwd.length >= 8 },
    { label: "1 mayúscula", ok: /[A-Z]/.test(newPwd) },
    { label: "1 minúscula", ok: /[a-z]/.test(newPwd) },
    { label: "1 número", ok: /\d/.test(newPwd) },
    {
      label: "Coinciden",
      ok: newPwd.length > 0 && confirmPwd.length > 0 && newPwd === confirmPwd,
    },
  ];

  const onSubmit = async (values: ChangePasswordInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/configuracion/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !json.success) {
        const message = json.error || "No se pudo actualizar la contraseña.";
        if (message.toLowerCase().includes("actual")) {
          form.setError("currentPassword", { message });
        }
        toast.error(message);
        return;
      }

      form.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      toast.success("Contraseña actualizada correctamente.");
    } catch {
      toast.error("Error de red al actualizar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-primary" />
          Seguridad & Cambio de Contraseña
        </CardTitle>
        <CardDescription>
          Actualice su clave de acceso personal en cualquier momento. Cada cambio
          queda registrado en auditoría clínica.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="currentPassword"
              className="block text-xs font-semibold text-foreground"
            >
              Contraseña Actual
            </label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Ingrese su contraseña actual"
                className="pr-10"
                disabled={isSubmitting}
                {...form.register("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={
                  showCurrent
                    ? "Ocultar contraseña actual"
                    : "Mostrar contraseña actual"
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {form.formState.errors.currentPassword ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.currentPassword.message}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="block text-xs font-semibold text-foreground"
              >
                Nueva Contraseña
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                  disabled={isSubmitting}
                  {...form.register("newPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  aria-label={
                    showNew
                      ? "Ocultar nueva contraseña"
                      : "Mostrar nueva contraseña"
                  }
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.newPassword ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.newPassword.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-foreground"
              >
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repita la nueva contraseña"
                  className="pr-10"
                  disabled={isSubmitting}
                  {...form.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={
                    showConfirm
                      ? "Ocultar confirmación"
                      : "Mostrar confirmación"
                  }
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.confirmPassword ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/25 p-2.5">
            {rules.map((rule) => (
              <span
                key={rule.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium transition-colors",
                  rule.ok
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                <Check className="size-3" />
                {rule.label}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              Cifrado PBKDF2-SHA256 con salt único
            </span>

            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Actualizar Contraseña
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
