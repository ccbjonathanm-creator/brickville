import { SAVE_KEY, SAVE_VERSION } from "./constants";
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

function migrate(raw: SaveData): SaveData {
  const s = { ...defaults, ...raw };
  s.version = SAVE_VERSION;
  if (!Array.isArray(s.plates)) s.plates = [];
  if (!Array.isArray(s.bricks)) s.bricks = [];
  return s;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as SaveData;
    return (parsed.plates?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export function writeSave(data: SaveData) {
  try {
    const payload: SaveData = { ...data, version: SAVE_VERSION };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
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
