"use client";

import { cn } from "@/lib/utils";

interface CervicalClockProps {
  selectedHours: string[];
  onChange?: (hours: string[]) => void;
  interactive?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLegend?: boolean;
}

const CLOCK_HOURS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

function getHourCoordinates(hourNumber: number, radius: number) {
  const angle = ((hourNumber * 30 - 90) * Math.PI) / 180;
  return {
    x: 100 + radius * Math.cos(angle),
    y: 100 + radius * Math.sin(angle),
  };
}

export function CervicalClock({
  selectedHours = [],
  onChange,
  interactive = true,
  className,
  size = "md",
  showLegend = true,
}: CervicalClockProps) {
  const dimensions = {
    sm: "size-32",
    md: "size-60",
    lg: "size-72",
  }[size];

  const handleToggleHour = (hour: string) => {
    if (!interactive || !onChange) return;
    if (selectedHours.includes(hour)) {
      onChange(selectedHours.filter((h) => h !== hour));
    } else {
      const next = [...selectedHours, hour].sort(
        (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10)
      );
      onChange(next);
    }
  };

  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      <div className={cn("relative", dimensions)}>
        <svg
          viewBox="0 0 200 200"
          className="size-full"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Mapa horario cervical colposcópico de 1 a 12 horas"
        >
          <defs>
            <radialGradient id="cervix-surface" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--muted)" stopOpacity="0.45" />
              <stop offset="70%" stopColor="var(--secondary)" stopOpacity="0.65" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.18" />
            </radialGradient>
          </defs>

          {/* Ectocérvix */}
          <circle
            cx="100"
            cy="100"
            r="82"
            fill="url(#cervix-surface)"
            stroke="var(--primary)"
            strokeWidth="2.2"
            strokeOpacity="0.55"
          />

          {/* Guías de cuadrantes Q1-Q4 */}
          <line
            x1="100"
            y1="20"
            x2="100"
            y2="180"
            stroke="var(--primary)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.35"
          />
          <line
            x1="20"
            y1="100"
            x2="180"
            y2="100"
            stroke="var(--primary)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.35"
          />

          <text
            x="136"
            y="68"
            fill="var(--primary)"
            opacity="0.55"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            Q1
          </text>
          <text
            x="136"
            y="138"
            fill="var(--primary)"
            opacity="0.55"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            Q2
          </text>
          <text
            x="64"
            y="138"
            fill="var(--primary)"
            opacity="0.55"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            Q3
          </text>
          <text
            x="64"
            y="68"
            fill="var(--primary)"
            opacity="0.55"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            Q4
          </text>

          {/* Zona de Transformación */}
          <circle
            cx="100"
            cy="100"
            r="43"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.2"
            strokeDasharray="4 2"
            opacity="0.45"
          />

          {/* Orificio Cervical Externo (OCE) */}
          <ellipse
            cx="100"
            cy="100"
            rx="11"
            ry="5.5"
            fill="var(--primary)"
            stroke="var(--foreground)"
            strokeWidth="1.2"
          />

          {/* Horas 1 a 12 */}
          {CLOCK_HOURS.map((hour) => {
            const hourNum = Number.parseInt(hour, 10);
            const { x, y } = getHourCoordinates(hourNum, 66);
            const isSelected = selectedHours.includes(hour);

            return (
              <g
                key={hour}
                onClick={() => handleToggleHour(hour)}
                className={cn(
                  "transition-opacity",
                  interactive ? "cursor-pointer hover:opacity-90" : "cursor-default"
                )}
              >
                {isSelected ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={13.5}
                    fill="none"
                    stroke="var(--destructive)"
                    strokeWidth="1.2"
                    strokeOpacity="0.65"
                  />
                ) : null}

                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 10.5 : 9.5}
                  fill={isSelected ? "var(--destructive)" : "var(--card)"}
                  stroke={isSelected ? "var(--destructive)" : "var(--border)"}
                  strokeWidth={isSelected ? 2 : 1.3}
                />

                <text
                  x={x}
                  y={y + 3.5}
                  textAnchor="middle"
                  fontSize={isSelected ? "9.5" : "8.5"}
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill={isSelected ? "var(--primary-foreground)" : "var(--foreground)"}
                  className="pointer-events-none"
                >
                  {hour}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {showLegend ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-center">
          {selectedHours.length > 0 ? (
            selectedHours.map((h) => (
              <span
                key={h}
                className="rounded border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[10px] font-bold text-destructive"
              >
                Hora {h}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {interactive
                ? "Haga clic en las horas (1–12) para marcar sitios de biopsia"
                : "Sin puntos de biopsia seleccionados"}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
