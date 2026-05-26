import type { Corner } from "./types";

const N = 32;
const HALF = N / 2;

export function steppedTriangle(corner: Corner): string {
  const pts: [number, number][] = [];

  if (corner === "top") {
    pts.push([0, 0], [N, 0]);
    let x = N, y = 0;
    for (let i = 0; i < HALF; i++) {
      y++;
      pts.push([x, y]);
      x--;
      pts.push([x, y]);
    }
    for (let i = 0; i < HALF; i++) {
      x--;
      pts.push([x, y]);
      y--;
      pts.push([x, y]);
    }
  } else if (corner === "bottom") {
    pts.push([N, N]);
    let x = N, y = N;
    for (let i = 0; i < HALF; i++) {
      y--;
      pts.push([x, y]);
      x--;
      pts.push([x, y]);
    }
    for (let i = 0; i < HALF; i++) {
      x--;
      pts.push([x, y]);
      y++;
      pts.push([x, y]);
    }
  } else if (corner === "left") {
    pts.push([0, 0]);
    let x = 0, y = 0;
    for (let i = 0; i < HALF; i++) {
      x++;
      pts.push([x, y]);
      y++;
      pts.push([x, y]);
    }
    for (let i = 0; i < HALF; i++) {
      y++;
      pts.push([x, y]);
      x--;
      pts.push([x, y]);
    }
  } else {
    pts.push([N, 0]);
    let x = N, y = 0;
    for (let i = 0; i < HALF; i++) {
      x--;
      pts.push([x, y]);
      y++;
      pts.push([x, y]);
    }
    for (let i = 0; i < HALF; i++) {
      y++;
      pts.push([x, y]);
      x++;
      pts.push([x, y]);
    }
  }

  return `polygon(${pts
    .map(([x, y]) => `${(x / N) * 100}% ${(y / N) * 100}%`)
    .join(", ")})`;
}

export function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
