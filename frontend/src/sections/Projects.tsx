import { useMemo, useState, type CSSProperties } from "react";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useInView } from "@/hooks/useInView";
import { prefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import { buildDomainFilters, filterProjectsByDomain, findSpotlightProject, sortProjects } from "@/lib/portfolio";
import { SECTION } from "@/lib/site";
import { ProjectCard } from "@/sections/ProjectCard";
import type { ProjectSummary } from "@/types/api";

interface ProjectsProps {
  projects: readonly ProjectSummary[];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Phones: bring the chosen chip to the middle of the horizontally scrolling row (never scrolls the page). */
function centerInRow(chip: HTMLElement): void {
  const row = chip.parentElement;
  if (!row || row.scrollWidth <= row.clientWidth || typeof row.scrollTo !== "function") return;
  row.scrollTo({
    left: chip.offsetLeft - row.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/**
 * #projects — "Featured projects" (docs/SPEC.md §3.4): taxonomy filters with counts,
 * a flagship spotlight card in the "All" view, then featured projects by display order.
 * Light ivory surface; cards stagger in on first view and re-enter briefly after a filter change.
 */
export function Projects({ projects }: ProjectsProps) {
  const [domain, setDomain] = useState<string | null>(null);
  const [filtered, setFiltered] = useState(false);
  const [gridRef, revealed] = useInView<HTMLUListElement>({ once: true, rootMargin: "0px 0px -10% 0px" });
  const ordered = useMemo(() => sortProjects(projects), [projects]);
  const filters = useMemo(() => buildDomainFilters(ordered), [ordered]);
  const spotlight = useMemo(() => findSpotlightProject(ordered), [ordered]);

  const visible = useMemo(() => {
    const matching = filterProjectsByDomain(ordered, domain);
    if (domain !== null || !spotlight) return matching;
    return [spotlight, ...matching.filter((project) => project.slug !== spotlight.slug)];
  }, [ordered, domain, spotlight]);

  if (ordered.length === 0) return null;
  const spotlightSlug = domain === null ? spotlight?.slug : undefined;

  function selectDomain(next: string | null): void {
    setDomain(next);
    setFiltered(true);
  }

  return (
    <Section id={SECTION.projects} tone="ivory" className="overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(55%_65%_at_88%_0%,rgb(207_224_246/0.6),transparent_70%),radial-gradient(40%_50%_at_0%_10%,rgb(243_237_227/0.9),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sand-200 to-transparent"
      />
      <Container className="relative">
        <SectionHeading
          sectionId={SECTION.projects}
          index="07"
          eyebrow="Projects"
          title="Featured projects"
          lead="Selected case studies spanning Data Science, Data Engineering, Machine Learning, NLP, LLMs, Computer Vision and Optimization — each one documents the problem, the engineering approach, the architecture and the stack."
        />

        {filters.length > 0 && (
          <div className="mt-12 flex items-center justify-between gap-6">
            <div
              role="group"
              aria-label="Filter projects by domain"
              className="no-scrollbar -mx-5 flex min-w-0 flex-1 gap-2 overflow-x-auto px-5 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              <FilterChip label="All" count={ordered.length} active={domain === null} onClick={() => selectDomain(null)} />
              {filters.map((filter) => (
                <FilterChip
                  key={filter.name}
                  label={filter.name}
                  count={filter.count}
                  active={domain === filter.name}
                  onClick={() => selectDomain(domain === filter.name ? null : filter.name)}
                />
              ))}
            </div>
            <p aria-hidden="true" className="hidden shrink-0 font-mono text-[12px] tracking-[0.06em] text-slate-600 lg:block">
              Showing <span className="text-ink tabular-nums">{pad(visible.length)}</span> of{" "}
              <span className="tabular-nums">{pad(ordered.length)}</span>
            </p>
          </div>
        )}

        <p aria-live="polite" className="sr-only">
          {visible.length} {visible.length === 1 ? "project" : "projects"} shown
        </p>

        <ul
          key={domain ?? "all"}
          ref={gridRef}
          data-revealed={revealed}
          data-filtered={filtered}
          className={cn("projects-grid grid gap-6 md:grid-cols-2 lg:grid-cols-3", filters.length > 0 ? "mt-8" : "mt-14")}
        >
          {visible.map((project, index) => {
            const isSpotlight = project.slug === spotlightSlug;
            return (
              <li
                key={project.slug}
                className={cn("project-item min-w-0", isSpotlight && "lg:col-span-2")}
                style={{ "--item-delay": `${Math.min(index, 6) * 90}ms`, "--item-index": String(index) } as CSSProperties}
              >
                <ProjectCard project={project} spotlight={isSpotlight} index={index} playIntro={!filtered} />
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={(event) => {
        onClick();
        centerInRow(event.currentTarget);
      }}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-full border py-1 pr-1.5 pl-4 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-200 pointer-coarse:min-h-11",
        active
          ? "border-accent bg-accent text-white shadow-[0_8px_18px_-10px_rgb(46_107_203/0.75)]"
          : "border-line bg-white text-slate-600 hover:border-accent/40 hover:text-ink hover:shadow-soft",
      )}
    >
      {label}
      <span
        aria-hidden="true"
        className={cn(
          "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-mono text-[11px] tabular-nums transition-colors duration-200",
          active ? "bg-white/20 text-white" : "bg-sky-100 text-accent-strong",
        )}
      >
        {count}
      </span>
      <span className="sr-only">
        ({count} {count === 1 ? "project" : "projects"})
      </span>
    </button>
  );
}
