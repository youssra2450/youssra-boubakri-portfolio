import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";

const BLOCK_TONES = {
  sand: "bg-sand-200/70",
  line: "bg-line/80",
  sky: "bg-sky-100",
} as const;

/** Light pulse block (local so the case study never depends on a dark skeleton tone). */
function Block({ className, tone = "sand" }: { className?: string; tone?: keyof typeof BLOCK_TONES }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse motion-reduce:animate-none",
        !className?.includes("rounded-") && "rounded-md",
        BLOCK_TONES[tone],
        className,
      )}
    />
  );
}

/** Loading state of a case study with the geometry of the real page (ivory header, white body). */
export function ProjectSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading project…</span>
      <div className="border-b border-line bg-linear-to-b from-ivory to-white">
        <Container className="grid gap-12 pt-28 pb-14 md:pt-36 md:pb-20 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <Block className="h-4 w-36" />
            <Block className="mt-12 h-3.5 w-48" />
            <Block className="mt-6 h-12 w-full max-w-2xl md:h-14" />
            <Block className="mt-5 h-5 w-72 max-w-full" />
            <Block className="mt-8 h-4 w-64 max-w-full" />
            <Block className="mt-8 h-11 w-44 rounded-[10px]" />
          </div>
          <Block className="aspect-[16/10] w-full rounded-media lg:col-span-5" tone="sky" />
        </Container>
      </div>
      <Container className="grid gap-12 py-16 md:py-24 lg:grid-cols-12">
        <div className="hidden space-y-3 lg:col-span-3 lg:block">
          {Array.from({ length: 6 }, (_, index) => (
            <Block key={index} className="h-4 w-32" tone="line" />
          ))}
        </div>
        <div className="space-y-4 lg:col-span-9">
          <Block className="h-8 w-48" tone="line" />
          <Block className="h-5 w-full" tone="line" />
          <Block className="h-5 w-11/12" tone="line" />
          <Block className="h-5 w-3/4" tone="line" />
          <Block className="mt-10 h-8 w-40" tone="line" />
          <Block className="h-5 w-full" tone="line" />
          <Block className="h-5 w-5/6" tone="line" />
        </div>
      </Container>
    </div>
  );
}
