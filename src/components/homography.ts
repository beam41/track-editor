import type { Matrix3x3, Vector2 } from '../index.types';
import { scaled } from '../utils/scaled';

const H_DEFAULT = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
] as Matrix3x3;

// --- Reference Points for Map Alignment ---
// Using your provided four corners (clockwise from top left)
const referenceWorldPoints = [
  { x: -1277708.2965454245, y: -317662.26182056009 }, // top-left
  { x: 917131.48374835111, y: -315379.30946399376 }, // top-right
  { x: 917957.0844781138, y: 1877914.3470450507 }, // bottom-right
  { x: -1279574.7736519347, y: 1879092.599622732 }, // bottom-left
];

// Destination points matching the canvas dimensions (800×800)
const referenceMapPoints = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
].map(({ x, y }) => ({ x: scaled(x), y: scaled(y) }));

// The homography matrix (3x3) mapping world points to canvas points.
let H: Matrix3x3;
try {
  H = computeHomography(referenceWorldPoints, referenceMapPoints);
} catch (e) {
  console.error('Homography computation failed:', e);
  H = H_DEFAULT;
}

/* ========= Homography Computation ========= */
function solveLinearSystem(A: number[][], b: number[]) {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    A[i].push(b[i]);
  }
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
        maxRow = j;
      }
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    if (Math.abs(A[i][i]) < 1e-10) {
      throw new Error('Matrix is singular or nearly singular');
    }
    const pivot = A[i][i];
    for (let j = i; j < n + 1; j++) {
      A[i][j] /= pivot;
    }
    for (let j = i + 1; j < n; j++) {
      const factor = A[j][i];
      for (let k = i; k < n + 1; k++) {
        A[j][k] -= factor * A[i][k];
      }
    }
  }
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = A[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= A[i][j] * x[j];
    }
  }
  return x;
}

function computeHomography(srcPoints: Vector2[], dstPoints: Vector2[]) {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = srcPoints[i];
    const { x: xp, y: yp } = dstPoints[i];
    A.push([x, y, 1, 0, 0, 0, -xp * x, -xp * y]);
    b.push(xp);
    A.push([0, 0, 0, x, y, 1, -yp * x, -yp * y]);
    b.push(yp);
  }
  const h = solveLinearSystem(A, b);
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ] as Matrix3x3;
}

export function transformPoint(point: Vector2) {
  const x = point.x,
    y = point.y;
  const xp = H[0][0] * x + H[0][1] * y + H[0][2];
  const yp = H[1][0] * x + H[1][1] * y + H[1][2];
  const wp = H[2][0] * x + H[2][1] * y + H[2][2];
  return { x: xp / wp, y: yp / wp };
}
