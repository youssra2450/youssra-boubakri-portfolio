import { ArrowLeft, ArrowUpRight, Briefcase, CalendarDays, Layers, Lock, Mail } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router";

import { TechList } from "@/components/common/TechList";
import { GitHubIcon } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ProjectVisual } from "@/features/project/ProjectVisual";
import { SECTION, sectionHref } from "@/lib/site";
import { mailtoHref, safeHref } from "@/lib/url";
import type { ProjectDetail } from "@/types/api";

interface ProjectHeaderProps {
  project: ProjectDetail;
  /** Owner's email for the "source code on request" fallback (null while the profile loads). */
  contactEmail: string | null;
}

/** Staggered entrance step (styles/projects.css `.cs-enter`). */
function enter(step: number): CSSProperties {
  return { "--enter-delay": `${step * 80}ms` } as CSSProperties;
}

/**
 * Light page header of a case study (Palette v4): ivory → white surface with a soft blue glow,
 * breadcrumb, category, title, context, domains, stack, source links and the project cover.
 */
export function ProjectHeader({ project, contactEmail }: ProjectHeaderProps) {
  const github = safeHref(project.github_url);
  const demo = safeHref(project.demo_url);
  const hasMeta = Boolean(project.context || project.period_label || project.domains.length > 0);

  return (
    <header className="relative isolate overflow-hidden border-b border-line bg-linear-to-b from-ivory via-ivory to-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_60%_at_82%_30%,rgb(207_224_246/0.7),transparent_70%),radial-gradient(35%_45%_at_5%_0%,rgb(243_237_227/0.95),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(46_107_203/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(46_107_203/0.05)_1px,transparent_1px)] mask-[radial-gradient(60%_70%_at_75%_35%,#000,transparent_75%)] bg-size-[28px_28px]"
      />
      <Container className="pt-28 pb-14 md:pt-36 md:pb-20">
        <nav aria-label="Breadcrumb" className="cs-enter" style={enter(0)}>
          <Link
            to={sectionHref(SECTION.projects)}
            className="group -ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-medium text-slate-600 transition-colors hover:text-accent-strong"
          >
            <ArrowLeft aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to projects
          </Link>
        </nav>

        <div className="mt-8 grid items-center gap-12 lg:mt-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <p className="eyebrow cs-enter flex items-start gap-3 text-accent-strong" style={enter(1)}>
              <span aria-hidden="true" className="mt-[0.7em] h-px w-8 shrink-0 bg-current opacity-50" />
              {project.category}
            </p>
            <h1
              id="project-title"
              className="cs-enter mt-5 text-[clamp(2.1rem,3.6vw,3.1rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance text-ink"
              style={enter(2)}
            >
              {project.title}
            </h1>
            {project.title_original && (
              <p lang="fr" className="cs-enter mt-4 text-lg text-slate-600 italic" style={enter(3)}>
                {project.title_original}
              </p>
            )}

            {hasMeta && (
              <dl
                className="cs-enter mt-7 flex flex-wrap gap-x-7 gap-y-3 text-[15px] text-slate-600"
                style={enter(4)}
              >
                {project.context && (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Context</dt>
                    <Briefcase aria-hidden="true" className="size-4 text-accent" />
                    <dd>{project.context}</dd>
                  </div>
                )}
                {project.period_label && (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Period</dt>
                    <CalendarDays aria-hidden="true" className="size-4 text-accent" />
                    <dd>{project.period_label}</dd>
                  </div>
                )}
                {project.domains.length > 0 && (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Domains</dt>
                    <Layers aria-hidden="true" className="size-4 text-accent" />
                    <dd>{project.domains.join(" · ")}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="cs-enter mt-8 flex flex-wrap items-center gap-3" style={enter(5)}>
              {github || demo ? (
                <>
                  {github && (
                    <ButtonLink href={github} external leadingIcon={<GitHubIcon />}>
                      View on GitHub{" "}<span className="sr-only">(opens in a new tab)</span>
                    </ButtonLink>
                  )}
                  {demo && (
                    <ButtonLink
                      href={demo}
                      external
                      variant={github ? "secondary" : "primary"}
                      trailingIcon={<ArrowUpRight aria-hidden="true" />}
                    >
                      Live demo{" "}<span className="sr-only">(opens in a new tab)</span>
                    </ButtonLink>
                  )}
                </>
              ) : (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-white/80 px-4 py-2.5 text-[15px] text-slate-600 shadow-soft">
                  <span className="inline-flex items-center gap-2">
                    <Lock aria-hidden="true" className="size-4 text-accent" />
                    Source code available on request.
                  </span>
                  {contactEmail && (
                    <a
                      href={mailtoHref(contactEmail, `Source code request — ${project.title}`)}
                      className="inline-flex items-center gap-1.5 rounded-sm font-medium text-accent-strong underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      <Mail aria-hidden="true" className="size-4" />
                      Request by email
                    </a>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="cs-enter-media lg:col-span-5" style={enter(3)}>
            <div className="rounded-media border border-line bg-white p-2 shadow-media">
              <ProjectVisual visual={project.visual} className="aspect-[16/10] rounded-[14px]" />
            </div>
          </div>
        </div>

        {project.technologies.length > 0 && (
          <div className="cs-enter mt-10 max-w-4xl" style={enter(6)}>
            <p aria-hidden="true" className="eyebrow mb-3 text-slate-600">
              Stack
            </p>
            <TechList items={project.technologies} />
          </div>
        )}
      </Container>
    </header>
  );
}
