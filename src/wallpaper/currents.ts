// Flowing currents: particles follow a slowly changing flow field, leaving soft trails.
// The cursor stirs a gentle whirlpool; a click sends out a swirl.
import type { Settings } from "../settings";
import { inRect, rand, type FrameContext, type WallpaperEffect } from "./types";

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number; // 0..1 blend between primary and glow color
  age: number;
}

export class Currents implements WallpaperEffect {
  readonly ownsBackground = true;
  private ps: P[] = [];
  private w = 0;
  private h = 0;
  private lastBg = "";
  private swirls: { x: number; y: number; t: number }[] = [];

  resize(width: number, height: number, settings: Settings): void {
    this.w = width;
    this.h = height;
    this.lastBg = ""; // force a full repaint
    this.configure(settings, width, height);
  }

  configure(settings: Settings, width: number, height: number): void {
    const target = Math.round(((width * height) / 10000) * settings.wpDensity * 0.35);
    while (this.ps.length < target) this.ps.push(this.spawn());
    if (this.ps.length > target) this.ps.length = target;
    this.lastBg = "";
  }

  private spawn(): P {
    return { x: Math.random() * this.w, y: Math.random() * this.h, vx: 0, vy: 0, hue: Math.random(), age: rand(0, 8) };
  }

  click(x: number, y: number, ctx: FrameContext): void {
    if (ctx.settings.clickEffect !== "none") this.swirls.push({ x, y, t: 0 });
  }

  update(dt: number, ctx: FrameContext): void {
    const { settings: st, mouse, time, energy } = ctx;
    const speed = (0.4 + st.wpSpeed * 0.35) * energy;
    const t = time * 0.12;
    const bias = (st.wpDirection * Math.PI) / 180;
    for (const s of this.swirls) s.t += dt;
    this.swirls = this.swirls.filter((s) => s.t < 2.5);

    for (const p of this.ps) {
      // Smooth pseudo-noise flow field, nudged toward the chosen direction.
      const a =
        Math.sin(p.x * 0.0035 + t) * 1.6 +
        Math.cos(p.y * 0.0042 - t * 0.8) * 1.6 +
        Math.sin((p.x + p.y) * 0.0018 + t * 0.5) +
        bias * 0.35;
      p.vx = p.vx * 0.92 + Math.cos(a) * 3.2 * speed;
      p.vy = p.vy * 0.92 + Math.sin(a) * 3.2 * speed;

      if (mouse.active && st.mouseGlow) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 110 && d > 1) {
          const f = (1 - d / 110) * 9;
          p.vx += (-dy / d) * f;
          p.vy += (dx / d) * f;
        }
      }
      for (const s of this.swirls) {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const d = Math.hypot(dx, dy);
        const r = 60 + s.t * 160;
        if (d < r && d > 1) {
          const f = (1 - d / r) * (1 - s.t / 2.5) * 16;
          p.vx += (-dy / d) * f + (dx / d) * f * 0.3;
          p.vy += (dx / d) * f + (dy / d) * f * 0.3;
        }
      }

      p.x += p.vx * dt * 8;
      p.y += p.vy * dt * 8;
      p.age += dt;
      if (p.x < 0 || p.x > this.w || p.y < 0 || p.y > this.h || p.age > 14) Object.assign(p, this.spawn(), { age: 0 });
    }
  }

  draw(g: CanvasRenderingContext2D, ctx: FrameContext): void {
    const { settings: st, colors, dimRect } = ctx;
    // Fade previous frame toward the background, leaving trails.
    g.globalAlpha = this.lastBg === colors.bg ? 0.07 : 1;
    this.lastBg = colors.bg;
    g.fillStyle = colors.bg;
    g.fillRect(0, 0, this.w, this.h);

    const dimInside = 1 - st.dimBehindText;
    g.lineWidth = 1.1 * st.wpSize;
    g.lineCap = "round";
    for (const [color, lo, hi] of [[colors.primary, 0, 0.6], [colors.glow, 0.6, 1]] as const) {
      g.strokeStyle = color;
      for (const p of this.ps) {
        if (p.hue < lo || p.hue >= hi) continue;
        let a = 0.5 * st.wpBrightness * Math.min(1, p.age * 1.5);
        if (inRect(dimRect, p.x, p.y)) a *= dimInside;
        if (a < 0.02) continue;
        g.globalAlpha = Math.min(1, a);
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * 0.9, p.y - p.vy * 0.9);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  }
}
