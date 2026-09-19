import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BRICK_H, COLORS, GAP, PLATE_H, STUD_H, STUD_R } from "./constants";
import type { BrickKind, ColorId } from "./types";

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.MeshStandardMaterial>();

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  for (const p of parts) {
    p.deleteAttribute("uv");
    p.deleteAttribute("uv1");
    p.deleteAttribute("uv2");
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) {
    return new THREE.BoxGeometry(1, 1, 1);
  }
  merged.computeVertexNormals();
  return merged;
}

function studsOnTop(w: number, d: number, h: number): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < d; j++) {
      const cyl = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 10);
      cyl.translate(i + 0.5, h + STUD_H / 2, j + 0.5);
      parts.push(cyl);
    }
  }
  return parts;
}

function brickBody(w: number, d: number, h: number): THREE.BufferGeometry {
  const bw = Math.max(0.12, w - GAP);
  const bd = Math.max(0.12, d - GAP);
  const box = new THREE.BoxGeometry(bw, h, bd);
  box.translate(w / 2, h / 2, d / 2);
  return box;
}

export function getBrickGeometry(
  kind: BrickKind,
  w: number,
  d: number,
  hPlates: number,
): THREE.BufferGeometry {
  const key = `${kind}:${w}x${d}x${hPlates}`;
  const hit = geoCache.get(key);
  if (hit) return hit;

  const h = hPlates * PLATE_H;
  let geo: THREE.BufferGeometry;

  switch (kind) {
    case "tile": {
      geo = brickBody(w, d, h);
      break;
    }
    case "plate":
    case "brick": {
      geo = merge([brickBody(w, d, h), ...studsOnTop(w, d, h)]);
      break;
    }
    case "round": {
      const r = Math.min(w, d) / 2 - GAP / 2;
      const cyl = new THREE.CylinderGeometry(r, r, h, 20);
      cyl.translate(w / 2, h / 2, d / 2);
      const parts = [cyl, ...studsOnTop(w, d, h)];
      geo = merge(parts);
      break;
    }
    case "slope": {
      geo = makeWedge(w, d, h, true);
      break;
    }
    case "slope25": {
      geo = makeWedge(w, d, h, true);
      break;
    }
    case "window": {
      geo = makeWindow(w, d, h);
      break;
    }
    case "door": {
      geo = makeDoor(w, d, h);
      break;
    }
    case "fence": {
      geo = makeFence(w, d, h);
      break;
    }
    case "bench": {
      geo = makeBench(w, d, h);
      break;
    }
    case "lamp": {
      geo = makeLamp();
      break;
    }
    case "tree": {
      geo = makeTree();
      break;
    }
    case "car": {
      geo = makeCar(w, d, false);
      break;
    }
    case "truck": {
      geo = makeCar(Math.max(w, 6), 2, true);
      break;
    }
    case "bus": {
      geo = makeBus();
      break;
    }
    case "minifig": {
      geo = makeMinifig();
      break;
    }
    default: {
      geo = merge([brickBody(w, d, h), ...studsOnTop(w, d, h)]);
    }
  }

  geoCache.set(key, geo);
  return geo;
}

function makeWedge(w: number, d: number, h: number, withStuds: boolean): THREE.BufferGeometry {
  const bw = w - GAP;
  const bd = d - GAP;
  const ox = GAP / 2;
  const oz = GAP / 2;
  const verts = new Float32Array([
    ox, 0, oz,
    ox + bw, 0, oz,
    ox + bw, 0, oz + bd,
    ox, 0, oz + bd,
    ox, h, oz,
    ox + bw, h, oz,
  ]);
  const idx = [
    0, 2, 1, 0, 3, 2,
    0, 1, 5, 0, 5, 4,
    0, 4, 3,
    1, 2, 5,
    4, 5, 2, 4, 2, 3,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const parts: THREE.BufferGeometry[] = [geo];
  if (withStuds) {
    for (let i = 0; i < w; i++) {
      const cyl = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 10);
      cyl.translate(i + 0.5, h + STUD_H / 2, 0.4);
      parts.push(cyl);
    }
  }
  return merge(parts);
}

function makeWindow(w: number, d: number, h: number): THREE.BufferGeometry {
  const t = 0.12;
  const frameL = new THREE.BoxGeometry(t, h - GAP, d - GAP);
  frameL.translate(t / 2 + GAP / 2, h / 2, d / 2);
  const frameR = new THREE.BoxGeometry(t, h - GAP, d - GAP);
  frameR.translate(w - t / 2 - GAP / 2, h / 2, d / 2);
  const frameT = new THREE.BoxGeometry(w - GAP, t, d - GAP);
  frameT.translate(w / 2, h - t / 2, d / 2);
  const frameB = new THREE.BoxGeometry(w - GAP, t, d - GAP);
  frameB.translate(w / 2, t / 2, d / 2);
  const bar = new THREE.BoxGeometry(t * 0.7, h - 0.3, d - GAP);
  bar.translate(w / 2, h / 2, d / 2);
  const glass = new THREE.BoxGeometry(Math.max(0.15, w - 0.5), Math.max(0.15, h - 0.4), 0.08);
  glass.translate(w / 2, h / 2, d / 2);
  return merge([frameL, frameR, frameT, frameB, bar, glass]);
}

function makeDoor(w: number, d: number, h: number): THREE.BufferGeometry {
  const slab = brickBody(w, d, h);
  const panel = new THREE.BoxGeometry(w - 0.28, h - 0.3, 0.08);
  panel.translate(w / 2, h / 2, d / 2 + 0.12);
  const knob = new THREE.SphereGeometry(0.1, 8, 8);
  knob.translate(w - 0.28, h * 0.48, d / 2 + 0.2);
  return merge([slab, panel, knob]);
}

function makeFence(w: number, _d: number, h: number): THREE.BufferGeometry {
  const posts: THREE.BufferGeometry[] = [];
  const count = Math.max(2, w + 1);
  for (let i = 0; i < count; i++) {
    const post = new THREE.BoxGeometry(0.14, h, 0.14);
    post.translate((i * w) / (count - 1), h / 2, 0.5);
    posts.push(post);
  }
  const rail = new THREE.BoxGeometry(w - GAP, 0.12, 0.1);
  rail.translate(w / 2, h * 0.7, 0.5);
  const rail2 = new THREE.BoxGeometry(w - GAP, 0.12, 0.1);
  rail2.translate(w / 2, h * 0.35, 0.5);
  return merge([...posts, rail, rail2]);
}

function makeBench(w: number, d: number, h: number): THREE.BufferGeometry {
  const seat = new THREE.BoxGeometry(w - GAP, 0.18, d - GAP);
  seat.translate(w / 2, h * 0.45, d / 2);
  const back = new THREE.BoxGeometry(w - GAP, h * 0.55, 0.14);
  back.translate(w / 2, h * 0.7, 0.16);
  const leg1 = new THREE.BoxGeometry(0.16, h * 0.4, d - 0.2);
  leg1.translate(0.35, h * 0.2, d / 2);
  const leg2 = new THREE.BoxGeometry(0.16, h * 0.4, d - 0.2);
  leg2.translate(w - 0.35, h * 0.2, d / 2);
  return merge([seat, back, leg1, leg2]);
}

function makeLamp(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.42, 0.48, 0.35, 10);
  base.translate(0.5, 0.18, 0.5);
  const pole = new THREE.CylinderGeometry(0.12, 0.14, 4.2, 8);
  pole.translate(0.5, 2.3, 0.5);
  const arm = new THREE.BoxGeometry(0.14, 0.14, 0.9);
  arm.translate(0.5, 4.35, 0.85);
  const head = new THREE.BoxGeometry(0.55, 0.28, 0.55);
  head.translate(0.5, 4.2, 1.15);
  const bulb = new THREE.SphereGeometry(0.18, 10, 8);
  bulb.translate(0.5, 4.02, 1.15);
  return merge([base, pole, arm, head, bulb]);
}

function makeTree(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.35, 0.45, 1.8, 8);
  trunk.translate(1.5, 0.9, 1.5);
  const c1 = new THREE.ConeGeometry(1.7, 1.8, 8);
  c1.translate(1.5, 2.4, 1.5);
  const c2 = new THREE.ConeGeometry(1.35, 1.5, 8);
  c2.translate(1.5, 3.3, 1.5);
  const c3 = new THREE.ConeGeometry(0.95, 1.2, 8);
  c3.translate(1.5, 4.1, 1.5);
  return merge([trunk, c1, c2, c3]);
}

function makeCar(len: number, width: number, truck: boolean): THREE.BufferGeometry {
  const w = width;
  const d = len;
  const chassis = new THREE.BoxGeometry(w - 0.15, 0.55, d - 0.2);
  chassis.translate(w / 2, 0.55, d / 2);
  const cabinH = truck ? 1.1 : 0.85;
  const cabinL = truck ? d * 0.38 : d * 0.5;
  const cabin = new THREE.BoxGeometry(w - 0.28, cabinH, cabinL);
  cabin.translate(w / 2, 1.15, truck ? d * 0.28 : d * 0.42);
  const hood = new THREE.BoxGeometry(w - 0.3, 0.28, d * 0.28);
  hood.translate(w / 2, 0.95, d * 0.82);
  const wheels: THREE.BufferGeometry[] = [];
  const wz = [d * 0.22, d * 0.78];
  for (const z of wz) {
    for (const x of [0.05, w - 0.05]) {
      const wheel = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
      wheel.rotateZ(Math.PI / 2);
      wheel.translate(x, 0.38, z);
      wheels.push(wheel);
    }
  }
  return merge([chassis, cabin, hood, ...wheels]);
}

function makeBus(): THREE.BufferGeometry {
  const w = 2;
  const d = 8;
  const body = new THREE.BoxGeometry(w - 0.12, 1.7, d - 0.15);
  body.translate(w / 2, 1.15, d / 2);
  const roof = new THREE.BoxGeometry(w - 0.22, 0.18, d - 0.3);
  roof.translate(w / 2, 2.08, d / 2);
  const wheels: THREE.BufferGeometry[] = [];
  for (const z of [1.2, 3.4, 6.6]) {
    for (const x of [0.05, w - 0.05]) {
      const wheel = new THREE.CylinderGeometry(0.4, 0.4, 0.28, 12);
      wheel.rotateZ(Math.PI / 2);
      wheel.translate(x, 0.4, z);
      wheels.push(wheel);
    }
  }
  return merge([body, roof, ...wheels]);
}

function makeMinifig(): THREE.BufferGeometry {
  const hip = new THREE.BoxGeometry(0.78, 0.28, 0.42);
  hip.translate(0.5, 0.95, 0.5);
  const legL = new THREE.BoxGeometry(0.34, 0.85, 0.4);
  legL.translate(0.32, 0.45, 0.5);
  const legR = new THREE.BoxGeometry(0.34, 0.85, 0.4);
  legR.translate(0.68, 0.45, 0.5);
  const torso = new THREE.BoxGeometry(0.8, 1.05, 0.48);
  torso.translate(0.5, 1.65, 0.5);
  const armL = new THREE.BoxGeometry(0.22, 0.85, 0.28);
  armL.translate(-0.02, 1.55, 0.5);
  const armR = new THREE.BoxGeometry(0.22, 0.85, 0.28);
  armR.translate(1.02, 1.55, 0.5);
  const handL = new THREE.BoxGeometry(0.18, 0.18, 0.22);
  handL.translate(-0.02, 1.08, 0.5);
  const handR = new THREE.BoxGeometry(0.18, 0.18, 0.22);
  handR.translate(1.02, 1.08, 0.5);
  const head = new THREE.CylinderGeometry(0.32, 0.32, 0.52, 12);
  head.translate(0.5, 2.4, 0.5);
  const stud = new THREE.CylinderGeometry(0.16, 0.16, 0.14, 10);
  stud.translate(0.5, 2.72, 0.5);
  return merge([hip, legL, legR, torso, armL, armR, handL, handR, head, stud]);
}

export function getMaterial(color: ColorId, kind: BrickKind): THREE.MeshStandardMaterial {
  const key = `${color}:${kind}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  const map: Record<string, { roughness: number; metalness: number; emissive?: string; emissiveIntensity?: number }> = {
    window: { roughness: 0.18, metalness: 0.05 },
    lamp: { roughness: 0.35, metalness: 0.2, emissive: "#f0d878", emissiveIntensity: 0.18 },
    tree: { roughness: 0.7, metalness: 0 },
    minifig: { roughness: 0.4, metalness: 0 },
  };
  const extra = map[kind] ?? { roughness: 0.38, metalness: 0.02 };
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS[color],
    roughness: extra.roughness,
    metalness: extra.metalness,
    emissive: extra.emissive ? extra.emissive : "#000000",
    emissiveIntensity: extra.emissiveIntensity ?? 0,
  });
  matCache.set(key, mat);
  return mat;
}

export function orientedSize(w: number, d: number, rot: number): { w: number; d: number } {
  return rot % 2 === 0 ? { w, d } : { w: d, d: w };
}

export function footprintCells(
  x: number,
  z: number,
  w: number,
  d: number,
  rot: number,
): { x: number; z: number }[] {
  const s = orientedSize(w, d, rot);
  const cells: { x: number; z: number }[] = [];
  for (let i = 0; i < s.w; i++) {
    for (let j = 0; j < s.d; j++) {
      cells.push({ x: x + i, z: z + j });
    }
  }
  return cells;
}

export function specialHeight(kind: BrickKind, hPlates: number): number {
  if (kind === "minifig") return 7;
  if (kind === "tree") return 12;
  if (kind === "lamp") return 12;
  if (kind === "car" || kind === "truck" || kind === "bus") return 5;
  if (kind === "bench") return 3;
  if (kind === "fence") return 3;
  return hPlates;
}

export function brickWorldMatrix(
  x: number,
  yPlates: number,
  z: number,
  w: number,
  d: number,
  rot: number,
): THREE.Matrix4 {
  const s = orientedSize(w, d, rot);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3(x, yPlates * PLATE_H, z);
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rot * (Math.PI / 2));
  if (rot === 1) {
    pos.x += s.w;
  } else if (rot === 2) {
    pos.x += s.w;
    pos.z += s.d;
  } else if (rot === 3) {
    pos.z += s.d;
  }
  m.compose(pos, quat, scale);
  return m;
}

export const BRICK_H_UNITS = BRICK_H;
