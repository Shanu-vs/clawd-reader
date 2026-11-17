// One location of the pixel world, generated once per window size and drawn every frame.
import type { Biome, PaletteDef } from "./biomes";
import { css, disc, hex, mix, NIGHT_TINT, ridge, rng, type RGB } from "./kit";
import { PROPS, PROP_W, type PropCtx } from "./props";

export interface Palette {
  skyTop: RGB;
  skyBot: RGB;
  far: RGB;
  mid: RGB;
  tree: RGB;
  groundTop: RGB;
  ground: RGB;
  dirt: RGB;
  cloud: RGB;
  night: number;
}

export interface View {
  cam: number; // how far the world has scrolled (art pixels)
  parX: number;
  parY: number;
  time: number;
  hour: number;
}

const DUSK_TOP = hex("#3f2f7a");
const DUSK_BOT = hex("#ff9358");
const WARM = hex("#ff8a50");

export function nightAt(h: number): number {
  if (h < 4.8 || h >= 20.2) return 1;
  if (h < 7.5) return 1 - (h - 4.8) / 2.7;
  if (h < 17.5) return 0;
  return (h - 17.5) / 2.7;
}
const warmAt = (h: number) => Math.max(0, 1 - Math.abs(h - 6.3) / 1.4) + Math.max(0, 1 - Math.abs(h - 18.6) / 1.4);

export class Scene {
  private sky = document.createElement("canvas");
  private skyKey = "";
  private bw = 0;
  private bh = 0;
  private L = 0;
  private farH: number[] = [];
  private midH: number[] = [];
  private nearH: number[] = [];
  private trees: { x: number; h: number; c: number; phase: number }[] = [];
  private decor: { x: number; kind: string; c: RGB }[] = [];
  private clouds: { x: number; y: number; w: number }[] = [];
  private stars: { x: number; y: number; p: number }[] = [];
  private flies: { x: number; y: number; p: number }[] = [];
  private weather: { x: number; y: number; v: number; p: number; c: number }[] = [];
  private flyers: { x: number; y: number; v: number; phase: number; c: number }[] = [];
  private smoke: { x: number; y: number; age: number }[] = [];
  private smokeIn = 0;

  constructor(readonly biome: Biome) {}

  build(bw: number, bh: number): void {
    if (bw === this.bw && bh === this.bh && this.nearH.length) return;
    this.bw = bw;
    this.bh = bh;
    this.sky.width = bw;
    this.sky.height = bh;
    this.skyKey = "";
    const L = (this.L = Math.max(bw * 3, 480));
    const bi = this.biome;
    const r = rng(bi.id.split("").reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));

    switch (bi.far) {
      case "mountains": this.farH = ridge(r, L, bh * 0.6, bh * 0.13, [2, 5, 11, 23], 0.8); break;
      case "hills": this.farH = ridge(r, L, bh * 0.63, bh * 0.07, [2, 4, 9], 1); break;
      case "rocks": this.farH = ridge(r, L, bh * 0.62, bh * 0.12, [3, 7, 15], 1.3); break;
      case "sea": this.farH = new Array(L).fill(Math.round(bh * 0.6)); break;
      case "mesas": {
        const raw = ridge(r, L, bh * 0.64, bh * 0.14, [2, 3, 7], 1);
        const base = Math.round(bh * 0.66);
        this.farH = raw.map((v) => (v < bh * 0.6 ? Math.round(v / 5) * 5 : base));
        break;
      }
    }
    this.midH = bi.mid === "none" ? [] : ridge(r, L, bh * (bi.mid === "seaweed" ? 0.76 : 0.71), bh * (bi.mid === "dunes" ? 0.05 : 0.045), [2, 3, 7, 13], 1);
    this.nearH = ridge(r, L, bh * 0.83, 1.6, [4, 9, 19], 1);

    this.trees = [];
    if (bi.mid !== "none") {
      const gap = bi.mid === "dunes" ? 40 : bi.mid === "roundtrees" ? 6 : 5;
      for (let x = 0; x < L; x += gap + Math.floor(r() * (bi.mid === "dunes" ? 50 : 12))) {
        this.trees.push({ x, h: 6 + Math.floor(r() * 9), c: Math.floor(r() * 4), phase: r() * 6.28 });
      }
    }

    const nearProp = (x: number) => bi.props.some(([, at]) => Math.abs(x - Math.round(at * L)) < 16);
    this.decor = [];
    for (let x = 0; x < L; x++) {
      if (nearProp(x)) continue;
      for (const d of bi.decor) {
        if (r() < d.rate) {
          this.decor.push({ x, kind: d.kind, c: hex(d.colors[Math.floor(r() * d.colors.length)]) });
          break;
        }
      }
      if (r() < bi.tufts) this.decor.push({ x, kind: "tuft", c: [0, 0, 0] });
      else if (bi.mushrooms && r() < bi.mushrooms) this.decor.push({ x, kind: "mushroom", c: [0, 0, 0] });
    }

    this.clouds = [];
    for (let i = 0; i < Math.ceil(L / 70); i++) this.clouds.push({ x: r() * L, y: 6 + r() * bh * 0.3, w: 10 + Math.floor(r() * 18) });
    this.stars = [];
    for (let i = 0; i < (bw * bh) / 90; i++) this.stars.push({ x: Math.floor(r() * bw), y: Math.floor(r() * bh * 0.6), p: r() * 6.28 });
    this.flies = [];
    for (let i = 0; i < 18; i++) this.flies.push({ x: r() * bw, y: bh * (0.74 + r() * 0.12), p: r() * 6.28 });

    const n = bi.weather === "snow" ? Math.round((bw * bh) / 380) : bi.weather === "leaves" ? 26 : bi.weather === "bubbles" ? 34 : 0;
    this.weather = [];
    for (let i = 0; i < n; i++) this.weather.push({ x: r() * bw, y: r() * bh, v: 0.6 + r() * 0.8, p: r() * 6.28, c: Math.floor(r() * 4) });
  }

  palette(hour: number): Palette {
    const bi = this.biome;
    const n = nightAt(hour);
    const w = bi.warm ? warmAt(hour) : 0;
    const p = (k: keyof PaletteDef) => mix(hex(bi.day[k]), hex(bi.night[k]), n);
    const land = (k: keyof PaletteDef) => mix(p(k), WARM, w * 0.12);
    return {
      skyTop: mix(p("skyTop"), DUSK_TOP, w * 0.75),
      skyBot: mix(p("skyBot"), DUSK_BOT, w * 0.8),
      far: land("far"), mid: land("mid"), tree: land("tree"),
      groundTop: land("groundTop"), ground: land("ground"), dirt: land("dirt"),
      cloud: mix(p("cloud"), hex("#ffb48a"), w * 0.6),
      night: n,
    };
  }

  groundAt(worldX: number, parY: number): number {
    const L = this.L;
    return this.nearH[((Math.floor(worldX) % L) + L) % L] + Math.round(parY);
  }

  update(dt: number, energy: number): void {
    const bi = this.biome;
    this.smokeIn -= dt;
    if (this.smokeIn <= 0) {
      this.smokeIn = 0.7;
      this.smoke.push({ x: 0, y: 0, age: 0 });
    }
    for (const s of this.smoke) {
      s.age += dt;
      s.y -= 4 * dt;
      s.x += (2 + Math.sin(s.age * 2)) * dt;
    }
    this.smoke = this.smoke.filter((s) => s.age < 5);

    for (const f of this.flies) {
      f.p += dt;
      f.x += Math.sin(f.p * 0.7) * 3 * dt;
      f.y += Math.cos(f.p * 0.9) * 2 * dt;
    }

    const { bw, bh } = this;
    for (const w of this.weather) {
      w.p += dt;
      if (bi.weather === "snow") {
        w.y += (5 + w.v * 5) * dt * energy;
        w.x += Math.sin(w.p * 0.8) * 3 * dt;
      } else if (bi.weather === "leaves") {
        w.y += (6 + w.v * 6) * dt * energy;
        w.x += (5 + Math.sin(w.p * 1.6) * 8) * dt * energy;
      } else {
        w.y -= (6 + w.v * 8) * dt * energy;
        w.x += Math.sin(w.p * 2) * 2 * dt;
      }
      if (w.y > bh) { w.y = -2; w.x = Math.random() * bw; }
      if (w.y < -2) { w.y = bh; w.x = Math.random() * bw; }
      if (w.x > bw) w.x -= bw;
      if (w.x < 0) w.x += bw;
    }

    if (bi.flyers !== "none") {
      const want = bi.flyers === "fish" ? 4 : 0;
      if ((this.flyers.length <= want && Math.random() < dt * (bi.flyers === "fish" ? 0.5 : 0.05) * energy) || this.flyers.length < want) {
        const left = bi.flyers !== "fish" || Math.random() < 0.5;
        const y = bi.flyers === "fish" ? bh * (0.25 + Math.random() * 0.4) : 10 + Math.random() * bh * 0.25;
        const count = bi.flyers === "fish" ? 1 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          this.flyers.push({
            x: left ? -10 - i * 7 : bw + 10 + i * 7,
            y: y + (i % 2) * 4 + i,
            v: (left ? 1 : -1) * (bi.flyers === "fish" ? 5 + Math.random() * 4 : 10 + Math.random() * 3),
            phase: Math.random() * 6,
            c: Math.floor(Math.random() * 3),
          });
        }
      }
      for (const f of this.flyers) {
        f.x += f.v * dt;
        f.phase += dt * 8;
      }
      this.flyers = this.flyers.filter((f) => f.x > -30 && f.x < bw + 30);
    }
  }

  private paintSky(pal: Palette): void {
    const { bw, bh } = this;
    const sctx = this.sky.getContext("2d")!;
    const img = sctx.createImageData(bw, bh);
    const bands = 9;
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const horizon = bh * 0.75;
    const cols: RGB[] = [];
    for (let i = 0; i <= bands; i++) cols.push(mix(pal.skyTop, pal.skyBot, i / bands));
    for (let y = 0; y < bh; y++) {
      const t = Math.min(1, y / horizon) * bands;
      const band = Math.floor(t);
      const frac = t - band;
      for (let x = 0; x < bw; x++) {
        const c = frac * 16 > bayer[(y & 3) * 4 + (x & 3)] ? cols[Math.min(bands, band + 1)] : cols[band];
        const o = (y * bw + x) * 4;
        img.data[o] = c[0];
        img.data[o + 1] = c[1];
        img.data[o + 2] = c[2];
        img.data[o + 3] = 255;
      }
    }
    sctx.putImageData(img, 0, 0);
  }

  draw(b: CanvasRenderingContext2D, v: View): void {
    const bi = this.biome;
    const { bw, bh, L } = this;
    const pal = this.palette(v.hour);
    const night = pal.night;
    const shade = (c: RGB) => css(mix(c, NIGHT_TINT, night * 0.55));
    const wrap = (x: number) => ((Math.floor(x) % L) + L) % L;

    const key = v.hour.toFixed(2);
    if (Math.abs(Number(key) - Number(this.skyKey || -9)) > 0.04) {
      this.paintSky(pal);
      this.skyKey = key;
    }
    b.drawImage(this.sky, 0, 0);

    if (bi.stars && night > 0.05) {
      b.fillStyle = "#ffffff";
      for (const s of this.stars) {
        const a = night * (0.5 + 0.5 * Math.sin(v.time * 1.5 + s.p));
        if (a < 0.15) continue;
        b.globalAlpha = a;
        b.fillRect(s.x, s.y, 1, 1);
      }
      b.globalAlpha = 1;
    }

    if (bi.sun) {
      const h = v.hour;
      const sunUp = h >= 5.8 && h <= 19.2;
      const prog = sunUp ? (h - 5.8) / 13.4 : ((h - 19.2 + 24) % 24) / 10.6;
      const cx = Math.round(bw * (0.08 + 0.84 * prog) - v.parX * 0.2);
      const cy = Math.round(bh * 0.62 - Math.sin(Math.PI * prog) * bh * 0.48);
      disc(b, cx, cy, sunUp ? 6 : 5, sunUp ? "#ffe9a3" : "#eef0ff");
      if (!sunUp) {
        b.fillStyle = "#c9cde6";
        b.fillRect(cx - 2, cy - 1, 2, 2);
        b.fillRect(cx + 1, cy + 2, 1, 1);
      }
    } else {
      // Under the sea: shimmering light rays from the surface.
      b.fillStyle = css(pal.cloud);
      for (let k = 0; k < 6; k++) {
        b.globalAlpha = 0.07 * (1 - night * 0.7);
        const x0 = ((k * bw) / 5 + Math.sin(v.time * 0.4 + k) * 6 - v.parX * 0.3) % bw;
        for (let y = 0; y < bh * 0.6; y++) b.fillRect(Math.round(x0 + y * 0.35), y, 3 + (k % 2), 1);
      }
      b.globalAlpha = 1;
    }

    if (bi.clouds) {
      b.fillStyle = css(pal.cloud);
      b.globalAlpha = 0.85 - night * 0.45;
      for (const c of this.clouds) {
        const x = Math.round((((c.x - v.time * 1.5 - v.cam * 0.05 - v.parX * 0.1) % L) + L) % L);
        for (const ox of [x, x - L]) {
          if (ox > bw || ox + c.w < 0) continue;
          b.fillRect(ox, Math.round(c.y + 2), c.w, 3);
          b.fillRect(ox + 3, Math.round(c.y), c.w - 7, 2);
          b.fillRect(ox + 2, Math.round(c.y + 5), c.w - 4, 1);
        }
      }
      b.globalAlpha = 1;
    }

    this.drawFlyers(b, night, bi.flyers !== "fish");

    // ---- far layer ----
    const offFar = v.cam * 0.12 + v.parX * 0.25;
    const pyFar = Math.round(v.parY * 0.25);
    if (bi.far === "sea") {
      const top = this.farH[0] + pyFar;
      b.fillStyle = css(pal.far);
      b.fillRect(0, top, bw, bh - top);
      b.fillStyle = css(mix(pal.far, pal.cloud, 0.45));
      for (let y = top + 1; y < top + bh * 0.24; y += 2) {
        for (let x = 0; x < bw; x += 2) {
          if (Math.sin(x * 0.21 + y * 1.7 + v.time * 1.3 + offFar * 0.2) > 0.94) b.fillRect(x, y, 2, 1);
        }
      }
    } else {
      const peak = Math.min(...this.farH);
      const snow = css(mix(hex("#f4f6ff"), NIGHT_TINT, night * 0.6));
      const strata = css(mix(pal.far, NIGHT_TINT, 0.25));
      for (let x = 0; x < bw; x++) {
        const top = this.farH[wrap(x + offFar)] + pyFar;
        b.fillStyle = css(pal.far);
        b.fillRect(x, top, 1, bh - top);
        if (bi.snowcaps && top < peak + bh * 0.05) {
          b.fillStyle = snow;
          b.fillRect(x, top, 1, 2);
        }
        if (bi.far === "mesas") {
          b.fillStyle = strata;
          b.fillRect(x, top + 3, 1, 1);
          b.fillRect(x, top + 8, 1, 1);
        }
      }
    }

    // ---- mid layer ----
    if (bi.mid !== "none") {
      const offMid = v.cam * 0.35 + v.parX * 0.55;
      const pyMid = Math.round(v.parY * 0.55);
      b.fillStyle = css(pal.mid);
      for (let x = 0; x < bw; x++) {
        const top = this.midH[wrap(x + offMid)] + pyMid;
        b.fillRect(x, top, 1, bh - top);
      }
      this.drawTrees(b, pal, night, offMid, pyMid, v.time);
    }

    // ---- near ground ----
    const offNear = v.cam + v.parX;
    const py = Math.round(v.parY);
    for (let x = 0; x < bw; x++) {
      const top = this.nearH[wrap(x + offNear)] + py;
      b.fillStyle = css(pal.dirt);
      b.fillRect(x, top + 2, 1, bh - top);
      b.fillStyle = css(pal.ground);
      b.fillRect(x, top + 1, 1, 2);
      b.fillStyle = css(pal.groundTop);
      b.fillRect(x, top, 1, 1);
      if (((x + Math.floor(offNear)) * 7) % 13 === 0) {
        b.fillStyle = css(mix(pal.dirt, NIGHT_TINT, 0.3));
        b.fillRect(x, top + 5 + (x % 3), 2, 1);
      }
    }
    const screenX = (wx: number) => {
      let x = wx - (offNear % L);
      if (x < -PROP_W) x += L;
      return Math.round(x);
    };

    for (const d of this.decor) {
      const x = screenX(d.x);
      if (x < -2 || x >= bw) continue;
      const gy = this.groundAt(d.x, v.parY);
      switch (d.kind) {
        case "flowers":
          b.fillStyle = css(pal.ground);
          b.fillRect(x, gy - 1, 1, 1);
          b.fillStyle = shade(d.c);
          b.fillRect(x, gy - 2, 1, 1);
          break;
        case "tuft":
          b.fillStyle = css(pal.groundTop);
          b.fillRect(x, gy - 1, 1, 1);
          break;
        case "shells":
        case "stones":
          b.fillStyle = shade(d.c);
          b.fillRect(x, gy, d.kind === "stones" ? 2 : 1, 1);
          break;
        case "leaves":
          b.fillStyle = shade(d.c);
          b.fillRect(x, gy, 1, 1);
          break;
        case "coral":
          b.fillStyle = shade(d.c);
          b.fillRect(x, gy - 2, 1, 2);
          b.fillRect(x - 1, gy - 3, 1, 1);
          b.fillRect(x + 1, gy - 3, 1, 2);
          break;
        case "mushroom":
          b.fillStyle = shade(hex("#f2ece0"));
          b.fillRect(x + 1, gy - 1, 1, 1);
          b.fillStyle = shade(hex("#d8342a"));
          b.fillRect(x, gy - 2, 3, 1);
          break;
      }
    }

    const pctx: PropCtx = { b, night, time: v.time, shade, smoke: this.smoke, leaf: pal.tree };
    for (const [type, at] of bi.props) {
      const wx = Math.round(at * L);
      const x = screenX(wx);
      if (x < -PROP_W || x > bw + PROP_W) continue;
      PROPS[type](pctx, x, this.groundAt(wx, v.parY));
    }

    if (bi.flyers === "fish") this.drawFlyers(b, night, false, true);

    if (night > 0.4 && bi.weather !== "bubbles" && bi.weather !== "snow") {
      b.fillStyle = "#ffe36a";
      for (const f of this.flies) {
        const a = Math.max(0, Math.sin(v.time * 1.3 + f.p)) * night;
        if (a < 0.2) continue;
        b.globalAlpha = a;
        b.fillRect(Math.round(f.x), Math.round(f.y + py), 1, 1);
      }
      b.globalAlpha = 1;
    }
  }

  /** Weather is drawn last, in front of everything (including the crab). */
  drawWeather(b: CanvasRenderingContext2D, hour: number): void {
    const bi = this.biome;
    if (bi.weather === "none") return;
    const night = nightAt(hour);
    const leafCols = ["#e0582a", "#f2a33a", "#c23b2a", "#f7d04a"];
    for (const w of this.weather) {
      const x = Math.round(w.x);
      const y = Math.round(w.y);
      if (bi.weather === "snow") {
        b.globalAlpha = 0.9 - night * 0.3;
        b.fillStyle = "#ffffff";
        b.fillRect(x, y, w.v > 1.1 ? 2 : 1, 1);
      } else if (bi.weather === "leaves") {
        b.globalAlpha = 1;
        b.fillStyle = css(mix(hex(leafCols[w.c]), NIGHT_TINT, night * 0.5));
        b.fillRect(x, y, 2, 1);
        if (Math.sin(w.p * 3) > 0) b.fillRect(x + 1, y + 1, 1, 1);
      } else {
        b.globalAlpha = 0.55;
        b.fillStyle = "#d8f6ff";
        if (w.v > 1.1) {
          b.fillRect(x, y - 1, 1, 1);
          b.fillRect(x - 1, y, 1, 1);
          b.fillRect(x + 1, y, 1, 1);
          b.fillRect(x, y + 1, 1, 1);
        } else b.fillRect(x, y, 1, 1);
      }
    }
    b.globalAlpha = 1;
  }

  private drawTrees(b: CanvasRenderingContext2D, pal: Palette, night: number, offMid: number, pyMid: number, time: number): void {
    const bi = this.biome;
    const L = this.L;
    const snow = css(mix(hex("#f4f8ff"), NIGHT_TINT, night * 0.5));
    const canopy = [pal.tree, ...(bi.treeColors ?? []).map((c) => mix(hex(c), NIGHT_TINT, night * 0.6))];
    for (const t of this.trees) {
      let x = t.x - (offMid % L);
      if (x < -8) x += L;
      if (x > this.bw + 8) continue;
      const xi = Math.round(x);
      const base = this.midH[t.x] + pyMid + 1;
      switch (bi.mid) {
        case "pines":
        case "snowpines":
          b.fillStyle = css(pal.tree);
          b.fillRect(xi, base - 2, 1, 2);
          for (let i = 0; i < t.h; i++) {
            const half = Math.floor((t.h - i) / 2.2);
            b.fillStyle = css(pal.tree);
            b.fillRect(xi - half, base - 2 - i, half * 2 + 1, 1);
            if (bi.mid === "snowpines" && i % 2 === 1) {
              b.fillStyle = snow;
              b.fillRect(xi - half, base - 2 - i, 1, 1);
              b.fillRect(xi + half, base - 2 - i, 1, 1);
            }
          }
          if (bi.mid === "snowpines") {
            b.fillStyle = snow;
            b.fillRect(xi, base - 1 - t.h, 1, 1);
          }
          break;
        case "roundtrees": {
          b.fillStyle = css(mix(hex("#5a3a24"), NIGHT_TINT, night * 0.5));
          b.fillRect(xi, base - 4, 1, 4);
          const r = 2 + (t.h % 3);
          disc(b, xi, base - 4 - r, r, css(canopy[t.c % canopy.length]));
          break;
        }
        case "dunes":
          b.fillStyle = css(pal.tree);
          b.fillRect(xi, base - 5, 1, 5);
          b.fillRect(xi - 2, base - 4, 1, 2);
          b.fillRect(xi - 1, base - 3, 1, 1);
          b.fillRect(xi + 2, base - 3, 1, 2);
          b.fillRect(xi + 1, base - 2, 1, 1);
          break;
        case "seaweed":
          b.fillStyle = css(pal.tree);
          for (let i = 0; i < t.h + 4; i++) {
            const sway = Math.round(Math.sin(time * 1.4 + i * 0.35 + t.phase) * (i / (t.h + 4)) * 2);
            b.fillRect(xi + sway, base - 1 - i, 1, 1);
          }
          break;
      }
    }
  }

  private drawFlyers(b: CanvasRenderingContext2D, night: number, sky: boolean, fish = false): void {
    const bi = this.biome;
    if (sky === fish) return;
    const fishCols = ["#ffa24a", "#ffe066", "#7fd3ff"];
    for (const f of this.flyers) {
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      if (bi.flyers === "fish") {
        const dir = f.v > 0 ? 1 : -1;
        b.fillStyle = css(mix(hex(fishCols[f.c]), NIGHT_TINT, night * 0.5));
        b.fillRect(x, y, 3, 2);
        b.fillRect(x - dir * 1, y + (Math.sin(f.phase) > 0 ? 0 : 1), 1, 1);
        b.fillStyle = "#1d1a17";
        b.fillRect(x + (dir > 0 ? 2 : 0), y, 1, 1);
      } else {
        if (night > 0.6) continue;
        const up = Math.sin(f.phase) > 0;
        b.fillStyle = bi.flyers === "gulls" ? "#ffffff" : "#2a2a3a";
        b.fillRect(x, y, 1, 1);
        b.fillRect(x - 1, y - (up ? 1 : 0), 1, 1);
        b.fillRect(x + 1, y - (up ? 1 : 0), 1, 1);
        if (bi.flyers === "gulls") {
          b.fillRect(x - 2, y - (up ? 1 : 0), 1, 1);
          b.fillRect(x + 2, y - (up ? 1 : 0), 1, 1);
        }
      }
    }
  }
}

