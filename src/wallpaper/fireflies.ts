// Fireflies: soft glowing dots that wander, blink, gather near the cursor and scatter on click.
import type { Settings } from "../settings";
import { inRect, rand, type FrameContext, type WallpaperEffect } from "./types";

interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number; // wander phase
  blink: number; // blink phase
  blinkSpeed: number;
  z: number;
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

  update(dt: number, ctx: FrameContext): void {
    const { settings: st, mouse, energy } = ctx;
    const speed = (0.3 + st.wpSpeed * 0.25) * energy;
    const damp = Math.exp(-dt * 1.8);
    for (const f of this.flies) {
      // Lazy wandering: steer along a slowly turning heading.
      f.phase += dt * 0.35 * speed;
      const ang = Math.sin(f.phase) * 2.2 + Math.cos(f.phase * 0.63 + f.z * 7) * 2.2;
      f.vx += Math.cos(ang) * 22 * speed * dt;
      f.vy += Math.sin(ang) * 22 * speed * dt;

      // Gentle attraction to the cursor.
      if (mouse.active && st.mouseGlow) {
        const dx = mouse.x - f.x;
        const dy = mouse.y - f.y;
        const d = Math.hypot(dx, dy);
        if (d < 220 && d > 24) {
          f.vx += (dx / d) * 30 * dt;
          f.vy += (dy / d) * 30 * dt;
        }
      }

      f.vx *= damp;
      f.vy *= damp;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.blink += dt * f.blinkSpeed * (0.5 + energy * 0.5);
      if (f.x < -10) f.x = this.w + 10;
      else if (f.x > this.w + 10) f.x = -10;
      if (f.y < -10) f.y = this.h + 10;
      else if (f.y > this.h + 10) f.y = -10;
    }
  }

  draw(g: CanvasRenderingContext2D, ctx: FrameContext): void {
    const { settings: st, colors, dimRect } = ctx;
    const dimInside = 1 - st.dimBehindText;
    const size = st.wpSize;
    for (const f of this.flies) {
      // Mostly glowing, with occasional slow fades to dark.
      const b = Math.max(0, Math.sin(f.blink)) ** 0.6;
      let a = b * st.wpBrightness * f.z;
      if (inRect(dimRect, f.x, f.y)) a *= dimInside;
      if (a < 0.03) continue;
      g.globalAlpha = Math.min(1, a * 0.18);
      g.fillStyle = colors.glow;
      g.beginPath();
      g.arc(f.x, f.y, 9 * size * f.z, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = Math.min(1, a * 0.35);
      g.beginPath();
      g.arc(f.x, f.y, 4 * size * f.z, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = Math.min(1, a);
      g.fillStyle = colors.primary;
      g.beginPath();
      g.arc(f.x, f.y, 1.6 * size * f.z, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}
