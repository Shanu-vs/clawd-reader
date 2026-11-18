// Pixel world wallpaper: the Claude crab scuttles through a series of pixel-art locations.
// Locations rotate on the clock (every 30 minutes by default) with a smooth crossfade,
// and a little banner announces where you've arrived.
import type { Settings } from "../../settings";
import type { FrameContext, WallpaperEffect } from "../types";
import { BIOMES, getBiome } from "./biomes";
import { Crab, CRAB_W } from "./crab";
import { css, hex, type RGB } from "./kit";
import { Scene, nightAt, type View } from "./scene";

const FIXED_HOURS = { dawn: 6.6, day: 12, sunset: 18.4, night: 23 } as const;
const FADE_SECONDS = 6;

interface Spark { x: number; y: number; vx: number; vy: number; age: number; life: number; gravity: number; color: RGB }

const SPARK_COLORS = ["#ffe36a", "#ffffff", "#ff9f6a", "#d97757"].map(hex);
const FIREWORK_COLORS = [["#ff6b6b", "#ffd0d0"], ["#7fd3ff", "#e0f6ff"], ["#ffe36a", "#fff6c4"], ["#b99cff", "#efe6ff"], ["#7dffb0", "#dcffe9"]].map((p) => p.map(hex));

export class PixelWorld implements WallpaperEffect {
  readonly ownsBackground = true;

  private out = document.createElement("canvas");
  private o = this.out.getContext("2d", { alpha: false })!;
  private tmp = document.createElement("canvas");
  private t = this.tmp.getContext("2d", { alpha: false })!;
  private scenes = new Map<string, Scene>();
  private current: Scene | null = null;
  private prev: Scene | null = null;
  private fade = 1;

  private crab = new Crab();
  private sparks: Spark[] = [];
  private pending: { at: number; x: number; y: number }[] = []; // fireworks waiting to burst
  private clock = 0;
  private dustIn = 0;
  private P = 4;
  private bw = 0;
  private bh = 0;
  private w = 0;
  private h = 0;
  private cam = 0;
  private parX = 0;
  private parY = 0;

  resize(width: number, height: number, settings: Settings): void {
    this.w = width;
    this.h = height;
    this.configure(settings, width, height);
  }

  configure(settings: Settings, width: number, height: number): void {
    this.P = Math.max(2, Math.round(settings.pixelScale));
    this.bw = Math.ceil(width / this.P);
    this.bh = Math.ceil(height / this.P);
    for (const c of [this.out, this.tmp]) {
      if (c.width !== this.bw || c.height !== this.bh) {
        c.width = this.bw;
        c.height = this.bh;
      }
    }
    for (const s of this.scenes.values()) s.build(this.bw, this.bh);
    const want = this.wantedLocation(settings);
    if (!this.current) {
      this.current = this.scene(want);
      this.announce();
    } else if (this.current.biome.id !== want) this.travelTo(want);
  }

  private scene(id: string): Scene {
    let s = this.scenes.get(id);
    if (!s) {
      s = new Scene(getBiome(id));
      this.scenes.set(id, s);
    }
    s.build(this.bw, this.bh);
    return s;
  }

  private wantedLocation(st: Settings): string {
    if (st.location !== "rotate") return getBiome(st.location).id;
    const slot = Math.floor(Date.now() / (Math.max(1, st.locationMinutes) * 60_000));
    return BIOMES[slot % BIOMES.length].id;
  }

  private travelTo(id: string): void {
    if (!this.current || this.current.biome.id === id) return;
    this.prev = this.current;
    this.current = this.scene(id);
    this.fade = 0;
    this.announce();
  }

  /** Tell the app to show a "~ Sunny Beach ~" title card, like arriving somewhere new in a game. */
  private announce(): void {
    const name = this.current?.biome.name;
    // Slight delay so the card also shows on startup, once the app is listening.
    if (name) setTimeout(() => window.dispatchEvent(new CustomEvent("wallpaper:place", { detail: name })), 400);
  }

  private hour(st: Settings, time: number): number {
    if (st.timeOfDay === "auto") {
      const d = new Date();
      return d.getHours() + d.getMinutes() / 60;
    }
    if (st.timeOfDay === "cycle") return (8 + (time / 480) * 24) % 24;
    return FIXED_HOURS[st.timeOfDay];
  }

  click(x: number, y: number, ctx: FrameContext): void {
    if (ctx.settings.clickEffect === "none") return;
    if (ctx.settings.showCrab) this.crab.hop();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const s = 14 + Math.random() * 18;
      this.spark(x / this.P, y / this.P, Math.cos(a) * s, Math.sin(a) * s - 6, SPARK_COLORS[i % SPARK_COLORS.length]);
    }
  }

  /** Double-click: a little fireworks show over the spot, and Claw'd waves at it. */
  dblclick(x: number, y: number, ctx: FrameContext): void {
    if (ctx.settings.showCrab) this.crab.wave();
    for (let i = 0; i < 3; i++) {
      this.pending.push({ at: this.clock + i * 0.45, x: x + (Math.random() - 0.5) * 220, y: y - 40 - Math.random() * 120 });
    }
  }

  private spark(x: number, y: number, vx: number, vy: number, color: RGB, life = 1.2, gravity = 30): void {
    if (this.sparks.length < 600) this.sparks.push({ x, y, vx, vy, age: 0, life, gravity, color });
  }

  private burst(x: number, y: number): void {
    const [main, light] = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = 20 + Math.random() * 10;
      this.spark(x / this.P, y / this.P, Math.cos(a) * s, Math.sin(a) * s, i % 3 ? main : light, 1.8, 9);
    }
  }

  update(dt: number, ctx: FrameContext): void {
    const { settings: st, mouse, energy } = ctx;
    const want = this.wantedLocation(st);
    if (this.current && want !== this.current.biome.id && this.fade >= 1) this.travelTo(want);

    const speed = st.wpSpeed * 1.6 * energy;
    this.cam += speed * dt;
    this.crab.update(dt, speed);

    const tx = mouse.active ? ((mouse.x / this.w) * 2 - 1) * st.parallax * 1.4 : 0;
    const ty = mouse.active ? ((mouse.y / this.h) * 2 - 1) * st.parallax * 0.5 : 0;
    const k = Math.min(1, dt * 3);
    this.parX += (tx - this.parX) * k;
    this.parY += (ty - this.parY) * k;

    this.current?.update(dt, energy);
    if (this.prev) {
      this.prev.update(dt, energy);
      this.fade = Math.min(1, this.fade + dt / FADE_SECONDS);
      if (this.fade >= 1) this.prev = null;
    }

    // Fireworks queued by a double-click.
    this.clock += dt;
    for (const f of this.pending) if (f.at <= this.clock) this.burst(f.x, f.y);
    this.pending = this.pending.filter((f) => f.at > this.clock);

    // Press and hold: a trail of magic dust follows the cursor.
    if (mouse.held) {
      this.dustIn -= dt;
      if (this.dustIn <= 0) {
        this.dustIn = 0.03;
        const c = SPARK_COLORS[Math.floor(Math.random() * 2)];
        this.spark(mouse.x / this.P, mouse.y / this.P, (Math.random() - 0.5) * 8, -3 - Math.random() * 6, c, 0.9, 6);
      }
    }

    for (const s of this.sparks) {
      s.age += dt;
      s.vy += s.gravity * dt;
      s.vx *= 1 - dt * 0.8;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.sparks = this.sparks.filter((s) => s.age < s.life);
  }

  draw(g: CanvasRenderingContext2D, ctx: FrameContext): void {
    const { settings: st, time, dimRect, colors } = ctx;
    const cur = this.current;
    if (!cur) return;
    const hour = this.hour(st, time);
    const view: View = { cam: this.cam, parX: this.parX, parY: this.parY, time, hour };
    const o = this.o;

    // Smooth ease for the crossfade between locations.
    const f = this.fade * this.fade * (3 - 2 * this.fade);
    if (this.prev && f < 1) {
      this.prev.draw(o, view);
      cur.draw(this.t, view);
      o.globalAlpha = f;
      o.drawImage(this.tmp, 0, 0);
      o.globalAlpha = 1;
    } else cur.draw(o, view);

    // The crab walks in the open space left of the reading column.
    if (st.showCrab) {
      const margin = dimRect ? dimRect.left / this.P : this.bw * 0.4;
      const cx = margin >= CRAB_W + 4 ? Math.round(margin / 2 - CRAB_W / 2) : Math.round(this.bw * 0.03);
      const world = cx + this.cam + this.parX + CRAB_W / 2;
      let gy = cur.groundAt(world, this.parY);
      if (this.prev && f < 1) gy = Math.round(this.prev.groundAt(world, this.parY) * (1 - f) + gy * f);
      this.crab.draw(o, cx, gy, nightAt(hour), st.wpSpeed > 0);
    }

    // Weather sits in front of everything.
    if (this.prev && f < 1) {
      o.globalAlpha = 1 - f;
      this.prev.drawWeather(o, hour);
      o.globalAlpha = 1;
    }
    o.globalAlpha = Math.min(1, f + (this.prev ? 0 : 1));
    cur.drawWeather(o, hour);
    o.globalAlpha = 1;

    for (const s of this.sparks) {
      o.globalAlpha = 1 - s.age / s.life;
      o.fillStyle = css(s.color);
      o.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    o.globalAlpha = 1;

    // Scale up with crisp pixels.
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.drawImage(this.out, 0, 0, this.bw * this.P, this.bh * this.P);

    if (st.wpBrightness < 1) {
      g.globalAlpha = (1 - st.wpBrightness) * 0.75;
      g.fillStyle = "#000";
      g.fillRect(0, 0, this.w, this.h);
    } else if (st.wpBrightness > 1) {
      g.globalAlpha = (st.wpBrightness - 1) * 0.35;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, this.w, this.h);
    }
    if (dimRect && st.dimBehindText > 0) {
      g.globalAlpha = st.dimBehindText * 0.5;
      g.fillStyle = colors.bg;
      g.fillRect(dimRect.left, dimRect.top, dimRect.right - dimRect.left, dimRect.bottom - dimRect.top);
    }
    g.globalAlpha = 1;

  }
}
