// Rain ripples: a quiet pond at night. Raindrops fall, rings spread where they land,
// your cursor trails little drops and a click makes a splash. Press and hold to rest a
// finger in the water; double-click for a short thunder shower.
import type { Settings } from "../settings";
import { inRect, pick, rand, type FrameContext, type WallpaperEffect } from "./types";

interface Ripple {
  x: number;
  y: number;
  r: number;
  max: number;
  delay: number;
  tone: number;
}

interface Streak {
  x: number;
  y: number;
  len: number;
  speed: number;
}

export class Rain implements WallpaperEffect {
  private ripples: Ripple[] = [];
  private streaks: Streak[] = [];
  private w = 0;
  private h = 0;
  private lastMouse = { x: -1, y: -1 };
  private holdTimer = 0;
  private storm = 0; // seconds of heavy rain left
  private flash = 0; // lightning brightness, fades fast

  resize(width: number, height: number, settings: Settings): void {
    this.w = width;
    this.h = height;
    this.configure(settings, width, height);
  }

  configure(settings: Settings, width: number, height: number): void {
    const target = Math.round(settings.wpDensity * 14 * Math.sqrt((width * height) / 2e6));
    while (this.streaks.length < target) this.streaks.push(this.makeStreak(true));
    if (this.streaks.length > target) this.streaks.length = target;
  }

  private makeStreak(anywhere: boolean): Streak {
    return { x: Math.random() * this.w, y: anywhere ? Math.random() * this.h : rand(-60, -10), len: rand(10, 22), speed: rand(500, 750) };
  }

  private drop(x: number, y: number, max = rand(30, 70), delay = 0): void {
    if (this.ripples.length < 400) this.ripples.push({ x, y, r: 0, max, delay, tone: Math.random() });
  }

  click(x: number, y: number, ctx: FrameContext): void {
    if (ctx.settings.clickEffect === "none") return;
    for (let i = 0; i < 4; i++) this.drop(x, y, 90 + i * 30, i * 0.18);
  }

  dblclick(): void {
    this.storm = 6;
    this.flash = 1;
  }

  update(dt: number, ctx: FrameContext): void {
    const { settings: st, mouse, energy } = ctx;
    const speed = (0.4 + st.wpSpeed * 0.12) * energy;
    const stormy = this.storm > 0 ? 1 + Math.min(1, this.storm / 2) * 4 : 1;
    this.storm = Math.max(0, this.storm - dt);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    if (this.storm > 3.5 && this.storm < 3.6 && this.flash < 0.1) this.flash = 0.6; // a second, softer flicker

    // A finger resting in the water: slow, steady rings while the button is held.
    if (mouse.held) {
      this.holdTimer -= dt;
      if (this.holdTimer <= 0) {
        this.drop(mouse.x, mouse.y, rand(60, 90));
        this.holdTimer = 0.45;
      }
    } else this.holdTimer = 0;

    // Random drops landing on the pond.
    const rate = st.wpDensity * 1.6 * ((this.w * this.h) / 2e6) * energy * stormy;
    if (Math.random() < rate * dt) this.drop(Math.random() * this.w, Math.random() * this.h);

    // Cursor trails small drops as it moves.
    if (mouse.active && st.mouseGlow) {
      const moved = Math.hypot(mouse.x - this.lastMouse.x, mouse.y - this.lastMouse.y);
      if (moved > 38) {
        this.drop(mouse.x, mouse.y, rand(20, 40));
        this.lastMouse = { x: mouse.x, y: mouse.y };
      }
    }

    for (const r of this.ripples) {
      if (r.delay > 0) r.delay -= dt;
      else r.r += dt * 26 * speed * (0.7 + r.max / 120);
    }
    this.ripples = this.ripples.filter((r) => r.r < r.max);

    // Falling streaks, slanted by the drift direction setting.
    const slant = Math.cos((st.wpDirection * Math.PI) / 180) * 0.35;
    for (const s of this.streaks) {
      s.y += s.speed * dt * speed * (stormy > 1 ? 1.4 : 1);
      s.x += s.speed * dt * speed * slant;
      if (s.y > this.h + 20) Object.assign(s, this.makeStreak(false));
      if (s.x > this.w) s.x -= this.w;
      else if (s.x < 0) s.x += this.w;
    }
  }

  draw(g: CanvasRenderingContext2D, ctx: FrameContext): void {
    const { settings: st, colors, dimRect } = ctx;
    const dimInside = 1 - st.dimBehindText;
    const slant = Math.cos((st.wpDirection * Math.PI) / 180) * 0.35;

    g.lineWidth = 1 * st.wpSize;
    g.strokeStyle = colors.primary;
    for (const s of this.streaks) {
      let a = 0.22 * st.wpBrightness;
      if (inRect(dimRect, s.x, s.y)) a *= dimInside;
      g.globalAlpha = a;
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.lineTo(s.x - s.len * slant, s.y - s.len);
      g.stroke();
    }

    const multi = colors.tones.length > 1;
    g.strokeStyle = colors.glow;
    for (const r of this.ripples) {
      if (r.delay > 0 || r.r <= 0) continue;
      if (multi) g.strokeStyle = pick(colors.tones, r.tone);
      const life = 1 - r.r / r.max;
      let a = life * 0.6 * st.wpBrightness;
      if (inRect(dimRect, r.x, r.y)) a *= dimInside;
      if (a < 0.02) continue;
      g.lineWidth = 1.2 * st.wpSize;
      g.globalAlpha = a;
      g.beginPath();
      g.ellipse(r.x, r.y, r.r, r.r * 0.42, 0, 0, Math.PI * 2);
      g.stroke();
      if (r.r > 10) {
        g.globalAlpha = a * 0.5;
        g.beginPath();
        g.ellipse(r.x, r.y, r.r * 0.6, r.r * 0.25, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    if (this.flash > 0) {
      g.globalAlpha = this.flash * 0.18 * st.wpBrightness;
      g.fillStyle = colors.glow;
      g.fillRect(0, 0, this.w, this.h);
    }
    g.globalAlpha = 1;
  }
}
