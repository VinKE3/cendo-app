"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Eye,
  FileImage,
  Loader2,
  PenLine,
  PenTool,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CendoSignatureBlock } from "@/components/export/CendoSignatureBlock";
import { useSignatureSettings } from "@/components/providers/SignatureSettingsProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DOCTOR_TITLE_OPTIONS,
  MAX_SIGNATURE_FILE_BYTES,
  updateDoctorConfigSchema,
  type DoctorConfigProfile,
  type UpdateDoctorConfigInput,
} from "@/features/configuracion/configuracion.schema";
import { cn } from "@/lib/utils";
import { SignaturePadCanvas } from "./SignaturePadCanvas";

interface ConfiguracionViewProps {
  initialProfile: DoctorConfigProfile;
}

const VALID_BROWSER_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

/**
 * Convierte una imagen cargada por el usuario (foto o escaneo sobre papel blanco)
 * en un PNG con fondo transparente y recorte ajustado al trazo.
 */
async function cleanWhiteBackgroundToPngBlob(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo decodificar la imagen."));
      el.src = objectUrl;
    });

    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("El navegador no soporta procesamiento Canvas 2D.");
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const { data } = imgData;

    let minX = targetW;
    let minY = targetH;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const idx = (y * targetW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);

        let nextAlpha = a;
        if (lum >= 235 && chroma <= 22) {
          nextAlpha = 0;
        } else if (lum >= 195 && chroma <= 36) {
          const factor = Math.max(0, Math.min(1, (235 - lum) / (235 - 195)));
          nextAlpha = Math.min(a, Math.round(factor * 255));
        }

        data[idx + 3] = nextAlpha;
        if (nextAlpha > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    if (maxX < minX || maxY < minY) {
      throw new Error(
        "No se detectaron trazos visibles tras limpiar el fondo blanco. Desmarque la opción o suba otra imagen."
      );
    }

    const pad = 10;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(targetW - cropX, maxX - minX + 1 + pad * 2);
    const cropH = Math.min(targetH - cropY, maxY - minY + 1 + pad * 2);

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = cropW;
    exportCanvas.height = cropH;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) {
      throw new Error("No se pudo crear el lienzo de exportación PNG.");
    }

    exportCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      exportCanvas.toBlob((res) => resolve(res), "image/png")
    );
    if (!blob) {
      throw new Error("No se pudo generar el PNG limpio.");
    }
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ConfiguracionView({ initialProfile }: ConfiguracionViewProps) {
  const router = useRouter();
  const { refreshDirectory } = useSignatureSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<DoctorConfigProfile>(initialProfile);
  const [signatureTab, setSignatureTab] = useState<"upload" | "draw">("upload");
  const [removeWhiteBg, setRemoveWhiteBg] = useState(true);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [isProcessingPreview, setIsProcessingPreview] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isDeletingSignature, setIsDeletingSignature] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isTogglingDefault, setIsTogglingDefault] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [previewSampleMode, setPreviewSampleMode] = useState<"digital" | "manual">(
    initialProfile.hasSignature && initialProfile.showSignatureByDefault
      ? "digital"
      : "manual"
  );

  const safeTitle = (
    DOCTOR_TITLE_OPTIONS as readonly string[]
  ).includes(profile.doctorTitle)
    ? (profile.doctorTitle as (typeof DOCTOR_TITLE_OPTIONS)[number])
    : "Dr.";

  const form = useForm<UpdateDoctorConfigInput>({
    resolver: zodResolver(updateDoctorConfigSchema),
    defaultValues: {
      doctorTitle: safeTitle,
      fullName: profile.fullName,
      specialty: profile.specialty,
      cmp: profile.cmp,
      rne: profile.rne,
      phone: profile.phone,
      clinicAddress: profile.clinicAddress,
      showSignatureByDefault: profile.showSignatureByDefault,
    },
  });

  const watchedValues = useWatch({ control: form.control });

  const currentSignatureSrc = profile.hasSignature
    ? `/api/configuracion/firma?doctorId=${profile.id}&v=${encodeURIComponent(
        profile.signatureVersion
      )}`
    : null;

  const liveDoctorName = `${watchedValues.doctorTitle || profile.doctorTitle} ${
    watchedValues.fullName || profile.fullName
  }`.trim();

  const liveCredentials = [
    (watchedValues.cmp ?? profile.cmp)
      ? `CMP ${watchedValues.cmp ?? profile.cmp}`
      : "",
    (watchedValues.rne ?? profile.rne)
      ? `RNE ${watchedValues.rne ?? profile.rne}`
      : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const buildPreviewFromFile = async (file: File, cleanWhite: boolean) => {
    if (!VALID_BROWSER_MIME_TYPES.has(file.type)) {
      toast.error("Formato no soportado. Seleccione una imagen PNG, JPG o WebP.");
      return;
    }
    if (file.size > MAX_SIGNATURE_FILE_BYTES) {
      toast.error("El archivo supera el límite máximo permitido de 2 MB.");
      return;
    }

    setIsProcessingPreview(true);
    try {
      const processedBlob = cleanWhite
        ? await cleanWhiteBackgroundToPngBlob(file)
        : file;
      const previewUrl = URL.createObjectURL(processedBlob);
      setStagedPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });
      setStagedFile(
        new File([processedBlob], cleanWhite ? "firma-limpia.png" : file.name, {
          type: cleanWhite ? "image/png" : file.type,
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo procesar la imagen."
      );
    } finally {
      setIsProcessingPreview(false);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await buildPreviewFromFile(file, removeWhiteBg);
  };

  const uploadBinarySignature = async (blob: Blob, filename: string) => {
    if (blob.size > MAX_SIGNATURE_FILE_BYTES) {
      toast.error("La imagen generada excede el límite máximo de 2 MB.");
      return;
    }

    setIsUploadingSignature(true);
    try {
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], filename, { type: blob.type || "image/png" })
      );

      const res = await fetch("/api/configuracion/firma", {
        method: "POST",
        body: formData,
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { hasSignature: true; signatureVersion: string };
      };

      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || "No se pudo guardar la firma digital.");
        return;
      }

      setProfile((prev) => ({
        ...prev,
        hasSignature: true,
        signatureVersion: json.data!.signatureVersion,
      }));

      setStagedPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setStagedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (profile.showSignatureByDefault) {
        setPreviewSampleMode("digital");
      }

      await refreshDirectory();
      router.refresh();
      toast.success("Firma digital guardada en Storage privado CENDO.");
    } catch {
      toast.error("Error de red al subir la firma digital.");
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleConfirmDeleteSignature = async () => {
    setIsDeletingSignature(true);
    try {
      const res = await fetch("/api/configuracion/firma", {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { hasSignature: false; signatureVersion: string };
      };

      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || "No se pudo eliminar la firma digital.");
        return;
      }

      setProfile((prev) => ({
        ...prev,
        hasSignature: false,
        signatureVersion: json.data!.signatureVersion,
      }));
      setDeleteDialogOpen(false);
      setPreviewSampleMode("manual");

      await refreshDirectory();
      router.refresh();
      toast.success(
        "Firma digital eliminada. Los PDFs dejarán espacio limpio para sello manual."
      );
    } catch {
      toast.error("Error de red al eliminar la firma digital.");
    } finally {
      setIsDeletingSignature(false);
    }
  };

  const handleToggleDefaultPreference = async () => {
    const nextValue = !profile.showSignatureByDefault;
    setIsTogglingDefault(true);

    try {
      const payload: UpdateDoctorConfigInput = {
        doctorTitle: safeTitle,
        fullName: profile.fullName,
        specialty: profile.specialty,
        cmp: profile.cmp,
        rne: profile.rne,
        phone: profile.phone,
        clinicAddress: profile.clinicAddress,
        showSignatureByDefault: nextValue,
      };

      const res = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { profile: DoctorConfigProfile };
      };

      if (!res.ok || !json.success || !json.data?.profile) {
        toast.error(
          json.error || "No se pudo actualizar la preferencia de impresión."
        );
        return;
      }

      setProfile(json.data.profile);
      form.setValue("showSignatureByDefault", nextValue);
      setPreviewSampleMode(
        nextValue && json.data.profile.hasSignature ? "digital" : "manual"
      );

      await refreshDirectory();
      router.refresh();
      toast.success(
        nextValue
          ? "Preferencia actualizada: sus PDFs incluirán firma digital por defecto."
          : "Preferencia actualizada: sus PDFs dejarán espacio para firma y sello manual."
      );
    } catch {
      toast.error("Error de red al actualizar la preferencia.");
    } finally {
      setIsTogglingDefault(false);
    }
  };

  const onSubmitProfile = async (values: UpdateDoctorConfigInput) => {
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { profile: DoctorConfigProfile };
      };

      if (!res.ok || !json.success || !json.data?.profile) {
        toast.error(json.error || "No se pudieron guardar los cambios.");
        return;
      }

      setProfile(json.data.profile);
      await refreshDirectory();
      router.refresh();
      toast.success("Datos profesionales del sello médico actualizados.");
    } catch {
      toast.error("Error de red al guardar los datos del perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!profile.canManageSignature) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <Settings className="size-6 text-primary" />
              Configuración de Cuenta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestione sus datos de contacto personal en CENDO Miraflores.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            Rol Asistencial
          </Badge>
        </div>

        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <ShieldCheck className="size-4" />
              Autoría Médica & Firma Digital Protegida
            </CardTitle>
            <CardDescription className="text-foreground">
              Por seguridad clínica y normativa médico-legal, únicamente los
              médicos tratantes colegiados pueden registrar o emitir firmas
              digitales en recetas, órdenes y presupuestos. Al imprimir cualquier
              documento, el sistema utilizará automáticamente la firma (o el
              espacio para sello manual) del médico autor de la atención.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Mis Datos de Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(onSubmitProfile)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="assistant-name" className="block text-xs font-semibold text-foreground">
                  Nombre Completo
                </label>
                <Input
                  id="assistant-name"
                  {...form.register("fullName")}
                  disabled={isSavingProfile}
                />
                {form.formState.errors.fullName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="assistant-phone" className="block text-xs font-semibold text-foreground">
                  Teléfono
                </label>
                <Input
                  id="assistant-phone"
                  {...form.register("phone")}
                  disabled={isSavingProfile}
                />
              </div>

              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar Cambios
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Settings className="size-6 text-primary" />
            Configuración Profesional & Firma Digital
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualice y administre su firma manuscrita digitalizada, sus datos de
            sello médico y cómo se imprimen sus PDFs oficiales CENDO.
          </p>
        </div>

        <Badge
          variant="outline"
          className="gap-1.5 border-primary/30 bg-primary/5 font-mono text-xs text-primary"
        >
          <ShieldCheck className="size-3.5" />
          Storage Privado Zero Trust
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* COLUMNA IZQUIERDA: GESTIÓN DE FIRMA DIGITAL */}
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PenTool className="size-4 text-primary" />
                    Mi Firma Digital Manuscrita
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Almacenada de forma privada y cifrada; accesible únicamente
                    dentro de su clínica autenticada.
                  </CardDescription>
                </div>

                {profile.hasSignature ? (
                  <Badge className="gap-1 border border-success/30 bg-success/10 text-success hover:bg-success/15">
                    <CheckCircle2 className="size-3.5" />
                    Firma Digital Activa
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-muted text-muted-foreground"
                  >
                    Sin Firma Cargada
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              {/* Visualización de la firma actual */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Firma Registrada Actualmente
                  </span>
                  {profile.hasSignature ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      Eliminar Firma
                    </Button>
                  ) : null}
                </div>

                <div className="flex min-h-28 items-center justify-center rounded-xl border border-border bg-card p-4 shadow-inner">
                  {currentSignatureSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- Endpoint binario privado autenticado */
                    <img
                      src={currentSignatureSrc}
                      alt={`Firma digital actual de ${profile.doctorTitle} ${profile.fullName}`}
                      className="max-h-24 max-w-[240px] object-contain mix-blend-multiply select-none"
                    />
                  ) : (
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-medium text-muted-foreground">
                        No tiene una firma digital guardada
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mientras no suba una firma, sus PDFs dejarán el espacio en
                        blanco para sello físico y firma manual.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferencia Global por Defecto */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/25 px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    Incluir firma digital automáticamente al generar PDFs
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.showSignatureByDefault
                      ? "Activado: sus recetas, órdenes y consultas nacen con su firma visible (puede cambiarlo en 1 clic por cada PDF)."
                      : "Desactivado: sus PDFs nacen en blanco para firmar y sellar manualmente."}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.showSignatureByDefault}
                  aria-label="Incluir firma digital automáticamente al generar PDFs"
                  disabled={isTogglingDefault}
                  onClick={() => void handleToggleDefaultPreference()}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                    profile.showSignatureByDefault ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block size-5 rounded-full bg-card shadow-sm transition-transform",
                      profile.showSignatureByDefault
                        ? "translate-x-5"
                        : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {/* Subir o Dibujar nueva firma */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {profile.hasSignature
                      ? "Reemplazar Firma Digital"
                      : "Cargar Firma Digital"}
                  </span>

                  <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setSignatureTab("upload")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        signatureTab === "upload"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Upload className="size-3.5" />
                      Subir Imagen
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureTab("draw")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        signatureTab === "draw"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <PenLine className="size-3.5" />
                      Dibujar en Pantalla
                    </button>
                  </div>
                </div>

                {signatureTab === "upload" ? (
                  <div className="space-y-3 rounded-xl border border-border bg-muted/15 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground select-none">
                        <input
                          type="checkbox"
                          checked={removeWhiteBg}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setRemoveWhiteBg(checked);
                            const currentRaw = fileInputRef.current?.files?.[0];
                            if (currentRaw) {
                              void buildPreviewFromFile(currentRaw, checked);
                            }
                          }}
                          className="size-4 rounded border-border accent-primary"
                        />
                        <Sparkles className="size-3.5 text-primary" />
                        <span>
                          Limpiar fondo blanco automáticamente (PNG transparente)
                        </span>
                      </label>

                      <span className="font-mono text-[11px] text-muted-foreground">
                        PNG, JPG o WebP • Máx. 2 MB
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => void handleFileInputChange(e)}
                        className="block w-full text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted"
                      />
                    </div>

                    {isProcessingPreview ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                        Procesando imagen de firma...
                      </div>
                    ) : null}

                    {stagedPreviewUrl && stagedFile ? (
                      <div className="space-y-3 rounded-lg border border-primary/25 bg-card p-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                            <FileImage className="size-3.5" />
                            Vista previa lista para subir ({stagedFile.name})
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {(stagedFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>

                        <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed border-border bg-card p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL local temporal */}
                          <img
                            src={stagedPreviewUrl}
                            alt="Previsualización de nueva firma"
                            className="max-h-20 max-w-[220px] object-contain mix-blend-multiply"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (stagedPreviewUrl) {
                                URL.revokeObjectURL(stagedPreviewUrl);
                              }
                              setStagedPreviewUrl(null);
                              setStagedFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                            disabled={isUploadingSignature}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              void uploadBinarySignature(
                                stagedFile,
                                stagedFile.name
                              )
                            }
                            disabled={isUploadingSignature}
                          >
                            {isUploadingSignature ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Save className="size-3.5" />
                            )}
                            Confirmar y Guardar Firma
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/15 p-4">
                    <SignaturePadCanvas
                      isSaving={isUploadingSignature}
                      onSaveBlob={async (blob) => {
                        await uploadBinarySignature(blob, "firma-trazada.png");
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: PREVIEW REAL EN PDF + DATOS DEL SELLO */}
        <div className="space-y-6 lg:col-span-5">
          {/* Vista previa real en hoja PDF */}
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="size-4 text-primary" />
                    Vista Previa en PDF
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Simulación exacta del bloque de firma en recetas, órdenes y
                    consultas.
                  </CardDescription>
                </div>

                <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewSampleMode("digital")}
                    disabled={!profile.hasSignature}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-medium transition-colors disabled:opacity-40",
                      previewSampleMode === "digital" && profile.hasSignature
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Con Firma
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSampleMode("manual")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-medium transition-colors",
                      previewSampleMode === "manual" || !profile.hasSignature
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Sello Manual
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5">
              <div className="flex justify-center rounded-xl border border-border bg-card p-6 shadow-sm">
                <CendoSignatureBlock
                  doctorName={liveDoctorName}
                  doctorSpecialty={watchedValues.specialty ?? profile.specialty}
                  doctorCredentials={liveCredentials}
                  signatureSrc={currentSignatureSrc}
                  showDigitalSignature={
                    previewSampleMode === "digital" && profile.hasSignature
                  }
                  showSalutation
                />
              </div>

              <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
                {previewSampleMode === "digital" && profile.hasSignature
                  ? "Modo Digital: listo para enviar por WhatsApp o PDF directo."
                  : "Modo Físico: deja espacio limpio (~18 mm) para sello de jebe y firma con lapicero."}
              </p>
            </CardContent>
          </Card>

          {/* Datos del Sello Médico */}
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">
                Datos del Sello & Sede Clínica
              </CardTitle>
              <CardDescription>
                Estos datos aparecen automáticamente debajo de su línea de firma.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              <form
                onSubmit={form.handleSubmit(onSubmitProfile)}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="doctorTitle" className="block text-xs font-semibold text-foreground">
                      Título
                    </label>
                    <select
                      id="doctorTitle"
                      {...form.register("doctorTitle")}
                      disabled={isSavingProfile}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-2.5 py-1 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {DOCTOR_TITLE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label htmlFor="fullName" className="block text-xs font-semibold text-foreground">
                      Nombre Completo
                    </label>
                    <Input
                      id="fullName"
                      {...form.register("fullName")}
                      disabled={isSavingProfile}
                    />
                    {form.formState.errors.fullName ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.fullName.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="specialty" className="block text-xs font-semibold text-foreground">
                    Especialidad Médica
                  </label>
                  <Input
                    id="specialty"
                    {...form.register("specialty")}
                    disabled={isSavingProfile}
                  />
                  {form.formState.errors.specialty ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.specialty.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="cmp" className="block text-xs font-semibold text-foreground">
                      N° CMP
                    </label>
                    <Input
                      id="cmp"
                      className="font-mono"
                      {...form.register("cmp")}
                      disabled={isSavingProfile}
                    />
                    {form.formState.errors.cmp ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.cmp.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="rne" className="block text-xs font-semibold text-foreground">
                      N° RNE (Opcional)
                    </label>
                    <Input
                      id="rne"
                      className="font-mono"
                      {...form.register("rne")}
                      disabled={isSavingProfile}
                    />
                    {form.formState.errors.rne ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.rne.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-xs font-semibold text-foreground">
                    Teléfono de Contacto
                  </label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    disabled={isSavingProfile}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="clinicAddress" className="block text-xs font-semibold text-foreground">
                    Dirección de Consultorio
                  </label>
                  <Input
                    id="clinicAddress"
                    {...form.register("clinicAddress")}
                    disabled={isSavingProfile}
                  />
                  {form.formState.errors.clinicAddress ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.clinicAddress.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex justify-end border-t border-border pt-3">
                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Guardar Datos del Sello
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Confirmación para Eliminar Firma */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar Firma Digital?</DialogTitle>
            <DialogDescription>
              Su firma será eliminada de Supabase Storage privado. Podrá volver a
              subirla o dibujarla cuando lo necesite; mientras tanto, los PDFs
              dejarán un espacio limpio para firma y sello manual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingSignature}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDeleteSignature()}
              disabled={isDeletingSignature}
            >
              {isDeletingSignature ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Sí, Eliminar Firma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
