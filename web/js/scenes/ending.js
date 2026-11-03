// Game over og siger (vitnemål med fyrverkeri).

import { RAINBOW } from "../engine/screen.js";
import { STAT_INFO } from "../model/stats.js";
import { Scene } from "./base.js";
import { ENTER, bigWidth, drawBig, wrap } from "./ui.js";

function summary(game) {
  const p = game.player;
  if (!p) return [];
  const total = game.level.stages.length;
  return [
    [`Kroner samla: ${p.record.kroner}`, "gold"],
    [`Ting funne: ${p.record.ting}`, "cyan"],
    [`Skade gjort: ${p.record.skade}`, "red"],
    [`Kom til etappe ${Math.min(game.stageIndex + 1, total)} av ${total}`, "sky"],
  ];
}

export class GameOverScene extends Scene {
  constructor(game, reason, title = "GAME OVER") {
    super(game);
    this.music = "";
    this.pausable = false;
    this.reason = reason;
    this.title = title;
  }

  enter() {
    this.sound.play(this.title === "GAME OVER" ? "lose" : "expel");
    this.r.shake(2, 0.5);
  }

  handleKey(key) {
    if (this.t < 1) return;
    if (ENTER.has(key)) {
      this.sound.play("confirm");
      this.game.newRun();
    } else if (key === "t" || key === "T" || key === "ESC") {
      this.game.toTitle();
    }
  }

  update(dt) {
    super.update(dt);
    if (this.rng.random() < dt * 20) this.fx.burst(this.rng.uniform(0, 80), 0, 1, "|!:.", ["red", "darkred"], 1, 1.6, 12);
  }

  draw(r) {
    this.fx.draw(r);
    const jitter = this.t < 1.2 ? this.rng.randint(-2, 2) : 0;
    const x = Math.floor((80 - bigWidth(this.title)) / 2) + jitter;
    drawBig(r, 3, this.title, (cx, cy) => ((cx + cy + Math.floor(this.t * 10)) % 7 ? "red" : "darkred"), x);
    wrap(this.reason, 66).slice(0, 3).forEach((line, i) => r.center(10 + i, line, "white", { bold: true }));
    summary(this.game).forEach(([text, color], i) => r.center(14 + i, text, color));
    if (this.t > 1) r.center(20, "ENTER = prøv igjen  ·  T = tittelskjermen", "yellow", { bold: true });
  }
}

export class VictoryScene extends Scene {
  constructor(game) {
    super(game);
    this.music = "victory";
    this.pausable = false;
    this.nextFirework = 0.2;
  }

  enter() {
    this.sound.play("win");
  }

  handleKey(key) {
    if (this.t < 1.5) return;
    if (ENTER.has(key)) {
      this.sound.play("confirm");
      this.game.newRun();
    } else if (key === "t" || key === "T" || key === "ESC") {
      this.game.toTitle();
    }
  }

  update(dt) {
    super.update(dt);
    this.nextFirework -= dt;
    if (this.nextFirework <= 0) {
      const rng = this.rng;
      this.nextFirework = rng.uniform(0.25, 0.7);
      const x = rng.random() < 0.5 ? rng.uniform(3, 18) : rng.uniform(62, 77);
      const colors = rng.choice([["gold", "yellow"], ["magenta", "pink"], ["cyan", "sky"], ["lime", "green"]]);
      this.fx.burst(x, rng.uniform(2, 12), 28, "*+·.", [...colors, "white"], 18, 1.2, 5);
      if (rng.random() < 0.5) this.sound.play("hat");
    }
  }

  draw(r) {
    const p = this.player;
    this.fx.draw(r);
    const shift = Math.floor(this.t * 12);
    drawBig(r, 1, "VITNEMÅL", (x) => RAINBOW[(x + shift) % RAINBOW.length]);
    r.box(16, 7, 48, 14, "gold", { style: "double", fill: true });
    r.center(8, "AMALIE SKRAM VIDAREGÅANDE SKULE", "gold", { bold: true });
    r.center(9, "─".repeat(30), "gold");
    r.center(10, "Det blir med dette stadfesta at", "light");
    r.center(11, p.name.toUpperCase(), "white", { bold: true });
    r.center(12, "har fullført og bestått vidaregåande opplæring.", "light");
    let x = 22;
    for (const [name, value] of p.stats.entries()) {
      const s = `${STAT_INFO[name].label}: ${value}`;
      r.text(x, 14, s, STAT_INFO[name].color, { bold: true });
      x += s.length + 3;
    }
    r.center(15, `Helse att: ${p.hp}/${p.maxHp}  ·  Kroner att: ${p.money}`, "lime");
    r.center(16, `Samla ${p.record.kroner} kr · ${p.record.ting} ting · ${p.record.skade} skade`, "grey");
    r.text(40, 18, "Lars, rektor (motvillig)", "purple");
    r.text(40, 19, "~".repeat(23), "purple");
    if (this.t > 1.5) r.center(22, "Gratulerer! ENTER = spel igjen  ·  T = tittelskjermen", "yellow", { bold: true });
  }
}
