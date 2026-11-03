// Innskriving: vel namn, og la spelet trekkje stats med ein spelautomat-effekt.

import { START_MONEY } from "../config.js";
import { Player } from "../model/player.js";
import { STAT_INFO, Stats } from "../model/stats.js";
import { Scene } from "./base.js";
import { ENTER, isChar, statPips } from "./ui.js";

const BEST = {
  styrke: "Du er sterk som ein Brann-supporter etter tap.",
  utspekulert: "Du kunne ha selt paraply til ein bergensar.",
  sexy: "Folk snur seg etter deg på Torgallmenningen.",
};
const WORST = {
  styrke: "Men du slit med å opne ein yoghurt.",
  utspekulert: "Men du gløymer alltid kva du skulle lyge om.",
  sexy: "Men du går med sandalar og sokkar. Heile året.",
};

export function flavour(stats) {
  const entries = stats.entries();
  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const worst = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  if (stats.get(best) === stats.get(worst)) return ["Du er heilt gjennomsnittleg. Det er òg ein slags superkraft."];
  return [BEST[best], WORST[worst]];
}

export class CharacterScene extends Scene {
  static MAX_NAME = 12;
  static SETTLE = 0.6;
  static GAP = 0.45;

  constructor(game) {
    super(game);
    this.music = "title";
    this.phase = "name";
    this.name = "";
    this.rerolls = 2;
    this.hero = null;
    this.rollT = 0;
    this.settled = [false, false, false, false];
    this.tickT = 0;
  }

  get wantsText() {
    return this.phase === "name";
  }

  get rolling() {
    return !this.settled.every(Boolean);
  }

  startRoll() {
    this.hero = new Player(this.name, Stats.roll(this.rng), this.rng.randint(...START_MONEY));
    this.rollT = 0;
    this.settled = [false, false, false, false];
    this.phase = "roll";
    this.sound.play("dash");
  }

  handleKey(key) {
    if (this.phase === "name") {
      if (ENTER.has(key)) {
        this.name = this.name.trim() || "Eleven";
        this.startRoll();
      } else if (key === "BACKSPACE") {
        this.name = this.name.slice(0, -1);
        this.sound.play("typekey");
      } else if (isChar(key) && this.name.length < CharacterScene.MAX_NAME) {
        this.name += key;
        this.sound.play("typekey");
      }
    } else if (this.phase === "roll" && !this.rolling) {
      if (ENTER.has(key)) {
        this.sound.play("confirm");
        this.game.startLevel(this.hero);
      } else if ((key === "r" || key === "R" || key === " ") && this.rerolls > 0) {
        this.rerolls -= 1;
        this.startRoll();
      }
    }
  }

  update(dt) {
    super.update(dt);
    if (this.phase !== "roll" || !this.rolling) return;
    this.rollT += dt;
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 0.07;
      this.sound.play("tick");
    }
    for (let i = 0; i < 4; i++) {
      if (!this.settled[i] && this.rollT >= CharacterScene.SETTLE + i * CharacterScene.GAP) {
        this.settled[i] = true;
        this.sound.play("ding");
        this.fx.burst(37, 5 + i * 2, 10, "*+·", ["gold", "yellow", "white"], 14, 0.5);
      }
    }
  }

  draw(r) {
    r.box(0, 0, 80, 24, "sky", { style: "double", title: "INNSKRIVING · AMALIE SKRAM VGS" });
    if (this.phase === "name") {
      r.center(5, "Velkomen som ny elev!", "yellow", { bold: true });
      r.center(7, "Kva heiter du?", "white");
      r.box(25, 9, 30, 3, "yellow", { style: "round" });
      const cursor = Math.floor(this.t * 3) % 2 === 0 ? "_" : " ";
      r.text(27, 10, this.name + cursor, "white", { bold: true });
      r.center(13, "Skriv namnet ditt og trykk ENTER", "grey");
      if (this.game.touch) r.center(14, "(Trykk på skjermen eller ⌨ Tastatur for å skrive)", "dark");
      r.center(16, "Stats blir trekte tilfeldig etterpå. Kvar runde blir unik!", "sky");
      return;
    }

    const hero = this.hero;
    r.center(2, `Elevkort for ${hero.name}`, "yellow", { bold: true });
    Stats.NAMES.forEach((name, i) => {
      const info = STAT_INFO[name];
      const y = 5 + i * 2;
      const value = this.settled[i] ? hero.stats.get(name) : this.rng.randint(1, Stats.MAX);
      r.text(10, y, info.label.padEnd(12), info.color, { bold: true });
      r.text(24, y, statPips(value), this.settled[i] ? info.color : "grey");
      r.text(36, y, String(value).padStart(2), "white", { bold: true });
      r.text(41, y, info.desc, "grey");
    });
    const money = this.settled[3] ? hero.money : this.rng.randint(...START_MONEY);
    r.text(10, 11, "Lommepengar", "gold", { bold: true });
    r.text(24, 11, `${money} kr`, "gold", { bold: true });
    r.text(41, 11, "Du treng meir. Mykje meir.", "grey");

    if (!this.rolling) {
      r.text(10, 13, `Helse: ${hero.maxHp} HP (24 + styrke)`, "lime");
      flavour(hero.stats).forEach((line, j) => r.center(15 + j, line, "sky"));
      r.center(19, "ENTER = start spelet", "yellow", { bold: true });
      if (this.rerolls) r.center(20, `R / MELLOMROM = trekk på nytt (${this.rerolls} att)`, "light");
    }
    this.fx.draw(r);
  }
}
