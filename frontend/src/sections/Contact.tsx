import { MapPin, Plane } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { SECTION } from "@/lib/site";
import { ContactChannels } from "@/sections/ContactChannels";
import { ContactForm } from "@/sections/ContactForm";
import type { Profile } from "@/types/api";

interface ContactProps {
  profile: Profile;
}

export const CONTACT_TITLE = "Let's discuss your next data initiative";
const LEAD =
  "Hiring for a data role or scoping a data project? Reach out directly by email, LinkedIn or GitHub to start the conversation.";

/**
 * #contact (docs/SPEC.md §3.6) — email / LinkedIn / GitHub cards, location & mobility (no CV: SPEC v5).
 * The message form is only rendered when the backend can forward messages by email.
 */
export function Contact({ profile }: ContactProps) {
  if (profile.contact_form_enabled) {
    return (
      <Section id={SECTION.contact} tone="white">
        <ContactBackdrop />
        <Container className="relative">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeading sectionId={SECTION.contact} index="09" eyebrow="Contact" title={CONTACT_TITLE} lead={LEAD} />
              <Reveal delay={120}>
                <ContactChannels profile={profile} layout="stack" className="mt-10" />
              </Reveal>
              <Availability profile={profile} layout="stack" className="mt-10" />
            </div>

            <Reveal variant="scale-in" delay={160} className="lg:col-span-7">
              <Card className="p-6 sm:p-8 md:p-10">
                <p className="eyebrow text-accent-strong">Direct message</p>
                <h3 className="mt-3 font-display text-2xl font-bold">Send a message</h3>
                <div className="mt-2">
                  <ContactForm email={profile.email} />
                </div>
              </Card>
            </Reveal>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section id={SECTION.contact} tone="white">
      <ContactBackdrop />
      <Container className="relative">
        <SectionHeading sectionId={SECTION.contact} index="09" eyebrow="Contact" title={CONTACT_TITLE} lead={LEAD} />
        <ContactChannels profile={profile} layout="grid" className="mt-14" />
        <Reveal delay={240}>
          <Availability profile={profile} layout="band" className="mt-5" />
        </Reveal>
      </Container>
    </Section>
  );
}

/** Very soft light-blue glow in the top-right corner. Decorative. */
function ContactBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 -right-48 size-[640px] rounded-full bg-[radial-gradient(closest-side,rgb(207_224_246/0.55),transparent)]" />
    </div>
  );
}

interface AvailabilityProps {
  profile: Profile;
  /** `band`: one full-width row under the cards. `stack`: vertical, in the column beside the form. */
  layout: "band" | "stack";
  className?: string;
}

/** Location, mobility and availability. */
function Availability({ profile, layout, className }: AvailabilityProps) {
  const band = layout === "band";
  return (
    <div
      className={cn(
        band &&
          "flex flex-col gap-6 rounded-card border border-sand-200 bg-ivory p-6 shadow-soft md:flex-row md:items-center md:justify-between md:gap-10 md:px-8",
        className,
      )}
    >
      <dl className={cn("grid gap-3 text-[15px]", band && "md:max-w-2xl")}>
        {profile.location && (
          <div className="flex items-start gap-3">
            <dt className="sr-only">Location</dt>
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-strong">
              <MapPin className="size-3.5" />
            </span>
            <dd className="pt-0.5 font-semibold text-ink">{profile.location}</dd>
          </div>
        )}
        {profile.mobility && (
          <div className="flex items-start gap-3">
            <dt className="sr-only">Mobility</dt>
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-strong">
              <Plane className="size-3.5" />
            </span>
            <dd className="pt-0.5 leading-relaxed text-slate-600">{profile.mobility}</dd>
          </div>
        )}
      </dl>
      <p
        className={cn(
          "inline-flex w-fit items-center gap-2.5 rounded-full border border-success/20 bg-white px-4 py-2 text-[13.5px] font-medium text-ink",
          band ? "shrink-0" : "mt-8",
        )}
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-success shadow-[0_0_0_4px_rgb(31_138_91/0.14)]" />
        Open to opportunities
      </p>
    </div>
  );
}
