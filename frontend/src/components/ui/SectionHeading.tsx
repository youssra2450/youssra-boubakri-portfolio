import type { ReactNode } from "react";

import { WordReveal } from "@/components/ui/WordReveal";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";
import { sectionTitleId } from "@/lib/site";

interface SectionHeadingProps {
  /** Id of the parent section; the h2 receives `${sectionId}-title`. */
  sectionId: string;
  /** Ordinal shown in the eyebrow ("01"). */
  index: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Kept for backward compatibility; every surface is light in Palette v4. */
  tone?: "light" | "dark";
  /** Horizontal alignment of the heading block. */
  align?: "left" | "center";
  className?: string;
  /** Optional content aligned to the right of the heading on large screens (e.g. a toolbar). */
  aside?: ReactNode;
}

/**
 * Mono eyebrow ("01 — About") + h2 + one-line lead. On first view the eyebrow line draws,
 * the title words rise out of their masks and the lead fades in (instant under reduced motion).
 */
export function SectionHeading({
  sectionId,
  index,
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  aside,
}: SectionHeadingProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ once: true, rootMargin: "0px 0px -10% 0px" });
  const centered = align === "center";

  return (
    <div
      ref={ref}
      className={cn(
        "heading-reveal flex flex-col gap-8",
        centered ? "items-center text-center" : "lg:flex-row lg:items-end lg:justify-between",
        inView && "is-visible",
        className,
      )}
    >
      <div className={cn("max-w-3xl", centered && "flex flex-col items-center")}>
        <p className="eyebrow flex items-center gap-3 text-accent-strong">
          <span className="heading-reveal__index">{index}</span>
          <span aria-hidden="true" className="heading-reveal__line h-px w-10 bg-current opacity-60" />
          <span className="heading-reveal__label">{eyebrow}</span>
        </p>
        <h2 id={sectionTitleId(sectionId)} className="mt-5 text-h2 font-bold text-balance text-ink">
          {typeof title === "string" ? <WordReveal text={title} /> : <span className="heading-reveal__block">{title}</span>}
        </h2>
        {lead && (
          <p className={cn("heading-reveal__lead mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-slate-600")}>
            {lead}
          </p>
        )}
      </div>
      {aside}
    </div>
  );
}
