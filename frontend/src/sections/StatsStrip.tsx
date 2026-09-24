import { useCountUp } from "@/hooks/useCountUp";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";
import type { Stat } from "@/lib/portfolio";

interface StatsStripProps {
  stats: readonly Stat[];
}

/** Key figures under the hero — every value is computed from the API payload; numbers count up once. */
export function StatsStrip({ stats }: StatsStripProps) {
  const [ref, inView] = useInView<HTMLDListElement>({ once: true, rootMargin: "0px" });
  if (stats.length === 0) return null;
  const oddCount = stats.length % 2 === 1;

  return (
    <dl
      ref={ref}
      aria-label="Key figures"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-soft md:auto-cols-fr md:grid-flow-col md:grid-cols-none"
    >
      {stats.map((stat, index) => (
        <StatItem
          key={stat.key}
          stat={stat}
          start={inView}
          className={cn(oddCount && index === stats.length - 1 && "col-span-2 md:col-span-1")}
        />
      ))}
    </dl>
  );
}

interface StatItemProps {
  stat: Stat;
  start: boolean;
  className?: string;
}

function StatItem({ stat, start, className }: StatItemProps) {
  const numeric = typeof stat.value === "number";
  const count = useCountUp(numeric ? (stat.value as number) : 0, { enabled: start && numeric, duration: 1100 });

  return (
    <div
      className={cn(
        "group relative flex flex-col-reverse gap-2 bg-white/95 px-5 py-6 transition-colors duration-300 hover:bg-white md:px-6",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-5 top-0 h-0.5 origin-left scale-x-0 rounded-full bg-accent transition-transform duration-500 ease-out group-hover:scale-x-100 md:inset-x-6"
      />
      <dt className="text-[13px] leading-snug text-slate-600">{stat.label}</dt>
      <dd className="font-display text-[2rem] leading-none font-bold tracking-tight text-ink tabular-nums md:text-[2.4rem]">
        {numeric ? (
          <>
            <span aria-hidden="true">{count}</span>
            <span className="sr-only">{stat.value}</span>
          </>
        ) : (
          stat.value
        )}
      </dd>
    </div>
  );
}
