import { Check, Clock, GraduationCap, MapPin } from "lucide-react";

import { Timeline } from "@/components/common/Timeline";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { formatYearRange } from "@/lib/format";
import { findMastersDegree } from "@/lib/portfolio";
import { SECTION } from "@/lib/site";
import type { Education as EducationEntry } from "@/types/api";

interface EducationProps {
  items: readonly EducationEntry[];
}

/** #education — one scroll-drawn timeline; the Master's degree is the emphasised first entry. */
export function Education({ items }: EducationProps) {
  if (items.length === 0) return null;
  const ordered = [...items].sort((a, b) => a.display_order - b.display_order);
  const masters = findMastersDegree(ordered);
  const entries = masters ? [masters, ...ordered.filter((entry) => entry !== masters)] : ordered;

  return (
    <Section id={SECTION.education} tone="white">
      <Container>
        <SectionHeading
          sectionId={SECTION.education}
          index="04"
          eyebrow="Education"
          title="Academic foundation"
          lead="Academic training that combines computer science, mathematics and advanced data science — most recent first."
        />

        <Timeline label="Academic path" className="mt-14">
          {entries.map((entry, index) => {
            const featured = entry === masters;
            return (
              <Reveal
                as="li"
                key={entry.id}
                delay={Math.min(index, 4) * 70}
                className={cn("relative pl-8 md:pl-12", index < entries.length - 1 && (featured ? "pb-8" : "pb-5"))}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "timeline-dot absolute left-0 rounded-full border-2 border-accent ring-4 ring-white",
                    featured ? "top-7 size-[11px] bg-accent md:top-11" : "top-7 size-[11px] bg-white md:top-8",
                  )}
                />
                {featured ? <FeaturedDegree entry={entry} /> : <DegreeRow entry={entry} />}
              </Reveal>
            );
          })}
        </Timeline>
      </Container>
    </Section>
  );
}

function FeaturedDegree({ entry }: { entry: EducationEntry }) {
  return (
    <Card spotlight className="overflow-hidden border-accent/25! p-6 md:p-10">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-accent to-accent-soft" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(141_182_234/0.28),transparent)]"
      />
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <p className="font-mono text-[13px] font-medium text-ink">{formatYearRange(entry.start_year, entry.end_year)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={entry.status} />
          </div>
        </div>
        <div className="lg:col-span-9">
          <div className="flex items-start gap-4">
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-accent sm:flex">
              <GraduationCap aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h3 className="text-2xl font-bold text-balance md:text-[1.75rem]">{entry.degree}</h3>
              {entry.degree_original && (
                <p lang="fr" className="mt-2 text-[15px] text-slate-600 italic">
                  {entry.degree_original}
                </p>
              )}
              <Institution entry={entry} className="mt-5" />
              {entry.description && <p className="mt-5 max-w-2xl leading-relaxed text-slate-600">{entry.description}</p>}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DegreeRow({ entry }: { entry: EducationEntry }) {
  return (
    <Card interactive className="grid gap-3 p-6 md:p-7 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-3">
        <p className="font-mono text-[13px] font-medium text-ink">{formatYearRange(entry.start_year, entry.end_year)}</p>
        {entry.status === "in_progress" && (
          <div className="mt-3">
            <StatusBadge status={entry.status} />
          </div>
        )}
      </div>
      <div className="lg:col-span-9">
        <h3 className="text-lg font-semibold">{entry.degree}</h3>
        {entry.degree_original && (
          <p lang="fr" className="mt-1 text-[15px] text-slate-600 italic">
            {entry.degree_original}
          </p>
        )}
        <Institution entry={entry} className="mt-3" />
        {entry.description && <p className="mt-3 text-slate-600">{entry.description}</p>}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: EducationEntry["status"] }) {
  return status === "completed" ? (
    <Badge variant="accent" icon={<Check aria-hidden="true" strokeWidth={2.5} />}>
      Graduated
    </Badge>
  ) : (
    <Badge variant="neutral" icon={<Clock aria-hidden="true" />}>
      In progress
    </Badge>
  );
}

function Institution({ entry, className }: { entry: EducationEntry; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]", className)}>
      <span className="font-medium text-ink">{entry.institution}</span>
      {entry.location && (
        <span className="flex items-center gap-1.5 text-slate-600">
          <MapPin aria-hidden="true" className="size-4 text-slate-400" />
          {entry.location}
        </span>
      )}
    </p>
  );
}
