// Møte med ein fiende: dialog, og val av korleis du vil kome forbi.

import { KIND_STYLE, Outcome } from "../model/approaches.js";
import { Scene } from "./base.js";
import { BattleScene } from "./battle.js";
import { MINIGAMES } from "./minigames.js";
import { CONFIRM, DOWN, TypeWriter, UP, drawHud, wrap } from "./ui.js";

const BUBBLE_W = 40;

export class EncounterScene extends Scene {
  constructor(game, enemy, stage) {
    super(game);
    this.enemy = enemy;
    this.stage = stage;
    this.music = enemy.isBoss ? "boss" : "battle";
    this.approaches = enemy.approaches();
    this.used = new Set();
    this.sel = 0;
    this.phase = "intro";
    this.speech = new TypeWriter(enemy.intro, BUBBLE_W - 4);
    this.narration = null;
    this.outcome = null;
    this.moodT = 0;
    this.busy = false;
    this.leaving = false;
  }

  enter() {
    this.sound.play("whoosh");
  }

  // ------------------------------------------------------------ handlingar
  startBattle() {
    this.busy = true;
    this.pushChild(new BattleScene(this.game, this.enemy), (result) => this.afterBattle(result));
  }

  startMinigame(key, callback) {
    this.busy = true;
    this.pushChild(new MINIGAMES[key](this.game, this.player, this.enemy), callback);
  }

  afterBattle(result) {
    if (result === "won") {
      this.showOutcome(new Outcome({ success: true, speech: this.enemy.fightWon,
        lines: [`Du slo ${this.enemy.name}! Vegen vidare er open.`] }));
    } else {
      this.showOutcome(new Outcome({ success: true, speech: this.enemy.fightLost, mood: "bad",
        lines: ["Du tapte kampen, men kjem deg vidare med 1 HP. Det blir tøft mot rektor..."] }));
    }
  }

  showOutcome(outcome) {
    this.busy = false;
    this.outcome = outcome;
    this.phase = "outcome";
    this.speech = new TypeWriter(outcome.speech, BUBBLE_W - 4);
    this.narration = new TypeWriter(outcome.lines.join(" "), 74, 70);
    this.moodT = 0.6;
    if (outcome.mood === "good") {
      this.sound.play("win");
      this.fx.burst(20, 6, 30, "*+·★", ["gold", "yellow", "lime", "white"], 20, 0.9);
    } else {
      this.sound.play(outcome.gameOver ? "lose" : "hurt");
      this.r.shake(2, 0.35);
      this.r.flash("darkred", 0.1);
      if (outcome.hpLost) this.fx.text(62, 22, `-${outcome.hpLost} HP`, "red", 1.4);
    }
  }

  finishOutcome() {
    const o = this.outcome;
    if (o.gameOver) {
      this.game.gameOver(o.gameOver, o.gameOverTitle);
    } else if (!this.player.alive) {
      this.game.gameOver(`Du svima av framfor ${this.enemy.name}. Nokon ringde helsesjukepleiaren.`);
    } else if (o.success) {
      this.game.stageCleared();
    } else {
      this.phase = "menu";
      this.speech = new TypeWriter("Noko meir du vil prøve deg på?", BUBBLE_W - 4);
      this.selectNext();
      this.outcome = null;
    }
  }

  selectNext() {
    for (let i = 0; i < this.approaches.length; i++) {
      const j = (this.sel + i) % this.approaches.length;
      if (!this.used.has(j)) {
        this.sel = j;
        return;
      }
    }
  }

  // ------------------------------------------------------------ input
  handleKey(key) {
    if (this.busy) return;
    if (this.phase === "intro") {
      if (!CONFIRM.has(key)) return;
      if (!this.speech.done) this.speech.skip();
      else {
        this.phase = "menu";
        this.sound.play("confirm");
      }
    } else if (this.phase === "menu") {
      if (UP.has(key) || DOWN.has(key)) {
        const step = UP.has(key) ? -1 : 1;
        const n = this.approaches.length;
        for (let i = 0; i < n; i++) {
          this.sel = (this.sel + step + n) % n;
          if (!this.used.has(this.sel)) break;
        }
        this.sound.play("select");
      } else if (CONFIRM.has(key)) {
        if (!this.speech.done) {
          this.speech.skip();
          return;
        }
        this.sound.play("confirm");
        this.used.add(this.sel);
        this.approaches[this.sel].start(this);
      }
    } else if (this.phase === "outcome" && this.outcome && CONFIRM.has(key)) {
      if (!(this.speech.done && this.narration.done)) {
        this.speech.skip();
        this.narration.skip();
      } else if (!this.leaving) {
        this.sound.play("select");
        if (this.outcome.success || this.outcome.gameOver) this.leaving = true;
        this.finishOutcome();
      }
    }
  }

  update(dt) {
    super.update(dt);
    this.speech.update(dt);
    if (this.narration) this.narration.update(dt);
    this.moodT = Math.max(0, this.moodT - dt);
  }

  // ------------------------------------------------------------ teikning
  draw(r) {
    const enemy = this.enemy;
    r.center(0, `── ${enemy.location} ──`, "grey");
    const slide = Math.max(0, 1 - this.t / 0.5);
    const px = 1 - Math.floor(slide * 40);
    const jiggle = this.moodT > 0 && Math.floor(this.t * 20) % 2 === 0 ? 1 : 0;
    enemy.art.forEach((line, i) => r.text(px + jiggle, 1 + i, line, enemy.color, { bold: true }));

    const bx = 80 - BUBBLE_W - 1;
    r.text(bx, 1, enemy.name.toUpperCase(), enemy.color, { bold: true });
    r.text(bx + enemy.name.length + 1, 1, `· ${enemy.title}`, "grey");
    r.box(bx, 2, BUBBLE_W, 10, "white", { style: "round" });
    r.text(bx - 1, 6, "◀", "white", { bold: true });
    this.speech.draw(r, bx + 2, 3, "white", 8);

    const blink = Math.floor(this.t * 2) % 2 === 0;
    if (this.phase === "outcome" && this.narration) {
      const color = this.outcome && this.outcome.mood === "good" ? "lime" : "orange";
      r.box(0, 13, 80, 9, color, { style: "round", title: "Kva skjedde" });
      this.narration.draw(r, 2, 15, "white", 5);
      if (this.speech.done && this.narration.done && blink) r.text(66, 20, "▼ ENTER", "yellow", { bold: true });
    } else {
      const active = this.phase === "menu";
      r.box(0, 13, 80, 9, active ? "yellow" : "dark", { style: "round", title: `Korleis vil du kome forbi ${enemy.name}?` });
      this.approaches.forEach((ap, i) => {
        const y = 14 + i;
        const used = this.used.has(i);
        const [tag, tagColor] = KIND_STYLE[ap.kind];
        const selected = active && i === this.sel;
        r.text(2, y, selected ? "▶" : " ", "yellow", { bold: true });
        const padded = tag.padStart(Math.floor((11 + tag.length) / 2)).padEnd(11);
        r.text(4, y, `[${padded}]`, used ? "dark" : tagColor, { bold: !used });
        r.text(19, y, ap.label, used ? "dark" : selected ? "yellow" : "white", { bold: selected });
        if (used) r.text(62, y, "(prøvd)", "dark");
        else {
          const [info, infoColor] = ap.info(this.player);
          r.text(62, y, info, infoColor, { bold: true });
        }
      });
      if (active) {
        wrap(this.approaches[this.sel].description, 74).slice(0, 2).forEach((line, j) => r.text(3, 19 + j, line, "light"));
      } else if (this.speech.done && blink) {
        r.text(66, 20, "▼ ENTER", "yellow", { bold: true });
      }
    }

    r.text(0, 22, "↑↓ vel · ENTER stadfest · ESC pause", "grey");
    drawHud(r, this.player, 23);
    this.fx.draw(r);
  }
}
