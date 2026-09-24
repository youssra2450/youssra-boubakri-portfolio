import { ArrowRight, CloudOff, RefreshCw, SearchX } from "lucide-react";
import { useMemo, type MouseEvent } from "react";
import { useParams } from "react-router";

import { Button, ButtonLink } from "@/components/ui/Button";
import { ARROW_NUDGE } from "@/components/ui/buttonStyles";
import { Container } from "@/components/ui/Container";
import { buildCaseStudySections, type CaseStudySection } from "@/features/project/caseStudySections";
import { ProjectHeader } from "@/features/project/ProjectHeader";
import { ProjectPager } from "@/features/project/ProjectPager";
import { ProjectSkeleton } from "@/features/project/ProjectSkeleton";
import { ProjectStatus } from "@/features/project/ProjectStatus";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useDocumentMeta, type DocumentMeta } from "@/hooks/useDocumentMeta";
import { useInView } from "@/hooks/useInView";
import { usePortfolio, useProject } from "@/hooks/usePortfolio";
import { cn } from "@/lib/cn";
import { findNeighbours, ordinal } from "@/lib/portfolio";
import { SECTION, sectionHref, SITE_NAME } from "@/lib/site";
import { ApiError } from "@/services/api";
import { projectRoute } from "@/services/portfolio";
import type { Portfolio, ProjectDetail } from "@/types/api";

/** "/projects/:slug" — case study (docs/SPEC.md §3.5), light theme. */
export default function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const { data: project, error, validating, reload } = useProject(slug);
  // Reuses the cached home payload for the owner's name, contact email and prev / next links.
  const { data: portfolio } = usePortfolio();
  const owner = portfolio?.profile.full_name || SITE_NAME;
  const notFound = !project && error instanceof ApiError && error.status === 404;

  let meta: DocumentMeta = {};
  if (project) {
    meta = {
      title: owner ? `${project.title} — ${owner}` : project.title,
      description: project.summary,
      canonicalPath: projectRoute(project.slug),
    };
  } else if (notFound) {
    meta = { title: owner ? `Project not found — ${owner}` : "Project not found", robots: "noindex, follow" };
  }
  useDocumentMeta(meta);

  if (!project) {
    if (notFound) {
      return (
        <ProjectStatus
          icon={SearchX}
          eyebrow="Error 404"
          title="Project not found"
          description="This case study does not exist or is no longer published. The full portfolio of projects remains available."
          actions={
            <>
              <ButtonLink
                to={sectionHref(SECTION.projects)}
                trailingIcon={<ArrowRight aria-hidden="true" className={ARROW_NUDGE} />}
              >
                Browse all projects
              </ButtonLink>
              <ButtonLink to="/" variant="secondary">
                Home page
              </ButtonLink>
            </>
          }
        />
      );
    }
    if (error) {
      return (
        <ProjectStatus
          icon={CloudOff}
          eyebrow="Temporarily unavailable"
          title="This project could not be loaded"
          description="The server did not respond as expected. Please try again in a moment."
          actions={
            <Button loading={validating} leadingIcon={<RefreshCw aria-hidden="true" />} onClick={reload}>
              Try again
            </Button>
          }
        />
      );
    }
    return <ProjectSkeleton />;
  }

  return <CaseStudy project={project} portfolio={portfolio} />;
}

interface CaseStudyProps {
  project: ProjectDetail;
  portfolio: Portfolio | undefined;
}

function CaseStudy({ project, portfolio }: CaseStudyProps) {
  const contactEmail = portfolio?.profile.email || null;
  const sections = useMemo(() => buildCaseStudySections(project), [project]);
  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);
  const active = useActiveSection(sectionIds, "-20% 0px -70% 0px") ?? sectionIds[0];
  const { previous, next } = findNeighbours(portfolio?.projects ?? [], project.slug);

  return (
    <article aria-labelledby="project-title">
      <ProjectHeader project={project} contactEmail={contactEmail} />

      <div className="bg-white">
        <Container className="grid gap-12 py-16 md:py-24 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-28">
              <OnThisPage sections={sections} active={active} />
              <div className="mt-10 rounded-card border border-sky-200 bg-sky-50 p-5">
                <p className="text-sm font-semibold text-ink">Interested in this work?</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Happy to walk through the technical approach in more detail.
                </p>
                <ButtonLink
                  to={sectionHref(SECTION.contact)}
                  size="sm"
                  className="mt-4"
                  trailingIcon={<ArrowRight aria-hidden="true" className={ARROW_NUDGE} />}
                >
                  Get in touch
                </ButtonLink>
              </div>
            </div>
          </aside>

          <div className="min-w-0 lg:col-span-9">
            {sections.map((section, index) => (
              <CaseStudySectionView key={section.id} section={section} index={index} />
            ))}
          </div>
        </Container>
      </div>

      <ProjectPager previous={previous} next={next} />
    </article>
  );
}

/** One case-study section; its content reveals once when scrolled into view. */
function CaseStudySectionView({ section, index }: { section: CaseStudySection; index: number }) {
  const [ref, revealed] = useInView<HTMLDivElement>({ once: true, rootMargin: "0px 0px -8% 0px" });
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      tabIndex={-1}
      className="scroll-mt-6 border-t border-line py-12 outline-none first:border-t-0 first:pt-0 last:pb-0"
    >
      <div ref={ref} data-revealed={revealed} className="cs-reveal">
        <p aria-hidden="true" className="flex items-center gap-3 font-mono text-xs text-accent-strong">
          {ordinal(index + 1)}
          <span className="h-px w-8 bg-accent/40" />
        </p>
        <h2 id={`${section.id}-title`} className="mt-3 text-2xl font-bold text-ink md:text-[1.75rem]">
          {section.label}
        </h2>
        <div className="mt-6">{section.content}</div>
      </div>
    </section>
  );
}

/** Jump to a section without adding a history entry, moving focus along for keyboard users. */
function jumpTo(event: MouseEvent<HTMLAnchorElement>, id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ block: "start" });
  target.focus({ preventScroll: true });
}

function OnThisPage({ sections, active }: { sections: readonly CaseStudySection[]; active: string | undefined }) {
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === active),
  );
  const progress = sections.length > 1 ? activeIndex / (sections.length - 1) : 1;

  return (
    <nav aria-label="On this page">
      <p className="eyebrow text-slate-600">On this page</p>
      <div className="relative mt-5">
        <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-px bg-line" />
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 w-px origin-top bg-accent/50 transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ height: "100%", transform: `scaleY(${progress})` }}
        />
        <ol>
          {sections.map((section) => {
            const current = section.id === active;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(event) => jumpTo(event, section.id)}
                  aria-current={current ? "location" : undefined}
                  className={cn(
                    "relative block py-1.5 pl-4 text-sm transition-colors duration-200",
                    current ? "font-medium text-ink" : "text-slate-600 hover:text-accent-strong",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-1/2 -left-[3px] size-[7px] -translate-y-1/2 rounded-full border transition-[background-color,border-color,scale] duration-300",
                      current ? "scale-110 border-accent bg-accent" : "border-line bg-white",
                    )}
                  />
                  {section.label}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
