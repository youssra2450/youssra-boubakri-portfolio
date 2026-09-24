import { GraduationCap } from "lucide-react";

import { staggerIndex } from "@/lib/motion";

/** Responsive variants generated for the profile photo (public/images/*-480|800|1200.webp). */
const RESPONSIVE_PHOTO = /-(480|800|1200)\.webp$/;
const PHOTO_WIDTHS = [480, 800, 1200] as const;
/** Must match the preload hint in index.html. */
const PHOTO_SIZES = "(min-width: 1024px) 440px, 80vw";

function photoSrcSet(url: string): string | undefined {
  if (!RESPONSIVE_PHOTO.test(url)) return undefined;
  return PHOTO_WIDTHS.map((width) => `${url.replace(RESPONSIVE_PHOTO, `-${width}.webp`)} ${width}w`).join(", ");
}

interface HeroPortraitProps {
  photoUrl: string;
  name: string;
  /** Degree shown on the floating glass card (e.g. level + field of the Master's). */
  credential: { level: string; field: string | null } | null;
}

/**
 * Professional photo, displayed as-is (no filter, no recolouring; `object-cover` only crops),
 * in a white frame with a hairline and a soft shadow, over a soft light-blue glow and a fine
 * blue network motif whose strokes draw in on load.
 */
export function HeroPortrait({ photoUrl, name, credential }: HeroPortraitProps) {
  return (
    <figure className="relative mx-auto w-4/5 max-w-[440px] lg:mr-0 lg:w-full">
      <div
        aria-hidden="true"
        className="ambient-drift pointer-events-none absolute -inset-[22%] -z-10 rounded-full bg-[radial-gradient(closest-side,rgb(141_182_234/0.5),rgb(207_224_246/0.25)_55%,transparent)]"
      />
      <NetworkMotif />
      <div className="hero-portrait-frame relative rounded-[26px] border border-white bg-white p-2 shadow-media ring-1 ring-line/70">
        <div className="relative overflow-hidden rounded-media bg-sky-100">
          <img
            src={photoUrl}
            srcSet={photoSrcSet(photoUrl)}
            sizes={PHOTO_SIZES}
            width={800}
            height={800}
            fetchPriority="high"
            decoding="async"
            alt={`Portrait of ${name}`}
            className="hero-portrait-img aspect-[4/5] w-full object-cover object-center"
          />
        </div>
      </div>
      {credential && (
        <figcaption className="hero-glass absolute bottom-7 -left-4 flex max-w-[calc(100%+1rem)] items-center gap-3 rounded-2xl border border-white/90 bg-white/90 py-3 pr-4 pl-3 shadow-glass ring-1 ring-line/60 backdrop-blur-md sm:-left-10 sm:max-w-[330px]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-accent">
            <GraduationCap aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-[10.5px] tracking-[0.12em] text-accent-strong uppercase">
              {credential.level}
            </span>
            {credential.field && (
              <span className="mt-0.5 block text-[14px] leading-snug font-semibold text-ink">{credential.field}</span>
            )}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

/** Nodes of the decorative network, in the 520 × 640 motif coordinate space. */
const NODES: ReadonlyArray<readonly [number, number]> = [
  [470, 70],
  [505, 170],
  [440, 250],
  [500, 330],
  [30, 360],
  [12, 470],
  [70, 560],
  [160, 612],
  [380, 20],
];

/** Solid edges draw in; dashed edges fade in. */
const EDGES: ReadonlyArray<readonly [number, number, "solid" | "dashed"]> = [
  [8, 0, "dashed"],
  [0, 1, "solid"],
  [1, 2, "solid"],
  [2, 3, "solid"],
  [0, 2, "solid"],
  [4, 5, "solid"],
  [5, 6, "solid"],
  [6, 7, "dashed"],
  [4, 6, "solid"],
];

/** Nodes that breathe gently while the hero is on screen. */
const BREATHING = new Set([0, 3, 5]);

/** Faint grid + connected nodes (neural network / pipeline) around the photo. Purely decorative. */
function NetworkMotif() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 520 640"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute -inset-x-[12%] -inset-y-[8%] -z-10 h-[116%] w-[124%] text-accent"
    >
      <defs>
        <pattern id="hero-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <radialGradient id="hero-grid-fade" cx="50%" cy="50%" r="55%">
          <stop offset="0.35" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="hero-grid-mask">
          <rect width="520" height="640" fill="url(#hero-grid-fade)" />
        </mask>
      </defs>
      <rect className="motif-fade" width="520" height="640" fill="url(#hero-grid)" mask="url(#hero-grid-mask)" opacity="0.08" />
      <g stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.4">
        {EDGES.map(([from, to, kind], index) =>
          kind === "solid" ? (
            <line
              key={`${from}-${to}`}
              className="motif-line"
              style={staggerIndex(index)}
              pathLength={1}
              x1={NODES[from][0]}
              y1={NODES[from][1]}
              x2={NODES[to][0]}
              y2={NODES[to][1]}
            />
          ) : (
            <line
              key={`${from}-${to}`}
              className="motif-fade"
              style={staggerIndex(index)}
              x1={NODES[from][0]}
              y1={NODES[from][1]}
              x2={NODES[to][0]}
              y2={NODES[to][1]}
              strokeDasharray="3 5"
            />
          ),
        )}
      </g>
      <g fill="currentColor">
        {NODES.map(([x, y], index) => (
          <g key={`${x}-${y}`} className="motif-node" style={staggerIndex(index)}>
            {BREATHING.has(index) && (
              <circle className="breathe" style={staggerIndex(index % 3)} cx={x} cy={y} r={7} opacity={0.14} />
            )}
            <circle cx={x} cy={y} r={index % 3 === 0 ? 4 : 3} opacity={index % 3 === 0 ? 0.55 : 0.35} />
          </g>
        ))}
      </g>
    </svg>
  );
}
