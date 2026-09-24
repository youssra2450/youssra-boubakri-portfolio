import { ArrowRight } from "lucide-react";
import { Fragment } from "react";

import { SocialLinks } from "@/components/common/SocialLinks";
import { ButtonLink } from "@/components/ui/Button";
import { ARROW_NUDGE } from "@/components/ui/buttonStyles";
import { Container } from "@/components/ui/Container";
import { WordReveal } from "@/components/ui/WordReveal";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useRotatingIndex } from "@/hooks/useRotatingIndex";
import { cn } from "@/lib/cn";
import { staggerIndex } from "@/lib/motion";
import {
  buildStats,
  findMastersDegree,
  locationLine,
  splitDegreeTitle,
  splitHeadline,
  splitRolePrefix,
} from "@/lib/portfolio";
import { SECTION, sectionHref, sectionTitleId } from "@/lib/site";
import { HeroPortrait } from "@/sections/HeroPortrait";
import { StatsStrip } from "@/sections/StatsStrip";
import type { Portfolio } from "@/types/api";

interface HeroProps {
  portfolio: Portfolio;
}

/**
 * #home — identity, positioning statement, primary calls to action and key figures.
 * Light hero (ivory → white) with a choreographed ≈ 1.2 s entrance; ambient layers only
 * move while the hero is on screen.
 */
export function Hero({ portfolio }: HeroProps) {
  const { profile, education } = portfolio;
  const masters = findMastersDegree(education);
  const roles = splitHeadline(profile.headline);
  const eyebrow = locationLine(profile.location, profile.mobility);
  const [sectionRef, onScreen] = useInView<HTMLElement>({ once: false, rootMargin: "0px" });

  return (
    <section
      ref={sectionRef}
      id={SECTION.home}
      aria-labelledby={sectionTitleId(SECTION.home)}
      tabIndex={-1}
      data-ambient={onScreen ? "on" : "off"}
      className="relative isolate overflow-hidden bg-linear-to-b from-ivory via-ivory to-white outline-none"
    >
      <HeroBackdrop />
      <Container className="relative pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            {eyebrow && (
              <p
                className="hero-in inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-sand-200 bg-white/80 sm:rounded-full py-1.5 pr-4 pl-2 text-[13px] font-medium text-ink shadow-[0_1px_2px_rgb(19_34_63/0.05)] backdrop-blur"
                style={staggerIndex(0)}
              >
                <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-tint">
                  <span className="size-1.5 rounded-full bg-accent" />
                </span>
                <span className="min-w-0">{eyebrow}</span>
              </p>
            )}
            <h1
              id={sectionTitleId(SECTION.home)}
              className="hero-name mt-7 text-display font-extrabold text-ink"
            >
              <WordReveal text={profile.full_name} />
            </h1>

            <RoleLine headline={profile.headline} roles={roles} active={onScreen} />

            {profile.tagline && (
              <p
                className="hero-in mt-8 max-w-2xl border-l-2 border-accent pl-5 font-display text-[1.4rem] leading-snug font-semibold text-balance text-ink md:text-[1.65rem]"
                style={staggerIndex(4)}
              >
                {profile.tagline}
              </p>
            )}
            {profile.summary && (
              <p
                className="hero-in mt-6 max-w-xl text-[17px] leading-relaxed text-pretty text-slate-600"
                style={staggerIndex(5)}
              >
                {profile.summary}
              </p>
            )}

            <div className="hero-in mt-10 flex flex-wrap items-center gap-3" style={staggerIndex(6)}>
              <ButtonLink
                to={sectionHref(SECTION.projects)}
                size="lg"
                trailingIcon={<ArrowRight aria-hidden="true" className={ARROW_NUDGE} />}
              >
                View my work
              </ButtonLink>
              <ButtonLink to={sectionHref(SECTION.contact)} variant="secondary" size="lg">
                Get in touch
              </ButtonLink>
            </div>

            <div className="hero-in mt-10 flex items-center gap-4" style={staggerIndex(7)}>
              <span aria-hidden="true" className="eyebrow text-slate-600">
                Connect
              </span>
              <span aria-hidden="true" className="h-px w-8 bg-sand-400/70" />
              <SocialLinks email={profile.email} githubUrl={profile.github_url} linkedinUrl={profile.linkedin_url} />
            </div>
          </div>

          <div className="lg:col-span-5">
            <HeroPortrait
              photoUrl={profile.photo_url}
              name={profile.full_name}
              credential={masters ? splitDegreeTitle(masters.degree) : null}
            />
          </div>
        </div>

        <div className="hero-in mt-20 md:mt-24" style={staggerIndex(8)}>
          <StatsStrip stats={buildStats(portfolio)} />
        </div>
      </Container>
    </section>
  );
}

interface RoleLineProps {
  headline: string;
  roles: string[];
  /** Rotate only while the hero is on screen. */
  active: boolean;
}

/**
 * The headline roles as a refined rotating word ("Data Scientist → Data Engineer → Data Analyst").
 * Screen readers get the full static headline; reduced motion shows every role, static.
 */
function RoleLine({ headline, roles, active }: RoleLineProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rotate = roles.length > 1 && !reducedMotion;
  const index = useRotatingIndex(roles.length, { interval: 2800, enabled: rotate && active });
  const { prefix, variants } = splitRolePrefix(roles);
  const previous = (index - 1 + variants.length) % variants.length;

  return (
    <p className="hero-in mt-5 font-display text-[1.5rem] font-semibold tracking-tight text-slate-600 md:text-[1.9rem]" style={staggerIndex(3)}>
      <span className="sr-only">{headline}</span>
      {rotate ? (
        <span aria-hidden="true" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            {prefix && <span className="text-ink">{prefix} </span>}
            <span className="rotator text-accent">
              {variants.map((variant, position) => (
                <span
                  key={variant}
                  data-state={position === index ? "active" : position === previous ? "leaving" : "waiting"}
                >
                  {variant}
                </span>
              ))}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            {roles.map((role, position) => (
              <span
                key={role}
                className={cn(
                  "rotator-tick h-1 rounded-full",
                  position === index ? "w-6 bg-accent" : "w-1.5 bg-sand-400/70",
                )}
              />
            ))}
          </span>
        </span>
      ) : (
        <span aria-hidden="true" className="flex flex-wrap items-center gap-y-1 text-ink">
          {roles.map((role, position) => (
            <Fragment key={role}>
              {position > 0 && <span className="mx-3 inline-block h-5 w-px bg-sand-400" />}
              <span>{role}</span>
            </Fragment>
          ))}
        </span>
      )}
    </p>
  );
}

/** Ivory wash, soft light-blue glow behind the portrait, warm glow on the left, faint grid. Decorative. */
function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="ambient-drift absolute top-[-8%] right-[-12%] size-[760px] rounded-full bg-[radial-gradient(closest-side,rgb(141_182_234/0.34),rgb(207_224_246/0.18)_55%,transparent)]" />
      <div className="absolute top-[35%] left-[-18%] size-[620px] rounded-full bg-[radial-gradient(closest-side,rgb(232_223_208/0.55),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(46_107_203/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(46_107_203/0.045)_1px,transparent_1px)] bg-size-[56px_56px] [mask-image:radial-gradient(70%_60%_at_60%_30%,#000,transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
    </div>
  );
}
