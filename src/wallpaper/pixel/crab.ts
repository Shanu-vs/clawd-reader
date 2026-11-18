// Claw'd, the Claude crab: a flat, blocky terracotta critter with square eyes, stubby side arms
// and four legs. Drawn on a 12x8 grid to match the original character art.
//
// Animations: legs step in pairs while walking, blinking, glancing left/right,
// a friendly arm wave now and then, both arms up when it hops (click), and sleepy z's at night.
import { css, glow, hex, mix, NIGHT_TINT } from "./kit";

export const CRAB_W = 12;
export const CRAB_H = 8;

// Body is 8x6 starting at column 2. Eyes sit on row 1 at columns 3 and 8.
const BODY = [
  "..oooooooo..",
  "..oooooooo..",
  "..oooooooo..",
  "..oooooooo..",
  "..oooooooo..",
  "..oooooooo..",
];
const LEG_COLS = [2, 4, 7, 9];
const EYES = [3, 8];

const ORANGE = hex("#d97757");
const EYE = hex("#000000");

type ArmPose = "down" | "up";

export class Crab {
  private walk = 0;
  private blinkIn = 3;
  private blinking = 0;
  private waveIn = 7;
  private waving = 0;
  private lookIn = 4;
  private look = 0;
  private hopY = 0;
  private hopV = 0;
  private still = 0;
  private zzz = 0;

  hop(): void {
    if (this.hopY === 0) this.hopV = -30;
  }

  /** A long, happy wave (used for fireworks). */
  wave(): void {
    this.waving = 2.4;
    this.waveIn = 8 + Math.random() * 6;
  }

  update(dt: number, speed: number): void {
    const moving = speed > 0.05;
    this.walk += dt * (moving ? 3 + speed * 0.5 : 0);
    this.still = moving ? 0 : this.still + dt;
    this.zzz += dt;

    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinking = 0.14;
      this.blinkIn = 2.5 + Math.random() * 4;
    }
    this.blinking = Math.max(0, this.blinking - dt);

    this.waveIn -= dt;
    if (this.waveIn <= 0) {
      this.waving = 1.2;
      this.waveIn = 6 + Math.random() * 8;
    }
    this.waving = Math.max(0, this.waving - dt);

    this.lookIn -= dt;
    if (this.lookIn <= 0) {
      this.look = this.look === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      this.lookIn = this.look === 0 ? 3 + Math.random() * 5 : 0.8 + Math.random();
    }

    if (this.hopV !== 0 || this.hopY < 0) {
      this.hopV += 110 * dt;
      this.hopY = Math.min(0, this.hopY + this.hopV * dt);
      if (this.hopY === 0) this.hopV = 0;
    }
  }

  /** x = left edge, groundY = the row the feet stand on. */
  draw(b: CanvasRenderingContext2D, x: number, groundY: number, night: number, moving: boolean): void {
    const hopping = this.hopY < 0;
    const step = Math.floor(this.walk) % 2;
    const bob = 0; // the legs do the stepping; the body stays level like the original art
    const top = groundY - CRAB_H + Math.round(this.hopY);
    const body = css(mix(ORANGE, NIGHT_TINT, night * 0.35));
    const asleep = this.still > 8 && night > 0.6;

    // Soft shadow on the ground.
    b.globalAlpha = hopping ? 0.12 : 0.22;
    b.fillStyle = "#000";
    b.fillRect(x + 2, groundY, CRAB_W - 4, 1);
    b.globalAlpha = 1;

    if (night > 0.5) glow(b, x + 6, top + 3, 7, night * 0.08, hex("#ffb38f"));

    b.fillStyle = body;

    // Body.
    for (let r = 0; r < BODY.length; r++) b.fillRect(x + 2, top + r + bob, 8, 1);

    // Arms: rows 2-3 at rest; raised for a hop; one waves now and then.
    const waveUp = this.waving > 0 && Math.floor(this.waving * 5) % 2 === 0;
    const left: ArmPose = hopping || waveUp ? "up" : "down";
    const right: ArmPose = hopping ? "up" : "down";
    const armRow = (pose: ArmPose) => (pose === "up" ? 0 : 2);
    b.fillRect(x, top + armRow(left) + bob, 2, 2);
    b.fillRect(x + 10, top + armRow(right) + bob, 2, 2);

    // Legs: pairs take turns lifting while walking.
    for (let i = 0; i < LEG_COLS.length; i++) {
      const lifted = moving && !hopping && (i % 2 === step);
      b.fillRect(x + LEG_COLS[i], top + 6, 1, lifted ? 1 : 2);
    }

    // Eyes: blink, glance, or close while asleep.
    if (this.blinking <= 0 && !asleep) {
      b.fillStyle = css(EYE);
      for (const col of EYES) b.fillRect(x + col + this.look, top + 1 + bob, 1, 1);
    }

    // Sleepy z's.
    if (asleep) {
      const t = this.zzz % 3;
      b.globalAlpha = 1 - t / 3;
      b.fillStyle = "#e8ecff";
      const zx = x + 11 + Math.round(t * 2);
      const zy = top - 3 - Math.round(t * 3);
      b.fillRect(zx, zy, 3, 1);
      b.fillRect(zx + 1, zy + 1, 1, 1);
      b.fillRect(zx, zy + 2, 3, 1);
      b.globalAlpha = 1;
    }
  }
}
