// Utforsking: spring rundt i gangen og fang pengar og ting som fyk rundt.

import { BigCoin, CinnamonBun, Coin, LotteryTicket, Wallet, WEAPON_TYPES } from "../model/items.js";
import { Scene } from "./base.js";
import { EncounterScene } from "./encounter.js";
import { DOWN, LEFT, RIGHT, UP, drawBig, drawHud } from "./ui.js";

// Spelbart område i lerret-koordinatar (inklusive)
const AX0 = 1;
const AX1 = 78;
const AY0 = 4;
const AY1 = 20;

const DIRS = { UP: [0, -1, 1], DOWN: [0, 1, 1], LEFT: [-1, 0, 2], RIGHT: [1, 0, 2] };
const HOLD_DELAY = 0.18; // sekund før ein inne-halden tast byrjar å repetere
const HOLD_RATE = 0.065; // sekund mellom kvart steg når tasten er halden inne

/** Noko som flyg rundt og sprett i veggar og pultar. */
class Mover {
  constructor(x, y, vx, vy) {
    Object.assign(this, { x, y, vx, vy });
  }

  get cell() {
    return [Math.round(this.x), Math.round(this.y)];
  }

  step(dt, blocked) {
    let nx = this.x + this.vx * dt;
    if (blocked(Math.round(nx), Math.round(this.y))) {
      this.vx = -this.vx;
      nx = this.x;
    }
    let ny = this.y + this.vy * dt;
    if (blocked(Math.round(nx), Math.round(ny))) {
      this.vy = -this.vy;
      ny = this.y;
    }
    this.x = nx;
    this.y = ny;
  }
}

class Pickup extends Mover {
  constructor(item, x, y, vx, vy) {
    super(x, y, vx, vy);
    this.item = item;
    this.age = 0;
  }
}

class Homework extends Mover {
  constructor(x, y, vx, vy) {
    super(x, y, vx, vy);
    Object.assign(this, { glyph: "§", color: "red", damage: 2 });
  }
}

/** Vikaren: går sakte mot deg og tek pengar i «mobilbot». */
class Substitute {
  constructor(x, y, speed) {
    Object.assign(this, { x, y, speed, glyph: "V", color: "magenta" });
  }

  get cell() {
    return [Math.round(this.x), Math.round(this.y)];
  }

  step(dt, tx, ty, blocked) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (Math.abs(dx) > 0.5) {
      const nx = this.x + Math.sign(dx) * this.speed * dt;
      if (!blocked(Math.round(nx), Math.round(this.y))) this.x = nx;
    }
    if (Math.abs(dy) > 0.5) {
      const ny = this.y + Math.sign(dy) * this.speed * 0.5 * dt;
      if (!blocked(Math.round(this.x), Math.round(ny))) this.y = ny;
    }
  }
}

export class ExploreScene extends Scene {
  static READY_TIME = 2.2;
  static WARNING_TIME = 2.0;
  static DASH_COOLDOWN = 1.2;

  constructor(game, stage, index, total) {
    super(game);
    this.music = "explore";
    Object.assign(this, { stage, index, total });
    this.enemy = new stage.enemy();
    this.phase = "ready";
    this.phaseT = 0;
    this.elapsed = 0;
    this.px = 40;
    this.py = 12;
    this.lastDir = [1, 0];
    this.dashCd = 0;
    this.invuln = 0;
    this.leaving = false;
    this.spawnT = 0;
    this.lastTick = 99;
    this.holdT = {};
    this.blocked = this.blocked.bind(this);
    this.obstacles = this.makeObstacles();
    this.pickups = [];
    this.hazards = Array.from({ length: stage.hazards }, () => this.makeHomework());
    this.chasers = [];
    this.specials = this.scheduleSpecials();
  }

  // ------------------------------------------------------------ oppsett
  makeObstacles() {
    return [[9, 7], [63, 7], [9, 16], [63, 16], [36, 7]].map(([bx, by]) =>
      [bx + this.rng.randint(-3, 3), by + this.rng.randint(-1, 1), 8, 2]);
  }

  makeHomework() {
    const [x, y, vx, vy] = this.edgeLaunch(this.rng.uniform(7, 11));
    return new Homework(x, y, vx, vy);
  }

  scheduleSpecials() {
    const rng = this.rng;
    const t = this.stage.exploreTime;
    const specials = [];
    for (let i = 0; i < this.stage.weapons; i++) {
      const Type = rng.choice(WEAPON_TYPES);
      specials.push([rng.uniform(1, t - 2), new Type()]);
    }
    specials.push([rng.uniform(2, t - 1.5), new Wallet(rng.randint(35, 70))]);
    if (rng.random() < 0.65) specials.push([rng.uniform(1, t - 2), new CinnamonBun()]);
    if (rng.random() < 0.2) specials.push([rng.uniform(2, t - 2), new LotteryTicket()]);
    return specials.sort((a, b) => a[0] - b[0]);
  }

  blocked(x, y) {
    if (x < AX0 || x > AX1 || y < AY0 || y > AY1) return true;
    return this.obstacles.some(([ox, oy, w, h]) => ox <= x && x < ox + w && oy <= y && y < oy + h);
  }

  edgeLaunch(speed) {
    const rng = this.rng;
    const side = rng.choice(["l", "r", "t", "b"]);
    let x;
    let y;
    let ang;
    if (side === "l") [x, y, ang] = [AX0, rng.uniform(AY0, AY1), 0];
    else if (side === "r") [x, y, ang] = [AX1, rng.uniform(AY0, AY1), Math.PI];
    else if (side === "t") [x, y, ang] = [rng.uniform(AX0, AX1), AY0, Math.PI / 2];
    else [x, y, ang] = [rng.uniform(AX0, AX1), AY1, -Math.PI / 2];
    ang += rng.uniform(-1, 1);
    return [x, y, Math.cos(ang) * speed, Math.sin(ang) * speed * 0.5];
  }

  launch(item) {
    const [x, y, vx, vy] = this.edgeLaunch(this.rng.uniform(...item.speed));
    this.pickups.push(new Pickup(item, x, y, vx, vy));
    this.fx.burst(x, y, 5, "·.", [item.color, "grey"], 5, 0.3, 0);
  }

  // ------------------------------------------------------------ input
  dirOf(key) {
    if (UP.has(key)) return "UP";
    if (DOWN.has(key)) return "DOWN";
    if (LEFT.has(key)) return "LEFT";
    if (RIGHT.has(key)) return "RIGHT";
    return null;
  }

  handleKey(key) {
    if (this.phase === "warning" || this.leaving) return;
    const dir = this.dirOf(key);
    if (dir) {
      this.stepDir(dir);
      this.holdT[dir] = HOLD_DELAY;
    } else if (key === " " && this.dashCd <= 0) {
      this.dash();
    }
  }

  stepDir(dir) {
    const [dx, dy, steps] = DIRS[dir];
    this.move(dx, dy, steps);
  }

  move(dx, dy, steps) {
    this.lastDir = [dx, dy];
    for (let i = 0; i < steps; i++) {
      const nx = this.px + dx;
      const ny = this.py + dy;
      if (this.blocked(nx, ny)) break;
      this.px = nx;
      this.py = ny;
      this.collect();
    }
  }

  dash() {
    const [dx, dy] = this.lastDir;
    const steps = dx ? 9 : 4;
    this.dashCd = ExploreScene.DASH_COOLDOWN;
    this.sound.play("dash");
    for (let i = 0; i < steps; i++) {
      const nx = this.px + dx;
      const ny = this.py + dy;
      if (this.blocked(nx, ny)) break;
      this.fx.burst(this.px, this.py, 1, "░·", ["sky", "blue"], 2, 0.35, 0);
      this.px = nx;
      this.py = ny;
      this.collect();
    }
  }

  updateHeld(dt) {
    if (this.phase === "warning" || this.leaving) return;
    for (const dir of Object.keys(DIRS)) {
      if (!this.game.held.has(dir)) {
        delete this.holdT[dir];
        continue;
      }
      if (this.holdT[dir] === undefined) this.holdT[dir] = HOLD_DELAY;
      this.holdT[dir] -= dt;
      while (this.holdT[dir] <= 0) {
        this.stepDir(dir);
        this.holdT[dir] += HOLD_RATE;
      }
    }
  }

  // ------------------------------------------------------------ logikk
  collect() {
    for (const p of [...this.pickups]) {
      const [cx, cy] = p.cell;
      if (Math.abs(cx - this.px) <= 1 && cy === this.py) {
        this.pickups.splice(this.pickups.indexOf(p), 1);
        const msg = p.item.apply(this.player);
        this.sound.play(p.item.sound);
        this.fx.burst(cx, cy, 14, "*+·.", [p.item.color, "yellow", "white"], 14, 0.6);
        this.fx.text(cx, cy - 1, msg, p.item.color, 1.0);
      }
    }
  }

  hitPlayer(damage, text, money = 0) {
    if (this.invuln > 0) return;
    this.invuln = 1.3;
    const lost = this.player.hurt(damage);
    const stolen = money ? this.player.loseMoney(money) : 0;
    this.sound.play("hurt");
    this.r.shake(1, 0.25);
    this.r.flash("darkred", 0.08);
    this.fx.text(this.px, this.py - 1, `-${lost} HP${stolen ? ` -${stolen} kr` : ""}`, "red");
    this.fx.burst(this.px, this.py, 8, "x*·", ["red", "orange"], 10, 0.5);
    if (!this.player.alive && !this.leaving) {
      this.leaving = true;
      this.game.gameOver(text);
    }
  }

  get timeLeft() {
    return Math.max(0, this.stage.exploreTime - this.elapsed);
  }

  update(dt) {
    super.update(dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.phaseT += dt;
    this.updateHeld(dt);

    if (this.phase === "ready" && this.phaseT >= ExploreScene.READY_TIME) {
      this.phase = "play";
      this.phaseT = 0;
      this.sound.play("confirm");
    } else if (this.phase === "play") {
      this.updatePlay(dt);
    } else if (this.phase === "warning" && this.phaseT >= ExploreScene.WARNING_TIME && !this.leaving) {
      this.leaving = true;
      const { enemy, stage } = this;
      this.game.fadeTo(() => new EncounterScene(this.game, enemy, stage));
    }

    for (const p of [...this.pickups]) {
      p.step(dt, this.blocked);
      p.age += dt;
      if (p.age > p.item.lifetime) {
        this.pickups.splice(this.pickups.indexOf(p), 1);
        this.fx.burst(p.x, p.y, 3, "·", ["grey"], 3, 0.3, 0);
      }
    }
    if (this.phase !== "ready") this.collect();
  }

  updatePlay(dt) {
    this.elapsed += dt;
    const left = this.timeLeft;
    if (left <= 0) {
      this.phase = "warning";
      this.phaseT = 0;
      this.sound.play("warning");
      this.r.shake(1, 0.4);
      return;
    }
    const whole = Math.ceil(left);
    if (whole <= 3 && whole !== this.lastTick) {
      this.lastTick = whole;
      this.sound.play("tick");
    }

    // nye myntar
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = this.stage.spawnInterval * this.rng.uniform(0.6, 1.4);
      this.launch(this.rng.random() < 0.85 ? new Coin() : new BigCoin());
    }
    while (this.specials.length && this.specials[0][0] <= this.elapsed) this.launch(this.specials.shift()[1]);

    // vikarar kjem etter litt
    if (this.chasers.length < this.stage.chasers && this.elapsed > 2) {
      const corner = this.rng.choice([[AX0 + 1, AY0], [AX1 - 1, AY0], [AX0 + 1, AY1], [AX1 - 1, AY1]]);
      this.chasers.push(new Substitute(...corner, 5.5 + this.index));
      this.sound.play("whoosh");
    }

    for (const h of this.hazards) {
      h.step(dt, this.blocked);
      const [hx, hy] = h.cell;
      if (hx === this.px && hy === this.py) this.hitPlayer(h.damage, "Du drukna i lekser og svima av i gangen.");
    }
    for (const c of this.chasers) {
      c.step(dt, this.px, this.py, this.blocked);
      const [cx, cy] = c.cell;
      if (cx === this.px && cy === this.py && this.invuln <= 0) {
        this.hitPlayer(2, "Vikaren konfiskerte både mobilen og motet ditt.", 5);
        [c.x, c.y] = this.px < 40 ? [AX1 - 1, AY0] : [AX0 + 1, AY1];
      }
    }
  }

  // ------------------------------------------------------------ teikning
  draw(r) {
    const stage = this.stage;
    drawHud(r, this.player, 0);
    r.text(0, 1, `${stage.title} av ${this.total}`, stage.color, { bold: true });
    r.text(stage.title.length + 6, 1, `· ${stage.location}`, "light");

    r.box(0, 2, 80, 20, stage.color, { style: "round" });
    r.text(AX0, 3, "▐▒▒▌".repeat(20).slice(0, AX1 - AX0 + 1), "navy");
    for (let y = AY0; y <= AY1; y += 2) {
      for (let x = 2 + (y % 4); x < AX1; x += 8) r.text(x, y, "·", "dark");
    }
    for (const [ox, oy, w] of this.obstacles) {
      r.text(ox, oy, "▄".repeat(w), "brown");
      r.text(ox, oy + 1, "▀".repeat(w), "coffee");
    }

    for (const p of this.pickups) {
      const remaining = p.item.lifetime - p.age;
      if (remaining > 1.5 || Math.floor(this.t * 10) % 2 === 0) r.text(...p.cell, p.item.glyph, p.item.color, { bold: true });
    }
    for (const h of this.hazards) r.text(...h.cell, h.glyph, h.color, { bold: true });
    for (const c of this.chasers) r.text(...c.cell, c.glyph, c.color, { bold: true });

    this.fx.draw(r);
    if (this.invuln <= 0 || Math.floor(this.t * 12) % 2 === 0) r.text(this.px, this.py, "@", "yellow", { bold: true });

    this.drawTimer(r);
    this.drawLegend(r);
    if (this.phase === "ready") this.drawReady(r);
    else if (this.phase === "warning") this.drawWarning(r);
  }

  drawTimer(r) {
    const frac = this.timeLeft / this.stage.exploreTime;
    const color = frac > 0.5 ? "lime" : frac > 0.25 ? "yellow" : "red";
    const label = `${this.enemy.name} dukkar opp om ${this.timeLeft.toFixed(1).padStart(4)} s `;
    r.text(1, 22, label, color, { bold: true });
    r.bar(label.length + 1, 22, 30, frac, color);
    const ready = this.dashCd <= 0;
    r.text(68, 22, ready ? "SPURT KLAR" : "spurt ....", ready ? "sky" : "dark", { bold: true });
  }

  drawLegend(r) {
    const legend = [["¤", "gold", "5kr"], ["Ø", "orange", "20kr"], ["▣", "lime", "lommebok"], ["★", "magenta", "lodd"],
      ["♥", "pink", "bolle"], ["╪", "cyan", "linjal"], ["&", "green", "matpakke"], ["¦", "white", "kritt"],
      ["§", "red", "lekse!"], ["V", "magenta", "vikar!"]];
    let x = 1;
    for (const [glyph, color, label] of legend) {
      r.text(x, 23, glyph, color, { bold: true });
      r.text(x + 1, 23, label, "grey");
      x += label.length + 2;
    }
  }

  drawReady(r) {
    const stage = this.stage;
    r.box(14, 8, 52, 8, stage.color, { style: "double", fill: true });
    r.center(9, `${stage.title.toUpperCase()} · ${stage.location}`, stage.color, { bold: true });
    r.center(11, "Fang pengar og ting som fyk rundt!", "white");
    r.center(12, `Om ${stage.exploreTime} sekund kjem ${this.enemy.name}.`, "light");
    const left = ExploreScene.READY_TIME - this.phaseT;
    const word = left > 1.4 ? "Klar..." : left > 0.6 ? "Ferdig..." : "GÅ!";
    r.center(14, word, "yellow", { bold: true });
  }

  drawWarning(r) {
    const color = Math.floor(this.t * 8) % 2 === 0 ? "red" : "yellow";
    r.fill(2, 8, 76, 9);
    drawBig(r, 9, `${this.enemy.name.toUpperCase()}!`, () => color);
    r.center(15, "DUKKAR OPP!", color, { bold: true });
  }
}
