// Turbasert kamp. Angrepa (model/attacks.js) styrer kampen gjennom metodane her.

import { PLAYER_POSES } from "../art.js";
import { Scene } from "./base.js";
import { MINIGAMES } from "./minigames.js";
import { CONFIRM, DOWN, LEFT, RIGHT, UP, drawHud, hpBar, wrap } from "./ui.js";

const ENEMY_POS = [17, 6];
const PLAYER_POS = [63, 8];

export class BattleScene extends Scene {
  constructor(game, enemy) {
    super(game);
    this.enemy = enemy;
    this.music = enemy.isBoss ? "boss" : "battle";
    this.logLines = [];
    this.sel = 0;
    this.state = "intro";
    this.enemyShake = 0;
    this.pose = "idle";
    this.poseT = 0;
    this.dying = 0;
    this.finished = false;
  }

  enter() {
    this.log(this.enemy.fightStart, this.enemy.color);
    this.sound.play("whoosh");
    this.after(1.2, () => this.beginPlayerTurn());
  }

  // ------------------------------------------------------------ API for angrep
  log(text, color = "white") {
    for (const line of wrap(text, 76)) this.logLines.push([line, color]);
    this.logLines = this.logLines.slice(-12);
  }

  enemyHitChance(base) {
    return base * (this.enemy.blinded > 0 ? 0.5 : 1);
  }

  hurtPlayer(amount, sound = "hurt") {
    const dealt = this.player.hurt(amount);
    this.sound.play(sound);
    this.r.shake(amount >= 6 ? 2 : 1, 0.3);
    this.r.flash("darkred", 0.08);
    this.setPose("hurt", 0.5);
    this.playerText(`-${dealt}`, "red");
    this.fx.burst(PLAYER_POS[0], PLAYER_POS[1], 10, "x*·", ["red", "orange"], 12, 0.5);
    return dealt;
  }

  playerText(text, color) {
    this.fx.text(PLAYER_POS[0], PLAYER_POS[1] - 2, text, color, 1.0);
  }

  enemyProjectile(glyph, color, onArrive) {
    this.fx.projectile(ENEMY_POS[0] + 6, ENEMY_POS[1], PLAYER_POS[0] - 1, PLAYER_POS[1], glyph, color, onArrive, 0.45, 3);
  }

  runMinigame(key, callback) {
    this.pushChild(new MINIGAMES[key](this.game, this.player, this.enemy), callback);
  }

  expel(text) {
    this.end(() => this.game.gameOver(text, "UTVIST!"), 1.4);
    this.sound.play("expel");
    this.r.shake(3, 0.6);
  }

  sitOn() {
    this.log("SITT PÅ! Lars set seg til rette på fanget ditt...", "magenta");
    this.sound.play("boom");
    this.r.shake(3, 0.8);
    this.r.flash("purple", 0.2);
    this.end(() => this.game.gameOver(
      "Rektor Lars sette seg på fanget ditt og vil aldri reise seg att. Ingen vitnemål i år.", "SITT PÅ!"), 1.8);
  }

  setPose(pose, duration) {
    this.pose = pose;
    this.poseT = duration;
  }

  end(fn, delay) {
    if (this.finished) return;
    this.finished = true;
    this.state = "done";
    this.clearTimers();
    this.after(delay, fn);
  }

  // ------------------------------------------------------------ turar
  beginPlayerTurn() {
    if (this.finished) return;
    if (this.player.skipTurns > 0) {
      this.player.skipTurns -= 1;
      this.setPose("sleep", 1.0);
      this.log("Zzz... du søv framleis.", "grey");
      this.sound.play("yawn");
      this.after(1.0, () => this.enemyTurn());
      return;
    }
    this.state = "choose";
    this.sel = Math.min(this.sel, this.player.weapons().length - 1);
  }

  playerAttack(weapon) {
    this.state = "busy";
    const strike = weapon.strike(this.player, this.rng);
    this.log(`Du ${weapon.verb}!`, "sky");
    this.setPose("attack", 0.4);
    this.sound.play("dash");
    this.fx.projectile(PLAYER_POS[0] - 2, PLAYER_POS[1], ENEMY_POS[0] + 6, ENEMY_POS[1],
      weapon.projectile, weapon.projectileColor, () => this.playerHit(weapon, strike), 0.4, 2.5);
  }

  playerHit(weapon, strike) {
    const [ex, ey] = ENEMY_POS;
    if (strike.hit) {
      const dealt = this.enemy.hurt(strike.damage);
      this.player.record.skade += dealt;
      this.enemyShake = 0.4;
      this.sound.play(strike.crit ? "crit" : weapon.hitSound);
      this.fx.burst(ex, ey, strike.crit ? 16 : 10, "*+x·", ["yellow", "orange", "white"], 16, 0.6);
      this.fx.text(ex, ey - 3, strike.crit ? `KRITISK! -${dealt}` : `-${dealt}`, strike.crit ? "yellow" : "white", 1.1);
      this.log(`${strike.crit ? "KRITISK treff" : "Treff"}! ${this.enemy.name} tek ${dealt} skade.`, strike.crit ? "yellow" : "white");
      const extra = weapon.onHit(this.enemy, this.rng);
      if (extra) this.log(extra, "lime");
    } else {
      this.sound.play("whoosh");
      this.fx.text(ex, ey - 3, "BOM", "grey");
      this.log("Bom! Du trefte berre lufta.", "grey");
    }
    this.after(0.8, () => (this.enemy.alive ? this.enemyTurn() : this.win()));
  }

  enemyTurn() {
    if (this.finished) return;
    this.state = "enemy";
    const enemy = this.enemy;
    if (!enemy.onTurnStart(this)) return;
    if (enemy.stunned > 0) {
      enemy.stunned -= 1;
      this.log(`${enemy.name} er for kvalm til å gjere noko!`, "green");
      this.after(1.0, () => this.afterEnemy());
      return;
    }
    enemy.chooseAttack(this.rng).execute(this, () => this.afterEnemy());
  }

  afterEnemy() {
    if (this.finished) return;
    if (this.enemy.blinded > 0) this.enemy.blinded -= 1;
    if (!this.player.alive) this.lose();
    else this.beginPlayerTurn();
  }

  win() {
    this.log(`${this.enemy.name} er slått!`, "lime");
    this.sound.play("win");
    this.dying = 0.001;
    this.fx.burst(ENEMY_POS[0], ENEMY_POS[1], 40, "*+·★", ["gold", "yellow", "lime", "white"], 24, 1.2);
    this.end(() => this.game.pop("won"), 2.2);
  }

  lose() {
    this.sound.play("lose");
    if (this.enemy.isBoss) {
      this.log(`${this.enemy.name} vann kampen...`, "red");
      this.end(() => this.game.gameOver(`Rektor ${this.enemy.name} vann kampen. Ingen vitnemål på deg i år.`), 2.0);
    } else {
      this.player.hp = 1;
      this.log("Du ligg rett ut... men kjem deg på beina med 1 HP.", "orange");
      this.end(() => this.game.pop("lost"), 2.2);
    }
  }

  // ------------------------------------------------------------ input/oppdatering
  handleKey(key) {
    if (this.state !== "choose") return;
    const weapons = this.player.weapons();
    const n = weapons.length;
    if (LEFT.has(key)) this.sel = (this.sel - 1 + n) % n;
    else if (RIGHT.has(key)) this.sel = (this.sel + 1) % n;
    else if (UP.has(key)) this.sel = n > 2 ? (this.sel - 2 + n) % n : this.sel;
    else if (DOWN.has(key)) this.sel = n > 2 ? (this.sel + 2) % n : this.sel;
    else if (CONFIRM.has(key)) {
      this.playerAttack(weapons[this.sel]);
      return;
    } else return;
    this.sound.play("select");
  }

  update(dt) {
    super.update(dt);
    this.enemyShake = Math.max(0, this.enemyShake - dt);
    if (this.poseT > 0) {
      this.poseT -= dt;
      if (this.poseT <= 0) this.pose = "idle";
    }
    if (this.dying) this.dying += dt;
  }

  // ------------------------------------------------------------ teikning
  draw(r) {
    const { enemy, player } = this;
    r.center(0, `»»  KAMP MOT ${enemy.name.toUpperCase()}  ««`, "red", { bold: true });

    const jx = this.enemyShake > 0 ? this.rng.randint(-2, 2) : 0;
    const sink = this.dying ? Math.floor(Math.min(this.dying, 1.5) * 8) : 0;
    if (!this.dying || Math.floor(this.t * 10) % 2 === 0) {
      enemy.art.forEach((line, i) => r.text(1 + jx, 1 + i + sink, line.slice(0, 38), enemy.color,
        { bold: !this.dying, dim: Boolean(this.dying) }));
    }

    const x = 42;
    r.text(x, 2, enemy.name.toUpperCase(), enemy.color, { bold: true });
    r.text(x + enemy.name.length + 1, 2, enemy.title, "grey");
    hpBar(r, x, 3, 26, enemy.hp, enemy.maxHp);
    let sx = x;
    for (const [label, color, on] of [["KVALM", "green", enemy.stunned], ["BLIND", "white", enemy.blinded]]) {
      if (!on) continue;
      r.text(sx, 4, `[${label}]`, color, { bold: true });
      sx += label.length + 3;
    }
    if (enemy.chargeMax) {
      const danger = enemy.charge >= enemy.chargeMax - 3;
      const color = danger ? (Math.floor(this.t * 6) % 2 === 0 ? "red" : "magenta") : "purple";
      r.text(x, 5, "SITT PÅ", color, { bold: true });
      r.bar(x + 8, 5, 18, enemy.charge / enemy.chargeMax, color, "dark", "▓");
      r.text(x + 27, 5, `${enemy.charge}/${enemy.chargeMax}`, color);
    }

    const px = PLAYER_POS[0] - 2 + (this.pose === "attack" ? 1 : 0);
    PLAYER_POSES[this.pose].forEach((line, i) => r.text(px, PLAYER_POS[1] - 1 + i, line, "yellow", { bold: true }));
    r.text(x + 14, 11, player.name.slice(0, 12), "white", { bold: true });
    hpBar(r, x + 14, 12, 14, player.hp, player.maxHp);

    r.box(0, 13, 80, 5, "grey", { style: "round", title: "Kamplogg" });
    this.logLines.slice(-3).forEach(([text, color], i) => r.text(2, 14 + i, text, color));

    const active = this.state === "choose";
    r.box(0, 18, 80, 5, active ? "yellow" : "dark", { style: "round", title: "Vel angrep" });
    const weapons = player.weapons();
    weapons.slice(0, 4).forEach((w, i) => {
      const cx = 2 + (i % 2) * 39;
      const cy = 19 + Math.floor(i / 2);
      const selected = active && i === this.sel;
      const [lo, hi] = w.damageRange(player);
      r.text(cx, cy, selected ? "▶" : " ", "yellow", { bold: true });
      r.text(cx + 2, cy, w.name.padEnd(16), selected ? "yellow" : active ? "white" : "grey", { bold: selected });
      r.text(cx + 19, cy, `${lo}-${hi} skade ${Math.round(w.accuracy * 100)}% ${w.usesText()}`, active ? "light" : "dark");
    });
    if (active && weapons.length) r.text(2, 21, weapons[Math.min(this.sel, weapons.length - 1)].description.slice(0, 76), "grey");
    else if (this.state === "enemy") r.text(2, 21, `${enemy.name} sin tur...`, "orange");

    drawHud(r, player, 23);
    this.fx.draw(r);
  }
}
