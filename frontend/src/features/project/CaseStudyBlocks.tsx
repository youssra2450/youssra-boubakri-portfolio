import { ArrowUpRight, Check } from "lucide-react";
import { lazy, Suspense } from "react";

import { GitHubIcon } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { ordinal } from "@/lib/portfolio";

/** Presentational building blocks of a case study (see caseStudySections.tsx). Light theme only. */

const UavTrajectoryLab = lazy(() => import("@/features/project/uav/UavTrajectoryLab"));

export function Lead({ children }: { children: string }) {
  return <p className="max-w-3xl text-lg leading-relaxed text-pretty text-ink/90 md:text-[1.2rem]">{children}</p>;
}

/** Problem / approach statements: prose with an accent rule. */
export function Statement({ children }: { children: string }) {
  return (
    <div className="max-w-3xl border-l-2 border-accent/40 pl-5 sm:pl-6">
      <p className="text-[17px] leading-relaxed text-pretty text-slate-600">{children}</p>
    </div>
  );
}

export function ConceptList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2.5">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-accent-tint/70 py-2 pr-4 pl-3 text-[15px] font-medium text-accent-strong"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function TechnologyGrid({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <li
          key={item}
          className="flex min-h-12 min-w-0 items-center gap-2.5 rounded-[10px] border border-line bg-white px-4 font-mono text-[13px] text-ink shadow-[0_1px_2px_rgb(19_34_63/0.04)] transition-[border-color,box-shadow] duration-200 hover:border-accent/35 hover:shadow-soft"
        >
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Implementation steps: numbered rows inside one hairline card. */
export function NumberedList({ items }: { items: readonly string[] }) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white shadow-soft">
      {items.map((item, index) => (
        <li key={item} className="flex gap-4 px-5 py-4 sm:gap-5 sm:px-6">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-100 font-mono text-[12px] font-medium text-accent-strong">
            {ordinal(index + 1)}
          </span>
          <span className="pt-0.5 leading-relaxed text-ink/85">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** Key capabilities (project features) as a two-column grid of check items. */
export function CapabilityGrid({ items }: { items: readonly string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 rounded-[10px] border border-line bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink"
        >
          <span
            aria-hidden="true"
            className="mt-[3px] flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-strong"
          >
            <Check className="size-3" strokeWidth={2.5} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Outcomes: a light blue panel with accent markers. */
export function OutcomeList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-4 rounded-card border border-sky-200 bg-sky-50 p-5 sm:p-7">
      {items.map((item) => (
        <li key={item} className="flex gap-4">
          <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rotate-45 rounded-[2px] bg-accent" />
          <span className="text-[17px] leading-relaxed text-ink/85">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AccentList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item} className="flex gap-4">
          <span aria-hidden="true" className="mt-2 h-4 w-0.5 shrink-0 rounded-full bg-accent" />
          <span className="text-[17px] leading-relaxed text-slate-600">{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface SourceLinksProps {
  github: string | null;
  demo: string | null;
}

export function SourceLinks({ github, demo }: SourceLinksProps) {
  return (
    <div className="flex flex-col gap-5 rounded-card border border-line bg-ivory p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <p className="max-w-md text-[15px] leading-relaxed text-slate-600">
        {github && demo
          ? "Browse the source code or open the live demo."
          : github
            ? "Browse the source code of this project on GitHub."
            : "Open the live demo of this project."}
      </p>
      <div className="flex flex-wrap gap-3">
        {github && (
          <ButtonLink href={github} external leadingIcon={<GitHubIcon />}>
            View source on GitHub{" "}<span className="sr-only">(opens in a new tab)</span>
          </ButtonLink>
        )}
        {demo && (
          <ButtonLink
            href={demo}
            external
            variant={github ? "secondary" : "primary"}
            trailingIcon={<ArrowUpRight aria-hidden="true" />}
          >
            Open live demo{" "}<span className="sr-only">(opens in a new tab)</span>
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

/** Lazy-loaded TSP-UAV lab (its own chunk) with a skeleton of the same footprint. */
export function InteractiveLab({ githubUrl }: { githubUrl: string | null }) {
  return (
    <>
      <p className="mb-6 max-w-3xl text-[17px] leading-relaxed text-slate-600">
        Compare four approaches on a random set of IoT nodes: select an algorithm, then press Run to fly the UAV
        along the computed tour.
      </p>
      <Suspense fallback={<LabSkeleton />}>
        <UavTrajectoryLab githubUrl={githubUrl} />
      </Suspense>
    </>
  );
}

function LabSkeleton() {
  return (
    <div role="status" aria-busy="true" className="rounded-media border border-sky-200 bg-sky-50 p-4 sm:p-6">
      <span className="sr-only">Loading the interactive visualisation…</span>
      <div aria-hidden="true" className="h-11 w-full animate-pulse rounded-xl bg-white motion-reduce:animate-none" />
      <div aria-hidden="true" className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="aspect-square w-full animate-pulse rounded-media bg-white motion-reduce:animate-none" />
        <div className="space-y-3">
          <div className="h-6 w-full animate-pulse rounded-md bg-sky-100 motion-reduce:animate-none" />
          <div className="h-11 w-full animate-pulse rounded-[10px] bg-sky-100 motion-reduce:animate-none" />
          <div className="h-11 w-full animate-pulse rounded-[10px] bg-sky-100 motion-reduce:animate-none" />
          <div className="h-40 w-full animate-pulse rounded-md bg-sky-100 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
