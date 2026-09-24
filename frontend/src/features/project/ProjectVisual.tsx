import { useId, type CSSProperties, type JSX } from "react";

import { cn } from "@/lib/cn";
import type { ProjectVisual as ProjectVisualKey } from "@/types/api";

/**
 * Decorative project covers (docs/SPEC.md §3.4, Palette v4): pure SVG line-art on a light sky or
 * ivory surface, drawn with palette tokens only (accent / accent-soft / ink). Every cover is a
 * complete static image; the one-shot animations (`pv-*` classes, styles/projects.css) only run
 * inside a `.project-card` — once on first view and on hover / focus — never under reduced motion.
 */

type CoverKey = ProjectVisualKey | "fallback";
/** Light surfaces only — no navy / dark cover exists anymore. */
export type CoverTone = "sky" | "ivory";

const COVERS: Record<CoverKey, { tone: CoverTone; Art: (props: ArtProps) => JSX.Element }> = {
  "multi-agent": { tone: "sky", Art: MultiAgentArt },
  biometric: { tone: "ivory", Art: BiometricArt },
  document: { tone: "ivory", Art: DocumentArt },
  medical: { tone: "sky", Art: MedicalArt },
  uav: { tone: "sky", Art: UavArt },
  vision: { tone: "ivory", Art: VisionArt },
  fallback: { tone: "ivory", Art: FallbackArt },
};

function isCoverKey(value: string): value is CoverKey {
  return Object.hasOwn(COVERS, value);
}

/** Tailwind classes for each role of the line-art. */
interface Palette {
  /** Signal strokes (tour, trend, boundary, detections). */
  hi: string;
  hiFill: string;
  /** Structural strokes (links, mesh, secondary shapes). */
  line: string;
  lineFill: string;
  /** Background structure (orbits, text lines, axis ticks). */
  faint: string;
  faintFill: string;
  /** Hairline outline of white panels. */
  edge: string;
  /** Panels and node bodies. */
  surface: string;
  /** Light blue fills (scene shapes, highlight wells). */
  tint: string;
  /** Fine ink line-art (axes, UAV arms). */
  ink: string;
  inkFill: string;
  /** Mono labels. */
  label: string;
}

const PALETTES: Record<CoverTone, Palette> = {
  sky: {
    hi: "stroke-accent",
    hiFill: "fill-accent",
    line: "stroke-accent-soft",
    lineFill: "fill-accent-soft",
    faint: "stroke-accent/20",
    faintFill: "fill-accent/25",
    edge: "stroke-sky-200",
    surface: "fill-white",
    tint: "fill-sky-100",
    ink: "stroke-ink/70",
    inkFill: "fill-ink",
    label: "fill-slate-600",
  },
  ivory: {
    hi: "stroke-accent",
    hiFill: "fill-accent",
    line: "stroke-accent-soft",
    lineFill: "fill-accent-soft",
    faint: "stroke-ink/15",
    faintFill: "fill-ink/20",
    edge: "stroke-sand-200",
    surface: "fill-white",
    tint: "fill-sky-100",
    ink: "stroke-ink/70",
    inkFill: "fill-ink",
    label: "fill-slate-600",
  },
};

interface ArtProps {
  p: Palette;
  /** Unique, url()-safe prefix for gradient ids. */
  uid: string;
}

interface ProjectVisualProps {
  /** Cover identity key from the API; null or unknown values render the neutral cover. */
  visual: string | null;
  className?: string;
}

export function ProjectVisual({ visual, className }: ProjectVisualProps) {
  const uid = `pv${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const key: CoverKey = visual && isCoverKey(visual) ? visual : "fallback";
  const { tone, Art } = COVERS[key];

  return (
    <div aria-hidden="true" data-visual={key} data-tone={tone} className={cn("project-visual", className)}>
      <svg
        viewBox="0 0 320 180"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        className="relative block size-full"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </radialGradient>
        </defs>
        <Art p={PALETTES[tone]} uid={uid} />
      </svg>
    </div>
  );
}

/** Stagger for the one-shot animations. */
function delay(ms: number): CSSProperties {
  return { "--pv-delay": `${ms}ms` } as CSSProperties;
}

const MONO = "font-mono";

/* ------------------------------------------------------------------------ */
/* multi-agent — four agents around an orchestrating hub, feeding a dashboard */
/* ------------------------------------------------------------------------ */

const HUB = { x: 112, y: 90 };
const AGENTS = [
  { id: "A1", x: 50, y: 46 },
  { id: "A2", x: 174, y: 46 },
  { id: "A3", x: 174, y: 134 },
  { id: "A4", x: 50, y: 134 },
] as const;
const TREND = "218,100 230,91 242,94 254,81 266,84 278,71";
const BAR_HEIGHTS = [12, 20, 16, 26, 22, 32] as const;

function MultiAgentArt({ p, uid }: ArtProps) {
  return (
    <>
      <circle cx={HUB.x} cy={HUB.y} r={44} fill={`url(#${uid}-glow)`} />
      <circle cx={HUB.x} cy={HUB.y} r={76} className={p.faint} strokeDasharray="2 5" />
      {AGENTS.map((agent, index) => (
        <line
          key={`link-${agent.id}`}
          x1={agent.x}
          y1={agent.y}
          x2={HUB.x}
          y2={HUB.y}
          pathLength={1}
          className={cn("pv-draw", p.line)}
          strokeWidth={1.2}
          style={delay(index * 90)}
        />
      ))}

      {/* data flow hub → dashboard */}
      <path d="M127 90 H201" pathLength={1} className={cn("pv-draw", p.hi)} strokeWidth={1.4} style={delay(300)} />
      <path d="M197 86 L201.5 90 L197 94" className={p.hi} strokeWidth={1.4} />
      {[146, 163, 180].map((x, index) => (
        <circle key={x} cx={x} cy={90} r={2} className={cn("pv-ping", p.hiFill)} style={delay(380 + index * 110)} />
      ))}

      <circle cx={HUB.x} cy={HUB.y} r={19} className={cn("pv-halo", p.hi)} />
      <circle cx={HUB.x} cy={HUB.y} r={13} className={cn("pv-shadow", p.surface, p.hi)} strokeWidth={1.4} />
      <circle cx={HUB.x} cy={HUB.y} r={7.5} className={p.tint} />
      <circle cx={HUB.x} cy={HUB.y} r={4} className={p.hiFill} />

      {AGENTS.map((agent, index) => (
        <g key={agent.id}>
          <rect
            x={agent.x - 16}
            y={agent.y - 11}
            width={32}
            height={22}
            rx={6}
            className={cn("pv-shadow", p.surface, p.edge)}
          />
          <text
            x={agent.x}
            y={agent.y + 0.5}
            fontSize={8}
            fontWeight={500}
            letterSpacing={0.4}
            textAnchor="middle"
            dominantBaseline="central"
            className={cn(MONO, p.inkFill)}
          >
            {agent.id}
          </text>
          <circle
            cx={agent.x + 16}
            cy={agent.y - 11}
            r={2.2}
            className={cn("pv-ping", p.hiFill)}
            style={delay(index * 120)}
          />
        </g>
      ))}

      {/* mini dashboard: trend + forecast, KPI bars */}
      <rect x={208} y={30} width={94} height={120} rx={8} className={cn("pv-shadow", p.surface, p.edge)} />
      {[217, 223, 229].map((x) => (
        <circle key={x} cx={x} cy={41} r={1.7} className={p.faintFill} />
      ))}
      <path d="M266 41 H292" className={p.faint} strokeWidth={3} />
      <path d="M208 50 H302" className={p.edge} />
      <path d="M218 104 H292" className={p.faint} />
      <polygon points={`${TREND} 278,104 218,104`} fill={`url(#${uid}-fade)`} />
      <polyline points={TREND} pathLength={1} className={cn("pv-draw", p.hi)} strokeWidth={1.6} style={delay(450)} />
      <path d="M278 71 L291 62" className={p.hi} strokeWidth={1.3} strokeDasharray="2.5 2.5" opacity={0.6} />
      <circle cx={278} cy={71} r={3.6} className={p.surface} />
      <circle cx={278} cy={71} r={2.3} className={p.hiFill} />
      {BAR_HEIGHTS.map((height, index) => (
        <rect
          key={index}
          x={218 + index * 12.4}
          y={140 - height}
          width={8}
          height={height}
          rx={1.8}
          className={cn("pv-grow", index === BAR_HEIGHTS.length - 1 ? p.hiFill : p.lineFill)}
          opacity={index === BAR_HEIGHTS.length - 1 ? 1 : 0.75}
          style={delay(500 + index * 60)}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* biometric — abstract landmark mesh in a scan frame → embedding → AES/RSA   */
/* ------------------------------------------------------------------------ */

const FACE_POINTS: ReadonlyArray<readonly [number, number]> = [
  // outline (0–15)
  [100, 40], [120, 44], [134, 56], [139, 74], [138, 94], [132, 112], [121, 127], [108, 136],
  [100, 138], [92, 136], [79, 127], [68, 112], [62, 94], [61, 74], [66, 56], [80, 44],
  // eyes (16–23)
  [76, 80], [84, 76], [92, 80], [84, 84], [108, 80], [116, 76], [124, 80], [116, 84],
  // brows (24–29)
  [74, 70], [84, 67], [93, 70], [107, 70], [116, 67], [126, 70],
  // nose (30–33)
  [100, 78], [100, 98], [95, 104], [105, 104],
  // mouth (34–37)
  [88, 116], [100, 113], [112, 116], [100, 121],
];

const FACE_EDGES: ReadonlyArray<readonly [number, number]> = [
  ...Array.from({ length: 16 }, (_, index) => [index, (index + 1) % 16] as const),
  [16, 17], [17, 18], [18, 19], [19, 16], [20, 21], [21, 22], [22, 23], [23, 20],
  [24, 25], [25, 26], [27, 28], [28, 29],
  [30, 31], [31, 32], [31, 33], [32, 33],
  [34, 35], [35, 36], [36, 37], [37, 34],
  [0, 26], [0, 27], [15, 24], [1, 29], [26, 27], [26, 30], [27, 30], [24, 14], [29, 3],
  [25, 17], [28, 21], [18, 30], [20, 30], [18, 31], [20, 31], [16, 13], [22, 4], [19, 32], [23, 33],
  [13, 19], [4, 23], [12, 34], [5, 36], [32, 34], [33, 36], [32, 35], [33, 35],
  [37, 8], [34, 10], [36, 6], [37, 9], [37, 7],
];

const KEY_LANDMARKS = new Set([16, 18, 20, 22, 31, 34, 36, 8]);
const EMBEDDING = [0.9, 0.35, 0.7, 0.5, 0.95, 0.3, 0.65, 0.45] as const;

function BiometricArt({ p, uid }: ArtProps) {
  return (
    <>
      <ellipse cx={100} cy={90} rx={52} ry={60} fill={`url(#${uid}-glow)`} />
      {/* scan frame */}
      <path
        d="M44 38 V24 H58 M142 24 H156 V38 M156 142 V156 H142 M58 156 H44 V142"
        className={p.hi}
        strokeWidth={1.6}
      />
      <g className={p.line} strokeWidth={0.8}>
        {FACE_EDGES.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={FACE_POINTS[from][0]}
            y1={FACE_POINTS[from][1]}
            x2={FACE_POINTS[to][0]}
            y2={FACE_POINTS[to][1]}
          />
        ))}
      </g>
      {FACE_POINTS.map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={KEY_LANDMARKS.has(index) ? 2 : 1.3}
          className={cn(p.hiFill, KEY_LANDMARKS.has(index) && "pv-ping")}
          style={KEY_LANDMARKS.has(index) ? delay(200 + (index % 8) * 70) : undefined}
        />
      ))}
      <g className="pv-scan-y">
        <rect x={48} y={16} width={104} height={10} className={p.hiFill} opacity={0.1} />
        <path d="M48 26 H152" className={p.hi} strokeWidth={1.2} />
      </g>

      {/* embedding vector */}
      <path d="M160 90 H175" className={p.line} />
      <rect x={176} y={43} width={16} height={94} rx={4} className={cn(p.surface, p.edge)} />
      {EMBEDDING.map((opacity, index) => (
        <rect
          key={index}
          x={180}
          y={48 + index * 11}
          width={8}
          height={8}
          rx={1.5}
          opacity={opacity}
          className={cn("pv-ping", p.hiFill)}
          style={delay(350 + index * 55)}
        />
      ))}
      <path d="M196 90 H214" pathLength={1} className={cn("pv-draw", p.line)} style={delay(700)} />
      <path d="M210 86 L214.5 90 L210 94" className={p.line} />

      {/* AES — shield + lock */}
      <circle cx={236} cy={89} r={30} className={cn("pv-halo", p.hi)} />
      <path
        d="M236 64 L254 70.5 V88 C254 101 246.5 109.5 236 114 C225.5 109.5 218 101 218 88 V70.5 Z"
        className={cn("pv-shadow", p.surface, p.hi)}
        strokeWidth={1.5}
      />
      <path d="M232 86 V82 A4 4 0 0 1 240 82 V86" className={p.hi} strokeWidth={1.5} />
      <rect x={229} y={86} width={14} height={11} rx={2} className={p.hiFill} />
      <circle cx={236} cy={91} r={1.4} className={p.surface} />
      <text x={262} y={89} fontSize={7} letterSpacing={0.8} dominantBaseline="central" className={cn(MONO, p.label)}>
        AES
      </text>

      {/* RSA — key management */}
      <path d="M236 117 V137" className={p.faint} strokeDasharray="2 3" />
      <circle cx={236} cy={146} r={5} className={cn(p.surface, p.ink)} strokeWidth={1.2} />
      <path d="M241 146 H259 M252 146 V150 M257 146 V151" className={p.ink} strokeWidth={1.2} />
      <text x={266} y={146} fontSize={7} letterSpacing={0.8} dominantBaseline="central" className={cn(MONO, p.label)}>
        RSA
      </text>
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* document — source page → Transformer encoder/decoder → translated page    */
/* ------------------------------------------------------------------------ */

const PAGE_PATH = (x: number) =>
  `M${x + 6} 34 H${x + 52} L${x + 64} 46 V140 A6 6 0 0 1 ${x + 58} 146 H${x + 6} A6 6 0 0 1 ${x} 140 V40 A6 6 0 0 1 ${x + 6} 34 Z`;
const TEXT_LINES = [
  { y: 58, w: 44 },
  { y: 66, w: 40 },
  { y: 74, w: 44 },
  { y: 82, w: 30 },
  { y: 98, w: 44 },
  { y: 106, w: 36 },
  { y: 114, w: 42 },
  { y: 130, w: 26 },
] as const;
const BLOCK_YS = [57, 81, 105] as const;
const ENCODER_X = 120;
const DECODER_X = 168;

function DocumentArt({ p }: ArtProps) {
  return (
    <>
      {/* source document */}
      <path d={PAGE_PATH(20)} className={cn("pv-shadow", p.surface, p.edge)} />
      <path d="M72 34 V46 H84" className={p.edge} />
      <path d="M30 47 H50" className={p.ink} strokeWidth={2.6} opacity={0.55} />
      {TEXT_LINES.map((line) => (
        <path key={line.y} d={`M30 ${line.y} H${30 + line.w}`} className={p.faint} strokeWidth={2.2} />
      ))}
      <path d="M90 90 H104" className={p.line} />
      <path d="M100 86 L104.5 90 L100 94" className={p.line} />

      {/* Transformer */}
      <rect x={110} y={47} width={104} height={86} rx={10} className={cn(p.tint, p.line)} fillOpacity={0.45} strokeDasharray="3 3" />
      <text x={162} y={40} fontSize={6.5} letterSpacing={1.2} textAnchor="middle" className={cn(MONO, p.label)}>
        TRANSFORMER
      </text>
      {[ENCODER_X, DECODER_X].map((x, stack) =>
        BLOCK_YS.map((y, index) => (
          <g key={`${x}-${y}`}>
            <rect
              x={x}
              y={y}
              width={36}
              height={18}
              rx={4}
              className={cn(p.surface, stack === 0 ? p.line : p.hi, "pv-ping")}
              strokeWidth={1.1}
              style={delay(150 + stack * 260 + index * 70)}
            />
            <path d={`M${x + 8} ${y + 9} H${x + 28}`} className={stack === 0 ? p.line : p.hi} opacity={0.8} />
            {index < BLOCK_YS.length - 1 && <path d={`M${x + 18} ${y + 18} V${y + 24}`} className={p.line} />}
          </g>
        )),
      )}
      {[66, 90, 114].map((y, index) => (
        <line
          key={y}
          x1={ENCODER_X + 36}
          y1={66}
          x2={DECODER_X}
          y2={y}
          pathLength={1}
          className={cn("pv-draw", p.line)}
          style={delay(260 + index * 60)}
        />
      ))}
      <text x={138} y={144} fontSize={6.5} letterSpacing={1} textAnchor="middle" className={cn(MONO, p.label)}>
        ENC
      </text>
      <text x={186} y={144} fontSize={6.5} letterSpacing={1} textAnchor="middle" className={cn(MONO, p.label)}>
        DEC
      </text>
      <path d="M220 90 H232" className={p.hi} />
      <path d="M228 86 L232.5 90 L228 94" className={p.hi} />

      {/* translated document */}
      <path d={PAGE_PATH(238)} className={cn("pv-shadow", p.surface, p.hi)} strokeWidth={1.2} />
      <path d="M290 34 V46 H302" className={p.hi} strokeWidth={1.2} />
      <path d="M248 47 H268" pathLength={1} className={cn("pv-draw", p.hi)} strokeWidth={2.6} style={delay(560)} />
      {TEXT_LINES.map((line, index) => (
        <path
          key={line.y}
          d={`M248 ${line.y} H${248 + Math.max(18, line.w - ((index * 7) % 12))}`}
          pathLength={1}
          className={cn("pv-draw", p.line)}
          strokeWidth={2.2}
          style={delay(600 + index * 50)}
        />
      ))}
      {[
        { label: "DOCX", x: 240, width: 28 },
        { label: "PDF", x: 272, width: 22 },
      ].map((tag) => (
        <g key={tag.label}>
          <rect x={tag.x} y={152} width={tag.width} height={12} rx={6} className={cn(p.surface, p.hi)} strokeWidth={0.9} />
          <text
            x={tag.x + tag.width / 2}
            y={158.4}
            fontSize={6.3}
            letterSpacing={0.6}
            textAnchor="middle"
            dominantBaseline="central"
            className={cn(MONO, p.hiFill)}
          >
            {tag.label}
          </text>
        </g>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* medical — benign / malignant clusters split by a decision boundary        */
/* ------------------------------------------------------------------------ */

const BENIGN: ReadonlyArray<readonly [number, number]> = [
  [80, 118], [92, 106], [88, 131], [104, 118], [114, 104], [101, 134], [119, 126], [74, 102], [98, 94], [124, 112],
];
const MALIGNANT: ReadonlyArray<readonly [number, number]> = [
  [210, 60], [222, 48], [236, 58], [228, 72], [214, 76], [246, 70], [234, 38], [250, 52], [222, 88], [258, 84],
];
const BOUNDARY = "M146 150 C170 112 160 66 194 22";

function MedicalArt({ p, uid }: ArtProps) {
  return (
    <>
      <path d={`${BOUNDARY} H294 V150 Z`} className={p.hiFill} opacity={0.06} />
      <ellipse cx={99} cy={116} rx={40} ry={30} fill={`url(#${uid}-glow)`} opacity={0.6} />
      <path d="M36 20 V150 H294" className={p.ink} strokeWidth={0.9} opacity={0.5} />
      <g className={p.faint}>
        {[76, 116, 156, 196, 236, 276].map((x) => (
          <path key={x} d={`M${x} 150 V154`} />
        ))}
        {[40, 70, 100, 130].map((y) => (
          <path key={y} d={`M32 ${y} H36`} />
        ))}
      </g>
      <path d="M134 150 C158 112 148 66 182 22" className={p.line} strokeDasharray="3 3" />
      <path d="M158 150 C182 112 172 66 206 22" className={p.line} strokeDasharray="3 3" />
      <path d={BOUNDARY} pathLength={1} className={cn("pv-draw", p.hi)} strokeWidth={1.7} />

      {BENIGN.map(([x, y], index) => (
        <circle
          key={`b-${index}`}
          cx={x}
          cy={y}
          r={3.1}
          className={cn("pv-ping", p.surface, p.hi)}
          strokeWidth={1.2}
          style={delay(250 + index * 40)}
        />
      ))}
      {MALIGNANT.map(([x, y], index) => (
        <circle
          key={`m-${index}`}
          cx={x}
          cy={y}
          r={3.1}
          className={cn("pv-ping", p.hiFill)}
          style={delay(450 + index * 40)}
        />
      ))}

      {/* clinical cross */}
      <rect x={46} y={24} width={24} height={24} rx={7} className={cn("pv-shadow", p.surface, p.edge)} />
      <path d="M58 30 V42 M52 36 H64" className={p.hi} strokeWidth={2.2} />

      {/* legend */}
      <circle cx={196} cy={166} r={2.6} className={cn(p.surface, p.hi)} strokeWidth={1.1} />
      <text x={202} y={166} fontSize={6.3} letterSpacing={0.9} dominantBaseline="central" className={cn(MONO, p.label)}>
        BENIGN
      </text>
      <circle cx={240} cy={166} r={2.6} className={p.hiFill} />
      <text x={246} y={166} fontSize={6.3} letterSpacing={0.9} dominantBaseline="central" className={cn(MONO, p.label)}>
        MALIGNANT
      </text>
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* vision — image frame with detection boxes and confidence ticks            */
/* ------------------------------------------------------------------------ */

interface Detection {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Filled ticks out of five. */
  ticks: number;
  primary: boolean;
}

const DETECTIONS: readonly Detection[] = [
  { x: 84, y: 66, width: 62, height: 62, ticks: 5, primary: true },
  { x: 164, y: 54, width: 82, height: 70, ticks: 4, primary: true },
  { x: 222, y: 114, width: 30, height: 30, ticks: 2, primary: false },
];

function VisionArt({ p }: ArtProps) {
  return (
    <>
      <rect x={40} y={20} width={240} height={140} rx={9} className={cn("pv-shadow", p.surface, p.edge)} />
      <path
        d="M48 36 V28 H56 M264 28 H272 V36 M272 144 V152 H264 M56 152 H48 V144"
        className={p.faint}
        strokeWidth={1.2}
      />
      {/* abstract scene */}
      <circle cx={115} cy={97} r={22} className={p.tint} />
      <circle cx={115} cy={97} r={12} className={cn(p.surface, p.line)} />
      <rect x={172} y={62} width={66} height={54} rx={10} className={p.tint} />
      <path d="M184 100 L198 84 L210 94 L226 76" className={p.line} strokeWidth={1.3} />
      <circle cx={237} cy={129} r={8} className={p.tint} />
      <path d="M156 90 H164 M160 86 V94" className={p.faint} />

      {DETECTIONS.map((box, index) => {
        const tabWidth = box.primary ? 34 : 24;
        return (
          <g key={index}>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              rx={2}
              pathLength={box.primary ? 1 : undefined}
              className={cn(box.primary && "pv-draw", box.primary ? p.hi : p.line)}
              strokeWidth={box.primary ? 1.5 : 1.1}
              strokeDasharray={box.primary ? undefined : "3 2"}
              style={delay(200 + index * 180)}
            />
            <rect
              x={box.x - 0.75}
              y={box.y - 10}
              width={tabWidth}
              height={10}
              rx={1.5}
              className={box.primary ? p.hiFill : p.lineFill}
            />
            {Array.from({ length: box.primary ? 5 : 3 }, (_, tick) => (
              <rect
                key={tick}
                x={box.x + 4 + tick * 5.6}
                y={box.y - 7.5}
                width={3}
                height={5}
                rx={0.8}
                className={p.surface}
                opacity={tick < box.ticks ? 0.95 : 0.4}
              />
            ))}
          </g>
        );
      })}

      <g className="pv-scan-x">
        <rect x={40} y={20} width={14} height={140} className={p.hiFill} opacity={0.08} />
        <path d="M54 22 V158" className={p.hi} strokeWidth={1.1} />
      </g>
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* uav — IoT nodes on an optimised closed tour, a depot and a small UAV       */
/* ------------------------------------------------------------------------ */

const TOUR_NODES: ReadonlyArray<readonly [number, number]> = [
  [48, 132], [40, 72], [78, 34], [130, 52], [176, 28], [226, 46],
  [280, 34], [286, 96], [248, 142], [198, 112], [150, 150], [104, 110],
];
const SIGNAL_NODES = new Set([2, 5, 8]);
const COVERAGE_NODES = [4, 9] as const;
const UAV = { x: 253, y: 40 };

function UavArt({ p }: ArtProps) {
  const points = TOUR_NODES.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <>
      {COVERAGE_NODES.map((index) => (
        <circle
          key={index}
          cx={TOUR_NODES[index][0]}
          cy={TOUR_NODES[index][1]}
          r={17}
          className={cn(p.tint, p.line)}
          fillOpacity={0.5}
          strokeDasharray="2 3"
        />
      ))}
      <polygon points={points} className={p.line} strokeDasharray="1.5 3" />
      <polygon points={points} pathLength={1} className={cn("pv-draw", p.hi)} strokeWidth={1.6} />

      {TOUR_NODES.slice(1).map(([x, y], offset) => {
        const index = offset + 1;
        return (
          <g key={index}>
            {SIGNAL_NODES.has(index) && (
              <path
                d={`M${x - 4} ${y - 6} Q${x} ${y - 10} ${x + 4} ${y - 6} M${x - 7} ${y - 9} Q${x} ${y - 15} ${x + 7} ${y - 9}`}
                className={p.line}
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={3.4}
              className={cn("pv-ping", p.surface, p.hi)}
              strokeWidth={1.4}
              style={delay(index * 75)}
            />
          </g>
        );
      })}

      {/* depot */}
      <circle cx={48} cy={132} r={12} className={cn("pv-halo", p.hi)} />
      <rect x={42.5} y={126.5} width={11} height={11} rx={2.5} className={cn("pv-shadow", p.inkFill)} />
      <rect x={46} y={130} width={4} height={4} rx={1} className={p.surface} />
      <text x={48} y={150} fontSize={6.5} letterSpacing={1} textAnchor="middle" className={cn(MONO, p.label)}>
        BASE
      </text>

      {/* UAV glyph */}
      <circle cx={UAV.x} cy={UAV.y} r={14} className={cn("pv-halo", p.hi)} style={delay(900)} />
      <path
        d={`M${UAV.x - 6} ${UAV.y - 6} L${UAV.x + 6} ${UAV.y + 6} M${UAV.x - 6} ${UAV.y + 6} L${UAV.x + 6} ${UAV.y - 6}`}
        className={p.ink}
        strokeWidth={1.4}
      />
      {[
        [-6, -6],
        [6, -6],
        [6, 6],
        [-6, 6],
      ].map(([dx, dy]) => (
        <circle
          key={`${dx}-${dy}`}
          cx={UAV.x + dx}
          cy={UAV.y + dy}
          r={3.2}
          className={cn(p.surface, p.ink)}
          strokeWidth={1}
        />
      ))}
      <rect x={UAV.x - 3.2} y={UAV.y - 3.2} width={6.4} height={6.4} rx={1.6} className={p.hiFill} />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* fallback — neutral grid + connected nodes                                  */
/* ------------------------------------------------------------------------ */

const FALLBACK_NODES: ReadonlyArray<readonly [number, number]> = [
  [78, 64], [128, 42], [176, 82], [234, 54], [258, 114], [194, 136], [116, 122],
];
const FALLBACK_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [2, 5], [0, 2], [2, 4],
];

function FallbackArt({ p, uid }: ArtProps) {
  return (
    <>
      <circle cx={176} cy={82} r={40} fill={`url(#${uid}-glow)`} />
      {FALLBACK_EDGES.map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={FALLBACK_NODES[from][0]}
          y1={FALLBACK_NODES[from][1]}
          x2={FALLBACK_NODES[to][0]}
          y2={FALLBACK_NODES[to][1]}
          pathLength={1}
          className={cn("pv-draw", p.line)}
          style={delay(from * 60)}
        />
      ))}
      {FALLBACK_NODES.map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={index === 2 ? 6.5 : 4.2}
          className={cn("pv-ping", p.surface, index === 2 ? p.hi : p.line)}
          strokeWidth={1.4}
          style={delay(200 + index * 60)}
        />
      ))}
      <circle cx={176} cy={82} r={2.2} className={p.hiFill} />
    </>
  );
}
