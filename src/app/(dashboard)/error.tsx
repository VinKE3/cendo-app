"use client";

import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-lg">
            No se pudo cargar esta sección clínica
          </CardTitle>
          <CardDescription>
            Ocurrió una interrupción temporal de conexión o servidor. Los datos
            clínicos registrados permanecen seguros en PostgreSQL.
          </CardDescription>
        </CardHeader>

        {error.digest ? (
          <CardContent>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center font-mono text-xs text-muted-foreground">
              Código de referencia: {error.digest}
            </div>
          </CardContent>
        ) : null}

        <CardFooter className="flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>
            <RotateCcw className="size-4" />
            Reintentar
          </Button>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline" })}
          >
            <LayoutDashboard className="size-4" />
            Ir al Panel Principal
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
