"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "../auth.schema";
import { loginAction } from "../actions/auth.actions";

function resolveSafeRedirect(redirectTo?: string): string {
  if (!redirectTo) return "/dashboard";
  const trimmed = redirectTo.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/dashboard";
  }
  return trimmed;
}

export function useLoginForm(redirectTo?: string) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await loginAction(values);

    if (!result.success) {
      toast.error(result.error || "Error al iniciar sesión.");
      return;
    }

    toast.success(`Bienvenido(a), ${result.data.fullName}`);
    router.push(resolveSafeRedirect(redirectTo));
    router.refresh();
  });

  return {
    form,
    showPassword,
    toggleShowPassword: () => setShowPassword((prev) => !prev),
    isSubmitting: form.formState.isSubmitting,
    onSubmit,
  };
}
