import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState, type CSSProperties, type PointerEvent } from "react";
import { Link } from "react-router";

import { TechList } from "@/components/common/TechList";
import { GitHubIcon } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectVisual } from "@/features/project/ProjectVisual";
import { fetchCached } from "@/hooks/useApi";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";
import { safeHref } from "@/lib/url";
import { projectPath, projectRoute } from "@/services/portfolio";
import type { ProjectSummary } from "@/types/api";

const CONCEPT_PREVIEW = 4;
const TECH_PREVIEW = 5;
const DOMAIN_PREVIEW = 3;
/** Longest first-view cover animation (stagger + line-art) — the flag is cleared afterwards. */
const INTRO_MS = 3200;

interface ProjectCardProps {
  project: ProjectSummary;
  /** Flagship presentation: wider cover, two-column body on large screens, accent frame. */
  spotlight?: boolean;
  /** Position in the grid; staggers the first-view cover animation. */
  index?: number;
  /** Play the one-shot cover animation the first time the card is seen (off after a filter change). */
  playIntro?: boolean;
}

/** Warm the case-study cache when the visitor shows intent (hover / focus on "View details"). */
function prefetchProject(slug: string): void {
  void fetchCached(projectPath(slug)).catch(() => undefined);
}

/** Cursor-following spotlight: CSS variables only (no React state), mouse pointers only. */
function trackSpotlight(event: PointerEvent<HTMLElement>): void {
  if (event.pointerType !== "mouse") return;
  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  card.style.setProperty("--spot-x", `${Math.round(event.clientX - bounds.left)}px`);
  card.style.setProperty("--spot-y", `${Math.round(event.clientY - bounds.top)}px`);
}

/**
 * Project card (docs/SPEC.md §3.4): cover, category, title, context · period, summary,
 * key concepts, stack and explicit actions — the card itself is not one giant link.
 */
export function ProjectCard({ project, spotlight = false, index = 0, playIntro = true }: ProjectCardProps) {
  const [cardRef, seen] = useInView<HTMLElement>({ once: true, threshold: 0.25, rootMargin: "0px" });
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (!seen || !playIntro) return;
    const timer = window.setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [seen, playIntro]);

  const meta = [project.context, project.period_label].filter(Boolean).join(" · ");
  const github = safeHref(project.github_url);
  const demo = safeHref(project.demo_url);
  const titleId = `project-card-${project.slug}`;
  const concepts = project.concepts.slice(0, CONCEPT_PREVIEW);
  const domains = project.domains.slice(0, DOMAIN_PREVIEW);
  const details = projectRoute(project.slug);

  return (
    <article
      ref={cardRef}
      aria-labelledby={titleId}
      data-variant={spotlight ? "spotlight" : "default"}
      data-intro={seen && playIntro && !introDone ? "play" : undefined}
      onPointerMove={trackSpotlight}
      style={{ "--intro-delay": `${320 + (index % 3) * 110}ms` } as CSSProperties}
      className={cn(
        "project-card group relative flex h-full flex-col overflow-hidden rounded-card border bg-white",
        spotlight
          ? "border-accent/35 shadow-[0_1px_2px_rgb(19_34_63/0.04),0_24px_56px_-30px_rgb(46_107_203/0.5)]"
          : "border-line shadow-soft",
      )}
    >
      {spotlight && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-[2] h-0.5 bg-linear-to-r from-transparent via-accent to-transparent opacity-80"
        />
      )}

      <div className="relative">
        {/* Mouse shortcut to the case study; keyboard users get the explicit "View details" link. */}
        <Link to={details} tabIndex={-1} aria-hidden="true" className="block" onPointerEnter={() => prefetchProject(project.slug)}>
          <ProjectVisual
            visual={project.visual}
            className={cn("aspect-[16/9] border-b border-line", spotlight && "lg:aspect-[2.35/1]")}
          />
        </Link>
        {spotlight && (
          // Below lg the flagship card has a regular-width cover: the label flows under it instead of over the art.
          <p className="pointer-events-none mx-6 mt-5 -mb-2 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-white/90 py-1 pr-3 pl-2.5 font-mono text-[11px] font-medium tracking-[0.12em] text-accent-strong uppercase shadow-soft backdrop-blur-sm lg:absolute lg:top-4 lg:left-4 lg:m-0">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            Flagship project
          </p>
        )}
        {/* Taxonomy domains on the wide flagship cover only (they would crowd the line-art of regular covers). */}
        {spotlight && domains.length > 0 && (
          <ul
            aria-label="Domains"
            className="pointer-events-none absolute top-4 right-4 hidden max-w-[55%] flex-wrap justify-end gap-1.5 lg:flex"
          >
            {domains.map((domain) => (
              <li
                key={domain}
                className="rounded-full border border-line/80 bg-white/85 px-2 py-0.5 font-mono text-[10.5px] leading-4 text-slate-600 backdrop-blur-sm"
              >
                {domain}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={cn(
          "relative flex flex-1 flex-col p-6",
          // Spare height goes to the first row and the bottom padding matches regular cards, so the
          // actions row lines up with the neighbouring card's.
          spotlight &&
            "lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-rows-[1fr_auto] lg:gap-x-10 lg:px-8 lg:pt-8",
        )}
      >
        <div className="min-w-0">
          <p className="eyebrow text-accent-strong">{project.category}</p>
          <h3
            id={titleId}
            className={cn(
              "mt-3 font-bold text-balance text-ink",
              spotlight ? "text-[1.4rem] leading-tight md:text-[1.65rem]" : "text-xl leading-snug",
            )}
          >
            {project.title}
          </h3>
          {meta && (
            <p data-project-meta className="mt-2 font-mono text-[12px] text-slate-600">
              {meta}
            </p>
          )}
          <p
            className={cn(
              "mt-4 text-[15px] leading-relaxed text-slate-600",
              spotlight ? "line-clamp-4 md:text-base" : "line-clamp-3",
            )}
          >
            {project.summary}
          </p>
        </div>

        {/* Chips follow the summary; any spare height goes above the actions row, so dividers align across a row. */}
        <div className={cn("space-y-4 pt-5 pb-6", spotlight && "lg:space-y-5 lg:pt-1 lg:pb-0")}>
          {concepts.length > 0 && (
            <div>
              {spotlight && <p className="eyebrow mb-2.5 hidden text-slate-600 lg:block">Key concepts</p>}
              <ul aria-label="Key concepts" className="flex flex-wrap gap-1.5">
                {concepts.map((concept) => (
                  <li
                    key={concept}
                    className="rounded-md border border-accent/20 bg-accent-tint/70 px-2 py-[3px] text-[12px] leading-4 font-medium text-accent-strong"
                  >
                    {concept}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {project.technologies.length > 0 && (
            <div>
              {spotlight && <p className="eyebrow mb-2.5 hidden text-slate-600 lg:block">Stack</p>}
              <TechList items={project.technologies} max={TECH_PREVIEW} className="gap-1.5" />
            </div>
          )}
        </div>

        <div
          className={cn(
            "mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-5",
            spotlight && "lg:col-span-2 lg:mt-6",
          )}
        >
          <Link
            to={details}
            onPointerEnter={() => prefetchProject(project.slug)}
            onFocus={() => prefetchProject(project.slug)}
            className="group/details -ml-1 inline-flex min-h-9 items-center gap-1.5 rounded-md px-1 text-[15px] font-semibold text-ink underline decoration-transparent decoration-1 underline-offset-[6px] transition-[color,text-decoration-color] duration-200 hover:text-accent-strong hover:decoration-accent/40 pointer-coarse:min-h-11"
          >
            View details<span className="sr-only">: {project.title}</span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-accent transition-transform duration-200 group-hover:translate-x-0.5 group-hover/details:translate-x-1"
            />
          </Link>
          {(github || demo) && (
            <div className="ml-auto flex flex-wrap gap-2">
              {github && (
                <ButtonLink
                  href={github}
                  external
                  variant="secondary"
                  size="sm"
                  leadingIcon={<GitHubIcon />}
                  className="pointer-coarse:h-11"
                >
                  GitHub{" "}<span className="sr-only">repository of {project.title} (opens in a new tab)</span>
                </ButtonLink>
              )}
              {demo && (
                <ButtonLink
                  href={demo}
                  external
                  variant="secondary"
                  size="sm"
                  trailingIcon={<ArrowUpRight aria-hidden="true" />}
                  className="pointer-coarse:h-11"
                >
                  Demo{" "}<span className="sr-only">of {project.title} (opens in a new tab)</span>
                </ButtonLink>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
