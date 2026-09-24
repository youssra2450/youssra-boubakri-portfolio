import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { sectionTitleId } from "@/lib/site";

/**
 * Section surfaces (Palette v4 — light only). `mist` is the historical name of the light-blue
 * surface (same as `sky`); `navy` is kept for backward compatibility and renders as `sky`.
 */
export type SectionTone = "white" | "ivory" | "sand" | "sky" | "mist" | "navy";

const TONES: Record<SectionTone, string> = {
  white: "bg-white",
  ivory: "bg-ivory",
  sand: "bg-sand",
  sky: "bg-sky-50",
  mist: "bg-sky-50",
  navy: "bg-sky-50",
};

interface SectionProps {
  /** Anchor id; the section is labelled by the heading with id `${id}-title`. */
  id: string;
  tone?: SectionTone;
  /** Hairline at the top edge (separates two sections of the same surface). */
  divider?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Page section landmark with the vertical rhythm of the design system.
 * `tabIndex={-1}` lets in-page navigation move focus to the section.
 */
export function Section({ id, tone = "white", divider = false, className, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={sectionTitleId(id)}
      tabIndex={-1}
      data-tone={tone}
      className={cn(
        "relative py-24 outline-none md:py-32",
        TONES[tone],
        divider && "border-t border-line/80",
        className,
      )}
    >
      {children}
    </section>
  );
}
