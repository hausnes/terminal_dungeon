// Teiknemotor.
//
// Renderer held eit rutenett på 80x24 teikn (som ein terminal). Scenene skriv
// tekst inn i rutenettet, og CanvasDisplay teiknar rutenettet på eit <canvas>.
// Blokk- og rammeteikn blir teikna som former, så dei heng saman utan glipper.

import { CANVAS_H, CANVAS_W } from "../config.js";

/** Gjer om ein xterm 256-fargeindeks til hex. */
export function xterm(index) {
  if (index < 16) {
    const basic = ["#000000", "#cd0000", "#00cd00", "#cdcd00", "#0000ee", "#cd00cd", "#00cdcd", "#e5e5e5",
      "#7f7f7f", "#ff0000", "#00ff00", "#ffff00", "#5c5cff", "#ff00ff", "#00ffff", "#ffffff"];
    return basic[index];
  }
  if (index >= 232) {
    const v = 8 + 10 * (index - 232);
    return `rgb(${v},${v},${v})`;
  }
  const i = index - 16;
  const level = [0, 95, 135, 175, 215, 255];
  return `rgb(${level[Math.floor(i / 36)]},${level[Math.floor(i / 6) % 6]},${level[i % 6]})`;
}

const PALETTE_INDEX = {
  white: 231, light: 252, grey: 245, dark: 240, red: 196, darkred: 124, orange: 208, yellow: 226,
  gold: 220, green: 40, lime: 118, darkgreen: 28, cyan: 51, sky: 117, blue: 33, navy: 19,
  magenta: 201, pink: 218, purple: 141, brown: 130, coffee: 137, skin: 223, black: 16,
};
export const PALETTE = Object.fromEntries(Object.entries(PALETTE_INDEX).map(([k, v]) => [k, xterm(v)]));
export const RAINBOW = [196, 202, 208, 214, 220, 226, 190, 154, 118, 82, 46, 48, 51, 45, 39, 33, 63, 93, 129, 165, 201, 199];

export function resolveColor(color) {
  if (color === null || color === undefined) return null;
  if (typeof color === "number") return xterm(color);
  return PALETTE[color] ?? color;
}

export const BOLD = 1;
export const DIM = 2;
export const UNDERLINE = 4;

const BOX = {
  single: "┌┐└┘─│",
  double: "╔╗╚╝═║",
  round: "╭╮╰╯─│",
  heavy: "┏┓┗┛━┃",
};

export class Renderer {
  constructor(rng) {
    this.rng = rng;
    this.size = CANVAS_W * CANVAS_H;
    this.ch = new Array(this.size).fill(" ");
    this.fg = new Array(this.size).fill(null);
    this.bg = new Array(this.size).fill(null);
    this.attr = new Uint8Array(this.size);
    this.sx = 0;
    this.sy = 0;
    this._shakeT = 0;
    this._shakeP = 0;
    this._flashT = 0;
    this.flashColor = null;
  }

  // ------------------------------------------------------------ effektar
  shake(power = 1, duration = 0.25) {
    this._shakeP = Math.max(this._shakeT > 0 ? this._shakeP : 0, power);
    this._shakeT = Math.max(this._shakeT, duration);
  }

  flash(color = "red", duration = 0.08) {
    this._flashT = duration;
    this._flashColorName = color;
  }

  // ------------------------------------------------------------ ramme
  beginFrame(dt) {
    this.ch.fill(" ");
    this.fg.fill(null);
    this.bg.fill(null);
    this.attr.fill(0);
    if (this._shakeT > 0) {
      this._shakeT -= dt;
      const p = this._shakeP;
      this.sx = this.rng.randint(-2 * p, 2 * p);
      this.sy = p >= 2 ? this.rng.randint(-1, 1) : 0;
    } else {
      this.sx = this.sy = 0;
    }
    if (this._flashT > 0) {
      this._flashT -= dt;
      this.flashColor = resolveColor(this._flashColorName);
    } else {
      this.flashColor = null;
    }
  }

  // ------------------------------------------------------------ teikning
  text(x, y, s, fg = "white", o = {}) {
    if (!s) return;
    x = Math.trunc(x);
    y = Math.trunc(y);
    if (y < 0 || y >= CANVAS_H) return;
    const color = resolveColor(fg);
    const bg = resolveColor(o.bg);
    const a = (o.bold ? BOLD : 0) | (o.dim ? DIM : 0) | (o.underline ? UNDERLINE : 0);
    for (let i = 0; i < s.length; i++) {
      const cx = x + i;
      if (cx < 0) continue;
      if (cx >= CANVAS_W) break;
      const idx = y * CANVAS_W + cx;
      this.ch[idx] = s[i];
      this.fg[idx] = color;
      this.bg[idx] = bg;
      this.attr[idx] = a;
    }
  }

  center(y, s, fg = "white", o = {}) {
    this.text(Math.floor((CANVAS_W - s.length) / 2), y, s, fg, o);
  }

  box(x, y, w, h, fg = "white", o = {}) {
    const [tl, tr, bl, br, hz, vt] = BOX[o.style ?? "single"];
    const bold = { bold: o.bold };
    this.text(x, y, tl + hz.repeat(w - 2) + tr, fg, bold);
    for (let i = 1; i < h - 1; i++) {
      if (o.fill) this.text(x + 1, y + i, " ".repeat(w - 2));
      this.text(x, y + i, vt, fg, bold);
      this.text(x + w - 1, y + i, vt, fg, bold);
    }
    this.text(x, y + h - 1, bl + hz.repeat(w - 2) + br, fg, bold);
    if (o.title) this.text(x + 2, y, ` ${o.title} `, o.titleFg ?? fg, { bold: true });
  }

  fill(x, y, w, h, ch = " ", fg = "white", bg = null) {
    for (let i = 0; i < h; i++) this.text(x, y + i, ch.repeat(w), fg, { bg });
  }

  bar(x, y, w, frac, fg = "green", emptyFg = "dark", full = "█", empty = "░") {
    const n = Math.max(0, Math.min(w, Math.round(frac * w)));
    this.text(x, y, full.repeat(n), fg);
    this.text(x + n, y, empty.repeat(w - n), emptyFg);
  }

  /** Teksten på skjermen som linjer – brukt av testane. */
  lines() {
    const out = [];
    for (let y = 0; y < CANVAS_H; y++) {
      out.push(this.ch.slice(y * CANVAS_W, (y + 1) * CANVAS_W).join("").trimEnd());
    }
    return out;
  }
}

// ---------------------------------------------------------------- canvas
// Rammeteikn: [venstre, høgre, opp, ned] der 1 = tynn, 2 = dobbel, 3 = tjukk
const LINES = {
  "─": [1, 1, 0, 0], "│": [0, 0, 1, 1], "┌": [0, 1, 0, 1], "┐": [1, 0, 0, 1], "└": [0, 1, 1, 0],
  "┘": [1, 0, 1, 0], "╭": [0, 1, 0, 1], "╮": [1, 0, 0, 1], "╰": [0, 1, 1, 0], "╯": [1, 0, 1, 0],
  "├": [0, 1, 1, 1], "┤": [1, 0, 1, 1], "━": [3, 3, 0, 0], "┃": [0, 0, 3, 3], "┏": [0, 3, 0, 3],
  "┓": [3, 0, 0, 3], "┗": [0, 3, 3, 0], "┛": [3, 0, 3, 0], "═": [2, 2, 0, 0], "║": [0, 0, 2, 2],
  "╔": [0, 2, 0, 2], "╗": [2, 0, 0, 2], "╚": [0, 2, 2, 0], "╝": [2, 0, 2, 0], "╪": [2, 2, 1, 1],
};
// Blokkteikn: [x, y, w, h, alpha] som del av ruta
const BLOCKS = {
  "█": [0, 0, 1, 1, 1], "▀": [0, 0, 1, 0.5, 1], "▄": [0, 0.5, 1, 0.5, 1], "▌": [0, 0, 0.5, 1, 1],
  "▐": [0.5, 0, 0.5, 1, 1], "░": [0, 0, 1, 1, 0.25], "▒": [0, 0, 1, 1, 0.5], "▓": [0, 0, 1, 1, 0.75],
  "▬": [0.05, 0.38, 0.9, 0.24, 1],
};

const FONT_STACK = 'Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';
const CELL_RATIO = 1.9; // høgd / breidd for ei rute

export class CanvasDisplay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.pad = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const hint = document.getElementById("hint");
    const hintH = hint && hint.offsetParent !== null ? hint.offsetHeight + 10 : 0;
    const availW = window.innerWidth * 0.96;
    const availH = (window.innerHeight - hintH) * 0.95;
    const cssCell = Math.max(4, Math.min(availW / (CANVAS_W + 2), availH / ((CANVAS_H + 1) * CELL_RATIO)));
    this.cw = Math.max(4, Math.floor(cssCell * dpr));
    this.chh = Math.round(this.cw * CELL_RATIO);
    this.padX = this.cw;
    this.padY = Math.round(this.chh / 2);
    this.canvas.width = this.cw * CANVAS_W + this.padX * 2;
    this.canvas.height = this.chh * CANVAS_H + this.padY * 2;
    this.canvas.style.width = `${this.canvas.width / dpr}px`;
    this.canvas.style.height = `${this.canvas.height / dpr}px`;
    // Monospace-skrift er ca. 0,6 gonger så brei som ho er høg: fyll breidda av ruta.
    this.fontSize = Math.round(Math.min(this.cw / 0.6, this.chh * 0.9));
    this.fonts = {
      normal: `${this.fontSize}px ${FONT_STACK}`,
      bold: `bold ${this.fontSize}px ${FONT_STACK}`,
    };
  }

  render(r) {
    const { ctx, cw, chh } = this;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#10101a";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(this.padX + r.sx * cw, this.padY + r.sy * chh);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let font = null;
    for (let y = 0; y < CANVAS_H; y++) {
      for (let x = 0; x < CANVAS_W; x++) {
        const i = y * CANVAS_W + x;
        const px = x * cw;
        const py = y * chh;
        if (r.bg[i]) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = r.bg[i];
          ctx.fillRect(px, py, cw, chh);
        }
        const c = r.ch[i];
        if (c === " ") continue;
        const a = r.attr[i];
        ctx.fillStyle = r.fg[i] ?? PALETTE.white;
        ctx.globalAlpha = a & DIM ? 0.55 : 1;
        const block = BLOCKS[c];
        if (block) {
          ctx.globalAlpha *= block[4];
          ctx.fillRect(px + block[0] * cw - 0.25, py + block[1] * chh - 0.25, block[2] * cw + 0.5, block[3] * chh + 0.5);
          continue;
        }
        const line = LINES[c];
        if (line) {
          this.drawLine(px, py, line, a & BOLD);
          continue;
        }
        const want = a & BOLD ? this.fonts.bold : this.fonts.normal;
        if (font !== want) {
          ctx.font = want;
          font = want;
        }
        ctx.fillText(c, px + cw / 2, py + chh / 2 + chh * 0.04);
        if (a & UNDERLINE) ctx.fillRect(px, py + chh * 0.85, cw, Math.max(1, chh * 0.06));
      }
    }
    ctx.restore();
    if (r.flashColor) {
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = r.flashColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.globalAlpha = 1;
  }

  drawLine(px, py, [l, rr, u, d], bold) {
    const { ctx, cw, chh } = this;
    const t = Math.max(1, Math.round(cw * (bold ? 0.16 : 0.12)));
    const g = Math.max(2, Math.round(cw * 0.2));
    const cx = px + cw / 2;
    const cy = py + chh / 2;
    const hseg = (x0, x1, y, th) => ctx.fillRect(Math.min(x0, x1), y - th / 2, Math.abs(x1 - x0), th);
    const vseg = (y0, y1, x, th) => ctx.fillRect(x - th / 2, Math.min(y0, y1), th, Math.abs(y1 - y0));

    const doubleH = l === 2 || rr === 2;
    const doubleV = u === 2 || d === 2;
    // Doble hjørne: teikn ytre og indre linje så dei møtest pent
    if (doubleH && doubleV && [l, rr, u, d].filter(Boolean).length === 2) {
      const sx = rr ? 1 : -1;
      const sy = d ? 1 : -1;
      const ex = sx > 0 ? px + cw : px;
      const ey = sy > 0 ? py + chh : py;
      for (const k of [-1, 1]) {
        const ox = cx + k * sx * g;
        const oy = cy + k * sy * g;
        hseg(ox - (sx * t) / 2, ex, oy, t);
        vseg(oy - (sy * t) / 2, ey, ox, t);
      }
      return;
    }
    const width = (kind) => (kind === 3 ? t * 2 : t);
    const horiz = (kind, x0, x1) => {
      if (kind === 2) {
        hseg(x0, x1, cy - g, t);
        hseg(x0, x1, cy + g, t);
      } else hseg(x0, x1, cy, width(kind));
    };
    const vert = (kind, y0, y1) => {
      if (kind === 2) {
        vseg(y0, y1, cx - g, t);
        vseg(y0, y1, cx + g, t);
      } else vseg(y0, y1, cx, width(kind));
    };
    const ext = t / 2;
    if (l) horiz(l, px, cx + ext);
    if (rr) horiz(rr, cx - ext, px + cw);
    if (u) vert(u, py, cy + ext);
    if (d) vert(d, cy - ext, py + chh);
  }
}
