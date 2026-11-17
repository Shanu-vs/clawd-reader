// Small toolkit shared by the pixel world: colours, seeded randomness and pixel shapes.

export type RGB = [number, number, number];

export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const LAMP = hex("#ffd96a");
export const NIGHT_TINT = hex("#141a36");

/** Deterministic random numbers, so a location looks the same every visit. */
export function rng(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Looping height line (wraps seamlessly at L). */
export function ridge(r: () => number, L: number, base: number, amp: number, freqs: number[], sharp = 1): number[] {
  const ph = freqs.map(() => r() * Math.PI * 2);
  const out: number[] = new Array(L);
  for (let x = 0; x < L; x++) {
    let v = 0;
    freqs.forEach((k, i) => (v += Math.sin((x / L) * Math.PI * 2 * k + ph[i]) / (i + 1)));
    v = Math.sign(v) * Math.abs(v) ** sharp;
    out[x] = Math.round(base - v * amp);
  }
  return out;
}

export function disc(b: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  b.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    b.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

export function glow(b: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number, color: RGB = LAMP): void {
  const prev = b.globalAlpha;
  b.globalAlpha = prev * alpha * 0.6;
  disc(b, cx, cy, r, css(color));
  b.globalAlpha = prev * alpha;
  disc(b, cx, cy, Math.ceil(r / 2), css(color));
  b.globalAlpha = prev;
}

/** Draw a sprite given as strings, one character per pixel ("." = transparent). */
export function sprite(
  b: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  colors: Record<string, string>,
): void {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === "." || !colors[ch]) continue;
      b.fillStyle = colors[ch];
      b.fillRect(x + c, y + r, 1, 1);
    }
  }
}
