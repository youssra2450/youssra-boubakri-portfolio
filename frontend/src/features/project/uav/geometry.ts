import type { Point } from "@/features/project/uav/algorithms";

/** A closed tour as a drawable path: the depot is repeated at the end. */
export interface TourPath {
  vertices: Point[];
  /** Distance from the start to each vertex along the path. */
  cumulative: number[];
  total: number;
}

export function tourPath(points: readonly Point[], tour: readonly number[]): TourPath {
  const vertices = tour.length > 0 ? [...tour, tour[0]].map((index) => points[index]) : [];
  const cumulative: number[] = [];
  let total = 0;
  vertices.forEach((vertex, index) => {
    if (index > 0) total += Math.hypot(vertex.x - vertices[index - 1].x, vertex.y - vertices[index - 1].y);
    cumulative.push(total);
  });
  return { vertices, cumulative, total };
}

export interface FlightPosition {
  point: Point;
  /** Tour stops reached so far (the depot counts as the first one). */
  reached: number;
}

/** Position of the UAV after flying `progress` (0–1) of the tour. */
export function positionAlong(path: TourPath, progress: number): FlightPosition | null {
  const { vertices, cumulative, total } = path;
  if (vertices.length === 0) return null;
  const distance = Math.min(1, Math.max(0, progress)) * total;
  let segment = 1;
  while (segment < vertices.length - 1 && cumulative[segment] < distance) segment += 1;
  const from = vertices[segment - 1];
  const to = vertices[segment] ?? from;
  const length = cumulative[segment] - cumulative[segment - 1] || 1;
  const ratio = Math.min(1, Math.max(0, (distance - cumulative[segment - 1]) / length));
  const reached = cumulative.filter((value) => value <= distance + 1e-9).length;
  return {
    point: { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio },
    reached: Math.min(reached, vertices.length - 1),
  };
}
