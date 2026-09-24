import type { ReactNode } from "react";

import { useScrollLinkedProgress } from "@/hooks/useScrollProgress";
import { cn } from "@/lib/cn";

interface TimelineProps {
  label?: string;
  /** Colour of the unfilled spine for the surface it sits on. */
  surface?: "sand" | "white";
  className?: string;
  children: ReactNode;
}

/**
 * Vertical timeline whose accent spine draws progressively with scroll (`--progress`,
 * written by useScrollLinkedProgress). Items are `TimelineItem`s (Reveal list items with a dot).
 */
export function Timeline({ label, surface = "white", className, children }: TimelineProps) {
  const ref = useScrollLinkedProgress<HTMLOListElement>({ anchor: 0.72 });
  return (
    <ol ref={ref} aria-label={label} className={cn("relative", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-2 bottom-2 left-[5px] w-px",
          surface === "sand" ? "bg-sand-400/45" : "bg-line",
        )}
      />
      <span
        aria-hidden="true"
        className="timeline-fill absolute top-2 bottom-2 left-[4.5px] w-[2px] rounded-full bg-linear-to-b from-accent via-accent to-accent-soft"
      />
      {children}
    </ol>
  );
}
