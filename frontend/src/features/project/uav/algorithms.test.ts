import { describe, expect, it } from "vitest";

import {
  cuckooSearch,
  gamma,
  generateInstance,
  greyWolfOptimizer,
  isValidTour,
  levyStep,
  mulberry32,
  randomTour,
  solveAll,
  tabuSearch,
  tourLength,
  type Point,
  type TourResult,
} from "@/features/project/uav/algorithms";
import { positionAlong, tourPath } from "@/features/project/uav/geometry";

const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

const SOLVERS: Record<string, (points: readonly Point[], seed: number) => TourResult> = {
  random: randomTour,
  gwo: greyWolfOptimizer,
  cuckoo: cuckooSearch,
  tabu: tabuSearch,
};

describe("mulberry32", () => {
  it("is deterministic for a seed and returns values in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = Array.from({ length: 100 }, () => a());
    expect(Array.from({ length: 100 }, () => b())).toEqual(first);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(new Set(first).size).toBe(100);
  });

  it("produces different sequences for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("tourLength", () => {
  it("measures a closed tour, including the return leg", () => {
    expect(tourLength(SQUARE, [0, 1, 2, 3])).toBeCloseTo(4);
    expect(tourLength(SQUARE, [0, 2, 1, 3])).toBeCloseTo(2 + 2 * Math.SQRT2);
  });

  it("is zero for empty or single-node tours", () => {
    expect(tourLength(SQUARE, [])).toBe(0);
    expect(tourLength(SQUARE, [2])).toBe(0);
  });
});

describe("generateInstance", () => {
  it("creates the requested number of nodes inside the margins, deterministically", () => {
    const points = generateInstance(24, 7);
    expect(points).toHaveLength(24);
    expect(points.every((p) => p.x >= 7 && p.x <= 93 && p.y >= 7 && p.y <= 93)).toBe(true);
    expect(generateInstance(24, 7)).toEqual(points);
    expect(generateInstance(24, 8)).not.toEqual(points);
  });
});

describe.each(Object.entries(SOLVERS))("%s", (_name, solve) => {
  it.each([4, 8, 14, 24])("returns a valid tour from the depot for %i nodes", (count) => {
    const points = generateInstance(count, 1000 + count);
    const result = solve(points, 11);
    expect(isValidTour(result.tour, count)).toBe(true);
    expect(result.length).toBeCloseTo(tourLength(points, result.tour), 9);
    expect(result.iterations).toBeGreaterThan(0);
  });

  it("is deterministic for the same seed", () => {
    const points = generateInstance(16, 99);
    expect(solve(points, 5)).toEqual(solve(points, 5));
  });

  it("handles tiny instances", () => {
    const points = generateInstance(3, 1);
    const result = solve(points, 1);
    expect(isValidTour(result.tour, 3)).toBe(true);
  });
});

describe("metaheuristics vs random tours", () => {
  const instances = Array.from({ length: 6 }, (_, index) => generateInstance(18, 500 + index));

  it.each(["gwo", "cuckoo", "tabu"])("%s finds shorter tours than random on average", (key) => {
    let random = 0;
    let optimised = 0;
    instances.forEach((points, index) => {
      random += randomTour(points, index).length;
      optimised += SOLVERS[key](points, index).length;
    });
    expect(optimised).toBeLessThan(random);
  });

  it("tabu search is never worse than its random starting tour", () => {
    instances.forEach((points, index) => {
      expect(tabuSearch(points, index).length).toBeLessThanOrEqual(randomTour(points, index).length + 1e-9);
    });
  });

  it("tabu search finds the optimal tour of a square", () => {
    expect(tabuSearch(SQUARE, 3).length).toBeCloseTo(4);
  });

  it("solveAll runs every algorithm on the same instance", () => {
    const points = generateInstance(12, 3);
    const results = solveAll(points, 3);
    expect(Object.keys(results)).toEqual(["random", "gwo", "cuckoo", "tabu"]);
    Object.values(results).forEach((result) => expect(isValidTour(result.tour, 12)).toBe(true));
    expect(solveAll(points, 3)).toEqual(results);
  });
});

describe("Lévy flights", () => {
  it("uses a correct Gamma function", () => {
    expect(gamma(5)).toBeCloseTo(24, 8);
    expect(gamma(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 8);
    expect(gamma(2.5)).toBeCloseTo(1.329340388, 8);
  });

  it("draws finite, heavy-tailed steps", () => {
    const random = mulberry32(8);
    const steps = Array.from({ length: 5000 }, () => levyStep(random));
    expect(steps.every(Number.isFinite)).toBe(true);
    const median = [...steps].map(Math.abs).sort((a, b) => a - b)[2500];
    const max = Math.max(...steps.map(Math.abs));
    expect(max).toBeGreaterThan(median * 20);
  });
});

describe("flight geometry", () => {
  const path = tourPath(SQUARE, [0, 1, 2, 3]);

  it("closes the tour on the depot", () => {
    expect(path.vertices).toHaveLength(5);
    expect(path.vertices[4]).toEqual(SQUARE[0]);
    expect(path.total).toBeCloseTo(4);
  });

  it("interpolates the UAV position and counts reached stops", () => {
    expect(positionAlong(path, 0)).toEqual({ point: { x: 0, y: 0 }, reached: 1 });
    expect(positionAlong(path, 0.375)).toEqual({ point: { x: 1, y: 0.5 }, reached: 2 });
    expect(positionAlong(path, 1)?.reached).toBe(4);
    expect(positionAlong(tourPath(SQUARE, []), 0.5)).toBeNull();
  });
});
