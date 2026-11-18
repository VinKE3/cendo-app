import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  showText?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  inverted = false,
  showText = true,
  className,
}: BrandLogoProps) {
  const iconDimensions = {
    sm: "size-8",
    md: "size-10",
    lg: "size-13",
  }[size];

  const titleClass = {
    sm: "text-lg font-bold tracking-tight",
    md: "text-2xl font-bold tracking-tight",
    lg: "text-3xl font-bold tracking-tight",
  }[size];

  const subtitleClass = {
    sm: "text-[9px] font-semibold tracking-wider",
    md: "text-[10px] font-semibold tracking-widest",
    lg: "text-xs font-semibold tracking-widest",
  }[size];

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      <div className={cn("relative flex shrink-0 items-center justify-center", iconDimensions)}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-full transition-transform duration-200 hover:scale-105"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill={inverted ? "var(--primary-foreground)" : "var(--primary)"}
            fillOpacity={inverted ? "0.1" : "0.08"}
          />
          <path
            d="M 22 75 A 38 38 0 1 1 82 32"
            stroke={inverted ? "var(--primary-foreground)" : "var(--primary)"}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M 78 40 A 34 34 0 0 1 35 83"
            stroke="var(--warning)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="4 1"
          />
          <path
            d="M 50 28 C 42 38 38 48 38 58 C 38 66 43 72 50 72 C 57 72 62 66 62 58 C 62 48 58 38 50 28 Z"
            fill={inverted ? "var(--primary-foreground)" : "var(--primary)"}
            fillOpacity="0.92"
          />
          <path
            d="M 45 42 C 34 39 28 47 31 54 C 33 59 38 61 43 55 Z"
            fill="var(--warning)"
            fillOpacity="0.9"
          />
          <path
            d="M 55 42 C 66 39 72 47 69 54 C 67 59 62 61 57 55 Z"
            fill={inverted ? "var(--primary-foreground)" : "var(--primary)"}
            fillOpacity="0.72"
          />
          <circle
            cx="50"
            cy="54"
            r="3.2"
            fill={inverted ? "var(--primary)" : "var(--primary-foreground)"}
          />
        </svg>
      </div>

      {showText ? (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-heading",
                titleClass,
                inverted ? "text-primary-foreground" : "text-primary"
              )}
            >
              CENDO
            </span>
            <span className="mb-1 inline-block size-1.5 rounded-full bg-warning" />
          </div>
          <span
            className={cn(
              "font-sans uppercase",
              subtitleClass,
              inverted ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            Centro de Endometriosis
          </span>
        </div>
      ) : null}
    </div>
  );
}
