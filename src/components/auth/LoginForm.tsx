"use client";

import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const { form, showPassword, toggleShowPassword, isSubmitting, onSubmit } =
    useLoginForm(redirectTo);
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="size-3.5 text-primary" />
          Portal Asistencial Autorizado
        </div>
        <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Acceso a Profesionales de la Salud
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ingrese con sus credenciales médicas individuales para acceder a las historias
          clínicas, emisión de recetas y firma de informes diagnósticos.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs font-semibold tracking-wider text-foreground uppercase"
          >
            Correo Electrónico Institucional
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="ej. pjacinto@cendo.pe"
              className="h-11 rounded-xl bg-card pr-4 pl-10 text-sm"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <ShieldAlert className="size-3.5 shrink-0" />
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-semibold tracking-wider text-foreground uppercase"
            >
              Contraseña de Acceso
            </label>
            <ForgotPasswordDialog />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 rounded-xl bg-card pr-11 pl-10 text-sm"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <ShieldAlert className="size-3.5 shrink-0" />
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-center gap-2 pt-1 select-none">
          <input
            type="checkbox"
            className="size-4 rounded border-border accent-primary"
            {...register("rememberMe")}
          />
          <span className="text-xs text-muted-foreground">
            Recordar mi sesión en este equipo de consulta
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          className="mt-2 h-11 w-full gap-2 rounded-xl text-sm font-bold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span>Verificando Credenciales...</span>
          ) : (
            <>
              <KeyRound className="size-4 text-warning" />
              <span>Ingresar al Sistema Asistencial CENDO</span>
              <ArrowRight className="size-4 text-primary-foreground/80" />
            </>
          )}
        </Button>
      </form>

      <div className="space-y-1.5 rounded-xl border border-border bg-muted/70 p-3.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-foreground uppercase">
          <Building2 className="size-3.5 text-primary" />
          Gestión Centralizada de Accesos
        </div>
        <p className="text-[11px] leading-relaxed">
          Las cuentas médicas y permisos de atención son creados y administrados por la{" "}
          <span className="font-semibold text-foreground">
            Dirección Médica (Dr. Patrick Jacinto)
          </span>
          . Si requiere un nuevo acceso o cambio de clave, contáctese con administración.
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-success/25 bg-success/5 p-3 text-[11px] text-foreground">
        <ShieldCheck className="size-5 shrink-0 text-success" />
        <span>
          Cumplimiento estricto de la <span className="font-semibold">Ley N° 29733</span>{" "}
          (Protección de Datos Personales en Salud en el Perú) y normativa{" "}
          <span className="font-semibold">SUSALUD</span>.
        </span>
      </div>
    </div>
  );
}
