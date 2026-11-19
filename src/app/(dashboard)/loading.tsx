export default function DashboardLoading() {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-label="Cargando sección clínica"
      role="status"
    >
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded-lg bg-muted" />
          <div className="h-4 w-96 max-w-full rounded-md bg-muted/70" />
        </div>
        <div className="h-9 w-40 rounded-lg bg-muted" />
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="space-y-3 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded bg-muted" />
              <div className="size-8 rounded-lg bg-muted" />
            </div>
            <div className="h-7 w-16 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted/70" />
          </div>
        ))}
      </div>

      {/* Tabla / Contenido principal */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="h-9 w-64 rounded-lg bg-muted" />
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-b-0"
          >
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-4 w-1/4 rounded bg-muted/80" />
            <div className="h-6 w-20 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
