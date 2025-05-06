type Point = { x: number; y: number; z: number };

export function orientation2D(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.atan2(dy, dx);
}

export function toDegrees(rad: number): number {
  return rad * (180 / Math.PI);
}
