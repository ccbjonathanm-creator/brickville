export const STUD = 1;
export const PLATE_H = 0.4;
export const BRICK_H = 1.2;
export const PLATE_STUDS = 32;
export const GAP = 0.035;
export const STUD_R = 0.3;
export const STUD_H = 0.17;
export const MAX_PLATES = 25;
export const SAVE_KEY = "brickville-city-v1";
export const SAVE_VERSION = 1;

export const COLORS = {
  white: "#f3f2ee",
  black: "#1a1a1a",
  lightGrey: "#afb1b3",
  darkGrey: "#6d6e6a",
  red: "#c91a09",
  yellow: "#f5cd02",
  blue: "#0057c8",
  green: "#237841",
  orange: "#fe8a18",
  brown: "#5c3a28",
  tan: "#e4cd9e",
  darkRed: "#7a2d2c",
  azure: "#36aebf",
  lime: "#9aca3c",
  nougat: "#d09168",
  darkBlue: "#0a3463",
  transYellow: "#f5e16e",
  sandGreen: "#a0bcac",
} as const;

export type ColorId = keyof typeof COLORS;

export const BRICK_COLORS: ColorId[] = [
  "white",
  "red",
  "yellow",
  "blue",
  "green",
  "orange",
  "black",
  "lightGrey",
  "darkGrey",
  "brown",
  "tan",
  "darkRed",
  "azure",
  "darkBlue",
  "nougat",
  "sandGreen",
];

export const PLATE_TYPES = [
  "grass",
  "sand",
  "plaza",
  "water",
  "road-ns",
  "road-ew",
  "road-cross",
  "road-t-n",
  "road-t-e",
  "road-t-s",
  "road-t-w",
  "road-curve-ne",
  "road-curve-se",
  "road-curve-sw",
  "road-curve-nw",
] as const;

export type PlateType = (typeof PLATE_TYPES)[number];
