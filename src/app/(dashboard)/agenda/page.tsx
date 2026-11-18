import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionDoctor } from "@/lib/security/server-session";

export default async function AgendaPlaceholderPage() {
  await requireSessionDoctor();

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="size-4 text-primary" />
            Agenda de Citas Médicas
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            FASE 3
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 text-sm text-muted-foreground">
        Módulo listo en esquema PostgreSQL (`medical_appointments`). Se habilitará en la
        Fase 3 con validación anti-cruces, horario America/Lima y exportación a Google
        Calendar / .ics.
      </CardContent>
    </Card>
  );
}
