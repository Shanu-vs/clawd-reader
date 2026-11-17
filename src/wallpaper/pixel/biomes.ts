// The locations the Claude crab travels through. Each one is pure data: colours for day and night,
// which landscape shapes to use, ground details, props, weather and what flies past.
import type { PropType } from "./props";

export interface PaletteDef {
  skyTop: string;
  skyBot: string;
  far: string;
  mid: string;
  tree: string;
  groundTop: string;
  ground: string;
  dirt: string;
  cloud: string;
}

export interface Biome {
  id: string;
  name: string;
  day: PaletteDef;
  night: PaletteDef;
  /** Sunrise / sunset colours tint the sky. */
  warm: boolean;
  stars: boolean;
  sun: boolean;
  clouds: boolean;
  far: "mountains" | "sea" | "mesas" | "hills" | "rocks";
  snowcaps?: boolean;
  mid: "pines" | "snowpines" | "none" | "dunes" | "roundtrees" | "seaweed";
  decor: { kind: "flowers" | "shells" | "stones" | "leaves" | "coral"; colors: string[]; rate: number }[];
  tufts: number; // chance of grass tufts per column
  mushrooms?: number;
  props: [PropType, number][]; // type and position along the loop (0..1)
  weather: "none" | "snow" | "leaves" | "bubbles";
  flyers: "birds" | "gulls" | "fish" | "none";
  treeColors?: string[]; // extra canopy colours (autumn)
}

const NIGHT_SKY = { skyTop: "#070b24", skyBot: "#1f2a5a", cloud: "#2a3466" };

export const BIOMES: Biome[] = [
  {
    id: "meadow",
    name: "Green Meadow",
    day: { skyTop: "#3f8fe0", skyBot: "#bfe5ff", far: "#86a9d4", mid: "#5d9c6c", tree: "#2f6f4a", groundTop: "#7cc552", ground: "#4d9a3e", dirt: "#7a5636", cloud: "#ffffff" },
    night: { ...NIGHT_SKY, far: "#1c2350", mid: "#141c3c", tree: "#0d1430", groundTop: "#1c3a48", ground: "#12283a", dirt: "#141a2e" },
    warm: true, stars: true, sun: true, clouds: true,
    far: "mountains", snowcaps: true, mid: "pines",
    decor: [{ kind: "flowers", colors: ["#ff6b6b", "#ffd93d", "#ffffff", "#c38bff", "#7fd3ff"], rate: 0.045 }],
    tufts: 0.11,
    props: [["cottage", 0.22], ["lamp", 0.52], ["rock", 0.66], ["sign", 0.8]],
    weather: "none", flyers: "birds",
  },
  {
    id: "beach",
    name: "Sunny Beach",
    day: { skyTop: "#2f9be8", skyBot: "#c9f0ff", far: "#2a8fc4", mid: "#e8d39a", tree: "#3f9a4a", groundTop: "#f6e3a8", ground: "#ecd08a", dirt: "#d4b46c", cloud: "#ffffff" },
    night: { ...NIGHT_SKY, skyBot: "#1d2c5e", far: "#0f2a52", mid: "#3a3a50", tree: "#13304a", groundTop: "#4a4e6a", ground: "#3a3e58", dirt: "#2c2f48" },
    warm: true, stars: true, sun: true, clouds: true,
    far: "sea", mid: "none",
    decor: [{ kind: "shells", colors: ["#fff4ea", "#ffb3c1", "#f2a65a"], rate: 0.035 }],
    tufts: 0,
    props: [["palm", 0.1], ["umbrella", 0.3], ["sandcastle", 0.47], ["palm", 0.6], ["lighthouse", 0.8]],
    weather: "none", flyers: "gulls",
  },
  {
    id: "snow",
    name: "Snowy Peaks",
    day: { skyTop: "#7fb2e6", skyBot: "#e6f2ff", far: "#b9c9e6", mid: "#8fa6c4", tree: "#2e5a54", groundTop: "#ffffff", ground: "#e4eef8", dirt: "#bccbe0", cloud: "#f4f8ff" },
    night: { ...NIGHT_SKY, skyTop: "#0a0f2c", skyBot: "#27345e", far: "#3a4570", mid: "#2a345a", tree: "#10203a", groundTop: "#a9b6d8", ground: "#8e9cc2", dirt: "#6a78a0", cloud: "#2e3a68" },
    warm: true, stars: true, sun: true, clouds: true,
    far: "mountains", snowcaps: true, mid: "snowpines",
    decor: [{ kind: "stones", colors: ["#9aa8c0"], rate: 0.02 }],
    tufts: 0,
    props: [["cabin", 0.2], ["snowman", 0.45], ["lamp", 0.62], ["sign", 0.84]],
    weather: "snow", flyers: "none",
  },
  {
    id: "desert",
    name: "Desert Canyon",
    day: { skyTop: "#4e9ad8", skyBot: "#ffe2b0", far: "#d0805a", mid: "#e9b26c", tree: "#4f8a4a", groundTop: "#f3c98a", ground: "#e3ae6a", dirt: "#c48a4e", cloud: "#fff4e6" },
    night: { ...NIGHT_SKY, skyTop: "#0b0b28", skyBot: "#2c2550", far: "#3a2a48", mid: "#4a3a52", tree: "#1a2a30", groundTop: "#5a4a5e", ground: "#4a3c52", dirt: "#3a2e44", cloud: "#2e2a50" },
    warm: true, stars: true, sun: true, clouds: false,
    far: "mesas", mid: "dunes",
    decor: [{ kind: "stones", colors: ["#b07a4a", "#8a6040"], rate: 0.03 }],
    tufts: 0.02,
    props: [["cactus", 0.1], ["rock", 0.24], ["cactus", 0.36], ["sign", 0.55], ["cactus", 0.74], ["rock", 0.88]],
    weather: "none", flyers: "birds",
  },
  {
    id: "autumn",
    name: "Autumn Woods",
    day: { skyTop: "#5b9bd8", skyBot: "#f7e2c4", far: "#a28bb0", mid: "#7a8a5a", tree: "#d4692c", groundTop: "#b9894a", ground: "#8a6a3a", dirt: "#5e4428", cloud: "#fff6ec" },
    night: { ...NIGHT_SKY, skyTop: "#0a0b24", skyBot: "#2a2450", far: "#2e2a4e", mid: "#22283a", tree: "#3a2230", groundTop: "#3a3040", ground: "#2c2634", dirt: "#1e1a28", cloud: "#2a2a50" },
    warm: true, stars: true, sun: true, clouds: true,
    far: "hills", mid: "roundtrees", treeColors: ["#e8a33a", "#b8382a", "#f2cf4a"],
    decor: [{ kind: "leaves", colors: ["#e0582a", "#f2a33a", "#c23b2a", "#f7d04a"], rate: 0.12 }],
    tufts: 0.03, mushrooms: 0.012,
    props: [["pumpkin", 0.14], ["well", 0.3], ["lamp", 0.48], ["cottage", 0.66], ["pumpkin", 0.86]],
    weather: "leaves", flyers: "birds",
  },
  {
    id: "sea",
    name: "Under the Sea",
    day: { skyTop: "#5ec8e6", skyBot: "#1a5e9a", far: "#2a6a8e", mid: "#2f7a6a", tree: "#3fae6a", groundTop: "#e8d6a0", ground: "#cdb784", dirt: "#a8916a", cloud: "#bff0ff" },
    night: { skyTop: "#0a2a4a", skyBot: "#04102a", far: "#0c2440", mid: "#0c2a36", tree: "#134a3a", groundTop: "#3a4a5a", ground: "#2e3c4c", dirt: "#222e3e", cloud: "#3a6a9a" },
    warm: false, stars: false, sun: false, clouds: false,
    far: "rocks", mid: "seaweed",
    decor: [{ kind: "coral", colors: ["#ff7a8a", "#ffa24a", "#c77dff"], rate: 0.03 }, { kind: "shells", colors: ["#fff4ea", "#ffb3c1"], rate: 0.02 }],
    tufts: 0,
    props: [["chest", 0.22], ["coral", 0.38], ["anchor", 0.56], ["rock", 0.7], ["coral", 0.86]],
    weather: "bubbles", flyers: "fish",
  },
];

export const getBiome = (id: string) => BIOMES.find((b) => b.id === id) ?? BIOMES[0];
