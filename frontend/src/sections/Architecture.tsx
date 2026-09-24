import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";

import { TechList } from "@/components/common/TechList";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";
import { cssVars, staggerIndex } from "@/lib/motion";
import { collectKnownTechnologies, ordinal } from "@/lib/portfolio";
import { SECTION } from "@/lib/site";
import { API_DOCS_URL, OPENAPI_URL } from "@/services/portfolio";
import { ApiStatusPill } from "@/sections/ApiStatusPill";
import { LIFECYCLE_STAGES, stageTools, type LifecycleStage } from "@/sections/lifecycle";
import type { Portfolio } from "@/types/api";

const STAGES_PER_ROW = 4;

interface ArchitectureProps {
  portfolio: Portfolio;
}

/**
 * #architecture — generic data / AI lifecycle drawn as a light-blue line diagram (stages light
 * up in sequence, a data packet travels along the connectors while on screen) + how this very
 * portfolio is built, with the live API status.
 */
export function Architecture({ portfolio }: ArchitectureProps) {
  const known = useMemo(() => collectKnownTechnologies(portfolio), [portfolio]);
  const [litRef, lit] = useInView<HTMLOListElement>({ once: true, rootMargin: "0px 0px -20% 0px" });
  const [flowRef, flowing] = useInView<HTMLDivElement>({ once: false, rootMargin: "0px" });

  return (
    <Section id={SECTION.architecture} tone="sky" className="overflow-hidden">
      <ArchitectureBackdrop />
      <Container className="relative">
        <SectionHeading
          sectionId={SECTION.architecture}
          index="08"
          eyebrow="Architecture"
          title="From raw data to decision-ready systems"
          lead="The end-to-end data and AI lifecycle I work across — with the tools from my own stack at every stage."
        />

        <div ref={flowRef} data-flow={flowing ? "on" : "off"} className="relative mt-16">
          <ol
            ref={litRef}
            data-lit={lit ? "true" : "false"}
            aria-label="Data and AI lifecycle"
            className="grid gap-y-8 lg:auto-rows-fr lg:grid-cols-4 lg:gap-x-10 lg:gap-y-16"
          >
            {LIFECYCLE_STAGES.map((stage, index) => (
              <li key={stage.key} className="relative" style={staggerIndex(index)}>
                <StageCard stage={stage} index={index} tools={stageTools(stage, known)} />
                {index < LIFECYCLE_STAGES.length - 1 && (
                  <FlowConnector index={index} endOfRow={(index + 1) % STAGES_PER_ROW === 0} />
                )}
              </li>
            ))}
          </ol>
          <RowTurn />
        </div>

        <PortfolioStack />
      </Container>
    </Section>
  );
}

/** Very soft glows + a faint blue grid on the light-blue surface. Decorative. */
function ArchitectureBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 -left-40 size-[620px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.9),transparent)]" />
      <div className="absolute -right-40 bottom-0 size-[560px] rounded-full bg-[radial-gradient(closest-side,rgb(141_182_234/0.25),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(46_107_203/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(46_107_203/0.05)_1px,transparent_1px)] bg-size-[48px_48px] [mask-image:radial-gradient(70%_60%_at_50%_45%,#000,transparent)]" />
    </div>
  );
}

interface StageCardProps {
  stage: LifecycleStage;
  index: number;
  tools: string[];
}

function StageCard({ stage, index, tools }: StageCardProps) {
  const Icon = stage.icon;
  return (
    <div className="stage-card relative h-full rounded-card bg-white p-5 shadow-soft hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="stage-icon flex size-10 items-center justify-center rounded-xl">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="stage-index font-mono text-xs">{ordinal(index + 1)}</span>
      </div>
      <h3 className="mt-5 text-base font-semibold">{stage.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{stage.description}</p>
      {tools.length > 0 && <TechList items={tools} label={`${stage.title} tools`} className="mt-4 gap-1.5" />}
    </div>
  );
}

/**
 * Line to the next stage: downwards on phones / tablets, rightwards inside a desktop row.
 * A small packet travels along it in turn (see `.flow-packet` in styles/index.css).
 */
function FlowConnector({ index, endOfRow }: { index: number; endOfRow: boolean }) {
  return (
    <>
      <span aria-hidden="true" className="absolute top-full left-10 flex h-8 w-px flex-col items-center lg:hidden">
        <span className="w-px flex-1 bg-accent-soft" />
        <span className="-mt-1 size-1.5 rotate-45 border-r border-b border-accent" />
        <span
          className="flow-packet absolute top-0 left-1/2 -ml-[3px] size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(46_107_203/0.18)]"
          data-axis="y"
          style={cssVars({ "--i": index, "--packet-distance": "24px" })}
        />
      </span>
      {!endOfRow && (
        <span aria-hidden="true" className="absolute top-1/2 left-full hidden w-10 items-center px-1.5 lg:flex">
          <span className="h-px flex-1 bg-accent-soft" />
          <span className="-ml-1 size-1.5 rotate-45 border-t border-r border-accent" />
          <span
            className="flow-packet absolute top-1/2 left-1.5 -mt-[3px] size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(46_107_203/0.18)]"
            data-axis="x"
            style={cssVars({ "--i": index, "--packet-distance": "22px" })}
          />
        </span>
      )}
    </>
  );
}

/**
 * Elbow connector from the end of the first row (column 4) to the start of the second
 * (column 1), drawn in the 64 px row gap. Column centres account for the 40 px column gaps.
 */
function RowTurn() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-[calc(50%-2rem)] right-[calc((100%-7.5rem)/8)] left-[calc((100%-7.5rem)/8)] hidden h-16 lg:block"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full overflow-visible text-accent">
        <path
          d="M100 0 V50 H0 V100"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
          className="flow-dash"
        />
      </svg>
      <span className="absolute bottom-0 left-0 size-1.5 -translate-x-1/2 rotate-45 border-r border-b border-accent" />
    </div>
  );
}

interface StackLayer {
  label: string;
  name: string;
  details: readonly string[];
}

/** The stack of this portfolio (static UI content about the site itself). */
const STACK_LAYERS: readonly StackLayer[] = [
  { label: "Frontend", name: "React + TypeScript", details: ["Vite", "Tailwind CSS"] },
  { label: "API", name: "FastAPI", details: ["REST", "OpenAPI"] },
  { label: "Database", name: "PostgreSQL", details: ["SQLAlchemy", "Alembic"] },
];

function PortfolioStack() {
  const [ref, flowing] = useInView<HTMLOListElement>({ once: false, rootMargin: "0px" });
  return (
    <Reveal
      variant="scale-in"
      className="mt-24 grid gap-10 rounded-media border border-sky-200 bg-white p-6 shadow-soft sm:p-8 md:p-10 lg:grid-cols-12 lg:gap-12"
    >
      <div className="lg:col-span-5">
        <p className="eyebrow text-accent-strong">Under the hood</p>
        <h3 className="mt-4 text-2xl font-bold md:text-[1.75rem]">How this portfolio is built</h3>
        <p className="mt-4 leading-relaxed text-slate-600">
          A typed React front end consumes a documented REST API built with FastAPI. Every piece of content on this page
          is served from PostgreSQL, with a schema managed through SQLAlchemy and Alembic migrations.
        </p>
        <ApiStatusPill className="mt-6" />
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink
            href={API_DOCS_URL}
            external
            variant="secondary"
            trailingIcon={<ArrowUpRight aria-hidden="true" />}
          >
            API documentation
          </ButtonLink>
          <ButtonLink href={OPENAPI_URL} external variant="ghost" trailingIcon={<ArrowUpRight aria-hidden="true" />}>
            OpenAPI schema
          </ButtonLink>
        </div>
      </div>

      <div className="flex flex-col justify-center lg:col-span-7">
        <ol
          ref={ref}
          data-flow={flowing ? "on" : "off"}
          aria-label="Request flow"
          className="flex flex-col sm:flex-row sm:items-stretch"
        >
          {STACK_LAYERS.map((layer, index) => (
            <li key={layer.label} className="flex flex-col sm:flex-1 sm:flex-row">
              <div className="flex-1 rounded-card border border-sky-200 bg-sky-50 p-5 transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-accent/35">
                <p className="eyebrow text-accent-strong">{layer.label}</p>
                <p className="mt-3 font-display text-lg leading-snug font-semibold text-ink">{layer.name}</p>
                <ul className="mt-3 space-y-1 font-mono text-[12px] text-slate-600">
                  {layer.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>
              {index < STACK_LAYERS.length - 1 && <StackConnector index={index} />}
            </li>
          ))}
        </ol>
        <p className="mt-5 font-mono text-[12px] text-slate-600">
          Containerised with Docker Compose · served by Nginx · CI on GitHub Actions
        </p>
      </div>
    </Reveal>
  );
}

/** Connector between two stack layers (vertical on phones, horizontal from `sm`), with a travelling packet. */
function StackConnector({ index }: { index: number }) {
  return (
    <span aria-hidden="true" className="relative flex h-8 items-center justify-center sm:h-auto sm:w-8">
      <span className={cn("bg-accent-soft", "h-full w-px sm:h-px sm:w-full")} />
      <span className="absolute size-1.5 rotate-45 border-r border-b border-accent max-sm:bottom-1 sm:right-1 sm:-rotate-45" />
      <span
        className="flow-packet absolute top-1 left-1/2 -ml-[3px] size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(46_107_203/0.18)] sm:hidden"
        data-axis="y"
        data-slots="3"
        style={cssVars({ "--i": index, "--packet-distance": "18px", "--flow-cycle": "2.4s", "--flow-step": "0.8s" })}
      />
      <span
        className="flow-packet absolute top-1/2 left-1 -mt-[3px] hidden size-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(46_107_203/0.18)] sm:block"
        data-axis="x"
        data-slots="3"
        style={cssVars({ "--i": index, "--packet-distance": "18px", "--flow-cycle": "2.4s", "--flow-step": "0.8s" })}
      />
    </span>
  );
}
