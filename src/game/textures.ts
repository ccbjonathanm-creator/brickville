import * as THREE from "three";
import { PLATE_STUDS } from "./constants";
import type { PlateType } from "./constants";

const cache = new Map<string, THREE.CanvasTexture>();

function studGrid(
  ctx: CanvasRenderingContext2D,
  size: number,
  base: string,
  stud: string,
  ring: string,
) {
  const n = PLATE_STUDS;
  const cell = size / n;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cx = (i + 0.5) * cell;
      const cy = (j + 0.5) * cell;
      const r = cell * 0.28;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = stud;
      ctx.fill();
      ctx.strokeStyle = ring;
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.stroke();
    }
  }
}

function roadRect(
  ctx: CanvasRenderingContext2D,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const asphalt = "#5c5f63";
  const line = "#f4f1ea";
  ctx.fillStyle = asphalt;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = line;
  ctx.lineWidth = size * 0.012;
  ctx.setLineDash([size * 0.04, size * 0.035]);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const vertical = x1 - x0 < y1 - y0;
  ctx.beginPath();
  if (vertical) {
    ctx.moveTo(mx, y0);
    ctx.lineTo(mx, y1);
  } else {
    ctx.moveTo(x0, my);
    ctx.lineTo(x1, my);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function sidewalkBand(ctx: CanvasRenderingContext2D, size: number, type: PlateType) {
  const curb = "#c5c0b5";
  const n = PLATE_STUDS;
  const cell = size / n;
  const road = 16;
  const margin = (n - road) / 2;
  const x0 = margin * cell;
  const x1 = (margin + road) * cell;
  const y0 = margin * cell;
  const y1 = (margin + road) * cell;

  const fillNS = () => roadRect(ctx, size, x0, 0, x1, size);
  const fillEW = () => roadRect(ctx, size, 0, y0, size, y1);

  ctx.fillStyle = curb;
  switch (type) {
    case "road-ns":
      fillNS();
      break;
    case "road-ew":
      fillEW();
      break;
    case "road-cross":
      fillNS();
      fillEW();
      break;
    case "road-t-n":
      fillNS();
      roadRect(ctx, size, 0, 0, size, y1);
      break;
    case "road-t-s":
      fillNS();
      roadRect(ctx, size, 0, y0, size, size);
      break;
    case "road-t-e":
      fillEW();
      roadRect(ctx, size, x0, 0, size, size);
      break;
    case "road-t-w":
      fillEW();
      roadRect(ctx, size, 0, 0, x1, size);
      break;
    case "road-curve-ne":
      fillCurve(ctx, size, x1, y0, 1);
      break;
    case "road-curve-se":
      fillCurve(ctx, size, x1, y1, 2);
      break;
    case "road-curve-sw":
      fillCurve(ctx, size, x0, y1, 3);
      break;
    case "road-curve-nw":
      fillCurve(ctx, size, x0, y0, 4);
      break;
    default:
      break;
  }
}

function fillCurve(
  ctx: CanvasRenderingContext2D,
  size: number,
  _cx: number,
  _cy: number,
  quadrant: number,
) {
  const n = PLATE_STUDS;
  const cell = size / n;
  const road = 16;
  const margin = (n - road) / 2;
  const inner = margin * cell;
  const outer = (margin + road) * cell;
  const asphalt = "#5c5f63";
  ctx.fillStyle = asphalt;
  ctx.beginPath();
  let cx = 0;
  let cy = 0;
  let a0 = 0;
  let a1 = 0;
  if (quadrant === 1) {
    cx = size;
    cy = 0;
    a0 = Math.PI / 2;
    a1 = Math.PI;
  } else if (quadrant === 2) {
    cx = size;
    cy = size;
    a0 = Math.PI;
    a1 = Math.PI * 1.5;
  } else if (quadrant === 3) {
    cx = 0;
    cy = size;
    a0 = Math.PI * 1.5;
    a1 = Math.PI * 2;
  } else {
    cx = 0;
    cy = 0;
    a0 = 0;
    a1 = Math.PI / 2;
  }
  ctx.arc(cx, cy, outer, a0, a1, false);
  ctx.arc(cx, cy, inner, a1, a0, true);
  ctx.closePath();
  ctx.fill();
}

export function getPlateTexture(type: PlateType): THREE.CanvasTexture {
  const hit = cache.get(type);
  if (hit) return hit;
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  const palettes: Record<string, [string, string, string]> = {
    grass: ["#4a8a4e", "#5b9b5c", "#3e7542"],
    sand: ["#d9c089", "#e4cd9e", "#c4aa70"],
    plaza: ["#b9b6ae", "#c9c6be", "#a8a59e"],
    water: ["#2f7f9c", "#3b93b4", "#246883"],
  };

  const isRoad = type.startsWith("road");
  const [base, stud, ring] = isRoad
    ? (["#8a9a6a", "#97a876", "#73825a"] as [string, string, string])
    : (palettes[type] ?? palettes.grass);

  studGrid(ctx, size, base, stud, ring);
  if (isRoad) sidewalkBand(ctx, size, type);
  if (type === "water") {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse(
        ((i * 73) % size) + 40,
        ((i * 131) % size) + 20,
        48,
        14,
        i * 0.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cache.set(type, tex);
  return tex;
}

export function getWoodTexture(): THREE.CanvasTexture {
  const hit = cache.get("wood");
  if (hit) return hit;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#6b4423";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#7a4e2a" : "#5e3b1e";
    ctx.fillRect(0, (i * size) / 28, size, size / 28 - 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set("wood", tex);
  return tex;
}
