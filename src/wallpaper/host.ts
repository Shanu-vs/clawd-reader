// Runs the active wallpaper effect on the background canvas, and keeps it cheap:
// FPS cap, pauses when hidden, slows while scrolling, respects "reduce motion".
import { getSettings, onSettingsChange, type Settings } from "../settings";
import { getTheme } from "../themes";
import { Starfield } from "./starfield";
import { Fireflies } from "./fireflies";
import { Currents } from "./currents";
import { Rain } from "./rain";
import { PixelWorld } from "./pixel/world";
import { resolvePalette } from "./palettes";
import type { FrameContext, WallpaperEffect } from "./types";

const STRUCTURAL_KEYS: (keyof Settings)[] = ["wpDensity", "pixelScale", "timeOfDay", "theme", "location", "locationMinutes"];
const HOLD_MS = 220; // press this long without letting go to start press-and-hold play

function createEffect(style: Settings["wallpaper"]): WallpaperEffect | null {
  switch (style) {
    case "starfield": return new Starfield();
    case "fireflies": return new Fireflies();
    case "currents": return new Currents();
    case "rain": return new Rain();
    case "pixel": return new PixelWorld();
    default: return null;
  }
}

export class WallpaperHost {
  private g: CanvasRenderingContext2D;
  private effect: WallpaperEffect | null = null;
  private raf = 0;
  private last = 0;
  private lastDraw = 0;
  private start = performance.now();
  private w = 0;
  private h = 0;
  private dpr = 1;
  private mouse = { x: 0, y: 0, active: false, down: false, held: false };
  private downAt = 0;
  private scrollingUntil = 0;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  constructor(
    private canvas: HTMLCanvasElement,
    private getDimRect: () => DOMRect | null,
    private isClickOnBackground: (target: EventTarget | null) => boolean,
  ) {
    this.g = canvas.getContext("2d", { alpha: false })!;
    this.setEffect(getSettings().wallpaper);
    this.resize();

    window.addEventListener("resize", () => this.resize());
    window.addEventListener("pointermove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
      this.kick();
    });
    document.addEventListener("pointerleave", () => (this.mouse.active = false));
    window.addEventListener("blur", () => (this.mouse.active = false));
    window.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !this.isClickOnBackground(e.target)) return;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.down = getSettings().clickEffect !== "none";
      this.downAt = performance.now();
      this.effect?.click?.(e.clientX, e.clientY, this.frameContext(0));
      this.kick();
    });
    const release = () => {
      this.mouse.down = false;
      this.mouse.held = false;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    window.addEventListener("dblclick", (e) => {
      if (!this.isClickOnBackground(e.target) || getSettings().clickEffect === "none") return;
      window.getSelection()?.removeAllRanges();
      this.effect?.dblclick?.(e.clientX, e.clientY, this.frameContext(0));
      this.kick();
    });
    document.addEventListener("visibilitychange", () => (document.hidden ? this.stop() : this.loop()));
    this.reducedMotion.addEventListener("change", () => this.loop());

    onSettingsChange((s, changed) => {
      if (changed.includes("wallpaper")) this.setEffect(s.wallpaper);
      else if (changed.some((k) => STRUCTURAL_KEYS.includes(k))) this.effect?.configure(s, this.w, this.h);
      this.loop();
      this.drawOnce();
    });

    this.loop();
  }

  /** Called by the app while the reader is scrolling, to lower the frame rate. */
  noteScroll(): void {
    this.scrollingUntil = performance.now() + 180;
  }

  private setEffect(style: Settings["wallpaper"]): void {
    this.effect = createEffect(style);
    if (this.effect && this.w) this.effect.resize(this.w, this.h, getSettings());
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.effect?.resize(this.w, this.h, getSettings());
    this.drawOnce();
  }

  private isStatic(): boolean {
    const s = getSettings();
    return !this.effect || s.wpPaused || (s.respectReducedMotion && this.reducedMotion.matches);
  }

  private frameContext(time: number): FrameContext {
    const s = getSettings();
    const theme = getTheme(s.theme);
    const r = s.dimBehindText > 0 ? this.getDimRect() : null;
    this.mouse.held = this.mouse.down && performance.now() - this.downAt > HOLD_MS;
    const pal = resolvePalette(s, theme);
    return {
      width: this.w,
      height: this.h,
      time,
      mouse: this.mouse,
      dimRect: r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null,
      settings: s,
      colors: {
        bg: theme.vars.bg,
        primary: pal.primary,
        glow: pal.glow,
        tones: pal.tones,
      },
      energy: s.focusMode ? 0.35 : 1,
    };
  }

  private paint(ctx: FrameContext): void {
    this.g.globalAlpha = 1;
    if (!this.effect?.ownsBackground) {
      this.g.fillStyle = ctx.colors.bg;
      this.g.fillRect(0, 0, this.w, this.h);
    }
    this.effect?.draw(this.g, ctx);
  }

  /** Repaint a single frame (used for static mode and after settings change). */
  drawOnce(): void {
    if (!this.w) return;
    this.paint(this.frameContext((performance.now() - this.start) / 1000));
  }

  private kick(): void {
    if (!this.raf && !document.hidden && !this.isStatic()) this.loop();
  }

  private loop(): void {
    if (this.raf || document.hidden) return;
    if (this.isStatic()) {
      this.drawOnce();
      return;
    }
    this.last = performance.now();
    const tick = (now: number) => {
      this.raf = 0;
      if (document.hidden || this.isStatic()) {
        this.drawOnce();
        return;
      }
      const s = getSettings();
      const scrolling = now < this.scrollingUntil;
      const fps = scrolling ? Math.min(s.fpsCap, 15) : s.fpsCap;
      if (now - this.lastDraw >= 1000 / fps - 2) {
        const dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        this.lastDraw = now;
        const ctx = this.frameContext((now - this.start) / 1000);
        this.effect!.update(dt, ctx);
        this.paint(ctx);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
