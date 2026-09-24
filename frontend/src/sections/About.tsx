import { Blocks, Compass, Heart, Languages, MapPin, Plane, UserRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { staggerIndex } from "@/lib/motion";
import { ordinal } from "@/lib/portfolio";
import { SECTION } from "@/lib/site";
import type { Profile } from "@/types/api";

interface AboutProps {
  profile: Profile;
}

interface Pillar {
  key: string;
  label: string;
  icon: LucideIcon;
  text: string;
}

/** #about — Who I am / What I do / What I build, with a factual "At a glance" panel. */
export function About({ profile }: AboutProps) {
  const pillars: Pillar[] = [
    { key: "who", label: "Who I am", icon: UserRound, text: profile.about_who },
    { key: "what", label: "What I do", icon: Compass, text: profile.about_what },
    { key: "build", label: "What I build", icon: Blocks, text: profile.about_build },
  ].filter((pillar) => pillar.text.trim().length > 0);

  return (
    <Section id={SECTION.about} tone="white" divider>
      <Container>
        <SectionHeading
          sectionId={SECTION.about}
          index="02"
          eyebrow="About"
          title="Analytical rigour, engineering discipline"
          lead="A data scientist who builds — from statistical analysis and machine learning to the pipelines and applications that deliver the results."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <ul className="grid gap-5 lg:col-span-8">
            {pillars.map((pillar, index) => (
              <Reveal as="li" key={pillar.key} delay={index * 80}>
                <Card interactive spotlight className="grid gap-5 p-6 sm:grid-cols-[190px_1fr] sm:gap-8 md:p-8">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                    <span className="flex size-11 items-center justify-center rounded-xl border border-accent/15 bg-accent-tint text-accent-strong">
                      <pillar.icon aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <p aria-hidden="true" className="hidden font-mono text-[11px] text-slate-600 sm:mt-3 sm:block">
                        {ordinal(index + 1)}
                      </p>
                      <h3 className="text-lg font-bold">{pillar.label}</h3>
                    </div>
                  </div>
                  <p className="text-[16.5px] leading-relaxed text-slate-600">{pillar.text}</p>
                </Card>
              </Reveal>
            ))}
          </ul>

          <Reveal as="div" delay={160} variant="slide-left" className="lg:col-span-4">
            <Card tone="ivory" className="p-6 md:p-8 lg:sticky lg:top-28">
              <h3 className="eyebrow text-slate-600">At a glance</h3>
              <dl className="mt-6 space-y-5">
                {profile.location && (
                  <Fact icon={MapPin} term="Based in">
                    <span className="font-medium text-ink">{profile.location}</span>
                  </Fact>
                )}
                {profile.mobility && (
                  <Fact icon={Plane} term="Mobility & availability" highlighted>
                    {profile.mobility}
                  </Fact>
                )}
                {profile.languages.length > 0 && (
                  <Fact icon={Languages} term="Languages">
                    <ul className="space-y-2">
                      {profile.languages.map((language) => (
                        <li key={language.name} className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-medium text-ink">{language.name}</span>
                          <span className="text-sm text-slate-600">{language.level}</span>
                        </li>
                      ))}
                    </ul>
                  </Fact>
                )}
                {profile.interests.length > 0 && (
                  <Fact icon={Heart} term="Interests">
                    <ul className="reveal-children flex flex-wrap gap-2">
                      {profile.interests.map((interest, index) => (
                        <li
                          key={interest}
                          style={staggerIndex(index)}
                          className="rounded-full border border-sand-200 bg-white px-3 py-1 text-sm text-ink"
                        >
                          {interest}
                        </li>
                      ))}
                    </ul>
                  </Fact>
                )}
              </dl>
            </Card>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

interface FactProps {
  icon: LucideIcon;
  term: string;
  highlighted?: boolean;
  children: ReactNode;
}

function Fact({ icon: Icon, term, highlighted = false, children }: FactProps) {
  return (
    <div
      className={cn(
        highlighted
          ? "rounded-xl border border-accent/20 bg-accent-tint/70 p-4"
          : "border-b border-sand-200 pb-5 last:border-b-0 last:pb-0",
      )}
    >
      <dt className={cn("flex items-center gap-2 text-sm font-semibold", highlighted ? "text-accent-strong" : "text-ink")}>
        <Icon aria-hidden="true" className="size-4 text-accent-strong" />
        {term}
      </dt>
      <dd className={cn("mt-2 text-[15px] leading-relaxed", highlighted ? "text-ink" : "text-slate-600")}>{children}</dd>
    </div>
  );
}
