import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function PacientesPlaceholderPage() {
  await requireSessionDoctor();

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-4 text-primary" />
            Pacientes e Historias Clínicas
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            FASE 2
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 text-sm text-muted-foreground">
        Módulo listo en esquema PostgreSQL (`patients`, `patient_backgrounds`). Se
        habilitará en la siguiente fase junto a la ficha unificada (`/pacientes/[id]`).
      </CardContent>
    </Card>
  );
}
