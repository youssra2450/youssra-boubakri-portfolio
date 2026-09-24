import { Play, Shuffle } from "lucide-react";
import { useDeferredValue, useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  ALGORITHMS,
  generateInstance,
  solveAll,
  type AlgorithmKey,
  type Point,
  type TourResult,
} from "@/features/project/uav/algorithms";
import { TrajectoryCanvas } from "@/features/project/uav/TrajectoryCanvas";
import { prefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import { safeHref } from "@/lib/url";

const MIN_NODES = 8;
const MAX_NODES = 24;
const DEFAULT_NODES = 14;
const INITIAL_SEED = 0x5eed;
const FLIGHT_MS = 2600;

interface Instance {
  points: Point[];
  seed: number;
}

interface Flight {
  id: number;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function formatLength(value: number): string {
  return value.toFixed(1);
}

function labelOf(key: AlgorithmKey): string {
  return ALGORITHMS.find((algorithm) => algorithm.key === key)?.label ?? key;
}

function describeResult(key: AlgorithmKey, result: TourResult, baseline: TourResult, nodes: number): string {
  const base = `${labelOf(key)} — ${nodes} nodes, tour length ${formatLength(result.length)}, ${result.iterations} ${
    result.iterations === 1 ? "iteration" : "iterations"
  }`;
  if (key === "random" || baseline.length === 0) return `${base}.`;
  const gain = Math.round((1 - result.length / baseline.length) * 100);
  if (gain === 0) return `${base}, same length as the random tour.`;
  return `${base}, ${Math.abs(gain)}% ${gain > 0 ? "shorter" : "longer"} than the random tour.`;
}

interface UavTrajectoryLabProps {
  /** Repository of the original project, linked from the caption when available. */
  githubUrl: string | null;
}

/**
 * Interactive TSP-UAV lab (docs/SPEC.md §3.4): a seeded random instance of IoT nodes, the
 * tour found by each algorithm (computed live in the browser) and a one-shot flight animation.
 * Loaded as its own chunk, only on the project whose visual is "uav".
 */
export default function UavTrajectoryLab({ githubUrl }: UavTrajectoryLabProps) {
  const id = useId();
  const [nodeCount, setNodeCount] = useState(DEFAULT_NODES);
  const [seed, setSeed] = useState(INITIAL_SEED);
  const [algorithm, setAlgorithm] = useState<AlgorithmKey>("tabu");
  const [flight, setFlight] = useState<Flight | null>(null);
  const [progress, setProgress] = useState(1);

  const instance = useMemo<Instance>(() => ({ points: generateInstance(nodeCount, seed), seed }), [nodeCount, seed]);
  // Solving runs on the deferred instance so the slider stays responsive.
  const shown = useDeferredValue(instance);
  const results = useMemo(() => solveAll(shown.points, shown.seed), [shown]);
  const pending = shown !== instance;
  const result = results[algorithm];
  const bestLength = Math.min(...ALGORITHMS.map((item) => results[item.key].length));
  const worstLength = Math.max(...ALGORITHMS.map((item) => results[item.key].length)) || 1;
  const flying = flight !== null;

  useEffect(() => {
    if (!flight) return;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / FLIGHT_MS);
      setProgress(easeInOutSine(t));
      if (t < 1) frame = requestAnimationFrame(step);
      else setFlight(null);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [flight]);

  /** Any change of instance or algorithm shows the new tour fully drawn. */
  function land(): void {
    setFlight(null);
    setProgress(1);
  }

  function selectAlgorithm(key: AlgorithmKey): void {
    setAlgorithm(key);
    land();
  }

  function run(): void {
    if (prefersReducedMotion()) {
      land();
      return;
    }
    setProgress(0);
    setFlight((current) => ({ id: (current?.id ?? 0) + 1 }));
  }

  function newInstance(): void {
    setSeed(Math.floor(Math.random() * 0xffffffff));
    land();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    const index = ALGORITHMS.findIndex((item) => item.key === algorithm);
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % ALGORITHMS.length,
      ArrowDown: (index + 1) % ALGORITHMS.length,
      ArrowLeft: (index - 1 + ALGORITHMS.length) % ALGORITHMS.length,
      ArrowUp: (index - 1 + ALGORITHMS.length) % ALGORITHMS.length,
      Home: 0,
      End: ALGORITHMS.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const key = ALGORITHMS[target].key;
    selectAlgorithm(key);
    document.getElementById(`${id}-tab-${key}`)?.focus();
  }

  const panelId = `${id}-panel`;
  const sliderId = `${id}-nodes`;
  const summary = flying
    ? `Flying the ${labelOf(algorithm)} tour…`
    : describeResult(algorithm, result, results.random, shown.points.length);
  const repository = safeHref(githubUrl);

  return (
    <div className="rounded-media border border-sky-200 bg-sky-50 p-4 sm:p-6">
      <div
        role="tablist"
        aria-label="Algorithm"
        className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1 shadow-[0_1px_2px_rgb(19_34_63/0.04)] sm:grid-cols-4"
      >
        {ALGORITHMS.map((item) => {
          const selected = item.key === algorithm;
          return (
            <button
              key={item.key}
              id={`${id}-tab-${item.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectAlgorithm(item.key)}
              onKeyDown={handleTabKeyDown}
              className={cn(
                "min-h-10 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 pointer-coarse:min-h-11",
                selected
                  ? "bg-accent text-white shadow-[0_6px_16px_-8px_rgb(46_107_203/0.7)]"
                  : "text-slate-600 hover:bg-sky-50 hover:text-ink",
              )}
            >
              {item.shortLabel}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${id}-tab-${algorithm}`}
        className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start"
      >
        <div className="min-w-0">
          <TrajectoryCanvas
            points={shown.points}
            tour={result.tour}
            progress={progress}
            flying={flying}
            pending={pending}
            label={`${labelOf(algorithm)} tour over ${shown.points.length} nodes, starting and ending at the base`}
          />
          <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] text-slate-600">
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-ink" />
              Base
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-accent bg-white" />
              IoT node
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-accent" />
              Visited
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-accent" />
              Tour
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={sliderId} className="text-sm font-semibold text-ink">
                IoT nodes
              </label>
              <span aria-hidden="true" className="font-mono text-sm text-accent-strong tabular-nums">
                {nodeCount}
              </span>
            </div>
            <input
              id={sliderId}
              type="range"
              min={MIN_NODES}
              max={MAX_NODES}
              step={1}
              value={nodeCount}
              onChange={(event) => {
                setNodeCount(Number(event.target.value));
                land();
              }}
              className="mt-3 h-6 w-full cursor-pointer accent-accent"
            />
            <div aria-hidden="true" className="mt-1 flex justify-between font-mono text-[11px] text-slate-600">
              <span>{MIN_NODES}</span>
              <span>{MAX_NODES}</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Button onClick={run} leadingIcon={<Play aria-hidden="true" />} disabled={pending}>
              {flying ? "Restart flight" : "Run"}
            </Button>
            <Button variant="secondary" onClick={newInstance} leadingIcon={<Shuffle aria-hidden="true" />}>
              New random instance
            </Button>
          </div>

          <div className="rounded-xl border border-line bg-white px-3 py-1 shadow-[0_1px_2px_rgb(19_34_63/0.04)]">
            <table className="w-full text-sm">
              <caption className="sr-only">Tour length and iterations of each algorithm on this instance</caption>
              <thead>
                <tr className="border-b border-line font-mono text-[11px] tracking-[0.08em] text-slate-600 uppercase">
                  <th scope="col" className="py-2 pr-2 text-left font-medium">
                    Algorithm
                  </th>
                  <th scope="col" className="py-2 px-2 text-right font-medium">
                    Length
                  </th>
                  <th scope="col" className="py-2 pl-2 text-right font-medium">
                    Iter.
                  </th>
                </tr>
              </thead>
              <tbody>
                {ALGORITHMS.map((item) => {
                  const row = results[item.key];
                  const selected = item.key === algorithm;
                  const best = row.length <= bestLength + 1e-9;
                  return (
                    <tr
                      key={item.key}
                      aria-current={selected ? "true" : undefined}
                      className={cn("border-b border-line/70 last:border-b-0", selected && "bg-sky-50")}
                    >
                      <th
                        scope="row"
                        className={cn(
                          "py-2.5 pr-2 text-left font-medium whitespace-nowrap",
                          selected ? "text-ink shadow-[inset_2px_0_0_var(--color-accent)] pl-2.5" : "text-slate-600",
                        )}
                      >
                        {item.shortLabel}
                        {best && (
                          <span className="ml-1.5 rounded-full bg-accent-tint px-1.5 py-px align-middle font-mono text-[10px] text-accent-strong">
                            best
                          </span>
                        )}
                      </th>
                      <td className="py-2.5 px-2 text-right font-mono text-ink tabular-nums">
                        {formatLength(row.length)}
                        <span aria-hidden="true" className="mt-1 ml-auto block h-1 w-14 overflow-hidden rounded-full bg-sky-100">
                          <span
                            className={cn(
                              "block h-full origin-left rounded-full transition-transform duration-500 ease-out",
                              best ? "bg-accent" : "bg-accent-soft",
                            )}
                            style={{ transform: `scaleX(${Math.max(0.04, row.length / worstLength).toFixed(3)})` }}
                          />
                        </span>
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono text-slate-600 tabular-nums">{row.iterations}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-5 text-[15px] font-medium text-ink">
        {summary}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Illustrative re-implementation running live in your browser on a random instance — not the original
        project's code or results. See the{" "}
        {repository ? (
          <a
            href={repository}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-strong underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
          >
            GitHub repository
          </a>
        ) : (
          "GitHub repository"
        )}{" "}
        for the full implementation.
      </p>
    </div>
  );
}
