// Tittelskjerm, hjelpeskjerm og pausemeny.

import { CANVAS_H, CANVAS_W } from "../config.js";
import { RAINBOW } from "../engine/screen.js";
import { Scene } from "./base.js";
import { CONFIRM, DOWN, ENTER, UP, drawBig } from "./ui.js";

export class TitleScene extends Scene {
  constructor(game) {
    super(game);
    this.music = "title";
    this.sel = 0;
    const rng = this.rng;
    this.drops = Array.from({ length: 70 }, () => [rng.uniform(0, CANVAS_W), rng.uniform(0, CANVAS_H), rng.uniform(14, 26)]);
    this.nextLightning = rng.uniform(4, 8);
    this.lightning = 0;
  }

  options() {
    return ["Start nytt spel", "Korleis spele?", `Lyd: ${this.sound.enabled ? "PÅ" : "AV"}`, "Fullskjerm"];
  }

  handleKey(key) {
    if (UP.has(key)) {
      this.sel = (this.sel + 3) % 4;
      this.sound.play("select");
    } else if (DOWN.has(key)) {
      this.sel = (this.sel + 1) % 4;
      this.sound.play("select");
    } else if (CONFIRM.has(key)) {
      this.sound.play("confirm");
      if (this.sel === 0) this.game.newRun();
      else if (this.sel === 1) this.game.push(new HelpScene(this.game));
      else if (this.sel === 2) this.sound.toggle();
      else this.game.toggleFullscreen();
    }
  }

  update(dt) {
    super.update(dt);
    for (const d of this.drops) {
      d[1] += d[2] * dt;
      if (d[1] >= CANVAS_H - 1) {
        this.fx.burst(d[0], CANVAS_H - 1, 2, ".", ["sky", "blue"], 6, 0.3, 10);
        d[0] = this.rng.uniform(0, CANVAS_W);
        d[1] = -this.rng.uniform(0, 4);
      }
    }
    this.lightning -= dt;
    this.nextLightning -= dt;
    if (this.nextLightning <= 0) {
      this.nextLightning = this.rng.uniform(6, 12);
      this.lightning = 0.15;
      this.r.flash("navy", 0.12);
      this.sound.play("thunder");
    }
  }

  draw(r) {
    for (const [x, y, speed] of this.drops) r.text(x, y, speed > 20 ? "|" : "'", speed > 20 ? "blue" : "navy");
    r.text(0, CANVAS_H - 1, "~".repeat(CANVAS_W), "navy");
    this.fx.draw(r);

    const shift = Math.floor(this.t * 14);
    const flash = this.lightning > 0;
    const n = RAINBOW.length;
    const mod = (v) => ((v % n) + n) % n;
    drawBig(r, 1, "TERMINAL", (x, y) => (flash ? "white" : RAINBOW[mod(x + y - shift)]));
    drawBig(r, 7, "DUNGEON", (x, y) => (flash ? "white" : RAINBOW[mod(x - y + shift)]));
    r.center(13, "~ Eit eventyr på Amalie Skram VGS i Bergen ~", "sky", { bold: true });

    r.box(27, 15, 26, 6, "blue", { style: "round", fill: true });
    this.options().forEach((opt, i) => {
      const selected = i === this.sel;
      const marker = selected && Math.floor(this.t * 3) % 2 === 0 ? "▶ " : "  ";
      r.text(30, 16 + i, marker + opt, selected ? "yellow" : "light", { bold: selected });
    });
    if (this.sound.available && !this.sound.unlocked) {
      r.center(22, "Trykk ein tast for å slå på lyden", "yellow");
    } else {
      r.center(22, "↑↓ vel · ENTER stadfest · ESC pause i spelet", "grey");
    }
  }
}

export class HelpScene extends Scene {
  static LINES = [
    ["MÅL", "yellow", "Kom deg forbi Mercedes, Alec og rektor Lars – og få vitnemålet!"],
    ["UTFORSK", "sky", "Piltastar/WASD for å gå. MELLOMROM = spurt."],
    ["", "sky", "Plukk opp pengar og ting som flyg rundt. Unngå lekser § og vikaren V."],
    ["MØTE", "pink", "Vel korleis du kjem forbi: pengar, sexy, utspekulert eller styrke."],
    ["", "pink", "Feilar du, mistar du helse og stats – men du kan prøve noko anna."],
    ["KAMP", "red", "Vel våpen med piltastane. Linjal, matpakke og kritt slår hardare."],
    ["", "red", "Tapar du ein kamp, går du vidare med 1 HP. Mot rektor: game over."],
    ["STATS", "purple", "Styrke, Utspekulert og Sexy (1–10) blir trekte tilfeldig."],
    ["TASTAR", "grey", "ESC = pause (lyd av/på, fullskjerm, til tittelskjermen)."],
  ];

  constructor(game) {
    super(game);
    this.overlay = true;
    this.pausable = false;
  }

  handleKey() {
    this.sound.play("select");
    this.game.pop();
  }

  draw(r) {
    r.box(2, 3, 76, 17, "yellow", { style: "double", title: "Korleis spele", fill: true });
    HelpScene.LINES.forEach(([head, color, text], i) => {
      r.text(5, 5 + i, head.padEnd(8), color, { bold: true });
      r.text(14, 5 + i, text, "light");
    });
    r.center(17, "Trykk ein tast for å gå tilbake", "grey");
  }
}

export class PauseScene extends Scene {
  constructor(game) {
    super(game);
    this.overlay = true;
    this.pausable = false;
  }

  handleKey(key) {
    if (ENTER.has(key) || key === "ESC") {
      this.sound.play("select");
      this.game.pop();
    } else if (key === "m" || key === "M") {
      this.sound.toggle();
    } else if (key === "f" || key === "F") {
      this.game.toggleFullscreen();
    } else if (key === "t" || key === "T") {
      this.game.toTitle();
    }
  }

  draw(r) {
    r.box(24, 7, 32, 10, "sky", { style: "double", title: "PAUSE", fill: true });
    r.text(28, 9, "ENTER / ESC  Hald fram", "white");
    r.text(28, 10, `M            Lyd ${this.sound.enabled ? "AV" : "PÅ"}`, "white");
    r.text(28, 11, "F            Fullskjerm", "white");
    r.text(28, 12, "T            Til tittelskjermen", "white");
    if (!this.sound.available) r.text(28, 14, "(Nettlesaren støttar ikkje lyd)", "grey");
  }
}
