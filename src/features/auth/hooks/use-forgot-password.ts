"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "../auth.schema";

const MEDICAL_DIRECTOR_WHATSAPP = "51985945697";

export function useForgotPassword() {
  const [open, setOpen] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset();
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    const messageText = [
      "Hola Dr. Patrick, he olvidado mi contraseña de acceso al Portal Médico CENDO.",
      "",
      `Mi correo institucional es: ${values.email}`,
      "",
      "¿Podría por favor restablecer mi clave desde su panel de Dirección Médica? Muchas gracias.",
    ].join("\n");

    const whatsappUrl = `https://wa.me/${MEDICAL_DIRECTOR_WHATSAPP}?text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    toast.success("Solicitud preparada para Dirección Médica CENDO.");
    handleOpenChange(false);
  });

  return {
    open,
    setOpen: handleOpenChange,
    form,
    onSubmit,
  };
}
