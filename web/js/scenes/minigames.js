// Minispel. Kvart minispel er ei scene som returnerer true (klart) eller false.

import { COMPUTERS, DANCER, EYES } from "../art.js";
import { Scene } from "./base.js";
import { DOWN, ENTER, LEFT, RIGHT, UP, drawBig, isChar, wrap } from "./ui.js";

export class Minigame extends Scene {
  static COUNTDOWN = 3;

  constructor(game, player, enemy = null) {
    super(game);
    this.music = "";
    this.hero = player;
    this.enemy = enemy;
    this.phase = "intro";
    this.cd = 0;
    this.lastCd = 0;
    this.success = null;
    this.resultText = "";
    this.title = "Minispel";
    this.subtitle = "";
    this.instructions = [];
    this.color = "yellow";
  }

  // -- overstyr desse
  start() {}
  playUpdate(dt) {}
  playKey(key) {}
  drawPlay(r) {}
  extraInstructions() {
    return [];
  }

  // -- felles
  handleKey(key) {
    if (this.phase === "intro" && (ENTER.has(key) || key === " ")) {
      this.phase = "countdown";
      this.cd = Minigame.COUNTDOWN;
      this.lastCd = 0;
    } else if (this.phase === "play") {
      this.playKey(key);
    }
  }

  update(dt) {
    super.update(dt);
    if (this.phase === "countdown") {
      this.cd -= dt;
      const n = Math.ceil(this.cd);
      if (n !== this.lastCd && n > 0) {
        this.lastCd = n;
        this.sound.play("tick");
      }
      if (this.cd <= 0) {
        this.phase = "play";
        this.sound.play("confirm");
        this.start();
      }
    } else if (this.phase === "play") {
      this.playUpdate(dt);
    }
  }

  finish(success, text) {
    if (this.phase !== "play") return;
    this.phase = "result";
    this.success = success;
    this.resultText = text;
    this.sound.play(success ? "win" : "lose");
    if (success) {
      this.fx.burst(40, 10, 40, "*+·★", ["gold", "yellow", "lime", "white"], 24, 1.0);
    } else {
      this.r.shake(2, 0.4);
      this.r.flash("darkred", 0.12);
    }
    this.after(2.0, () => this.game.pop(success));
  }

  draw(r) {
    r.box(0, 0, 80, 24, this.color, { style: "double", title: this.title });
    if (this.phase === "intro") {
      r.center(2, this.subtitle, this.color, { bold: true });
      let y = 5;
      for (const text of [...this.instructions, ...this.extraInstructions()]) {
        for (const line of wrap(text, 70)) r.text(5, y++, line, "white");
        y++;
      }
      if (Math.floor(this.t * 2) % 2 === 0) r.center(21, "Trykk ENTER når du er klar!", "yellow", { bold: true });
      return;
    }
    this.drawPlay(r);
    if (this.phase === "countdown") {
      r.fill(30, 7, 20, 7);
      drawBig(r, 8, String(Math.max(1, Math.ceil(this.cd))), () => "yellow");
    } else if (this.phase === "result") {
      const color = this.success ? "lime" : "red";
      r.box(12, 6, 56, 11, color, { style: "double", fill: true });
      drawBig(r, 7, this.success ? "BRA!" : "FEIL!", () => color);
      wrap(this.resultText, 50).slice(0, 3).forEach((line, i) => r.center(13 + i, line, "white", { bold: true }));
    }
    this.fx.draw(r);
  }
}

// ====================================================================== rytme
export class RhythmMinigame extends Minigame {
  static BPM = 100;
  static DURATION = 10;
  static SPEED = 22; // ruter per sekund
  static ZONE_X = 14;
  static LANE_Y = 17;
  static LEAD_IN = 2;

  constructor(game, player, enemy) {
    super(game, player, enemy);
    this.title = "VRIKK PÅ RUMPA";
    this.subtitle = "Rektor Lars set på musikk. Vis kva du har!";
    this.color = "pink";
    this.instructions = [
      "Trykk MELLOMROM akkurat når ein ● er inne i ramma [ ].",
      "Dansen varer i 10 sekund. Bommar du ein einaste gong, eller trykkjer i utakt, er spelet over!",
    ];
    this.frame = 0;
    this.combo = 0;
  }

  get window() {
    return 0.1 + 0.012 * this.hero.stats.get("sexy");
  }

  extraInstructions() {
    return [`Sexy-staten din (${this.hero.stats.get("sexy")}) gir deg ±${Math.round(this.window * 1000)} ms slingringsmonn.`];
  }

  start() {
    const C = RhythmMinigame;
    this.period = 60 / C.BPM;
    this.pt = 0;
    this.beats = Array.from({ length: Math.floor(C.DURATION / this.period) }, (_, k) => this.period * (k + C.LEAD_IN));
    this.hit = new Set();
    this.nextHalf = 0;
  }

  playUpdate(dt) {
    this.pt += dt;
    const half = this.period / 2;
    while (this.nextHalf * half <= this.pt) {
      const idx = this.nextHalf;
      this.sound.play(idx % 2 === 0 ? "kick" : "hat");
      if (idx % 4 === 2) this.sound.play("clap");
      this.nextHalf++;
    }
    for (let i = 0; i < this.beats.length; i++) {
      if (!this.hit.has(i) && this.pt > this.beats[i] + this.window) {
        this.finish(false, "Du mista ein takt! Lars ristar på hovudet.");
        return;
      }
    }
    if (this.pt > this.beats[this.beats.length - 1] + this.window + 0.4) this.finish(true, "Perfekt takt! Lars applauderer motvillig.");
  }

  playKey(key) {
    if (key !== " ") return;
    let best = null;
    this.beats.forEach((b, i) => {
      if (this.hit.has(i)) return;
      const diff = Math.abs(this.pt - b);
      if (!best || diff < best[0]) best = [diff, i];
    });
    if (!best) return;
    const [diff, i] = best;
    if (diff <= this.window) {
      this.hit.add(i);
      this.frame ^= 1;
      this.combo++;
      const perfect = diff < this.window * 0.4;
      this.fx.text(40, 5, perfect ? "PERFEKT!" : "BRA!", perfect ? "yellow" : "lime", 0.6);
      this.fx.burst(RhythmMinigame.ZONE_X + 1, RhythmMinigame.LANE_Y, 10, "*+·", ["pink", "magenta", "white"], 14, 0.5);
    } else {
      this.finish(false, "Utakt! Du trakka i takten og rektor såg det.");
    }
  }

  drawPlay(r) {
    const C = RhythmMinigame;
    DANCER[this.frame].forEach((line, i) => r.text(34, 7 + i, line, "pink", { bold: true }));
    const playing = this.phase === "play" || this.phase === "result";
    if (playing) {
      r.text(30, 12, `Combo: ${this.combo}`, "magenta", { bold: true });
      r.text(4, 2, "Dansen:", "grey");
      r.bar(12, 2, 60, Math.min(1, this.pt / (this.beats[this.beats.length - 1] + 0.4)), "pink");
    }
    const y = C.LANE_Y;
    r.text(2, y - 1, "─".repeat(76), "dark");
    r.text(2, y + 1, "─".repeat(76), "dark");
    const pulse = this.phase === "play" && this.pt % this.period < 0.12;
    r.text(C.ZONE_X - 1, y, "[ ]", pulse ? "yellow" : "white", { bold: true });
    if (playing) {
      this.beats.forEach((b, i) => {
        if (this.hit.has(i)) return;
        const x = C.ZONE_X + (b - this.pt) * C.SPEED;
        if (x >= 2 && x < 78) r.text(Math.round(x), y, "●", "magenta", { bold: true });
      });
    }
    r.text(4, 20, "MELLOMROM i takt!", "grey");
  }
}

// ====================================================================== quiz
// Første svaralternativ er alltid det rette – rekkjefølgja blir stokka i spelet.
export const QUESTIONS = [
  ["Kva er den alminnelege foreldingsfristen for eit pengekrav i Noreg?", ["3 år", "5 år", "10 år", "1 år"]],
  ["Kva tyder det latinske prinsippet «in dubio pro reo»?", ["Tvilen skal kome den tiltalte til gode",
    "Lova gjeld ikkje bakover i tid", "Ingen kan dømmast to gonger for same sak", "Den som påstår noko, må bevise det"]],
  ["Kva heiter prinsippet om at ingen skal straffast to gonger for same forhold?",
    ["Ne bis in idem", "Lex posterior", "Pacta sunt servanda", "Habeas corpus"]],
  ["Kor gammal må ein vere for å kunne straffast i Noreg?", ["15 år", "14 år", "16 år", "18 år"]],
  ["Kva paragraf i Grunnlova handlar om ytringsfridom?", ["§ 100", "§ 1", "§ 112", "§ 49"]],
  ["Kor mange dommarar sit vanlegvis i ei avdeling i Høgsterett?", ["5", "3", "7", "11"]],
  ["Kva tyder «pacta sunt servanda»?", ["Avtalar skal haldast", "Lova er lik for alle", "Ingen straff utan lov",
    "Den nyaste lova gjeld"]],
  ["Kor lang er reklamasjonsfristen etter forbrukarkjøpslova for ting som skal vare vesentleg lenger enn to år?",
    ["5 år", "2 år", "3 år", "10 år"]],
  ["Kva heiter prinsippet om at ei nyare lov går framfor ei eldre?",
    ["Lex posterior", "Lex superior", "Lex specialis", "Lex mercatoria"]],
  ["Kva organ handsamar ofte små sivile tvistar før dei kan gå til tingretten?",
    ["Forliksrådet", "Lagmannsretten", "Sivilombodet", "Trygderetten"]],
  ["Kva for lov regulerer korleis offentleg forvaltning skal handsame saker?",
    ["Forvaltningslova", "Offentleglova", "Domstollova", "Straffeprosesslova"]],
];

export class QuizMinigame extends Minigame {
  static TIME = 20;

  constructor(game, player, enemy) {
    super(game, player, enemy);
    this.title = "«FAR MIN ER ADVOKAT!»";
    this.subtitle = "Lars: «Advokat, seier du? Då kan du sikkert svare på dette.»";
    this.color = "purple";
    this.instructions = [
      "Du får 3 vanskelege juss-spørsmål. Vel svar med ↑↓ (eller 1–4) og trykk ENTER.",
      "Du har 20 sekund per spørsmål. Eitt feil svar, og spelet er over!",
    ];
    this.hints = Math.max(0, Math.floor((player.stats.get("utspekulert") - 4) / 3));
    this.questions = this.rng.sample(QUESTIONS, 3).map(([q, options]) => {
      const [correct, ...wrong] = options;
      this.rng.shuffle(wrong);
      const shown = this.rng.shuffle([correct, ...wrong.slice(0, wrong.length - this.hints)]);
      return [q, shown, shown.indexOf(correct)];
    });
    this.qi = 0;
    this.sel = 0;
    this.qT = QuizMinigame.TIME;
    this.locked = false;
  }

  extraInstructions() {
    if (this.hints) {
      return [`Du er utspekulert (${this.hero.stats.get("utspekulert")}), så du ser gjennom ${this.hints} feil svar per spørsmål!`];
    }
    return ["(Med høgare Utspekulert hadde du fått hjelp her...)"];
  }

  start() {
    this.qT = QuizMinigame.TIME;
  }

  playUpdate(dt) {
    if (this.locked) return;
    this.qT -= dt;
    if (this.qT <= 0) this.finish(false, "Tida er ute! Lars smiler breitt.");
  }

  playKey(key) {
    if (this.locked) return;
    const options = this.questions[this.qi][1];
    if (UP.has(key)) {
      this.sel = (this.sel - 1 + options.length) % options.length;
      this.sound.play("select");
    } else if (DOWN.has(key)) {
      this.sel = (this.sel + 1) % options.length;
      this.sound.play("select");
    } else if (["1", "2", "3", "4"].includes(key) && Number(key) <= options.length) {
      this.sel = Number(key) - 1;
      this.answer();
    } else if (ENTER.has(key)) {
      this.answer();
    }
  }

  answer() {
    const [, options, correct] = this.questions[this.qi];
    if (this.sel !== correct) {
      this.finish(false, `Feil! Rett svar var «${options[correct]}».`);
      return;
    }
    this.sound.play("ding");
    this.fx.burst(10, 9 + this.sel * 2, 14, "*+·", ["lime", "white"], 14, 0.5);
    if (this.qi === this.questions.length - 1) {
      this.finish(true, "Tre av tre! Lars sveittar.");
      return;
    }
    this.locked = true;
    this.after(0.8, () => {
      this.qi++;
      this.sel = 0;
      this.qT = QuizMinigame.TIME;
      this.locked = false;
    });
  }

  drawPlay(r) {
    const [q, options, correct] = this.questions[this.qi];
    r.text(4, 2, `Spørsmål ${this.qi + 1} av ${this.questions.length}`, "purple", { bold: true });
    const frac = this.phase === "countdown" ? 1 : Math.max(0, this.qT / QuizMinigame.TIME);
    r.bar(28, 2, 40, frac, frac > 0.4 ? "lime" : "red");
    wrap(q, 70).slice(0, 3).forEach((line, i) => r.text(5, 4 + i, line, "white", { bold: true }));
    options.forEach((opt, i) => {
      const selected = i === this.sel;
      const color = this.locked && i === correct ? "lime" : selected ? "yellow" : "light";
      r.text(6, 9 + i * 2, `${selected ? "▶" : " "} ${i + 1}. ${opt}`, color, { bold: selected });
    });
    r.text(5, 19, "Lars: «Hm. Interessant. Din far, ja...»", "grey");
  }
}

// ====================================================================== hald deg vaken
const DRONE = "... og i følgje forskrift til opplæringslova skal fråværet førast i kvar time, og " +
  "dokumentert fråvær inntil ti skuledagar per skuleår kan strykast, men berre dersom " +
  "eleven ber om det, og så må vi sjølvsagt sjå på den absolutte fråværsgrensa, som eg " +
  "har snakka om før, og som eg kjem til å snakke om igjen, fordi det er viktig ...   ";

export class MashMinigame extends Minigame {
  static DURATION = 10;

  constructor(game, player, enemy) {
    super(game, player, enemy);
    this.title = "UDIR SITT FRÅVÆRSREGLEMENT";
    this.subtitle = "Lars snakkar. Og snakkar. Og snakkar...";
    this.color = "sky";
    this.instructions = [
      "Trykk ← og → (eller A og D) ANNANKVAR så fort du kan for å halde auga opne i 10 sekund.",
      "Vakenmåla søkk heile tida. Når ho når botnen, sovnar du – og Lars får to gratis angrep.",
      "Same tast to gonger på rad tel ikkje. Så nei, du kan ikkje berre halde inne knappen.",
    ];
    this.awake = 0.65;
    this.pt = 0;
  }

  start() {
    this.awake = 0.65;
    this.pt = 0;
    this.lastSide = null;
    this.presses = 0;
    this.warnT = 0;
  }

  playUpdate(dt) {
    this.pt += dt;
    this.warnT = Math.max(0, this.warnT - dt);
    this.awake -= (0.22 + 0.2 * (this.pt / MashMinigame.DURATION)) * dt;
    if (this.awake <= 0) {
      this.awake = 0;
      this.sound.play("yawn");
      this.finish(false, "Zzz... du sovna midt i paragraf 3-3.");
    } else if (this.pt >= MashMinigame.DURATION) {
      this.finish(true, "Du heldt deg vaken! Lars mistar tråden.");
    }
    if (this.rng.random() < dt * 3 && this.awake < 0.4) this.fx.text(this.rng.randint(50, 70), 10, "z", "sky", 1.2, 4);
  }

  playKey(key) {
    const side = LEFT.has(key) ? "l" : RIGHT.has(key) ? "r" : null;
    if (!side) return;
    if (side === this.lastSide) {
      this.warnT = 0.8; // same tast to gonger tel ikkje
      return;
    }
    this.lastSide = side;
    this.presses++;
    this.awake = Math.min(1, this.awake + 0.06);
    if (this.presses % 3 === 0) this.sound.play("tick");
  }

  drawPlay(r) {
    const awake = this.awake;
    const eyes = EYES[awake > 0.55 ? "open" : awake > 0.25 ? "half" : "closed"];
    eyes.forEach((line, i) => r.center(5 + i, line, "white", { bold: true }));
    r.text(6, 11, "Vaken:", "sky", { bold: true });
    r.bar(14, 11, 56, awake, awake > 0.55 ? "lime" : awake > 0.25 ? "yellow" : "red");
    if (this.phase === "play" || this.phase === "result") {
      r.text(6, 13, "Tid:", "grey");
      r.bar(14, 13, 56, Math.min(1, this.pt / MashMinigame.DURATION), "grey");
      const offset = Math.floor(this.pt * 18) % DRONE.length;
      r.text(4, 17, (DRONE.slice(offset) + DRONE).slice(0, 72), awake < 0.3 ? "dark" : "grey");
      if (this.warnT > 0) r.center(19, "Annankvar! ← → ← → ← →", "red", { bold: true });
      else r.center(19, "← → ← → ← →  FORT!", "yellow", { bold: true });
    }
  }
}

// ====================================================================== maskinskriving
const SENTENCES = [
  "Commodore 64 er den mest selde datamaskina.",
  "Amiga 500 hadde 512 kilobyte minne.",
  "Den første Macintosh kom i 1984.",
  "IBM PC kom på marknaden i 1981.",
  "ZX Spectrum vart laga av Sinclair.",
  "Norsk Data laga minimaskiner i Oslo.",
];

export class TypingMinigame extends Minigame {
  constructor(game, player, enemy) {
    super(game, player, enemy);
    this.title = "DATASAMLINGA TIL LARS";
    this.subtitle = "«Sjå på denne! Kan du skrive av skiltet? FORT!»";
    this.color = "cyan";
    this.instructions = [
      "Skriv av setninga så fort du kan, før tida går ut.",
      "Feil tast blir ikkje skriven – berre prøv igjen. Store/små bokstavar spelar inga rolle.",
      "Klarar du det ikkje i tide, tek du 8 skade.",
    ];
    if (game.touch) this.instructions.push("På mobil får du litt ekstra tid. Kjem ikkje tastaturet opp, trykk på ⌨ Tastatur.");
    this.target = this.rng.choice(SENTENCES);
    // Det går seinare å skrive på eit skjermtastatur, så mobil får litt ekstra tid
    this.timeLimit = game.touch ? this.target.length / 2.2 + 4 : this.target.length / 3 + 3;
    this.pos = 0;
    this.left = this.timeLimit;
    this.errors = 0;
    this.errT = 0;
  }

  get wantsText() {
    return this.phase === "countdown" || this.phase === "play";
  }

  playUpdate(dt) {
    this.left -= dt;
    this.errT = Math.max(0, this.errT - dt);
    if (this.left <= 0) this.finish(false, `For seint! Du kom til teikn ${this.pos} av ${this.target.length}.`);
  }

  playKey(key) {
    if (!isChar(key)) return;
    if (key.toLowerCase() === this.target[this.pos].toLowerCase()) {
      this.pos++;
      this.sound.play("typekey");
      if (this.pos >= this.target.length) {
        this.finish(true, `Feilfritt på ${(this.timeLimit - this.left).toFixed(1)} sekund! (${this.errors} feiltrykk)`);
      }
    } else {
      this.errors++;
      this.errT = 0.2;
      this.sound.play("typewrong");
    }
  }

  drawPlay(r) {
    COMPUTERS.forEach((line, i) => r.center(2 + i, line, "cyan"));
    const t = this.target;
    const x0 = Math.floor((80 - t.length) / 2);
    r.box(x0 - 2, 10, t.length + 4, 3, "white", { style: "round" });
    r.text(x0, 11, t.slice(0, this.pos), "lime", { bold: true });
    if (this.pos < t.length) {
      r.text(x0 + this.pos, 11, t[this.pos], this.errT > 0 ? "red" : "yellow", { bold: true, underline: true });
      r.text(x0 + this.pos + 1, 11, t.slice(this.pos + 1), "grey");
    }
    if (this.phase === "play" || this.phase === "result") {
      const frac = Math.max(0, this.left / this.timeLimit);
      r.text(6, 15, `Tid: ${Math.max(0, this.left).toFixed(1).padStart(4)} s`, "white", { bold: true });
      r.bar(20, 15, 50, frac, frac > 0.4 ? "lime" : "red");
      r.text(6, 17, `Feiltrykk: ${this.errors}`, "orange");
    }
  }
}

export const MINIGAMES = {
  rhythm: RhythmMinigame,
  quiz: QuizMinigame,
  mash: MashMinigame,
  typing: TypingMinigame,
};
