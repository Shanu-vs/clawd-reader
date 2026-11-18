// Starfield: layered drifting stars with parallax, twinkle, cursor glow, click ripples / warp,
// and the occasional shooting star. Press and hold to pull stars into a gravity well
// (let go and they slingshot away); double-click for a supernova.
import type { Settings } from "../settings";
import { pick, type FrameContext, type WallpaperEffect } from "./types";

interface Star {
  x: number;
  y: number;
  z: number; // depth 0.15 (far) .. 1 (near)
  phase: number;
  twSpeed: number;
  vx: number; // temporary push velocity (from clicks)
  vy: number;
  tone: number; // 0..1 index into the palette
}

interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  len: number;
}

interface Ring {
  x: number;
  y: number;
  age: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Starfield implements WallpaperEffect {
  private stars: Star[] = [];
  private shooters: Shooter[] = [];
  private rings: Ring[] = [];
  private offX = 0;
  private offY = 0;
  private w = 0;
  private h = 0;

  resize(width: number, height: number, settings: Settings): void {
    // Keep existing stars where possible so resizing doesn't "reshuffle" the sky.
    if (this.w && this.h) {
      const sx = width / this.w;
      const sy = height / this.h;
      for (const s of this.stars) {
        s.x *= sx;
        s.y *= sy;
      }
    }
    this.w = width;
    this.h = height;
    this.configure(settings, width, height);
  }

  configure(settings: Settings, width: number, height: number): void {
    const target = Math.round(((width * height) / 10000) * settings.wpDensity * 0.55);
    while (this.stars.length < target) this.stars.push(this.makeStar(width, height));
    if (this.stars.length > target) this.stars.length = target;
  }

  private makeStar(w: number, h: number): Star {
    // More far stars than near ones gives a natural sense of depth.
    const z = 0.15 + Math.pow(Math.random(), 2.2) * 0.85;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      z,
      phase: Math.random() * Math.PI * 2,
      twSpeed: rand(0.6, 2.2),
      vx: 0,
      vy: 0,
      tone: Math.random(),
    };
  }

  click(x: number, y: number, ctx: FrameContext): void {
    const mode = ctx.settings.clickEffect;
    if (mode === "none") return;
    const warp = mode === "warp";
    const radius = warp ? Math.hypot(ctx.width, ctx.height) : 260;
    for (const s of this.stars) {
      const { px, py } = this.screenPos(s);
      const dx = px - x;
      const dy = py - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > radius) continue;
      const strength = warp ? 260 + d * 0.9 : (1 - d / radius) * 240;
      s.vx += (dx / d) * strength * s.z;
      s.vy += (dy / d) * strength * s.z;
    }
    if (!warp) this.rings.push({ x, y, age: 0 });
  }

  /** Supernova: a warp-strength push from the point, a bright ring and a shower of shooting stars. */
  dblclick(x: number, y: number, ctx: FrameContext): void {
    for (const s of this.stars) {
      const { px, py } = this.screenPos(s);
      const dx = px - x;
      const dy = py - y;
      const d = Math.hypot(dx, dy) || 1;
      const strength = 380 * Math.max(0.25, 1 - d / Math.hypot(ctx.width, ctx.height));
      s.vx += (dx / d) * strength * s.z;
      s.vy += (dy / d) * strength * s.z;
    }
    this.rings.push({ x, y, age: 0 }, { x, y, age: -0.25 });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + rand(-0.3, 0.3);
      const spd = rand(420, 640);
      this.shooters.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0, maxLife: rand(0.7, 1.1), len: rand(70, 130) });
    }
  }

  private screenPos(s: Star): { px: number; py: number } {
    const w = this.w;
    const h = this.h;
    let px = (s.x + this.offX * s.z) % w;
    let py = (s.y + this.offY * s.z) % h;
    if (px < 0) px += w;
    if (py < 0) py += h;
    return { px, py };
  }

  update(dt: number, ctx: FrameContext): void {
    const { settings: st, width: w, height: h, energy } = ctx;

    // Gentle constant drift in the chosen direction.
    const ang = (st.wpDirection * Math.PI) / 180;
    const speed = st.wpSpeed * 6 * energy;
    const dx = Math.cos(ang) * speed;
    const dy = Math.sin(ang) * speed;

    // Parallax: the sky leans slightly away from the cursor, smoothed.
    const p = st.parallax * 0.006;
    const tx = ctx.mouse.active ? -(ctx.mouse.x - w / 2) * p : 0;
    const ty = ctx.mouse.active ? -(ctx.mouse.y - h / 2) * p : 0;
    const k = Math.min(1, dt * 2.5);
    this.offX += (tx * 3 - this.offX) * k;
    this.offY += (ty * 3 - this.offY) * k;

    const damp = Math.exp(-dt * 2.2);
    const { mouse } = ctx;
    for (const s of this.stars) {
      if (mouse.held) {
        // Gravity well: nearby stars fall toward the cursor and curl around it.
        const { px, py } = this.screenPos(s);
        const gx = mouse.x - px;
        const gy = mouse.y - py;
        const d = Math.hypot(gx, gy) || 1;
        if (d < 320 && d > 6) {
          const f = (1 - d / 320) * 900 * dt * s.z;
          s.vx += (gx / d) * f + (-gy / d) * f * 0.5;
          s.vy += (gy / d) * f + (gx / d) * f * 0.5;
        }
      }
      s.x += (dx * s.z + s.vx) * dt;
      s.y += (dy * s.z + s.vy) * dt;
      s.vx *= damp;
      s.vy *= damp;
      if (s.x < 0) s.x += w;
      else if (s.x >= w) s.x -= w;
      if (s.y < 0) s.y += h;
      else if (s.y >= h) s.y -= h;
    }

    // Shooting stars arrive randomly at roughly the chosen rate per minute.
    if (st.shootingStars > 0 && Math.random() < (st.shootingStars / 60) * dt * energy) {
      this.spawnShooter(w, h);
    }
    for (const sh of this.shooters) {
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.life += dt;
    }
    this.shooters = this.shooters.filter((sh) => sh.life < sh.maxLife);

    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < 1.6);
  }

  private spawnShooter(w: number, h: number): void {
    const fromLeft = Math.random() < 0.5;
    const ang = rand(0.35, 0.7) * (fromLeft ? 1 : -1) + (fromLeft ? 0 : Math.PI);
    const spd = rand(520, 820);
    this.shooters.push({
      x: fromLeft ? rand(-50, w * 0.6) : rand(w * 0.4, w + 50),
      y: rand(-30, h * 0.45),
      vx: Math.cos(ang) * spd,
      vy: Math.abs(Math.sin(ang)) * spd,
      life: 0,
      maxLife: rand(0.6, 1.1),
      len: rand(90, 170),
    });
  }

  draw(g: CanvasRenderingContext2D, ctx: FrameContext): void {
    const { settings: st, colors, mouse, dimRect, time, energy } = ctx;
    const dimInside = 1 - st.dimBehindText;
    const glowR = 140;
    const twinkle = st.twinkle;
    const sizeMul = st.wpSize;
    const bright = st.wpBrightness * (0.55 + 0.45 * energy);

    const inDim = (x: number, y: number) =>
      dimRect !== null && x > dimRect.left && x < dimRect.right && y > dimRect.top && y < dimRect.bottom;

    const multi = colors.tones.length > 1;
    g.fillStyle = colors.primary;
    for (const s of this.stars) {
      const { px, py } = this.screenPos(s);
      const color = multi ? pick(colors.tones, s.tone) : colors.primary;
      if (multi) g.fillStyle = color;

      let a = (0.25 + 0.75 * s.z) * bright;
      if (twinkle > 0) a *= 1 - twinkle * 0.55 + twinkle * 0.55 * Math.sin(time * s.twSpeed + s.phase);
      let r = (0.45 + s.z * 1.35) * sizeMul;

      if (st.mouseGlow && mouse.active) {
        const d = Math.hypot(px - mouse.x, py - mouse.y);
        if (d < glowR) {
          const f = 1 - d / glowR;
          a += f * 0.7;
          r *= 1 + f * 0.8;
        }
      }
      if (inDim(px, py)) a *= dimInside;
      if (a <= 0.02) continue;
      g.globalAlpha = Math.min(1, a);

      // Fast-moving stars (after a click) are drawn as short streaks.
      const v = Math.hypot(s.vx, s.vy);
      if (v > 50) {
        g.strokeStyle = color;
        g.lineWidth = Math.max(0.8, r * 0.9);
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px - s.vx * 0.06, py - s.vy * 0.06);
        g.stroke();
      } else if (r < 1.3) {
        g.fillRect(px - r * 0.7, py - r * 0.7, r * 1.4, r * 1.4);
      } else {
        g.beginPath();
        g.arc(px, py, r, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Shooting stars: a fading tail behind a bright head.
    for (const sh of this.shooters) {
      const t = sh.life / sh.maxLife;
      g.lineCap = "round";
      const fade = Math.sin(Math.PI * t) * (inDim(sh.x, sh.y) ? dimInside : 1) * bright;
      const sp = Math.hypot(sh.vx, sh.vy);
      const tx = sh.x - (sh.vx / sp) * sh.len;
      const ty = sh.y - (sh.vy / sp) * sh.len;
      const grad = g.createLinearGradient(sh.x, sh.y, tx, ty);
      grad.addColorStop(0, colors.glow);
      grad.addColorStop(1, "transparent");
      g.globalAlpha = Math.min(1, fade);
      g.strokeStyle = grad;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(sh.x, sh.y);
      g.lineTo(tx, ty);
      g.stroke();
    }

    // Click ripples.
    for (const ring of this.rings) {
      if (ring.age < 0) continue;
      const t = ring.age / 1.6;
      g.globalAlpha = (1 - t) * 0.35 * bright;
      g.strokeStyle = colors.glow;
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(ring.x, ring.y, 20 + t * 240, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
}
