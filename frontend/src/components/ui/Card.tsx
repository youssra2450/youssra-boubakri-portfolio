import type { HTMLAttributes, PointerEvent } from "react";

import { cn } from "@/lib/cn";
import { trackSpotlight } from "@/lib/motion";

/** `dark` is a backward-compatible alias of `light` (Palette v4 has no dark surfaces). */
type CardTone = "light" | "ivory" | "dark";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  /** Hover lift + border tint for clickable / explorable cards. */
  interactive?: boolean;
  /** Soft radial highlight following the cursor (fine pointers only). */
  spotlight?: boolean;
}

const TONES: Record<CardTone, string> = {
  light: "border-line bg-white shadow-soft",
  ivory: "border-sand-200/80 bg-ivory shadow-soft",
  dark: "border-line bg-white shadow-soft",
};

const INTERACTIVE =
  "transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-lift motion-reduce:hover:translate-y-0";

/** Bordered surface with the design-system radius and soft shadow. */
export function Card({ tone = "light", interactive = false, spotlight = false, className, onPointerMove, ...rest }: CardProps) {
  const handlePointerMove = spotlight
    ? (event: PointerEvent<HTMLDivElement>) => {
        trackSpotlight(event);
        onPointerMove?.(event);
      }
    : onPointerMove;

  return (
    <div
      className={cn("rounded-card border", TONES[tone], interactive && INTERACTIVE, spotlight && "spotlight", className)}
      onPointerMove={handlePointerMove}
      {...rest}
    />
  );
}
