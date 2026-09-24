import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { Container } from "@/components/ui/Container";
import { ProjectVisual } from "@/features/project/ProjectVisual";
import { cn } from "@/lib/cn";
import { SECTION, sectionHref } from "@/lib/site";
import { projectRoute } from "@/services/portfolio";
import type { ProjectSummary } from "@/types/api";

interface ProjectPagerProps {
  previous: ProjectSummary | null;
  next: ProjectSummary | null;
}

/** Previous / next case study on an ivory band, each with a miniature of its cover. */
export function ProjectPager({ previous, next }: ProjectPagerProps) {
  return (
    <nav aria-label="More projects" className="border-t border-sand-200 bg-ivory">
      <Container className="py-14 md:py-20">
        {(previous || next) && (
          <>
            <p className="eyebrow text-accent-strong">Continue exploring</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {previous ? <PagerCard project={previous} direction="previous" /> : <span className="hidden md:block" />}
              {next && <PagerCard project={next} direction="next" />}
            </div>
          </>
        )}
        <p className={cn("text-center", (previous || next) && "mt-10")}>
          <Link
            to={sectionHref(SECTION.projects)}
            className="inline-flex min-h-11 items-center rounded-md px-2 text-[15px] font-semibold text-ink underline decoration-sand-400 underline-offset-8 transition-colors hover:text-accent-strong hover:decoration-accent"
          >
            View all projects
          </Link>
        </p>
      </Container>
    </nav>
  );
}

function PagerCard({ project, direction }: { project: ProjectSummary; direction: "previous" | "next" }) {
  const isNext = direction === "next";
  const Arrow = isNext ? ArrowRight : ArrowLeft;
  return (
    <Link
      to={projectRoute(project.slug)}
      rel={isNext ? "next" : "prev"}
      className={cn(
        "pager-card group flex h-full items-center gap-5 rounded-card border border-line bg-white p-4 shadow-soft transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-lift sm:p-5",
        isNext && "md:flex-row-reverse md:text-right",
      )}
    >
      <ProjectVisual
        visual={project.visual}
        className="hidden aspect-[4/3] w-28 shrink-0 rounded-[10px] border border-line sm:block"
      />
      <span className={cn("flex min-w-0 flex-col", isNext && "md:items-end")}>
        <span className="eyebrow flex items-center gap-2 text-slate-600">
          {!isNext && (
            <Arrow aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          )}
          {isNext ? "Next project" : "Previous project"}
          {isNext && (
            <Arrow aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </span>
        <span className="mt-2.5 font-display text-lg leading-snug font-bold text-balance text-ink transition-colors group-hover:text-accent-strong">
          {project.title}
        </span>
        <span className="mt-1 font-mono text-[12px] text-slate-600">{project.category}</span>
      </span>
    </Link>
  );
}
