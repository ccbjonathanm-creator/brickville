import { PLATE_STUDS } from "./constants";
import { footprintCells, orientedSize, specialHeight } from "./geometry";
import type { PlacedBrick, PlacedPlate, VoxelBrick } from "./types";

function cellKey(x: number, y: number, z: number) {
  return `${x},${y},${z}`;
}

export class Occupancy {
  private cells = new Map<string, string>();
  private plateSet = new Set<string>();
  private heights = new Map<string, number>();

  reset(plates: PlacedPlate[], bricks: PlacedBrick[]) {
    this.cells.clear();
    this.plateSet.clear();
    this.heights.clear();
    for (const p of plates) this.plateSet.add(`${p.gx},${p.gz}`);
    for (const b of bricks) this.addBrick(b);
  }

  setPlates(plates: PlacedPlate[]) {
    this.plateSet.clear();
    for (const p of plates) this.plateSet.add(`${p.gx},${p.gz}`);
  }

  hasPlate(gx: number, gz: number) {
    return this.plateSet.has(`${gx},${gz}`);
  }

  onPlate(studX: number, studZ: number) {
    const gx = Math.floor(studX / PLATE_STUDS);
    const gz = Math.floor(studZ / PLATE_STUDS);
    return this.hasPlate(gx, gz);
  }

  addBrick(b: PlacedBrick | (VoxelBrick & { groupId: string })) {
    const h = specialHeight(b.kind, b.h);
    const cells = footprintCells(b.x, b.z, b.w, b.d, b.rot);
    for (const c of cells) {
      for (let y = b.y; y < b.y + h; y++) {
        this.cells.set(cellKey(c.x, y, c.z), b.groupId);
        const col = `${c.x},${c.z}`;
        const prev = this.heights.get(col) ?? -1;
        if (y > prev) this.heights.set(col, y);
      }
    }
  }

  removeGroup(groupId: string) {
    for (const [k, v] of this.cells) {
      if (v === groupId) this.cells.delete(k);
    }
    this.rebuildHeights();
  }

  private rebuildHeights() {
    this.heights.clear();
    for (const key of this.cells.keys()) {
      const [xs, ys, zs] = key.split(",");
      const col = `${xs},${zs}`;
      const y = Number(ys);
      const prev = this.heights.get(col) ?? -1;
      if (y > prev) this.heights.set(col, y);
    }
  }

  heightAt(x: number, z: number): number {
    const max = this.heights.get(`${x},${z}`);
    return max === undefined ? 0 : max + 1;
  }

  columnOwner(x: number, z: number, y: number): string | undefined {
    return this.cells.get(cellKey(x, y, z));
  }

  topGroupAt(x: number, z: number): string | undefined {
    let bestY = -1;
    let group: string | undefined;
    for (const [key, g] of this.cells) {
      const [xs, ys, zs] = key.split(",");
      if (Number(xs) === x && Number(zs) === z) {
        const y = Number(ys);
        if (y >= bestY) {
          bestY = y;
          group = g;
        }
      }
    }
    return group;
  }

  canPlace(bricks: VoxelBrick[]): { ok: boolean; yShift: number } {
    if (bricks.length === 0) return { ok: false, yShift: 0 };

    const supportYs: number[] = [];
    for (const b of bricks) {
      const cells = footprintCells(b.x, b.z, b.w, b.d, b.rot);
      for (const c of cells) {
        if (!this.onPlate(c.x, c.z)) return { ok: false, yShift: 0 };
        supportYs.push(this.heightAt(c.x, c.z));
      }
    }
    const target = Math.max(0, ...supportYs);
    if (supportYs.some((y) => y !== target)) {
      if (supportYs.some((y) => y < target)) return { ok: false, yShift: 0 };
    }

    for (const b of bricks) {
      const h = specialHeight(b.kind, b.h);
      const y0 = b.y + target;
      const cells = footprintCells(b.x, b.z, b.w, b.d, b.rot);
      for (const c of cells) {
        for (let y = y0; y < y0 + h; y++) {
          if (this.cells.has(cellKey(c.x, y, c.z))) return { ok: false, yShift: 0 };
        }
      }
    }
    return { ok: true, yShift: target };
  }
}

export function transformPrefab(
  prefab: VoxelBrick[],
  originX: number,
  originZ: number,
  rot: number,
  colorOverride?: VoxelBrick["color"],
): VoxelBrick[] {
  if (prefab.length === 0) return [];
  let maxX = 0;
  let maxZ = 0;
  for (const b of prefab) {
    const s = orientedSize(b.w, b.d, b.rot);
    maxX = Math.max(maxX, b.x + s.w);
    maxZ = Math.max(maxZ, b.z + s.d);
  }

  return prefab.map((b) => {
    const s = orientedSize(b.w, b.d, b.rot);
    const corners = [
      { x: b.x, z: b.z },
      { x: b.x + s.w, z: b.z },
      { x: b.x, z: b.z + s.d },
      { x: b.x + s.w, z: b.z + s.d },
    ].map((p) => rotatePoint(p.x, p.z, rot, maxX, maxZ));
    const nx = Math.min(...corners.map((p) => p.x));
    const nz = Math.min(...corners.map((p) => p.z));
    const wallColors = new Set(["white", "red", "yellow", "blue", "darkBlue", "green", "tan"]);
    const color =
      colorOverride && wallColors.has(b.color) && b.kind !== "minifig" && b.kind !== "tree"
        ? colorOverride
        : b.color;
    return {
      ...b,
      x: originX + nx,
      z: originZ + nz,
      rot: ((((b.rot + rot) % 4) + 4) % 4) as VoxelBrick["rot"],
      color,
    };
  });
}

function rotatePoint(x: number, z: number, rot: number, w: number, d: number) {
  switch (rot) {
    case 1:
      return { x: z, z: w - x };
    case 2:
      return { x: w - x, z: d - z };
    case 3:
      return { x: d - z, z: x };
    default:
      return { x, z };
  }
}

export const occupancy = new Occupancy();
