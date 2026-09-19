import { SAVE_KEY, SAVE_VERSION, COLORS, PLATE_TYPES, MAX_PLATES } from "./constants";
import { getCatalogItem } from "./catalog";
import type { ColorId, GamePhase, PlacedBrick, PlacedPlate, Rot, ToolMode } from "./types";

export type SaveData = {
  version: number;
  plates: PlacedPlate[];
  bricks: PlacedBrick[];
  selectedId: string;
  color: ColorId;
  rot: Rot;
  mode: ToolMode;
};

const defaults: SaveData = {
  version: SAVE_VERSION,
  plates: [],
  bricks: [],
  selectedId: "kit-house",
  color: "white",
  rot: 0,
  mode: "place",
};

function migrate(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== "object") return null;
  const s = { ...defaults, ...raw } as SaveData;
  if (s.version !== SAVE_VERSION || !Array.isArray(s.plates) || !s.plates.length || s.plates.length > MAX_PLATES || !Array.isArray(s.bricks)) return null;
  const integer = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
  const text = (v: unknown) => typeof v === "string" && v.length > 0 && v.length < 200;
  if (!s.plates.every(p => p && text(p.id) && integer(p.gx,-1000,1000) && integer(p.gz,-1000,1000) && PLATE_TYPES.includes(p.type))) return null;
  const positions = new Set(s.plates.map(p => `${p.gx},${p.gz}`));
  if (positions.size !== s.plates.length) return null;
  const kinds = new Set(["brick","plate","tile","slope","slope25","round","window","door","minifig","car","truck","bus","lamp","tree","bench","fence"]);
  if (!s.bricks.every(b => b && text(b.id) && text(b.groupId) && kinds.has(b.kind) && Object.hasOwn(COLORS,b.color) &&
    integer(b.x,-32000,32031) && integer(b.z,-32000,32031) && integer(b.y,0,100000) && integer(b.w,1,32) && integer(b.d,1,32) && integer(b.h,1,30) && integer(b.rot,0,3))) return null;
  const item = getCatalogItem(s.selectedId) ?? getCatalogItem("brick-2x2")!;
  s.selectedId = item.id;
  if (!item.colors.includes(s.color)) s.color = item.colors[0]!;
  if (!integer(s.rot,0,3)) s.rot = 0;
  if (!["place","erase","expand"].includes(s.mode)) s.mode = "place";
  if (s.mode === "place" && item.kind === "baseplate") s.mode = "expand";
  if (s.mode === "expand" && item.kind !== "baseplate") s.selectedId = "plate-grass";
  return s;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

export function writeSave(data: SaveData) {
  try {
    const payload: SaveData = { ...data, version: SAVE_VERSION };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export type { GamePhase };
