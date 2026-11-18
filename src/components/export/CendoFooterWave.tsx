import { Mail, MapPin, Phone } from "lucide-react";

import { cn } from "@/lib/utils";

interface CendoFooterWaveProps {
  address?: string;
  email?: string;
  phone?: string;
  className?: string;
}

export function CendoFooterWave({
  address = "Alfredo Benavides N°2975, Of. 405 / Miraflores - Lima",
  email = "cendoperu@gmail.com",
  phone = "985 945 697",
  className,
}: CendoFooterWaveProps) {
  return (
    <footer className={cn("relative w-full select-none overflow-hidden", className)}>
      <svg
        viewBox="0 0 1200 170"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-[34mm] w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 16C340 88 730 124 1200 84L1200 104C730 144 340 112 0 42Z"
          fill="var(--warning)"
        />
        <path
          d="M0 44C340 114 735 144 1200 86L1200 170L0 170Z"
          fill="var(--primary)"
        />
      </svg>

      <div className="bg-primary px-8 pb-4 pt-1 text-primary-foreground">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-3 text-[10px] font-medium tracking-tight">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
              <MapPin className="size-2.5" aria-hidden="true" />
            </span>
            <span>{address}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
              <Mail className="size-2.5" aria-hidden="true" />
            </span>
            <span>{email}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
              <Phone className="size-2.5" aria-hidden="true" />
            </span>
            <span>{phone}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
