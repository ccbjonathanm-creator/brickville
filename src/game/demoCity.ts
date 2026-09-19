import { CATALOG, getCatalogItem } from "./catalog";
import { transformPrefab } from "./occupancy";
import type { PlacedBrick, PlacedPlate, VoxelBrick } from "./types";

let seq = 1;
function nid() {
  seq += 1;
  return `d${seq}`;
}

function placeItem(
  bricks: PlacedBrick[],
  id: string,
  x: number,
  z: number,
  rot: VoxelBrick["rot"],
  color: VoxelBrick["color"],
) {
  const item = getCatalogItem(id);
  if (!item) return;
  const groupId = nid();
  let list: VoxelBrick[];
  if (item.prefab) {
    list = transformPrefab(item.prefab, x, z, rot, color);
  } else {
    list = [
      {
        kind: item.kind === "baseplate" || item.kind === "prefab" ? "brick" : item.kind,
        w: item.w,
        d: item.d,
        h: item.h,
        color,
        x,
        z,
        y: 0,
        rot,
      },
    ];
  }
  for (const b of list) {
    bricks.push({ ...b, id: nid(), groupId });
  }
}

export function makeDemoCity(): { plates: PlacedPlate[]; bricks: PlacedBrick[] } {
  seq = 1;
  const plates: PlacedPlate[] = [
    { id: nid(), gx: 0, gz: 0, type: "grass" },
    { id: nid(), gx: 1, gz: 0, type: "road-ns" },
    { id: nid(), gx: 0, gz: 1, type: "grass" },
    { id: nid(), gx: 1, gz: 1, type: "road-ns" },
    { id: nid(), gx: 2, gz: 0, type: "plaza" },
    { id: nid(), gx: 2, gz: 1, type: "plaza" },
  ];
  const bricks: PlacedBrick[] = [];
  placeItem(bricks, "kit-house", 4, 6, 0, "white");
  placeItem(bricks, "kit-cottage", 16, 4, 1, "yellow");
  placeItem(bricks, "kit-cafe", 5, 38, 0, "nougat");
  placeItem(bricks, "kit-shop", 18, 38, 0, "red");
  placeItem(bricks, "kit-police", 36, 36, 3, "darkBlue");
  placeItem(bricks, "kit-fountain", 40, 44, 0, "lightGrey");
  placeItem(bricks, "kit-town", 68, 4, 1, "tan");
  placeItem(bricks, "kit-fire", 66, 36, 3, "red");

  for (const t of [
    [2, 2],
    [26, 22],
    [3, 28],
    [24, 50],
    [12, 52],
  ] as const) {
    placeItem(bricks, "tree", t[0], t[1], 0, "green");
  }
  for (const z of [6, 18, 28, 40, 52]) {
    placeItem(bricks, "lamp", 33, z, 1, "black");
    placeItem(bricks, "lamp", 62, z, 3, "black");
  }
  placeItem(bricks, "car", 42, 8, 0, "red");
  placeItem(bricks, "car", 46, 22, 2, "blue");
  placeItem(bricks, "bus", 40, 48, 0, "yellow");
  placeItem(bricks, "truck", 50, 14, 2, "red");
  placeItem(bricks, "fig", 10, 16, 0, "red");
  placeItem(bricks, "fig", 12, 16, 0, "blue");
  placeItem(bricks, "fig", 22, 46, 1, "yellow");
  placeItem(bricks, "bench", 40, 40, 0, "brown");
  placeItem(bricks, "bench", 48, 40, 0, "green");
  placeItem(bricks, "fence-1x4", 36, 32, 0, "white");
  placeItem(bricks, "fence-1x4", 40, 32, 0, "white");
  return { plates, bricks };
}

export function makeNewCity(): { plates: PlacedPlate[]; bricks: PlacedBrick[] } {
  return {
    plates: [{ id: nid(), gx: 0, gz: 0, type: "grass" }],
    bricks: [],
  };
}

export { CATALOG };
