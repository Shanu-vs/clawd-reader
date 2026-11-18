// Fireflies: soft glowing dots in a few warm tones and sizes. They wander, blink, drift toward
// the cursor, scatter on click, gather into a slow orbit while you press and hold, and a
// double-click makes them all light up together and float outward.
import type { Settings } from "../settings";
import { inRect, pick, rand, type FrameContext, type WallpaperEffect } from "./types";

interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number; // wander phase
  blink: number; // blink phase
  blinkSpeed: number;
  z: number; // depth: dimmer and slower when far
  size: number; // body size multiplier (most small, a few large)
  tone: number; // 0..1 index into the palette
  flash: number; // extra glow from a double-click, fades out
}

export class Fireflies implements WallpaperEffect {
  private flies: Fly[] = [];
  private w = 0;
  private h = 0;

  resize(width: number, height: number, settings: Settings): void {
    this.w = width;
    this.h = height;
    this.configure(settings, width, height);
  }

  configure(settings: Settings, width: number, height: number): void {
    const target = Math.round(((width * height) / 10000) * settings.wpDensity * 0.12);
    while (this.flies.length < target) {
      this.flies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        phase: Math.random() * 100,
        blink: Math.random() * Math.PI * 2,
        blinkSpeed: rand(0.4, 1.2),
        z: rand(0.5, 1),
        size: 0.55 + Math.pow(Math.random(), 2.5) * 1.35,
        tone: Math.random(),
        flash: 0,
      });
    }
    if (this.flies.length > target) this.flies.length = target;
  }

  click(x: number, y: number, ctx: FrameContext): void {
    if (ctx.settings.clickEffect === "none") return;
    for (const f of this.flies) {
      const dx = f.x - x;
      const dy = f.y - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 320) continue;
      const s = (1 - d / 320) * 260;
      f.vx += (dx / d) * s;
      f.vy += (dy / d) * s;
    }
  }

  /** Every firefly lights up at once and drifts gently away from the point. */
  dblclick(x: number, y: number): void {
    for (const f of this.flies) {
      const dx = f.x - x;
      const dy = f.y - y;
      const d = Math.hypot(dx, dy) || 1;
      f.flash = 1 + Math.random() * 0.3;
      f.blink = Math.PI / 2;
      f.vx += (dx / d) * 70;
      f.vy += (dy / d) * 70 - 20;
    }
  }

  update(dt: number, ctx: FrameContext): void {
    const { settings: st, mouse, energy } = ctx;
    const speed = (0.3 + st.wpSpeed * 0.25) * energy;
    const damp = Math.exp(-dt * 1.8);
    for (const f of this.flies) {
      // Lazy wandering: steer along a slowly turning heading. Big ones are a little lazier.
      f.phase += dt * 0.35 * speed;
      const ang = Math.sin(f.phase) * 2.2 + Math.cos(f.phase * 0.63 + f.z * 7) * 2.2;
      const push = (22 * speed * dt) / Math.sqrt(f.size);
      f.vx += Math.cos(ang) * push;
      f.vy += Math.sin(ang) * push;

      const dx = mouse.x - f.x;
      const dy = mouse.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      if (mouse.held) {
        // Press and hold: they come to you and circle slowly around the cursor.
        if (d < 480) {
          const ring = 40 + f.tone * 70;
          const pull = (d - ring) * 0.9;
          f.vx += ((dx / d) * pull + (-dy / d) * 45) * dt;
          f.vy += ((dy / d) * pull + (dx / d) * 45) * dt;
        }
      } else if (mouse.active && st.mouseGlow && d < 220 && d > 24) {
        // Gentle attraction to the cursor.
        f.vx += (dx / d) * 30 * dt;
        f.vy += (dy / d) * 30 * dt;
      }

      f.vx *= damp;
      f.vy *= damp;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.blink += dt * f.blinkSpeed * (0.5 + energy * 0.5);
      if (f.flash > 0) f.flash = Math.max(0, f.flash - dt * 0.45);
      if (f.x < -10) f.x = this.w + 10;
      else if (f.x > this.w + 10) f.x = -10;
      if (f.y < -10) f.y = this.h + 10;
      else if (f.y > this.h + 10) f.y = -10;
    }
  }

  draw(g: CanvasRenderingContext2D, ctx: FrameContext): void {
    const { settings: st, colors, dimRect } = ctx;
    const dimInside = 1 - st.dimBehindText;
    const tones = colors.tones;
    const multi = tones.length > 1;
    for (const f of this.flies) {
      // Mostly glowing, with occasional slow fades to dark.
      const b = Math.max(Math.max(0, Math.sin(f.blink)) ** 0.6, Math.min(1, f.flash));
      let a = b * st.wpBrightness * f.z;
      if (inRect(dimRect, f.x, f.y)) a *= dimInside;
      if (a < 0.03) continue;
      const size = st.wpSize * f.z * f.size;
      const tone = pick(tones, f.tone);
      const halo = 1 + f.flash * 0.8;
      g.fillStyle = multi ? tone : colors.glow;
      g.globalAlpha = Math.min(1, a * 0.16);
      g.beginPath();
      g.arc(f.x, f.y, 9 * size * halo, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = Math.min(1, a * 0.32);
      g.beginPath();
      g.arc(f.x, f.y, 4 * size * halo, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = Math.min(1, a);
      g.fillStyle = multi ? tone : colors.primary;
      g.beginPath();
      g.arc(f.x, f.y, 1.6 * size, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}
