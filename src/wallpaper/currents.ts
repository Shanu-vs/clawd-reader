// Flowing currents: particles drift along a slowly changing flow field, leaving soft trails.
// Kept deliberately slow and smooth so it soothes rather than rushes. The cursor stirs a
// gentle whirlpool, a click sends out a swirl, press-and-drag stirs the water along your
// stroke, and a double-click opens a wide, slow vortex.
import type { Settings } from "../settings";
import { inRect, pick, rand, type FrameContext, type WallpaperEffect } from "./types";

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tone: number; // 0..1 index into the palette
  age: number;
  life: number;
}

interface Swirl {
  x: number;
  y: number;
  t: number;
  life: number;
  radius: number; // growth per second
  power: number;
}

const MOVE = 5; // velocity → px per second

export class Currents implements WallpaperEffect {
  readonly ownsBackground = true;
  private ps: P[] = [];
  private w = 0;
  private h = 0;
  private lastBg = "";
  private swirls: Swirl[] = [];
  private lastMouse = { x: 0, y: 0 };

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
    return { x: Math.random() * this.w, y: Math.random() * this.h, vx: 0, vy: 0, tone: Math.random(), age: rand(0, 8), life: rand(16, 26) };
  }

  click(x: number, y: number, ctx: FrameContext): void {
    if (ctx.settings.clickEffect !== "none") this.swirls.push({ x, y, t: 0, life: 4, radius: 90, power: 6 });
    this.lastMouse = { x, y };
  }

  dblclick(x: number, y: number): void {
    this.swirls.push({ x, y, t: 0, life: 9, radius: 70, power: 9 });
  }

  update(dt: number, ctx: FrameContext): void {
    const { settings: st, mouse, time, energy } = ctx;
    const speed = (0.12 + st.wpSpeed * 0.06) * energy;
    const t = time * 0.05;
    const bias = (st.wpDirection * Math.PI) / 180;
    for (const s of this.swirls) s.t += dt;
    this.swirls = this.swirls.filter((s) => s.t < s.life);

    // Press-and-drag: stir along the direction the cursor moves.
    const sdx = mouse.x - this.lastMouse.x;
    const sdy = mouse.y - this.lastMouse.y;
    this.lastMouse = { x: mouse.x, y: mouse.y };
    const stirring = mouse.held && Math.hypot(sdx, sdy) > 0.5;

    for (const p of this.ps) {
      // Smooth pseudo-noise flow field, nudged toward the chosen direction.
      const a =
        Math.sin(p.x * 0.003 + t) * 1.4 +
        Math.cos(p.y * 0.0036 - t * 0.8) * 1.4 +
        Math.sin((p.x + p.y) * 0.0015 + t * 0.5) +
        bias * 0.35;
      p.vx = p.vx * 0.93 + Math.cos(a) * 3.2 * speed;
      p.vy = p.vy * 0.93 + Math.sin(a) * 3.2 * speed;

      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d = Math.hypot(dx, dy);
      if (stirring && d < 130) {
        const f = (1 - d / 130) * 0.35;
        p.vx += sdx * f;
        p.vy += sdy * f;
      } else if (mouse.active && st.mouseGlow && d < 110 && d > 1) {
        const f = (1 - d / 110) * 3.5;
        p.vx += (-dy / d) * f;
        p.vy += (dx / d) * f;
      }
      for (const s of this.swirls) {
        const sx = p.x - s.x;
        const sy = p.y - s.y;
        const sd = Math.hypot(sx, sy);
        const r = 50 + s.t * s.radius;
        if (sd < r && sd > 1) {
          const ease = Math.sin(Math.PI * Math.min(1, s.t / s.life)); // fades in and out
          const f = (1 - sd / r) * ease * s.power;
          p.vx += (-sy / sd) * f + (sx / sd) * f * 0.15;
          p.vy += (sx / sd) * f + (sy / sd) * f * 0.15;
        }
      }

      p.x += p.vx * dt * MOVE;
      p.y += p.vy * dt * MOVE;
      p.age += dt;
      if (p.x < 0 || p.x > this.w || p.y < 0 || p.y > this.h || p.age > p.life) Object.assign(p, this.spawn(), { age: 0 });
    }
  }

  draw(g: CanvasRenderingContext2D, ctx: FrameContext): void {
    const { settings: st, colors, dimRect } = ctx;
    // Fade previous frame toward the background, leaving trails.
    g.globalAlpha = this.lastBg === colors.bg ? 0.06 : 1;
    this.lastBg = colors.bg;
    g.fillStyle = colors.bg;
    g.fillRect(0, 0, this.w, this.h);

    const dimInside = 1 - st.dimBehindText;
    g.lineWidth = 1.1 * st.wpSize;
    g.lineCap = "round";
    // Theme palette: mostly main colour with some highlights. Other palettes: each tone.
    const groups: [string, (p: P) => boolean][] =
      colors.tones.length > 1
        ? colors.tones.map((c) => [c, (p: P) => pick(colors.tones, p.tone) === c])
        : [[colors.primary, (p) => p.tone < 0.6], [colors.glow, (p) => p.tone >= 0.6]];
    for (const [color, member] of groups) {
      g.strokeStyle = color;
      for (const p of this.ps) {
        if (!member(p)) continue;
        // Fade in after spawning and out before respawning, so nothing pops.
        let a = 0.5 * st.wpBrightness * Math.min(1, p.age * 0.8, (p.life - p.age) * 0.8);
        if (inRect(dimRect, p.x, p.y)) a *= dimInside;
        if (a < 0.02) continue;
        g.globalAlpha = Math.min(1, a);
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * 1.4, p.y - p.vy * 1.4);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  }
}
