// Felles UI-hjelparar: tastar, HUD, stor skrift og skrivemaskintekst.

import { FONT } from "../art.js";
import { CANVAS_W } from "../config.js";
import { STAT_INFO, Stats } from "../model/stats.js";

export const UP = new Set(["UP", "w", "W"]);
export const DOWN = new Set(["DOWN", "s", "S"]);
export const LEFT = new Set(["LEFT", "a", "A"]);
export const RIGHT = new Set(["RIGHT", "d", "D"]);
export const ENTER = new Set(["ENTER"]);
export const CONFIRM = new Set(["ENTER", " "]);

/** Er tasten eit vanleg teikn som kan skrivast (ikkje ein namngitt tast)? */
export const isChar = (key) => typeof key === "string" && [...key].length === 1;

export const hpColor = (frac) => (frac > 0.6 ? "lime" : frac > 0.3 ? "yellow" : "red");

export function hpBar(r, x, y, w, hp, maxHp, label = true) {
  const frac = maxHp ? hp / maxHp : 0;
  r.bar(x, y, w, frac, hpColor(frac));
  if (label) r.text(x + w + 1, y, `${hp}/${maxHp}`, hpColor(frac), { bold: true });
}

export const statPips = (value) => "■".repeat(value) + "□".repeat(Stats.MAX - value);

/** Ei linje med namn, helse, pengar, stats og våpen. */
export function drawHud(r, player, y = 23) {
  if (!player) return;
  let x = 0;
  const name = player.name.slice(0, 12);
  r.text(x, y, name, "white", { bold: true });
  x += name.length + 1;
  r.text(x, y, "♥", "red", { bold: true });
  hpBar(r, x + 2, y, 10, player.hp, player.maxHp);
  x += 2 + 10 + 7;
  const money = `${player.money} kr`;
  r.text(x, y, money, "gold", { bold: true });
  x += money.length + 2;
  for (const [stat, value] of player.stats.entries()) {
    const info = STAT_INFO[stat];
    const s = `${info.short} ${value}`;
    r.text(x, y, s, info.color, { bold: true });
    x += s.length + 1;
  }
  x += 1;
  for (const w of player.inventory.values()) {
    if (!w.uses) continue;
    const s = `${w.glyph}${w.usesText()}`;
    r.text(x, y, s, w.color, { bold: true });
    x += s.length + 1;
  }
}

const glyphFor = (c) => FONT[c.toUpperCase()] ?? FONT[" "];

export function bigWidth(s) {
  const glyphs = [...s].map(glyphFor);
  return glyphs.reduce((sum, g) => sum + g[0].length, 0) + Math.max(0, glyphs.length - 1);
}

/** Teiknar tekst med blokkskrifta. colorFn(x, y) -> farge. */
export function drawBig(r, y, s, colorFn, x = null) {
  if (x === null) x = Math.floor((CANVAS_W - bigWidth(s)) / 2);
  let cx = x;
  for (const ch of s) {
    const glyph = glyphFor(ch);
    glyph.forEach((line, row) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] !== " ") r.text(cx + i, y + row, line[i], colorFn(cx + i, y + row), { bold: true });
      }
    });
    cx += glyph[0].length + 1;
  }
}

/** Bryt tekst i linjer (som Python sin textwrap.wrap). */
export function wrap(text, width) {
  const lines = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (word.length > width) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, width));
        word = word.slice(width);
      }
      if (!line) line = word;
      else if (line.length + 1 + word.length <= width) line += ` ${word}`;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Tekst som kjem fram bokstav for bokstav. */
export class TypeWriter {
  constructor(text, width, cps = 55) {
    this.lines = text ? wrap(text, width) : [];
    this.total = this.lines.reduce((s, l) => s + l.length, 0);
    this.shown = 0;
    this.cps = cps;
  }

  get done() {
    return this.shown >= this.total;
  }

  skip() {
    this.shown = this.total;
  }

  update(dt) {
    this.shown = Math.min(this.total, this.shown + this.cps * dt);
  }

  draw(r, x, y, fg = "white", maxLines = 10) {
    let left = Math.floor(this.shown);
    for (const [i, line] of this.lines.slice(0, maxLines).entries()) {
      if (left <= 0) break;
      r.text(x, y + i, line.slice(0, left), fg);
      left -= line.length;
    }
  }
}
