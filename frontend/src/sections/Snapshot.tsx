import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { staggerIndex } from "@/lib/motion";
import { ordinal } from "@/lib/portfolio";
import { SECTION } from "@/lib/site";
import type { Profile } from "@/types/api";

interface SnapshotProps {
  profile: Profile;
}

/** #snapshot — the disciplines at a glance + the roles she is targeting. */
export function Snapshot({ profile }: SnapshotProps) {
  const { snapshot, target_roles: roles } = profile;
  if (snapshot.length === 0 && roles.length === 0) return null;

  return (
    <Section id={SECTION.snapshot} tone="white">
      <Container>
        <SectionHeading
          sectionId={SECTION.snapshot}
          index="01"
          eyebrow="Snapshot"
          title="Expertise at a glance"
          lead="Complementary disciplines that cover the full data value chain — from pipelines and models to dashboards and applications."
        />

        {snapshot.length > 0 && (
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {snapshot.map((card, index) => (
              <Reveal as="li" key={card.title} delay={index * 80}>
                <Card interactive spotlight className="group h-full overflow-hidden p-6 md:p-7">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-linear-to-r from-accent to-accent-soft transition-transform duration-500 ease-out group-hover:scale-x-100"
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-accent-strong">{ordinal(index + 1)}</span>
                    <span aria-hidden="true" className="h-px w-10 bg-line transition-[width,background-color] duration-500 group-hover:w-14 group-hover:bg-accent/40" />
                  </div>
                  <h3 className="mt-7 text-xl font-bold">{card.title}</h3>
                  <ul className="mt-4 space-y-2">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug text-slate-600">
                        <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            ))}
          </ul>
        )}

        {roles.length > 0 && (
          <Reveal className="mt-12 flex flex-col gap-4 rounded-2xl border border-line bg-ivory px-5 py-5 md:flex-row md:items-center md:gap-8 md:px-7">
            <p className="eyebrow shrink-0 text-slate-600" id="target-roles-label">
              Target roles
            </p>
            <ul aria-labelledby="target-roles-label" className="reveal-children flex flex-wrap gap-2">
              {roles.map((role, index) => (
                <li
                  key={role}
                  style={staggerIndex(index)}
                  className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink shadow-[0_1px_2px_rgb(19_34_63/0.04)]"
                >
                  {role}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </Container>
    </Section>
  );
}
