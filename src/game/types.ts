import type { ColorId, PlateType } from "./constants";

export type { ColorId, PlateType };

export type Rot = 0 | 1 | 2 | 3;

export type BrickKind =
  | "brick"
  | "plate"
  | "tile"
  | "slope"
  | "slope25"
  | "round"
  | "window"
  | "door"
  | "minifig"
  | "car"
  | "truck"
  | "bus"
  | "lamp"
  | "tree"
  | "bench"
  | "fence";

export type CategoryId =
  | "plates"
  | "bricks"
  | "slabs"
  | "roofs"
  | "openings"
  | "street"
  | "nature"
  | "vehicles"
  | "figs"
  | "kits";

export type VoxelBrick = {
  kind: BrickKind;
  w: number;
  d: number;
  h: number;
  color: ColorId;
  x: number;
  z: number;
  y: number;
  rot: Rot;
};

export type CatalogItem = {
  id: string;
  name: string;
  category: CategoryId;
  kind: BrickKind | "baseplate" | "prefab";
  w: number;
  d: number;
  h: number;
  colors: ColorId[];
  plateType?: PlateType;
  prefab?: VoxelBrick[];
  thumb: "brick" | "plate" | "slope" | "round" | "window" | "door" | "fig" | "car" | "tree" | "lamp" | "road" | "house" | "bench";
};

export type PlacedBrick = VoxelBrick & {
  id: string;
  groupId: string;
};

export type PlacedPlate = {
  id: string;
  gx: number;
  gz: number;
  type: PlateType;
};

export type ToolMode = "place" | "erase" | "expand";

export type GamePhase = "title" | "play";
