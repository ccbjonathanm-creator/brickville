import { BRICK_COLORS, COLORS, type ColorId, type PlateType } from "./constants";
import type { CatalogItem, CategoryId, VoxelBrick } from "./types";

const ALL = BRICK_COLORS;

function b(
  kind: VoxelBrick["kind"],
  w: number,
  d: number,
  h: number,
  color: ColorId,
  x: number,
  z: number,
  y: number,
  rot: VoxelBrick["rot"] = 0,
): VoxelBrick {
  return { kind, w, d, h, color, x, z, y, rot };
}

function fillRect(
  out: VoxelBrick[],
  kind: VoxelBrick["kind"],
  w: number,
  d: number,
  h: number,
  color: ColorId,
  x0: number,
  z0: number,
  y: number,
) {
  const sizes = [8, 6, 4, 2, 1];
  let z = 0;
  while (z < d) {
    const zd = sizes.find((s) => s <= d - z) ?? 1;
    let x = 0;
    while (x < w) {
      const xd = sizes.find((s) => s <= w - x) ?? 1;
      out.push(b(kind, xd, zd, h, color, x0 + x, z0 + z, y));
      x += xd;
    }
    z += zd;
  }
}

type Hole = { x: number; z: number; w: number; d: number; minY: number; maxY: number };

function perimeter(
  out: VoxelBrick[],
  w: number,
  d: number,
  x0: number,
  z0: number,
  y0: number,
  hBricks: number,
  color: ColorId,
  holes: Hole[],
) {
  const h = 3;
  for (let layer = 0; layer < hBricks; layer++) {
    const y = y0 + layer * 3;
    for (let x = 0; x < w; x++) {
      for (const z of [0, d - 1]) {
        if (isHole(x0 + x, z0 + z, y, holes)) continue;
        out.push(b("brick", 1, 1, h, color, x0 + x, z0 + z, y));
      }
    }
    for (let z = 1; z < d - 1; z++) {
      for (const x of [0, w - 1]) {
        if (isHole(x0 + x, z0 + z, y, holes)) continue;
        out.push(b("brick", 1, 1, h, color, x0 + x, z0 + z, y));
      }
    }
  }
}

function isHole(x: number, z: number, y: number, holes: Hole[]) {
  return holes.some(
    (h) => x >= h.x && x < h.x + h.w && z >= h.z && z < h.z + h.d && y >= h.minY && y < h.maxY,
  );
}

function house(wall: ColorId, roof: ColorId): VoxelBrick[] {
  const out: VoxelBrick[] = [];
  const W = 8;
  const D = 10;
  fillRect(out, "plate", W, D, 1, "tan", 0, 0, 0);
  fillRect(out, "tile", W - 2, D - 2, 1, "nougat", 1, 1, 1);
  const door: Hole = { x: 3, z: 0, w: 2, d: 1, minY: 1, maxY: 10 };
  const winE: Hole = { x: 7, z: 3, w: 1, d: 2, minY: 4, maxY: 10 };
  const winW: Hole = { x: 0, z: 3, w: 1, d: 2, minY: 4, maxY: 10 };
  const winN: Hole = { x: 3, z: 9, w: 2, d: 1, minY: 4, maxY: 10 };
  perimeter(out, W, D, 0, 0, 1, 4, wall, [door, winE, winW, winN]);
  out.push(b("door", 2, 1, 9, "brown", 3, 0, 1));
  out.push(b("window", 1, 2, 6, "azure", 7, 3, 4));
  out.push(b("window", 1, 2, 6, "azure", 0, 3, 4));
  out.push(b("window", 2, 1, 6, "azure", 3, 9, 4));
  fillRect(out, "plate", W, D, 1, roof, 0, 0, 13);
  for (let x = 0; x < W; x += 2) {
    out.push(b("slope", 2, 1, 3, roof, x, 0, 14, 2));
    out.push(b("slope", 2, 1, 3, roof, x, D - 1, 14, 0));
  }
  out.push(b("brick", 1, 1, 6, "darkGrey", 6, 7, 14));
  out.push(b("round", 1, 1, 1, "black", 6, 7, 20));
  return out;
}

function shop(wall: ColorId): VoxelBrick[] {
  const out: VoxelBrick[] = [];
  const W = 10;
  const D = 8;
  fillRect(out, "plate", W, D, 1, "lightGrey", 0, 0, 0);
  const door: Hole = { x: 1, z: 0, w: 2, d: 1, minY: 1, maxY: 10 };
  const vitrine: Hole = { x: 4, z: 0, w: 5, d: 1, minY: 4, maxY: 10 };
  perimeter(out, W, D, 0, 0, 1, 3, wall, [door, vitrine]);
  out.push(b("door", 2, 1, 9, "darkGrey", 1, 0, 1));
  out.push(b("window", 2, 1, 6, "azure", 4, 0, 4));
  out.push(b("window", 2, 1, 6, "azure", 6, 0, 4));
  out.push(b("window", 1, 1, 6, "azure", 8, 0, 4));
  fillRect(out, "tile", W, D, 1, "darkGrey", 0, 0, 10);
  fillRect(out, "brick", W, 1, 3, "yellow", 0, 0, 10);
  for (let x = 0; x < W; x += 2) out.push(b("slope", 2, 1, 3, "red", x, 0, 13, 2));
  out.push(b("tile", 4, 1, 1, "white", 3, 0, 13));
  return out;
}

function police(): VoxelBrick[] {
  const out: VoxelBrick[] = [];
  const W = 10;
  const D = 10;
  fillRect(out, "plate", W, D, 1, "lightGrey", 0, 0, 0);
  const door: Hole = { x: 4, z: 0, w: 2, d: 1, minY: 1, maxY: 10 };
  const win1: Hole = { x: 1, z: 0, w: 2, d: 1, minY: 4, maxY: 10 };
  const win2: Hole = { x: 7, z: 0, w: 2, d: 1, minY: 4, maxY: 10 };
  perimeter(out, W, D, 0, 0, 1, 4, "darkBlue", [door, win1, win2]);
  out.push(b("door", 2, 1, 9, "white", 4, 0, 1));
  out.push(b("window", 2, 1, 6, "azure", 1, 0, 4));
  out.push(b("window", 2, 1, 6, "azure", 7, 0, 4));
  fillRect(out, "plate", W, D, 1, "white", 0, 0, 13);
  fillRect(out, "brick", W, 1, 3, "white", 0, 0, 13);
  out.push(b("brick", 2, 2, 3, "blue", 4, 4, 14));
  out.push(b("round", 2, 2, 1, "white", 4, 4, 17));
  return out;
}

function firehouse(): VoxelBrick[] {
  const out: VoxelBrick[] = [];
  const W = 12;
  const D = 10;
  fillRect(out, "plate", W, D, 1, "darkGrey", 0, 0, 0);
  const garage: Hole = { x: 2, z: 0, w: 8, d: 1, minY: 1, maxY: 10 };
  perimeter(out, W, D, 0, 0, 1, 3, "red", [garage]);
  for (let x = 2; x < 10; x += 2) out.push(b("door", 2, 1, 9, "darkGrey", x, 0, 1));
  fillRect(out, "plate", W, D, 1, "darkGrey", 0, 0, 10);
  fillRect(out, "brick", W, 2, 3, "red", 0, 0, 10);
  out.push(b("brick", 2, 2, 6, "darkGrey", 5, 7, 10));
  return out;
}

function cafe(): VoxelBrick[] {
  const out: VoxelBrick[] = [];
  const W = 8;
  const D = 8;
  fillRect(out, "plate", W, D, 1, "tan", 0, 0, 0);
  const door: Hole = { x: 3, z: 0, w: 2, d: 1, minY: 1, maxY: 10 };
  const win: Hole = { x: 0, z: 2, w: 1, d: 3, minY: 4, maxY: 10 };
  perimeter(out, W, D, 0, 0, 1, 3, "nougat", [door, win]);
  out.push(b("door", 2, 1, 9, "brown", 3, 0, 1));
  out.push(b("window", 1, 2, 6, "azure", 0, 2, 4));
  fillRect(out, "tile", W, D, 1, "brown", 0, 0, 10);
  for (let x = 0; x < W; x += 2) out.push(b("slope", 2, 1, 3, "red", x, 0, 11, 2));
  out.push(b("tile", 2, 2, 1, "white", 1, 1, 1));
  out.push(b("tile", 2, 2, 1, "white", 5, 1, 1));
  return out;
}

function townhouse(wall: ColorId): VoxelBrick[] {
  const out: VoxelBrick[] = [];
  const W = 6;
  const D = 8;
  fillRect(out, "plate", W, D, 1, "darkGrey", 0, 0, 0);
  const door: Hole = { x: 2, z: 0, w: 2, d: 1, minY: 1, maxY: 10 };
  const win: Hole = { x: 2, z: 0, w: 2, d: 1, minY: 13, maxY: 19 };
  perimeter(out, W, D, 0, 0, 1, 6, wall, [door, win]);
  out.push(b("door", 2, 1, 9, "black", 2, 0, 1));
  out.push(b("window", 2, 1, 6, "azure", 2, 0, 13));
  fillRect(out, "plate", W, D, 1, "darkRed", 0, 0, 19);
  for (let x = 0; x < W; x += 2) {
    out.push(b("slope", 2, 1, 3, "darkRed", x, 0, 20, 2));
    out.push(b("slope", 2, 1, 3, "darkRed", x, D - 1, 20, 0));
  }
  return out;
}

function parkFountain(): VoxelBrick[] {
  const out: VoxelBrick[] = [];
  fillRect(out, "plate", 6, 6, 1, "lightGrey", 0, 0, 0);
  fillRect(out, "round", 2, 2, 3, "azure", 2, 2, 1);
  out.push(b("round", 1, 1, 3, "white", 2, 2, 4));
  out.push(b("round", 2, 2, 1, "azure", 2, 2, 7));
  return out;
}

function item(
  id: string,
  name: string,
  category: CategoryId,
  kind: CatalogItem["kind"],
  w: number,
  d: number,
  h: number,
  colors: ColorId[],
  thumb: CatalogItem["thumb"],
  extra: Partial<CatalogItem> = {},
): CatalogItem {
  return { id, name, category, kind, w, d, h, colors, thumb, ...extra };
}

const brickSizes: [number, number][] = [
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 6],
  [1, 8],
  [2, 2],
  [2, 3],
  [2, 4],
  [2, 6],
  [2, 8],
  [4, 4],
];

const plateSizes: [number, number][] = [
  [1, 1],
  [1, 2],
  [1, 4],
  [2, 2],
  [2, 4],
  [2, 6],
  [2, 8],
  [4, 4],
  [6, 6],
  [8, 8],
];

const plateMeta: { id: PlateType; name: string }[] = [
  { id: "grass", name: "Pelouse" },
  { id: "sand", name: "Sable" },
  { id: "plaza", name: "Place" },
  { id: "water", name: "Eau" },
  { id: "road-ns", name: "Route N–S" },
  { id: "road-ew", name: "Route E–O" },
  { id: "road-cross", name: "Carrefour" },
  { id: "road-t-n", name: "T vers le nord" },
  { id: "road-t-e", name: "T vers l’est" },
  { id: "road-t-s", name: "T vers le sud" },
  { id: "road-t-w", name: "T vers l’ouest" },
  { id: "road-curve-ne", name: "Virage NE" },
  { id: "road-curve-se", name: "Virage SE" },
  { id: "road-curve-sw", name: "Virage SO" },
  { id: "road-curve-nw", name: "Virage NO" },
];

export const CATALOG: CatalogItem[] = [
  ...plateMeta.map((p) =>
    item(`plate-${p.id}`, p.name, "plates", "baseplate", 32, 32, 1, ["green"], "road", {
      plateType: p.id,
    }),
  ),
  ...brickSizes.map(([w, d]) =>
    item(`brick-${w}x${d}`, `Brique ${w}×${d}`, "bricks", "brick", w, d, 3, ALL, "brick"),
  ),
  item("round-1x1", "Ronde 1×1", "bricks", "round", 1, 1, 3, ALL, "round"),
  item("round-2x2", "Ronde 2×2", "bricks", "round", 2, 2, 3, ALL, "round"),
  ...plateSizes.map(([w, d]) =>
    item(`slab-${w}x${d}`, `Plaque ${w}×${d}`, "slabs", "plate", w, d, 1, ALL, "plate"),
  ),
  ...plateSizes
    .filter(([w, d]) => w * d <= 16)
    .map(([w, d]) =>
      item(`tile-${w}x${d}`, `Tuile ${w}×${d}`, "slabs", "tile", w, d, 1, ALL, "plate"),
    ),
  item("slope-2x1", "Pente 2×1", "roofs", "slope", 2, 1, 3, ALL, "slope"),
  item("slope-2x2", "Pente 2×2", "roofs", "slope", 2, 2, 3, ALL, "slope"),
  item("slope-4x1", "Pente 4×1", "roofs", "slope", 4, 1, 3, ALL, "slope"),
  item("slope-4x2", "Pente 4×2", "roofs", "slope25", 4, 2, 3, ALL, "slope"),
  item("window-1x2", "Fenêtre 1×2", "openings", "window", 1, 2, 6, ["white", "black", "brown", "darkGrey", "azure"], "window"),
  item("window-2x1", "Fenêtre 2×1", "openings", "window", 2, 1, 6, ["white", "black", "brown", "darkGrey", "azure"], "window"),
  item("door-2x1", "Porte", "openings", "door", 2, 1, 9, ["brown", "white", "black", "darkGrey", "red"], "door"),
  item("fence-1x4", "Clôture 1×4", "street", "fence", 4, 1, 3, ["white", "black", "brown", "darkGrey", "green"], "bench"),
  item("fence-1x2", "Clôture 1×2", "street", "fence", 2, 1, 3, ["white", "black", "brown", "darkGrey", "green"], "bench"),
  item("bench", "Banc", "street", "bench", 4, 2, 3, ["brown", "green", "red", "darkGrey"], "bench"),
  item("lamp", "Réverbère", "street", "lamp", 1, 2, 12, ["black", "darkGrey"], "lamp"),
  item("tree", "Arbre", "nature", "tree", 3, 3, 12, ["green"], "tree"),
  item("bush-2x2", "Buisson", "nature", "round", 2, 2, 3, ["green", "lime", "sandGreen"], "round"),
  item("flower-1x1", "Fleur", "nature", "round", 1, 1, 1, ["red", "yellow", "azure", "lime"], "round"),
  item("car", "Voiture", "vehicles", "car", 2, 4, 5, ["red", "blue", "yellow", "white", "black", "orange", "green"], "car"),
  item("truck", "Camion", "vehicles", "truck", 2, 6, 5, ["red", "darkGrey", "yellow", "blue"], "car"),
  item("bus", "Bus", "vehicles", "bus", 2, 8, 6, ["yellow", "red", "blue", "green"], "car"),
  item("fig", "Figurine", "figs", "minifig", 1, 1, 7, ["red", "blue", "yellow", "white", "green", "black", "orange", "darkBlue"], "fig"),
  item("kit-house", "Maison", "kits", "prefab", 8, 10, 20, ["white", "yellow", "red", "blue", "tan"], "house", {
    prefab: house("white", "red"),
  }),
  item("kit-cottage", "Cottage", "kits", "prefab", 8, 10, 20, ["yellow", "tan", "white", "nougat"], "house", {
    prefab: house("yellow", "darkRed"),
  }),
  item("kit-shop", "Magasin", "kits", "prefab", 10, 8, 16, ["red", "yellow", "blue", "green"], "house", {
    prefab: shop("red"),
  }),
  item("kit-police", "Commissariat", "kits", "prefab", 10, 10, 18, ["darkBlue"], "house", {
    prefab: police(),
  }),
  item("kit-fire", "Caserne", "kits", "prefab", 12, 10, 16, ["red"], "house", {
    prefab: firehouse(),
  }),
  item("kit-cafe", "Café", "kits", "prefab", 8, 8, 14, ["nougat", "tan"], "house", {
    prefab: cafe(),
  }),
  item("kit-town", "Immeuble", "kits", "prefab", 6, 8, 24, ["white", "tan", "lightGrey", "darkRed"], "house", {
    prefab: townhouse("white"),
  }),
  item("kit-fountain", "Fontaine", "kits", "prefab", 6, 6, 8, ["lightGrey"], "house", {
    prefab: parkFountain(),
  }),
];

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "plates", label: "Plaques" },
  { id: "kits", label: "Bâtiments" },
  { id: "bricks", label: "Briques" },
  { id: "slabs", label: "Plaques fines" },
  { id: "roofs", label: "Toits" },
  { id: "openings", label: "Ouvertures" },
  { id: "street", label: "Rue" },
  { id: "nature", label: "Nature" },
  { id: "vehicles", label: "Véhicules" },
  { id: "figs", label: "Figurines" },
];

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((c) => c.id === id);
}

export function itemFootprint(item: CatalogItem, rot: number): { w: number; d: number } {
  if (item.prefab && item.prefab.length) {
    let maxX = 0;
    let maxZ = 0;
    for (const br of item.prefab) {
      const bw = br.rot % 2 === 0 ? br.w : br.d;
      const bd = br.rot % 2 === 0 ? br.d : br.w;
      maxX = Math.max(maxX, br.x + bw);
      maxZ = Math.max(maxZ, br.z + bd);
    }
    return rot % 2 === 0 ? { w: maxX, d: maxZ } : { w: maxZ, d: maxX };
  }
  return rot % 2 === 0 ? { w: item.w, d: item.d } : { w: item.d, d: item.w };
}

export { COLORS };
