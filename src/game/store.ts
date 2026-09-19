import { create } from "zustand";
import { getCatalogItem, itemFootprint } from "./catalog";
import { MAX_PLATES, PLATE_STUDS } from "./constants";
import { makeDemoCity, makeNewCity } from "./demoCity";
import { footprintCells, orientedSize } from "./geometry";
import { occupancy, transformPrefab } from "./occupancy";
import { hasSave, loadSave, writeSave, type SaveData } from "./save";
import { playDenied, playErase, playExpand, playPlace, unlockAudio } from "./audio";
import type { ColorId, GamePhase, PlacedBrick, PlacedPlate, Rot, ToolMode, VoxelBrick } from "./types";
import type { PlateType } from "./constants";

type HistorySnap = {
  plates: PlacedPlate[];
  bricks: PlacedBrick[];
};

type Ghost = {
  x: number;
  z: number;
  valid: boolean;
  y: number;
};

type CityState = {
  phase: GamePhase;
  plates: PlacedPlate[];
  bricks: PlacedBrick[];
  selectedId: string;
  color: ColorId;
  rot: Rot;
  mode: ToolMode;
  ghost: Ghost | null;
  helpOpen: boolean;
  savedHint: boolean;
  hasExistingSave: boolean;
  past: HistorySnap[];
  future: HistorySnap[];
  startDemo: () => void;
  startNew: () => void;
  continueSave: () => void;
  setPhase: (p: GamePhase) => void;
  selectItem: (id: string) => void;
  setColor: (c: ColorId) => void;
  rotate: (dir?: 1 | -1) => void;
  setMode: (m: ToolMode) => void;
  setGhostWorld: (wx: number, wz: number) => void;
  placeAtGhost: () => boolean;
  eraseAtGhost: () => boolean;
  addPlateAt: (gx: number, gz: number) => boolean;
  replacePlate: (gx: number, gz: number) => boolean;
  undo: () => void;
  redo: () => void;
  resetCity: () => void;
  persist: () => void;
  setHelp: (v: boolean) => void;
};

let idSeq = 1000;
function nid() {
  idSeq += 1;
  return `b${idSeq.toString(36)}`;
}

function cloneSnap(plates: PlacedPlate[], bricks: PlacedBrick[]): HistorySnap {
  return {
    plates: plates.map((p) => ({ ...p })),
    bricks: bricks.map((b) => ({ ...b })),
  };
}

function rebuildOcc(plates: PlacedPlate[], bricks: PlacedBrick[]) {
  occupancy.reset(plates, bricks);
}

function selectedVoxels(
  selectedId: string,
  x: number,
  z: number,
  rot: Rot,
  color: ColorId,
): VoxelBrick[] {
  const item = getCatalogItem(selectedId);
  if (!item || item.kind === "baseplate") return [];
  if (item.prefab) return transformPrefab(item.prefab, x, z, rot, color);
  if (item.kind === "prefab") return [];
  return [
    {
      kind: item.kind,
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

let saveTimer: ReturnType<typeof setTimeout> | null = null;

const boot = makeDemoCity();
rebuildOcc(boot.plates, boot.bricks);

export const useCity = create<CityState>((set, get) => ({
  phase: "title",
  plates: boot.plates,
  bricks: boot.bricks,
  selectedId: "kit-house",
  color: "white",
  rot: 0,
  mode: "place",
  ghost: null,
  helpOpen: false,
  savedHint: false,
  hasExistingSave: false,
  past: [],
  future: [],

  startDemo() {
    const demo = makeDemoCity();
    rebuildOcc(demo.plates, demo.bricks);
    set({
      phase: "title",
      plates: demo.plates,
      bricks: demo.bricks,
      hasExistingSave: typeof window !== "undefined" ? hasSave() : false,
      ghost: null,
    });
  },

  startNew() {
    unlockAudio();
    const city = makeNewCity();
    rebuildOcc(city.plates, city.bricks);
    set({
      phase: "play",
      plates: city.plates,
      bricks: city.bricks,
      mode: "expand",
      selectedId: "plate-grass",
      rot: 0,
      past: [],
      future: [],
      ghost: null,
      helpOpen: true,
    });
    get().persist();
  },

  continueSave() {
    unlockAudio();
    const saved = loadSave();
    if (!saved) {
      get().startNew();
      return;
    }
    rebuildOcc(saved.plates, saved.bricks);
    set({
      phase: "play",
      plates: saved.plates,
      bricks: saved.bricks,
      selectedId: saved.selectedId || "kit-house",
      color: saved.color || "white",
      rot: saved.rot || 0,
      mode: saved.mode || "place",
      past: [],
      future: [],
      ghost: null,
    });
  },

  setPhase(p) {
    set({ phase: p });
  },

  selectItem(id) {
    const item = getCatalogItem(id);
    if (!item) return;
    if (item.kind === "baseplate") {
      set({ selectedId: id, mode: "expand" });
    } else {
      set({
        selectedId: id,
        mode: "place",
        color: item.colors.includes(get().color) ? get().color : item.colors[0]!,
      });
    }
  },

  setColor(c) {
    set({ color: c });
  },

  rotate(dir = 1) {
    set({ rot: ((((get().rot + dir) % 4) + 4) % 4) as Rot });
  },

  setMode(m) {
    set({ mode: m });
  },

  setGhostWorld(wx, wz) {
    const { selectedId, rot, mode, color } = get();
    if (mode === "expand") {
      const gx = Math.floor(wx / PLATE_STUDS);
      const gz = Math.floor(wz / PLATE_STUDS);
      const next = { x: gx * PLATE_STUDS, z: gz * PLATE_STUDS, y: 0, valid: true };
      const prev = get().ghost;
      if (prev && prev.x === next.x && prev.z === next.z && prev.valid) return;
      set({ ghost: next });
      return;
    }
    const item = getCatalogItem(selectedId);
    if (!item || item.kind === "baseplate") {
      set({ ghost: null });
      return;
    }
    const fp = itemFootprint(item, rot);
    const x = Math.round(wx - fp.w / 2);
    const z = Math.round(wz - fp.d / 2);
    const voxels = selectedVoxels(selectedId, x, z, rot, color);
    const { ok, yShift } = occupancy.canPlace(voxels);
    const next = { x, z, y: yShift, valid: ok };
    const prev = get().ghost;
    if (prev && prev.x === next.x && prev.z === next.z && prev.y === next.y && prev.valid === next.valid) {
      return;
    }
    set({ ghost: next });
  },

  placeAtGhost() {
    const { ghost, mode, selectedId, rot, color, plates, bricks } = get();
    if (!ghost || mode === "erase") return false;
    if (mode === "expand") {
      const gx = Math.floor(ghost.x / PLATE_STUDS);
      const gz = Math.floor(ghost.z / PLATE_STUDS);
      if (occupancy.hasPlate(gx, gz)) return get().replacePlate(gx, gz);
      return get().addPlateAt(gx, gz);
    }
    if (!ghost.valid) {
      playDenied();
      return false;
    }
    const voxels = selectedVoxels(selectedId, ghost.x, ghost.z, rot, color);
    const { ok, yShift } = occupancy.canPlace(voxels);
    if (!ok) {
      playDenied();
      return false;
    }
    const groupId = nid();
    const placed: PlacedBrick[] = voxels.map((v) => ({
      ...v,
      y: v.y + yShift,
      id: nid(),
      groupId,
    }));
    const nextBricks = [...bricks, ...placed];
    const past = [...get().past, cloneSnap(plates, bricks)].slice(-40);
    for (const b of placed) occupancy.addBrick(b);
    set({ bricks: nextBricks, past, future: [] });
    playPlace();
    get().persist();
    return true;
  },

  eraseAtGhost() {
    const { ghost, bricks, plates } = get();
    if (!ghost) return false;
    const cells = footprintCells(ghost.x, ghost.z, 1, 1, 0);
    const cell = cells[0];
    if (!cell) return false;
    const groupId = occupancy.topGroupAt(cell.x, cell.z);
    if (!groupId) {
      playDenied();
      return false;
    }
    const past = [...get().past, cloneSnap(plates, bricks)].slice(-40);
    occupancy.removeGroup(groupId);
    set({
      bricks: bricks.filter((b) => b.groupId !== groupId),
      past,
      future: [],
    });
    playErase();
    get().persist();
    return true;
  },

  addPlateAt(gx, gz) {
    const { plates, bricks, selectedId } = get();
    if (plates.length >= MAX_PLATES) {
      playDenied();
      return false;
    }
    if (occupancy.hasPlate(gx, gz)) return false;
    const neighbors = [
      [gx - 1, gz],
      [gx + 1, gz],
      [gx, gz - 1],
      [gx, gz + 1],
    ];
    const attached = plates.length === 0 || neighbors.some(([x, z]) => occupancy.hasPlate(x!, z!));
    if (!attached) {
      playDenied();
      return false;
    }
    const item = getCatalogItem(selectedId);
    const type = (item?.plateType ?? "grass") as PlateType;
    const plate: PlacedPlate = { id: nid(), gx, gz, type };
    const next = [...plates, plate];
    const past = [...get().past, cloneSnap(plates, bricks)].slice(-40);
    occupancy.setPlates(next);
    set({ plates: next, past, future: [] });
    playExpand();
    get().persist();
    return true;
  },

  replacePlate(gx, gz) {
    const { plates, bricks, selectedId } = get();
    const item = getCatalogItem(selectedId);
    if (!item?.plateType) return false;
    const covered = bricks.some((b) => {
      const s = orientedSize(b.w, b.d, b.rot);
      for (let x = b.x; x < b.x + s.w; x++) {
        for (let z = b.z; z < b.z + s.d; z++) {
          if (Math.floor(x / PLATE_STUDS) === gx && Math.floor(z / PLATE_STUDS) === gz) return true;
        }
      }
      return false;
    });
    if (covered) {
      playDenied();
      return false;
    }
    const past = [...get().past, cloneSnap(plates, bricks)].slice(-40);
    const next = plates.map((p) => (p.gx === gx && p.gz === gz ? { ...p, type: item.plateType! } : p));
    set({ plates: next, past, future: [] });
    playExpand();
    get().persist();
    return true;
  },

  undo() {
    const { past, plates, bricks, future } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    rebuildOcc(prev.plates, prev.bricks);
    set({
      plates: prev.plates,
      bricks: prev.bricks,
      past: past.slice(0, -1),
      future: [...future, cloneSnap(plates, bricks)].slice(-40),
    });
    get().persist();
  },

  redo() {
    const { future, plates, bricks, past } = get();
    const next = future[future.length - 1];
    if (!next) return;
    rebuildOcc(next.plates, next.bricks);
    set({
      plates: next.plates,
      bricks: next.bricks,
      future: future.slice(0, -1),
      past: [...past, cloneSnap(plates, bricks)].slice(-40),
    });
    get().persist();
  },

  resetCity() {
    const city = makeNewCity();
    rebuildOcc(city.plates, city.bricks);
    set({
      plates: city.plates,
      bricks: city.bricks,
      past: [],
      future: [],
      mode: "expand",
      selectedId: "plate-grass",
    });
    get().persist();
  },

  persist() {
    const s = get();
    if (s.phase !== "play") return;
    const data: SaveData = {
      version: 1,
      plates: s.plates,
      bricks: s.bricks,
      selectedId: s.selectedId,
      color: s.color,
      rot: s.rot,
      mode: s.mode,
    };
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      writeSave(data);
      set({ savedHint: true });
      setTimeout(() => set({ savedHint: false }), 900);
    }, 400);
  },

  setHelp(v) {
    set({ helpOpen: v });
  },
}));

export function expandSlots(plates: PlacedPlate[]): { gx: number; gz: number }[] {
  const have = new Set(plates.map((p) => `${p.gx},${p.gz}`));
  const slots = new Map<string, { gx: number; gz: number }>();
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const p of plates) {
    for (const [dx, dz] of dirs) {
      const gx = p.gx + dx!;
      const gz = p.gz + dz!;
      const k = `${gx},${gz}`;
      if (!have.has(k)) slots.set(k, { gx, gz });
    }
  }
  return [...slots.values()];
}
