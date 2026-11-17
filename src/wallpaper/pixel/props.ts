// Scenery props for the pixel world. Each draws with its base on the ground row `gy`.
import { css, glow, hex, LAMP, sprite, type RGB } from "./kit";

export type PropType =
  | "cottage" | "cabin" | "lamp" | "sign" | "rock" | "palm" | "umbrella" | "sandcastle"
  | "lighthouse" | "snowman" | "cactus" | "pumpkin" | "well" | "chest" | "anchor" | "coral";

export interface PropCtx {
  b: CanvasRenderingContext2D;
  night: number;
  time: number;
  shade: (c: RGB) => string;
  smoke: { x: number; y: number; age: number }[];
  leaf: RGB; // biome tree colour (palm fronds etc.)
}

const lit = (ctx: PropCtx) => ctx.night > 0.3;
const S = (ctx: PropCtx, h: string) => ctx.shade(hex(h));
const place = (ctx: PropCtx, rows: string[], x: number, gy: number, colors: Record<string, string>) =>
  sprite(ctx.b, rows, x, gy - rows.length, colors);

function house(ctx: PropCtx, x: number, gy: number, roof: string, snowy: boolean): void {
  const { b } = ctx;
  const wallTop = gy - 9;
  b.fillStyle = S(ctx, "#6b4a3a");
  b.fillRect(x + 10, wallTop - 9, 2, 5);
  b.fillStyle = S(ctx, snowy ? "#a0714a" : "#d9c39a");
  b.fillRect(x, wallTop, 15, 9);
  b.fillStyle = S(ctx, roof);
  for (let i = 0; i < 8; i++) b.fillRect(x + 7 - i, wallTop - 8 + i, 2 + i * 2, 1);
  if (snowy) {
    b.fillStyle = S(ctx, "#f4f8ff");
    for (let i = 0; i < 8; i++) b.fillRect(x + 7 - i, wallTop - 8 + i, 1 + Math.min(i, 2), 1);
    b.fillRect(x - 1, wallTop - 1, 17, 1);
  }
  b.fillStyle = S(ctx, "#5a3a28");
  b.fillRect(x + 9, gy - 6, 3, 6);
  b.fillStyle = lit(ctx) ? css(LAMP) : S(ctx, "#8ac4e6");
  b.fillRect(x + 3, wallTop + 2, 3, 3);
  if (lit(ctx)) glow(b, x + 4, wallTop + 3, 7, ctx.night * 0.2);
  for (const p of ctx.smoke) {
    b.globalAlpha = (1 - p.age / 5) * 0.55;
    b.fillStyle = S(ctx, "#d0d4dc");
    const s = p.age > 2 ? 2 : 1;
    b.fillRect(Math.round(x + 10 + p.x), Math.round(wallTop - 10 + p.y), s, s);
  }
  b.globalAlpha = 1;
}

export const PROPS: Record<PropType, (ctx: PropCtx, x: number, gy: number) => void> = {
  cottage: (c, x, gy) => house(c, x, gy, "#9c3f30", false),
  cabin: (c, x, gy) => house(c, x, gy, "#6a3a2a", true),

  lamp(c, x, gy) {
    const { b } = c;
    b.fillStyle = S(c, "#3a3d4a");
    b.fillRect(x, gy - 11, 1, 11);
    b.fillRect(x - 1, gy - 12, 3, 1);
    b.fillStyle = lit(c) ? css(LAMP) : S(c, "#d8d4b0");
    b.fillRect(x - 1, gy - 14, 3, 2);
    if (lit(c)) glow(b, x, gy - 13, 10, c.night * 0.24 * (0.9 + 0.1 * Math.sin(c.time * 9)));
  },

  sign(c, x, gy) {
    const { b } = c;
    b.fillStyle = S(c, "#7a5232");
    b.fillRect(x + 2, gy - 7, 1, 7);
    b.fillStyle = S(c, "#a7743f");
    b.fillRect(x, gy - 8, 7, 3);
    b.fillStyle = S(c, "#5a3a22");
    b.fillRect(x + 1, gy - 7, 1, 1);
    b.fillRect(x + 3, gy - 7, 2, 1);
  },

  rock: (c, x, gy) => place(c, [".hrrr.", "rrrrrr", "rrrrrd"], x, gy, { r: S(c, "#8a8a96"), h: S(c, "#b0b0bc"), d: S(c, "#6a6a76") }),

  palm(c, x, gy) {
    const { b } = c;
    let tx = x;
    let ty = gy;
    for (let i = 0; i < 17; i++) {
      tx = x + Math.round(Math.sin((i / 17) * 1.3) * 4);
      ty = gy - 1 - i;
      b.fillStyle = S(c, i % 3 === 0 ? "#7a5a34" : "#9a7445");
      b.fillRect(tx, ty, 2, 1);
    }
    const sway = Math.sin(c.time * 0.8) * 0.15;
    b.fillStyle = c.shade(c.leaf);
    for (const a of [-2.7, -2.2, -1.6, -1.0, -0.45]) {
      for (let j = 1; j <= 7; j++) {
        const fx = tx + 1 + Math.round(Math.cos(a + sway) * j);
        const fy = ty + Math.round(Math.sin(a + sway) * j * 0.6 + j * j * 0.09);
        b.fillRect(fx, fy, 1, 1);
      }
    }
    b.fillStyle = S(c, "#5a3a1a");
    b.fillRect(tx, ty + 1, 1, 1);
    b.fillRect(tx + 2, ty + 1, 1, 1);
  },

  umbrella(c, x, gy) {
    const { b } = c;
    b.fillStyle = S(c, "#d8d8d8");
    b.fillRect(x + 5, gy - 10, 1, 10);
    for (let i = 0; i < 4; i++) {
      const half = 1 + Math.round(i * 1.4);
      for (let dx = -half; dx <= half; dx++) {
        b.fillStyle = S(c, Math.floor((dx + 9) / 2) % 2 ? "#e8453c" : "#fff4ea");
        b.fillRect(x + 5 + dx, gy - 13 + i, 1, 1);
      }
    }
    b.fillStyle = S(c, "#4aa3e0");
    b.fillRect(x + 7, gy - 1, 6, 1); // towel
  },

  sandcastle: (c, x, gy) =>
    place(c, ["r..........", "p..........", "s.s.....s.s", "sss.....sss", "sss.s.s.sss", "sssssssssss", "ssssdddssss", "ssssdddssss"], x, gy, {
      r: S(c, "#e8453c"), p: S(c, "#7a5a34"), s: S(c, "#e2c07a"), d: S(c, "#a07a40"),
    }),

  lighthouse(c, x, gy) {
    const { b } = c;
    b.fillStyle = S(c, "#7a7a88");
    b.fillRect(x - 2, gy - 3, 13, 3);
    for (let i = 0; i < 18; i++) {
      const w = 7 - Math.floor(i / 9);
      const off = Math.floor((9 - w) / 2);
      b.fillStyle = S(c, Math.floor(i / 3) % 2 ? "#f4f0e8" : "#d8443a");
      b.fillRect(x + off, gy - 4 - i, w, 1);
    }
    const top = gy - 22;
    b.fillStyle = S(c, "#3a3a48");
    b.fillRect(x, top + 1, 9, 1);
    b.fillStyle = lit(c) ? css(LAMP) : S(c, "#a8d8f0");
    b.fillRect(x + 2, top - 2, 5, 3);
    b.fillStyle = S(c, "#b8382e");
    for (let i = 0; i < 3; i++) b.fillRect(x + 2 + i, top - 3 - i, 5 - i * 2, 1);
    if (lit(c)) {
      glow(b, x + 4, top - 1, 6, c.night * 0.3);
      const swing = Math.cos(c.time * 0.7);
      const len = Math.round(Math.abs(swing) * 46);
      b.globalAlpha = c.night * 0.22;
      b.fillStyle = css(LAMP);
      if (swing > 0) b.fillRect(x + 7, top - 2, len, 3);
      else b.fillRect(x + 2 - len, top - 2, len, 3);
      b.globalAlpha = 1;
    }
  },

  snowman: (c, x, gy) =>
    place(c, ["..kkk..", "..kkk..", ".kkkkk.", "..www..", ".wkwkw.", ".wwnnw.", "..www..", "t.www.t", ".twwwt.", ".wwkww.", "wwwwwww", "wwwwwww", ".wwwww."], x, gy, {
      k: S(c, "#22222a"), w: S(c, "#f4f8ff"), n: S(c, "#ff8a3a"), t: S(c, "#6a4a2a"),
    }),

  cactus: (c, x, gy) =>
    place(c, ["...g...", "..ggh..", "..ggh..", "g.ggh..", "g.ggh.g", "ggggh.g", "..ggggg", "..ggh..", "..ggh..", "..ggh..", "..ggh..", "..ggh.."], x, gy, {
      g: S(c, "#4f8a4a"), h: S(c, "#6fae5a"),
    }),

  pumpkin: (c, x, gy) => place(c, ["..s..", ".ooo.", "oOoOo", ".ooo."], x, gy, { s: S(c, "#4a7a2a"), o: S(c, "#e8792a"), O: S(c, "#c85a1a") }),

  well: (c, x, gy) =>
    place(c, ["rrrrrrrrr", ".rrrrrrr.", ".p.....p.", ".p..b..p.", ".p..b..p.", ".p.....p.", "sssssssss", "sgsssgsss", "sssgsssgs"], x, gy, {
      r: S(c, "#8a3a2a"), p: S(c, "#6a4a2a"), b: S(c, "#8a8a9a"), s: S(c, "#8a8a96"), g: S(c, "#6a6a78"),
    }),

  chest(c, x, gy) {
    place(c, [".wwwww.", "wwwwwww", "ggggggg", "wwwgwww", "wwwwwww"], x, gy, { w: S(c, "#8a5a2a"), g: css(hex("#ffcf4a")) });
    if (Math.sin(c.time * 2.3) > 0.85) {
      c.b.fillStyle = "#ffffff";
      c.b.fillRect(x + 5, gy - 6, 1, 1);
    }
  },

  anchor: (c, x, gy) =>
    place(c, ["..aaa..", "..a.a..", "..aaa..", "...a...", "aaaaaaa", "...a...", "a..a..a", "aa.a.aa", ".aaaaa."], x, gy, { a: S(c, "#6a7a8a") }),

  coral: (c, x, gy) =>
    place(c, ["c.c...c", "c.c.c.c", "ccc.c.c", ".c..ccc", ".cc.c..", "..ccc..", "...c...", "...c..."], x, gy, { c: S(c, "#ff7a8a") }),
};

/** Width used to decide when a prop is on screen. */
export const PROP_W = 30;
