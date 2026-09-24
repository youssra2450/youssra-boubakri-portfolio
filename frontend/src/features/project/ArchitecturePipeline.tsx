import type { CSSProperties } from "react";

import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";
import { ordinal, splitStepLabel } from "@/lib/portfolio";
import type { ArchitectureStep } from "@/types/api";

interface ArchitecturePipelineProps {
  steps: readonly ArchitectureStep[];
}

/**
 * Project architecture as a vertical pipeline on a light sky panel (docs/SPEC.md §3.5, Motion v3):
 * when it enters the viewport the numbered nodes pop in sequence, each connector draws and a
 * small data packet travels along it once. Static (fully drawn) under reduced motion or without
 * IntersectionObserver.
 */
export function ArchitecturePipeline({ steps }: ArchitecturePipelineProps) {
  const [ref, active] = useInView<HTMLOListElement>({ once: true, threshold: 0.12 });
  if (steps.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-media border border-sky-200 bg-sky-50 p-4 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(46_107_203/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(46_107_203/0.06)_1px,transparent_1px)] mask-[radial-gradient(90%_80%_at_20%_10%,#000,transparent_80%)] bg-size-[24px_24px]"
      />
      <ol ref={ref} aria-label="Architecture pipeline" data-active={active} className="pipeline relative">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          const { kicker, title } = splitStepLabel(step.step);
          return (
            <li
              key={`${step.step}-${index}`}
              className="relative flex gap-4 sm:gap-6"
              style={{ "--step": String(index) } as CSSProperties}
            >
              <div className="flex flex-col items-center">
                <span className="pipeline-node flex size-9 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-white font-mono text-[12px] font-medium text-accent-strong shadow-soft ring-4 ring-sky-50 sm:size-11 sm:text-[13px]">
                  {ordinal(index + 1)}
                </span>
                {!last && (
                  <span aria-hidden="true" className="relative my-1.5 w-px flex-1">
                    <span className="absolute inset-0 bg-sky-200" />
                    <span className="pipeline-line absolute inset-0 origin-top bg-accent/60" />
                    <span className="pipeline-packet absolute inset-0">
                      <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_0_4px_rgb(46_107_203/0.16)]" />
                    </span>
                    <span className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rotate-45 border-r border-b border-accent/70" />
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "pipeline-card mb-0 min-w-0 flex-1 rounded-card border border-line bg-white px-4 py-3.5 shadow-soft sm:px-5 sm:py-4",
                  !last && "mb-5",
                )}
              >
                {kicker && (
                  <p aria-hidden="true" className="eyebrow mb-1 text-accent-strong">
                    {kicker}
                  </p>
                )}
                <p className="font-display text-[17px] leading-snug font-semibold text-pretty break-words text-ink sm:text-lg">
                  {kicker ? <span className="sr-only">{kicker} — </span> : null}
                  {title}
                </p>
                {step.description && <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{step.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
