import { Briefcase, MapPin } from "lucide-react";

import { CheckList } from "@/components/common/CheckList";
import { TechList } from "@/components/common/TechList";
import { Timeline } from "@/components/common/Timeline";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDateRange, formatDuration, monthsBetween } from "@/lib/format";
import { SECTION } from "@/lib/site";
import type { Experience as ExperienceItem } from "@/types/api";

interface ExperienceProps {
  items: readonly ExperienceItem[];
}

/** #experience — scroll-drawn timeline on sand; only the fields present in the data are rendered. */
export function Experience({ items }: ExperienceProps) {
  if (items.length === 0) return null;
  const ordered = [...items].sort((a, b) => a.display_order - b.display_order);

  return (
    <Section id={SECTION.experience} tone="sand">
      <Container>
        <SectionHeading
          sectionId={SECTION.experience}
          index="03"
          eyebrow="Experience"
          title="Selected experience"
          lead="Professional internships spent designing and building business applications — from IT incident management to reporting and inventory tracking."
        />

        <Timeline label="Professional experience" surface="sand" className="mt-14">
          {ordered.map((item, index) => (
            <Reveal as="li" key={item.id} delay={index * 80} className="relative pb-6 pl-8 last:pb-0 md:pl-12">
              {/* Same anatomy as the Education timeline: dot level with the period, period column inside the card. */}
              <span
                aria-hidden="true"
                className="timeline-dot absolute top-7 left-0 size-[11px] rounded-full border-2 border-accent bg-white ring-4 ring-sand md:top-9"
              />
              <Card interactive spotlight className="grid gap-4 p-6 md:p-8 lg:grid-cols-12 lg:gap-8">
                <Period item={item} className="lg:col-span-3" />
                <div className="min-w-0 lg:col-span-9">
                  <ExperienceCard item={item} />
                </div>
              </Card>
            </Reveal>
          ))}
        </Timeline>
      </Container>
    </Section>
  );
}

function Period({ item, className }: { item: ExperienceItem; className?: string }) {
  // Duration is only computed for closed periods: it is derived from the dates, never estimated.
  const duration = item.end_date ? formatDuration(monthsBetween(item.start_date, item.end_date)) : null;
  return (
    <div className={className}>
      <p className="font-mono text-[13px] font-medium text-ink">{formatDateRange(item.start_date, item.end_date)}</p>
      {duration && <p className="mt-1 text-sm text-slate-600">{duration}</p>}
    </div>
  );
}

function ExperienceCard({ item }: { item: ExperienceItem }) {
  return (
    <article>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex items-start gap-4">
          <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent-tint text-accent-strong sm:flex">
            <Briefcase aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="text-2xl font-bold">{item.organization}</h3>
            {item.role && <p className="mt-1 font-medium text-ink">{item.role}</p>}
            {item.location && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600">
                <MapPin aria-hidden="true" className="size-4 text-slate-400" />
                {item.location}
              </p>
            )}
          </div>
        </div>
        <Badge variant="accent">{item.employment_type}</Badge>
      </header>

      {item.project_title && (
        <div className="mt-6 border-t border-line pt-6">
          <p className="eyebrow text-slate-600">Project</p>
          <p className="mt-2 font-display text-lg font-semibold text-ink">{item.project_title}</p>
        </div>
      )}

      {item.description && (
        <p className={item.project_title ? "mt-3 leading-relaxed text-slate-600" : "mt-6 leading-relaxed text-slate-600"}>
          {item.description}
        </p>
      )}

      {item.highlights.length > 0 && <CheckList items={item.highlights} className="mt-6" />}

      {item.technologies.length > 0 && <TechList items={item.technologies} cascade className="mt-6" />}
    </article>
  );
}
