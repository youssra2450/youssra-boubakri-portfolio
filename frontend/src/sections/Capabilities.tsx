import {
  AppWindow,
  BrainCircuit,
  ChartColumn,
  Layers,
  LayoutDashboard,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { TechList } from "@/components/common/TechList";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ordinal } from "@/lib/portfolio";
import { SECTION } from "@/lib/site";
import type { Capability } from "@/types/api";

/** `capabilities[].key` → icon (docs/SPEC.md §3.3). */
const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  analytics: ChartColumn,
  ml: BrainCircuit,
  engineering: Workflow,
  ai: Sparkles,
  bi: LayoutDashboard,
  apps: AppWindow,
};

function CapabilityIcon({ capabilityKey }: { capabilityKey: string }) {
  const Icon = CAPABILITY_ICONS[capabilityKey] ?? Layers;
  return <Icon aria-hidden="true" className="icon-draw size-[22px]" strokeWidth={1.75} />;
}

interface CapabilitiesProps {
  capabilities: readonly Capability[];
}

/** #capabilities — "What I can build": one card per capability with its tools (icons draw in, cursor spotlight). */
export function Capabilities({ capabilities }: CapabilitiesProps) {
  if (capabilities.length === 0) return null;

  return (
    <Section id={SECTION.capabilities} tone="white">
      <Container>
        <SectionHeading
          sectionId={SECTION.capabilities}
          index="06"
          eyebrow="Capabilities"
          title="What I can build for your team"
          lead="Where I create value — and the tools I rely on to deliver it."
        />

        <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability, index) => (
            <Reveal as="li" key={capability.key} delay={(index % 3) * 90}>
              <Card interactive spotlight className="group flex h-full flex-col p-7">
                <div className="flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-accent/15 bg-accent-tint text-accent-strong transition-[background-color,color,border-color] duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-white">
                    <CapabilityIcon capabilityKey={capability.key} />
                  </span>
                  <span aria-hidden="true" className="font-mono text-xs text-slate-600">
                    {ordinal(index + 1)}
                  </span>
                </div>
                <h3 className="mt-7 text-xl font-bold">{capability.title}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-slate-600">{capability.description}</p>
                {capability.tools.length > 0 && (
                  <TechList
                    items={capability.tools}
                    label={`${capability.title} tools`}
                    cascade
                    className="mt-6 border-t border-line pt-6"
                  />
                )}
              </Card>
            </Reveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
