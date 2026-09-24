import { useMemo } from "react";

import type { Point } from "@/features/project/uav/algorithms";
import { positionAlong, tourPath } from "@/features/project/uav/geometry";
import { cn } from "@/lib/cn";

interface TrajectoryCanvasProps {
  points: readonly Point[];
  tour: readonly number[];
  /** Share of the tour already flown (1 = complete tour drawn, UAV parked). */
  progress: number;
  flying: boolean;
  /** Accessible description of the drawing. */
  label: string;
  /** Slightly fades the drawing while a new instance is being solved. */
  pending?: boolean;
}

/**
 * Square SVG map (0–100 units) of the IoT nodes, the depot and the selected tour, on a light
 * sky surface with a hairline grid (Palette v4): tour and nodes in accent, depot and UAV in ink.
 */
export function TrajectoryCanvas({ points, tour, progress, flying, label, pending = false }: TrajectoryCanvasProps) {
  const path = useMemo(() => tourPath(points, tour), [points, tour]);
  const polyline = path.vertices.map((vertex) => `${vertex.x.toFixed(2)},${vertex.y.toFixed(2)}`).join(" ");
  const position = positionAlong(path, progress);
  const reached = new Set(tour.slice(0, position?.reached ?? tour.length));
  const depot = points[0];

  return (
    <div
      data-tone="sky"
      className={cn(
        "project-visual aspect-square w-full rounded-media border border-sky-200 shadow-soft transition-opacity duration-200",
        pending && "opacity-70",
      )}
    >
      <svg viewBox="0 0 100 100" role="img" aria-label={label} className="relative block size-full">
        <polyline
          points={polyline}
          fill="none"
          className="stroke-accent-soft"
          strokeWidth={0.35}
          strokeDasharray="0.9 1.1"
        />
        <polyline
          points={polyline}
          fill="none"
          className="stroke-accent"
          strokeWidth={0.65}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - progress}
        />

        {points.slice(1).map((point, offset) => {
          const index = offset + 1;
          const visited = reached.has(index);
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={1.55}
              strokeWidth={0.5}
              className={cn("stroke-accent transition-[fill] duration-200", visited ? "fill-accent" : "fill-white")}
            />
          );
        })}

        {depot && (
          <g>
            <rect
              x={depot.x - 2.1}
              y={depot.y - 2.1}
              width={4.2}
              height={4.2}
              rx={0.9}
              className="fill-ink"
            />
            <rect x={depot.x - 0.75} y={depot.y - 0.75} width={1.5} height={1.5} rx={0.3} className="fill-white" />
            <text
              x={depot.x}
              y={depot.y + (depot.y > 90 ? -4.2 : 6)}
              textAnchor="middle"
              fontSize={2.6}
              letterSpacing={0.3}
              stroke="#fff"
              strokeWidth={0.9}
              strokeLinejoin="round"
              paintOrder="stroke"
              className="fill-slate-600 font-mono"
            >
              BASE
            </text>
          </g>
        )}

        {flying && position && <UavGlyph x={position.point.x} y={position.point.y} />}
      </svg>
    </div>
  );
}

const ROTORS = [
  [-1.9, -1.9],
  [1.9, -1.9],
  [1.9, 1.9],
  [-1.9, 1.9],
] as const;

function UavGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
      <circle r={4.4} className="fill-accent/15" />
      <path d="M-1.9 -1.9 L1.9 1.9 M-1.9 1.9 L1.9 -1.9" className="stroke-ink" strokeWidth={0.5} />
      {ROTORS.map(([dx, dy]) => (
        <circle key={`${dx}-${dy}`} cx={dx} cy={dy} r={1.05} className="fill-white stroke-ink" strokeWidth={0.35} />
      ))}
      <rect x={-0.95} y={-0.95} width={1.9} height={1.9} rx={0.45} className="fill-accent" />
    </g>
  );
}
