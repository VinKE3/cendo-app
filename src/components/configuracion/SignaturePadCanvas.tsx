"use client";

import { useCallback, useRef, useState } from "react";
import { Eraser, Loader2, PenLine, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignaturePadCanvasProps {
  onSaveBlob: (blob: Blob) => Promise<void>;
  isSaving?: boolean;
}

const LOGICAL_WIDTH = 900;
const LOGICAL_HEIGHT = 300;

const INK_OPTIONS = [
  { id: "blue", label: "Tinta Azul Clínica", color: "#1e3a8a" },
  { id: "black", label: "Tinta Negra", color: "#0f172a" },
] as const;

export function SignaturePadCanvas({
  onSaveBlob,
  isSaving = false,
}: SignaturePadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [inkColor, setInkColor] = useState<string>(INK_OPTIONS[0].color);
  const [hasStroke, setHasStroke] = useState(false);

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      return {
        x: ((clientX - rect.left) * canvas.width) / rect.width,
        y: ((clientY - rect.top) * canvas.height) / rect.height,
      };
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSaving) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pt = getCanvasPoint(e.clientX, e.clientY);
    if (!canvas || !ctx || !pt) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = pt;

    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.1, 0, Math.PI * 2);
    ctx.fill();
    setHasStroke(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isSaving) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pt = getCanvasPoint(e.clientX, e.clientY);
    const prev = lastPointRef.current;
    if (!canvas || !ctx || !pt || !prev) return;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();

    lastPointRef.current = pt;
    if (!hasStroke) setHasStroke(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar si ya no tiene capture
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || !hasStroke) {
      toast.error("Trace su firma en el recuadro antes de guardar.");
      return;
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imgData;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      toast.error("No se detectaron trazos visibles en el lienzo.");
      return;
    }

    const pad = 14;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
    const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = cropW;
    exportCanvas.height = cropH;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) {
      toast.error("No se pudo procesar la firma dibujada.");
      return;
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
      toast.error("Error al exportar el trazo PNG.");
      return;
    }

    await onSaveBlob(blob);
    handleClear();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PenLine className="size-3.5 text-primary" />
          <span>Dibuje con mouse, lápiz óptico o dedo sobre la línea guía.</span>
        </div>

        <div className="flex items-center gap-1.5">
          {INK_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setInkColor(opt.color)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                inkColor === opt.color
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className="inline-block size-2.5 rounded-full border border-border"
                style={{ backgroundColor: opt.color }}
                aria-hidden="true"
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-card">
        <canvas
          ref={canvasRef}
          width={LOGICAL_WIDTH}
          height={LOGICAL_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="block aspect-[3/1] w-full cursor-crosshair touch-none select-none"
        />

        <div
          className="pointer-events-none absolute inset-x-10 bottom-7 border-b border-dashed border-border"
          aria-hidden="true"
        />
        {!hasStroke ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground/60 select-none">
              Firme aquí dentro del recuadro
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={!hasStroke || isSaving}
        >
          <Eraser className="size-3.5" />
          Limpiar trazo
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={!hasStroke || isSaving}
        >
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Guardar Firma Dibujada
        </Button>
      </div>
    </div>
  );
}
