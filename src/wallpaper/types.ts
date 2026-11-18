// Shared contract for live wallpaper effects. Each effect plugs into the host the same way.
import type { Settings } from "../settings";

export interface WallpaperColors {
  bg: string;
  primary: string; // main particle color (stars, fireflies, currents, ripples)
  glow: string; // highlight color (shooting stars, glows, splashes)
  tones: string[]; // palette tones; particles pick one each for gentle variety
}

export interface FrameContext {
  width: number; // CSS pixels
  height: number;
  time: number; // seconds since start
  /** down: button pressed on the background; held: pressed for a moment (press-and-hold play). */
  mouse: { x: number; y: number; active: boolean; down: boolean; held: boolean };
  /** Area of the reading column; effects should fade inside it. */
  dimRect: { left: number; top: number; right: number; bottom: number } | null;
  settings: Settings;
  colors: WallpaperColors;
  /** 0..1 global calm factor: 1 = normal, lower in focus mode. */
  energy: number;
}

export interface WallpaperEffect {
  /** True if the effect paints its own background (trails, pixel scenes). */
  readonly ownsBackground?: boolean;
  resize(width: number, height: number, settings: Settings): void;
  /** Called when settings change, to rebuild anything that depends on them. */
  configure(settings: Settings, width: number, height: number): void;
  update(dt: number, ctx: FrameContext): void;
  draw(g: CanvasRenderingContext2D, ctx: FrameContext): void;
  click?(x: number, y: number, ctx: FrameContext): void;
  /** Double-click on the background: a bigger, rarer moment. */
  dblclick?(x: number, y: number, ctx: FrameContext): void;
}

/** Index into a list from a stable 0..1 value. */
export const pick = <T>(list: T[], u: number): T => list[Math.min(list.length - 1, Math.floor(u * list.length))];

/** Helper: is a point inside the reading column? */
export function inRect(r: FrameContext["dimRect"], x: number, y: number): boolean {
  return r !== null && x > r.left && x < r.right && y > r.top && y < r.bottom;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
