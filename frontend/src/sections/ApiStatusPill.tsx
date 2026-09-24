import { useApi } from "@/hooks/useApi";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";
import { ApiError } from "@/services/api";
import { HEALTH_PATH } from "@/services/portfolio";
import type { HealthStatus } from "@/types/api";

type PillState = "checking" | "operational" | "degraded" | "unreachable";

const LABELS: Record<PillState, string> = {
  checking: "Checking API status…",
  operational: "API operational",
  degraded: "API degraded",
  unreachable: "API unreachable",
};

const DOTS: Record<PillState, string> = {
  checking: "bg-slate-400 text-slate-400",
  operational: "bg-success text-success",
  degraded: "bg-warning text-warning",
  unreachable: "bg-danger text-danger",
};

function toState(data: HealthStatus | undefined, error: Error | null): PillState {
  if (data) return data.status === "healthy" && data.database === "connected" ? "operational" : "degraded";
  if (error) return error instanceof ApiError && error.status === 503 ? "degraded" : "unreachable";
  return "checking";
}

/** Live GET /api/health status, requested the first time the pill scrolls into view. */
export function ApiStatusPill({ className }: { className?: string }) {
  const [ref, inView] = useInView<HTMLParagraphElement>({ once: true, rootMargin: "200px 0px" });
  const { data, error } = useApi<HealthStatus>(inView ? HEALTH_PATH : null);
  const state = toState(data, error);

  return (
    <p
      ref={ref}
      role="status"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border border-line bg-white py-1.5 pr-3.5 pl-3 font-mono text-[12px] text-ink shadow-[0_1px_2px_rgb(19_34_63/0.05)]",
        className,
      )}
    >
      {/* Keyed by state: the dot pulses (slowly, a few times) when the status arrives. */}
      <span
        key={state}
        aria-hidden="true"
        className={cn("size-2 rounded-full", state !== "checking" && "status-ping", DOTS[state])}
      />
      {LABELS[state]}
      {state === "operational" && data?.version && <span className="text-slate-600">· v{data.version}</span>}
    </p>
  );
}
