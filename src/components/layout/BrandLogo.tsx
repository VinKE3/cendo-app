import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  inverted?: boolean;
  showText?: boolean;
  layout?: "horizontal" | "vertical";
  className?: string;
}

export function BrandLogo({
  size = "md",
  inverted = false,
  showText = true,
  layout = "horizontal",
  className,
}: BrandLogoProps) {
  const iconDimensions = {
    sm: "size-9",
    md: "size-12",
    lg: "size-16",
    xl: "size-20",
  }[size];

  const titleClass = {
    sm: "text-xl leading-none",
    md: "text-2xl leading-none",
    lg: "text-3xl leading-none",
    xl: "text-4xl leading-none",
  }[size];

  const subtitleClass = {
    sm: "text-[6.5px] tracking-[0.12em]",
    md: "text-[8px] tracking-[0.14em]",
    lg: "text-[10px] tracking-[0.15em]",
    xl: "text-xs tracking-[0.15em]",
  }[size];

  const primaryFill = inverted ? "var(--primary-foreground)" : "var(--primary)";
  const blueCrescentFill = inverted
    ? "color-mix(in oklch, var(--primary-foreground), transparent 12%)"
    : "var(--primary)";

  return (
    <div
      className={cn(
        "inline-flex items-center select-none",
        layout === "vertical" ? "flex-col gap-2 text-center" : "gap-3.5",
        className
      )}
    >
      <div className={cn("relative flex shrink-0 items-center justify-center", iconDimensions)}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-full transition-transform duration-200 hover:scale-105"
          aria-hidden="true"
        >
          {/* Media luna superior derecha en ámbar institucional (círculos excéntricos oficiales) */}
          <path
            d="M 13.80 32.57 A 41.13 41.13 0 1 1 84.05 70.03 A 40.03 40.03 0 1 0 13.80 32.57 Z"
            fill="var(--warning)"
          />

          {/* Media luna inferior izquierda en azul petróleo (círculos excéntricos oficiales) */}
          <path
            d="M 98.70 55.48 A 49.13 49.13 0 1 1 17.70 12.32 A 47.03 47.03 0 1 0 98.70 55.48 Z"
            fill={blueCrescentFill}
          />

          {/* Emblema ginecológico central caligráfico (trazo continuo variable + gota interior) */}
          <path
            fillRule="evenodd"
            fill={primaryFill}
            d="
              M 50.00 37.80
              C 45.60 33.10, 38.20 29.85, 30.80 29.85
              C 23.60 29.85, 19.50 33.70, 19.50 39.50
              C 19.50 44.75, 23.40 48.35, 30.00 48.35
              C 35.20 48.35, 41.45 47.30, 41.45 45.95
              C 41.45 45.00, 40.40 44.65, 38.80 44.85
              C 35.80 45.25, 33.20 45.35, 30.70 45.30
              C 24.80 45.15, 22.00 42.85, 22.00 39.50
              C 22.00 36.00, 25.40 33.75, 31.30 33.75
              C 38.70 33.75, 45.30 37.25, 48.10 39.65
              C 45.00 43.30, 41.45 49.20, 41.45 55.40
              C 41.45 61.95, 44.80 67.95, 50.00 72.25
              C 55.20 67.95, 58.55 61.95, 58.55 55.40
              C 58.55 49.20, 55.00 43.30, 51.90 39.65
              C 54.70 37.25, 61.30 33.75, 68.70 33.75
              C 74.60 33.75, 78.00 36.00, 78.00 39.50
              C 78.00 42.85, 75.20 45.15, 69.30 45.30
              C 66.80 45.35, 64.20 45.25, 61.20 44.85
              C 59.60 44.65, 58.55 45.00, 58.55 45.95
              C 58.55 47.30, 64.80 48.35, 70.00 48.35
              C 76.60 48.35, 80.50 44.75, 80.50 39.50
              C 80.50 33.70, 76.40 29.85, 69.20 29.85
              C 61.80 29.85, 54.40 33.10, 50.00 37.80
              Z
              M 50.00 43.75
              C 46.40 47.75, 45.00 51.60, 45.00 55.60
              C 45.00 60.20, 46.75 64.45, 50.00 68.20
              C 53.25 64.45, 55.00 60.20, 55.00 55.60
              C 55.00 51.60, 53.60 47.75, 50.00 43.75
              Z
            "
          />
        </svg>
      </div>

      {showText ? (
        <div
          className={cn(
            "inline-flex flex-col",
            layout === "vertical" ? "items-center" : "items-start"
          )}
        >
          <span
            className={cn(
              "font-serif font-bold tracking-[0.02em]",
              titleClass,
              inverted ? "text-primary-foreground" : "text-primary"
            )}
          >
            CENDO
          </span>
          <span className="my-1 h-[2.5px] w-full bg-warning" />
          <span
            className={cn(
              "font-sans font-medium uppercase",
              subtitleClass,
              inverted ? "text-primary-foreground/85" : "text-primary"
            )}
          >
            Centro de Endometriosis
          </span>
        </div>
      ) : null}
    </div>
  );
}
