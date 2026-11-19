import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GlobalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-md border-border text-center shadow-sm">
        <CardHeader className="items-center space-y-4">
          <BrandLogo size="md" />
          <div className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            <SearchX className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
              Error 404
            </p>
            <CardTitle className="text-xl">
              Página o historia clínica no encontrada
            </CardTitle>
            <CardDescription>
              La ruta solicitada no existe o ya no se encuentra disponible en
              CENDO Miraflores.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="text-xs text-muted-foreground">
          Verifique la dirección o regrese al panel principal de gestión clínica.
        </CardContent>

        <CardFooter className="justify-center">
          <Link href="/dashboard" className={buttonVariants()}>
            <ArrowLeft className="size-4" />
            Volver al Panel Principal
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
