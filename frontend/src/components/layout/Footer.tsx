import { ArrowRight, ArrowUp, ArrowUpRight, Mail, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { Monogram } from "@/components/common/Brand";
import { NAV_ITEMS } from "@/components/layout/navigation";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/BrandIcons";
import { ButtonLink } from "@/components/ui/Button";
import { ARROW_NUDGE } from "@/components/ui/buttonStyles";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { usePortfolio } from "@/hooks/usePortfolio";
import { prefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { mobilityHighlight, sortProjects, splitHeadline } from "@/lib/portfolio";
import { SECTION, sectionHref, SITE_NAME } from "@/lib/site";
import { mailtoHref, safeHref } from "@/lib/url";
import { API_DOCS_URL, projectRoute } from "@/services/portfolio";

const CURRENT_YEAR = new Date().getFullYear();
const SELECTED_PROJECTS = 4;

const LINK_BASE =
  "group/link inline-flex min-h-9 gap-2 rounded-sm text-[15px] text-slate-600 transition-colors duration-200 hover:text-accent-strong";
const LINK_CLASS = `${LINK_BASE} items-center`;

/** Smooth scroll back to the top and move focus to the start of the page. */
function backToTop(): void {
  window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  document.getElementById("main")?.focus({ preventScroll: true });
}

/**
 * Footer v4 (docs/SPEC.md §3.3): call-to-action band with the availability pill, a 4-column
 * grid (brand · navigate · selected projects · connect) and a bottom bar. Data from the API;
 * missing links are hidden.
 */
export function Footer() {
  const data = usePortfolio().data;
  const profile = data?.profile;
  const name = profile?.full_name ?? SITE_NAME;
  const projects = data ? sortProjects(data.projects).slice(0, SELECTED_PROJECTS) : [];
  const availability = ["Open to opportunities", mobilityHighlight(profile?.mobility)].filter(Boolean).join(" · ");
  const github = safeHref(profile?.github_url);
  const linkedin = safeHref(profile?.linkedin_url);

  return (
    <footer className="relative isolate overflow-hidden border-t border-sand-200 bg-sand text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.75),transparent)]"
      />
      <Container className="pt-16 md:pt-20">
        {/* Call-to-action band */}
        <Reveal
          variant="scale-in"
          className="relative isolate overflow-hidden rounded-[28px] border border-white bg-white/85 p-7 shadow-soft sm:p-10 md:p-12"
        >
          <FooterBandArt />
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-7">
              <p className="inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-success/20 sm:rounded-full bg-success/[0.07] py-1.5 pr-3.5 pl-3 text-[13px] font-medium text-success-strong">
                <span aria-hidden="true" className="status-ping size-2 shrink-0 rounded-full bg-success text-success" />
                <span className="min-w-0">{availability}</span>
              </p>
              <h2 className="mt-6 max-w-2xl text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.12] font-bold tracking-tight text-balance">
                Let&apos;s turn your data into decision-ready products.
              </h2>
              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-pretty text-slate-600">
                Available for full-time roles and internships in data science, data engineering and analytics — in
                Morocco or abroad.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:flex-col lg:items-end">
              <ButtonLink
                to={sectionHref(SECTION.contact)}
                size="lg"
                className="justify-center lg:w-64"
                trailingIcon={<ArrowRight aria-hidden="true" className={ARROW_NUDGE} />}
              >
                Get in touch
              </ButtonLink>
              {linkedin && (
                <ButtonLink
                  href={linkedin}
                  external
                  variant="secondary"
                  size="lg"
                  className="justify-center lg:w-64"
                  leadingIcon={<LinkedInIcon />}
                >
                  Connect on LinkedIn
                </ButtonLink>
              )}
            </div>
          </div>
        </Reveal>

        {/* Main grid */}
        <div className="grid gap-12 py-16 sm:grid-cols-2 md:py-20 lg:grid-cols-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-4">
            <Link to="/" className="group/brand inline-flex items-center gap-3 rounded-md" aria-label={`${name || "Portfolio"} — home`}>
              <Monogram name={name} size="lg" />
              <span aria-hidden="true" className="font-display text-lg font-bold tracking-tight text-ink">
                {name}
              </span>
            </Link>
            {profile && (
              <>
                {/* "A | B | C" → "A · B · C": a pipe reads like a capital I in Manrope. */}
                <p className="mt-6 font-display text-[15px] font-semibold text-ink">
                  {splitHeadline(profile.headline).join(" · ")}
                </p>
                {profile.tagline && (
                  <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-slate-600">{profile.tagline}</p>
                )}
                {profile.location && (
                  <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white/70 px-3 py-1 text-[13px] font-medium text-ink">
                    <MapPin aria-hidden="true" className="size-3.5 text-accent-strong" />
                    {profile.location}
                  </p>
                )}
              </>
            )}
          </div>

          <FooterColumn title="Navigate" className="lg:col-span-2 lg:col-start-6">
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <Link to={sectionHref(item.id)} className={LINK_CLASS}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterColumn>

          {projects.length > 0 && (
            <FooterColumn title="Selected projects" className="lg:col-span-3">
              <ul className="space-y-1">
                {projects.map((project) => (
                  <li key={project.slug}>
                    <Link to={projectRoute(project.slug)} className={`${LINK_BASE} items-start py-1.5 leading-snug`}>
                      <span className="line-clamp-2">{project.title}</span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 opacity-0 transition-[opacity,translate] duration-200 group-hover/link:translate-x-0.5 group-hover/link:opacity-100"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </FooterColumn>
          )}

          <FooterColumn title="Connect" className="lg:col-span-2">
            <ul>
              {profile?.email && (
                <FooterLink href={mailtoHref(profile.email)} icon={<Mail aria-hidden="true" />}>
                  Email
                </FooterLink>
              )}
              {linkedin && (
                <FooterLink href={linkedin} external icon={<LinkedInIcon />}>
                  LinkedIn
                </FooterLink>
              )}
              {github && (
                <FooterLink href={github} external icon={<GitHubIcon />}>
                  GitHub
                </FooterLink>
              )}
            </ul>
          </FooterColumn>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-sand-200 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>
            © {CURRENT_YEAR} {name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <p>Built with React, TypeScript, FastAPI &amp; PostgreSQL</p>
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-sm font-medium text-ink underline decoration-sand-400 underline-offset-4 transition-colors hover:text-accent-strong hover:decoration-accent"
            >
              API documentation
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <button
              type="button"
              onClick={backToTop}
              className="group/top inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white/80 py-1.5 pr-3.5 pl-2 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgb(19_34_63/0.05)] transition-[border-color,color,translate] duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:text-accent-strong"
            >
              <span className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-accent-tint text-accent-strong">
                <ArrowUp aria-hidden="true" className="size-3.5 transition-transform duration-300 group-hover/top:-translate-y-0.5" />
              </span>
              Back to top
            </button>
          </div>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className={className}>
      <p className="eyebrow text-slate-600">{title}</p>
      <div className="mt-5">{children}</div>
    </nav>
  );
}

interface FooterLinkProps {
  href: string;
  external?: boolean;
  icon: ReactNode;
  children: ReactNode;
}

function FooterLink({ href, external = false, icon, children }: FooterLinkProps) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={`${LINK_CLASS} [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-slate-600 [&_svg]:transition-colors hover:[&_svg]:text-accent-strong`}
      >
        {icon}
        {children}
        {external && <span className="sr-only">(opens in a new tab)</span>}
      </a>
    </li>
  );
}

/** Fine blue line-art in the corner of the call-to-action band (decorative). */
function FooterBandArt() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 320 200"
      className="pointer-events-none absolute -right-10 -bottom-12 -z-10 hidden w-[420px] text-accent-soft sm:block"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55">
        <path d="M20 170 C 90 150, 120 90, 190 80 S 290 40, 310 20" />
        <path d="M40 190 C 110 170, 150 120, 210 112 S 300 80, 320 60" strokeDasharray="3 5" />
      </g>
      <g fill="currentColor">
        <circle cx="190" cy="80" r="3.5" />
        <circle cx="120" cy="118" r="2.5" opacity="0.7" />
        <circle cx="262" cy="45" r="2.5" opacity="0.7" />
      </g>
      <circle cx="190" cy="80" r="9" fill="none" stroke="currentColor" opacity="0.4" />
    </svg>
  );
}
