/**
 * TSP metaheuristics for the interactive UAV trajectory lab (docs/SPEC.md §3.4).
 *
 * Illustrative, self-contained re-implementations — not the original project's code.
 * Every function is pure and deterministic for a given seed. Tours are closed: they
 * start at the depot (node 0), visit every IoT node exactly once and return to the depot.
 */

export interface Point {
  x: number;
  y: number;
}

export interface TourResult {
  /** Node indices, starting with the depot (0); the return leg to the depot is implicit. */
  tour: number[];
  length: number;
  /** Iterations (generations / search steps) actually performed. */
  iterations: number;
}

export type Random = () => number;

/* ------------------------------------------------------------------------ */
/* Seeded randomness                                                         */
/* ------------------------------------------------------------------------ */

/** Mulberry32: small, fast 32-bit PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample (Box–Muller). */
function gaussian(random: Random): number {
  const u = 1 - random(); // (0, 1] — avoids log(0)
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randomInt(random: Random, maxExclusive: number): number {
  return Math.floor(random() * maxExclusive);
}

/* ------------------------------------------------------------------------ */
/* Instances and tours                                                       */
/* ------------------------------------------------------------------------ */

export interface InstanceOptions {
  /** Side of the square area (default 100). */
  size?: number;
  /** Empty border kept around the nodes (default 7). */
  margin?: number;
  /** Preferred minimum distance between nodes (default 9); relaxed if the area is crowded. */
  minSpacing?: number;
}

/**
 * Random instance: node 0 is the depot, the others are IoT nodes. Rejection sampling keeps
 * nodes apart so the drawing stays legible; the spacing is relaxed after repeated misses.
 */
export function generateInstance(count: number, seed: number, options: InstanceOptions = {}): Point[] {
  const { size = 100, margin = 7, minSpacing = 9 } = options;
  const random = mulberry32(seed);
  const span = size - 2 * margin;
  const points: Point[] = [];
  let spacing = minSpacing;
  let misses = 0;

  while (points.length < count) {
    const candidate = { x: margin + random() * span, y: margin + random() * span };
    if (points.every((point) => Math.hypot(point.x - candidate.x, point.y - candidate.y) >= spacing)) {
      points.push(candidate);
      misses = 0;
    } else if (++misses > 200) {
      spacing *= 0.85;
      misses = 0;
    }
  }
  return points;
}

/** Symmetric Euclidean distance matrix (row-major). */
function distanceMatrix(points: readonly Point[]): Float64Array {
  const n = points.length;
  const matrix = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      matrix[i * n + j] = d;
      matrix[j * n + i] = d;
    }
  }
  return matrix;
}

function closedLength(tour: readonly number[], dist: Float64Array, n: number): number {
  let total = 0;
  for (let i = 0; i < tour.length; i++) total += dist[tour[i] * n + tour[(i + 1) % tour.length]];
  return total;
}

/** Length of the closed tour (including the return leg to its first node). */
export function tourLength(points: readonly Point[], tour: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < tour.length; i++) {
    const a = points[tour[i]];
    const b = points[tour[(i + 1) % tour.length]];
    total += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return total;
}

/** True when `tour` is a permutation of 0..count-1 that starts at the depot. */
export function isValidTour(tour: readonly number[], count: number): boolean {
  if (tour.length !== count || (count > 0 && tour[0] !== 0)) return false;
  const seen = new Set(tour);
  return seen.size === count && tour.every((node) => Number.isInteger(node) && node >= 0 && node < count);
}

/** Tours with fewer than four nodes have a single possible length. */
function trivialResult(points: readonly Point[]): TourResult {
  const tour = points.map((_, index) => index);
  return { tour, length: tourLength(points, tour), iterations: 0 };
}

/** Uniformly random tour from the depot (Fisher–Yates on the IoT nodes). */
export function randomTour(points: readonly Point[], seed: number): TourResult {
  const random = mulberry32(seed);
  const tour = points.map((_, index) => index);
  for (let i = tour.length - 1; i > 1; i--) {
    const j = 1 + randomInt(random, i);
    [tour[i], tour[j]] = [tour[j], tour[i]];
  }
  return { tour, length: tourLength(points, tour), iterations: points.length > 0 ? 1 : 0 };
}

/* ------------------------------------------------------------------------ */
/* Random-key encoding (GWO, Cuckoo Search)                                  */
/* ------------------------------------------------------------------------ */

/**
 * A continuous position (one key per IoT node) decodes to the tour that visits the
 * nodes by increasing key, starting from the depot.
 */
class RandomKeyProblem {
  readonly dimension: number;
  private readonly n: number;
  private readonly dist: Float64Array;
  /** Reused index buffer, re-sorted in place for every evaluation (no allocation). */
  private readonly order: Int32Array;

  constructor(points: readonly Point[]) {
    this.n = points.length;
    this.dimension = points.length - 1;
    this.dist = distanceMatrix(points);
    this.order = Int32Array.from({ length: this.dimension }, (_, index) => index);
  }

  randomPosition(random: Random): Float64Array {
    return Float64Array.from({ length: this.dimension }, () => random());
  }

  decode(keys: Float64Array): number[] {
    this.sortBy(keys);
    return [0, ...Array.from(this.order, (index) => index + 1)];
  }

  cost(keys: Float64Array): number {
    this.sortBy(keys);
    const { n, dist, order } = this;
    let total = 0;
    let previous = 0;
    for (let i = 0; i < order.length; i++) {
      const node = order[i] + 1;
      total += dist[previous * n + node];
      previous = node;
    }
    return total + dist[previous * n];
  }

  /**
   * Insertion sort of the node indices by key (ties broken by index, so decoding is
   * deterministic). Faster than Array#sort with a comparator for these small arrays, and
   * the buffer is usually already close to sorted.
   */
  private sortBy(keys: Float64Array): void {
    const order = this.order;
    for (let i = 1; i < order.length; i++) {
      const item = order[i];
      const key = keys[item];
      let j = i - 1;
      while (j >= 0 && (keys[order[j]] > key || (keys[order[j]] === key && order[j] > item))) {
        order[j + 1] = order[j];
        j -= 1;
      }
      order[j + 1] = item;
    }
  }
}

interface Candidate {
  keys: Float64Array;
  cost: number;
}

function toResult(problem: RandomKeyProblem, best: Candidate, iterations: number): TourResult {
  return { tour: problem.decode(best.keys), length: best.cost, iterations };
}

/* ------------------------------------------------------------------------ */
/* Grey Wolf Optimizer                                                       */
/* ------------------------------------------------------------------------ */

export interface GreyWolfOptions {
  wolves?: number;
  iterations?: number;
}

/**
 * Grey Wolf Optimizer (Mirjalili et al., 2014) on random keys: the pack moves towards the
 * three best wolves (α, β, δ) while the coefficient `a` decreases linearly from 2 to 0,
 * shifting the search from exploration to exploitation.
 */
export function greyWolfOptimizer(
  points: readonly Point[],
  seed: number,
  { wolves = 20, iterations = 150 }: GreyWolfOptions = {},
): TourResult {
  if (points.length < 4) return trivialResult(points);
  const random = mulberry32(seed);
  const problem = new RandomKeyProblem(points);
  const dimension = problem.dimension;

  const pack: Candidate[] = Array.from({ length: wolves }, () => {
    const keys = problem.randomPosition(random);
    return { keys, cost: problem.cost(keys) };
  });
  // α, β, δ: the three best positions found so far (copies, sorted by cost).
  const leaders: Candidate[] = [...pack]
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 3)
    .map((wolf) => ({ keys: wolf.keys.slice(), cost: wolf.cost }));

  for (let t = 0; t < iterations; t++) {
    const a = 2 - (2 * t) / iterations;
    for (const wolf of pack) {
      for (let d = 0; d < dimension; d++) {
        let sum = 0;
        for (const leader of leaders) {
          const A = 2 * a * random() - a;
          const C = 2 * random();
          const distance = Math.abs(C * leader.keys[d] - wolf.keys[d]);
          sum += leader.keys[d] - A * distance;
        }
        wolf.keys[d] = sum / leaders.length;
      }
      wolf.cost = problem.cost(wolf.keys);
      promoteLeader(leaders, wolf);
    }
  }
  return toResult(problem, leaders[0], iterations);
}

/** Insert `wolf` into the α/β/δ hierarchy when it beats one of them. */
function promoteLeader(leaders: Candidate[], wolf: Candidate): void {
  const rank = leaders.findIndex((leader) => wolf.cost < leader.cost - 1e-12);
  if (rank === -1) return;
  leaders.splice(rank, 0, { keys: wolf.keys.slice(), cost: wolf.cost });
  leaders.length = Math.min(leaders.length, 3);
}

/* ------------------------------------------------------------------------ */
/* Cuckoo Search                                                             */
/* ------------------------------------------------------------------------ */

/** Lanczos approximation of the Gamma function (g = 7), accurate to ~1e-13 for z > 0. */
export function gamma(z: number): number {
  const coefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  const x = z - 1;
  let sum = coefficients[0];
  for (let i = 1; i < coefficients.length; i++) sum += coefficients[i] / (x + i);
  const t = x + 7.5;
  return Math.sqrt(2 * Math.PI) * t ** (x + 0.5) * Math.exp(-t) * sum;
}

const LEVY_BETA = 1.5;
/** Mantegna's σ_u for the Lévy exponent β. */
const LEVY_SIGMA =
  ((gamma(1 + LEVY_BETA) * Math.sin((Math.PI * LEVY_BETA) / 2)) /
    (gamma((1 + LEVY_BETA) / 2) * LEVY_BETA * 2 ** ((LEVY_BETA - 1) / 2))) **
  (1 / LEVY_BETA);

/** One Lévy-distributed step (Mantegna's algorithm): u / |v|^(1/β), u ~ N(0, σ²), v ~ N(0, 1). */
export function levyStep(random: Random): number {
  const u = gaussian(random) * LEVY_SIGMA;
  const v = Math.max(Math.abs(gaussian(random)), 1e-9);
  return u / v ** (1 / LEVY_BETA);
}

export interface CuckooOptions {
  nests?: number;
  iterations?: number;
  /** Fraction of nests discovered (and rebuilt) by the host birds at each generation. */
  pa?: number;
  /** Scale of the Lévy flights relative to the distance to the best nest. */
  stepScale?: number;
}

/**
 * Cuckoo Search (Yang & Deb, 2009) on random keys: every nest lays a new egg by a Lévy
 * flight (Mantegna, β = 1.5) scaled by its distance to the best nest, kept when it beats the
 * nest's current solution (as in the authors' reference implementation); then a fraction
 * `pa` of the nests is discovered and rebuilt by a biased random walk. The best nest is kept.
 */
export function cuckooSearch(
  points: readonly Point[],
  seed: number,
  { nests = 20, iterations = 120, pa = 0.25, stepScale = 1 }: CuckooOptions = {},
): TourResult {
  if (points.length < 4) return trivialResult(points);
  const random = mulberry32(seed);
  const problem = new RandomKeyProblem(points);
  const dimension = problem.dimension;

  const population: Candidate[] = Array.from({ length: nests }, () => {
    const keys = problem.randomPosition(random);
    return { keys, cost: problem.cost(keys) };
  });
  let best = bestOf(population);

  for (let t = 0; t < iterations; t++) {
    // 1. Lévy flights around each nest; the new egg replaces the nest's solution when better.
    for (const nest of population) {
      const keys = new Float64Array(dimension);
      for (let d = 0; d < dimension; d++) {
        const step = stepScale * levyStep(random) * (nest.keys[d] - best.keys[d]);
        keys[d] = nest.keys[d] + step * gaussian(random);
      }
      const cost = problem.cost(keys);
      if (cost < nest.cost) {
        nest.keys = keys;
        nest.cost = cost;
      }
    }
    best = bestOf(population);

    // 2. Discovery: a fraction pa of the nests is rebuilt by a biased random walk.
    for (const nest of population) {
      if (nest === best || random() >= pa) continue;
      const first = population[randomInt(random, nests)];
      const second = population[randomInt(random, nests)];
      const scale = random();
      const keys = nest.keys.map((key, d) => key + scale * (first.keys[d] - second.keys[d]));
      const cost = problem.cost(keys);
      if (cost < nest.cost) {
        nest.keys = keys;
        nest.cost = cost;
      }
    }
    best = bestOf(population);
  }
  return toResult(problem, best, iterations);
}

function bestOf(population: readonly Candidate[]): Candidate {
  return population.reduce((best, candidate) => (candidate.cost < best.cost ? candidate : best));
}

/* ------------------------------------------------------------------------ */
/* Tabu Search                                                               */
/* ------------------------------------------------------------------------ */

export interface TabuOptions {
  iterations?: number;
  /** Iterations during which a node pair that was just moved cannot be moved again. */
  tenure?: number;
  /** Stop after this many iterations without improving the best tour. */
  patience?: number;
}

interface Move {
  kind: "two-opt" | "swap";
  i: number;
  j: number;
  delta: number;
}

/**
 * Tabu Search over the 2-opt (segment reversal) and swap neighbourhoods. At each step the
 * best admissible move is applied, even when it worsens the tour; recently moved node pairs
 * are tabu for `tenure` iterations unless the move beats the best tour (aspiration).
 */
export function tabuSearch(
  points: readonly Point[],
  seed: number,
  { iterations = 200, tenure, patience = 60 }: TabuOptions = {},
): TourResult {
  const n = points.length;
  if (n < 4) return trivialResult(points);
  const dist = distanceMatrix(points);
  const d = (a: number, b: number) => dist[a * n + b];
  const tabuTenure = tenure ?? Math.max(5, Math.round(n / 3));
  // Separate tabu tables for the two move types, indexed by node pair.
  const tabuUntil = { "two-opt": new Int32Array(n * n), swap: new Int32Array(n * n) };

  const current = randomTour(points, seed).tour;
  let currentLength = closedLength(current, dist, n);
  let best = current.slice();
  let bestLength = currentLength;
  let stale = 0;
  let iteration = 0;

  while (iteration < iterations && stale < patience) {
    iteration += 1;
    let chosen: Move | null = null;

    const consider = (kind: Move["kind"], i: number, j: number, delta: number) => {
      const a = current[i];
      const b = current[j];
      const key = Math.min(a, b) * n + Math.max(a, b);
      const aspiration = currentLength + delta < bestLength - 1e-9;
      if (tabuUntil[kind][key] >= iteration && !aspiration) return;
      if (!chosen || delta < chosen.delta - 1e-12) chosen = { kind, i, j, delta };
    };

    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const prev = current[i - 1];
        const next = current[(j + 1) % n];
        if (!(i === 1 && j === n - 1)) {
          // Reverse current[i..j]: edges (prev, ci) and (cj, next) become (prev, cj) and (ci, next).
          consider("two-opt", i, j, d(prev, current[j]) + d(current[i], next) - d(prev, current[i]) - d(current[j], next));
        }
        consider("swap", i, j, swapDelta(current, i, j, d));
      }
    }

    const move = chosen as Move | null;
    if (!move) break; // every move is tabu and none qualifies for aspiration
    const a = current[move.i];
    const b = current[move.j];
    if (move.kind === "two-opt") reverse(current, move.i, move.j);
    else [current[move.i], current[move.j]] = [current[move.j], current[move.i]];
    tabuUntil[move.kind][Math.min(a, b) * n + Math.max(a, b)] = iteration + tabuTenure;

    currentLength = closedLength(current, dist, n);
    if (currentLength < bestLength - 1e-9) {
      best = current.slice();
      bestLength = currentLength;
      stale = 0;
    } else {
      stale += 1;
    }
  }
  return { tour: best, length: bestLength, iterations: iteration };
}

function reverse(tour: number[], from: number, to: number): void {
  for (let i = from, j = to; i < j; i++, j--) [tour[i], tour[j]] = [tour[j], tour[i]];
}

/** Length change of swapping the nodes at positions i < j (position 0, the depot, never moves). */
function swapDelta(tour: readonly number[], i: number, j: number, d: (a: number, b: number) => number): number {
  const n = tour.length;
  const a = tour[i];
  const b = tour[j];
  const beforeA = tour[i - 1];
  const afterB = tour[(j + 1) % n];
  if (j === i + 1) {
    return d(beforeA, b) + d(a, afterB) - d(beforeA, a) - d(b, afterB);
  }
  const afterA = tour[i + 1];
  const beforeB = tour[j - 1];
  return (
    d(beforeA, b) + d(b, afterA) + d(beforeB, a) + d(a, afterB) - d(beforeA, a) - d(a, afterA) - d(beforeB, b) - d(b, afterB)
  );
}

/* ------------------------------------------------------------------------ */
/* Comparison                                                                */
/* ------------------------------------------------------------------------ */

export type AlgorithmKey = "random" | "gwo" | "cuckoo" | "tabu";

export interface AlgorithmInfo {
  key: AlgorithmKey;
  label: string;
  shortLabel: string;
}

export const ALGORITHMS: readonly AlgorithmInfo[] = [
  { key: "random", label: "Random", shortLabel: "Random" },
  { key: "gwo", label: "Grey Wolf Optimizer", shortLabel: "GWO" },
  { key: "cuckoo", label: "Cuckoo Search", shortLabel: "Cuckoo Search" },
  { key: "tabu", label: "Tabu Search", shortLabel: "Tabu Search" },
];

/** Run every algorithm on the same instance; each gets its own seed derived from `seed`. */
export function solveAll(points: readonly Point[], seed: number): Record<AlgorithmKey, TourResult> {
  return {
    random: randomTour(points, seed ^ 0x51ed),
    gwo: greyWolfOptimizer(points, seed ^ 0x6a09),
    cuckoo: cuckooSearch(points, seed ^ 0xbb67),
    tabu: tabuSearch(points, seed ^ 0x3c6e),
  };
}
