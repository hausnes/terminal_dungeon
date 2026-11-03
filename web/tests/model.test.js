// Testar for spelmodellen. Køyr med: node --test web/tests/

import assert from "node:assert/strict";
import { test } from "node:test";

import { FONT } from "../js/art.js";
import { noteFreq, MUSIC, SFX } from "../js/engine/sound.js";
import { PayApproach, StatApproach } from "../js/model/approaches.js";
import { Alec, Lars, Mercedes } from "../js/model/enemies.js";
import { BareHands, Chalk, Coin, Ruler } from "../js/model/items.js";
import { amalieSkram } from "../js/model/level.js";
import { Player } from "../js/model/player.js";
import { Stats } from "../js/model/stats.js";
import { Random } from "../js/rng.js";

const makePlayer = (styrke = 5, utspekulert = 5, sexy = 5, money = 15) =>
  new Player("Test", new Stats(styrke, utspekulert, sexy), money);

test("stats blir avgrensa til 0–10", () => {
  const s = new Stats(15, -3, 5);
  assert.deepEqual([s.get("styrke"), s.get("utspekulert"), s.get("sexy")], [10, 0, 5]);
  assert.equal(s.change("sexy", 10), 5);
  assert.equal(s.get("sexy"), 10);
});

test("trekte stats er mellom 1 og 10", () => {
  const rng = new Random(1);
  for (let i = 0; i < 200; i++) {
    for (const [, v] of Stats.roll(rng).entries()) assert.ok(v >= 1 && v <= 10);
  }
});

test("skade og helsing", () => {
  const p = makePlayer(6);
  assert.equal(p.maxHp, 30);
  assert.equal(p.hurt(100), 30);
  assert.equal(p.alive, false);
  assert.equal(p.heal(5), 5);
});

test("våpen av same type blir lagde saman", () => {
  const p = makePlayer();
  new Ruler().apply(p);
  new Ruler().apply(p);
  assert.equal(p.inventory.get("Ruler").uses, 10);
  assert.deepEqual(p.weapons().map((w) => w.name), ["Dask", "Linjal"]);
});

test("mynt gir pengar", () => {
  const p = makePlayer(5, 5, 5, 10);
  new Coin().apply(p);
  assert.equal(p.money, 15);
  assert.equal(p.record.kroner, 5);
});

test("våpen blir brukte opp, dask varer evig", () => {
  const p = makePlayer();
  const chalk = new Chalk();
  const rng = new Random(3);
  for (let i = 0; i < 3; i++) chalk.strike(p, rng);
  assert.equal(chalk.uses, 0);
  p.addWeapon(chalk);
  assert.ok(!p.weapons().includes(chalk));
  const fists = new BareHands();
  assert.deepEqual(fists.damageRange(makePlayer(9)), [4, 6]);
  fists.strike(p, rng);
  assert.equal(fists.uses, null);
});

test("betaling hos Mercedes", () => {
  const pay = new Mercedes().approaches().find((a) => a instanceof PayApproach);
  const rich = makePlayer(5, 5, 5, 60);
  assert.ok(pay.resolve(rich, new Random(1)).success);
  assert.equal(rich.money, 10);
  const poor = makePlayer(5, 5, 5, 20);
  const out = pay.resolve(poor, new Random(1));
  assert.equal(out.success, false);
  assert.equal(poor.money, 10);
  assert.equal(out.hpLost, 3);
});

test("Alec tek alle pengane når betalinga feilar", () => {
  const pay = new Alec().approaches().find((a) => a instanceof PayApproach);
  const p = makePlayer(5, 5, 5, 99);
  pay.resolve(p, new Random(1));
  assert.equal(p.money, 0);
});

test("sjanse for stat-val", () => {
  const charm = new Mercedes().approaches().find((a) => a instanceof StatApproach && a.stat === "sexy");
  assert.equal(charm.chance(makePlayer(5, 5, 6)), 1);
  assert.equal(charm.chance(makePlayer(5, 5, 3)), 0.3);
  const p = makePlayer(5, 5, 0);
  assert.equal(charm.resolve(p, new Random(1)).success, false);
  assert.equal(p.stats.get("sexy"), 0);
});

test("alle fiendar har fire val og angrep", () => {
  for (const Cls of [Mercedes, Alec, Lars]) {
    const enemy = new Cls();
    assert.equal(enemy.approaches().length, 4);
    assert.ok(enemy.attacks.length > 0);
    assert.ok(enemy.attacks.includes(enemy.chooseAttack(new Random(2))));
  }
  assert.deepEqual(amalieSkram().stages.map((s) => s.enemy.name), ["Mercedes", "Alec", "Lars"]);
});

test("blokkskrifta har like breie rader", () => {
  for (const [ch, rows] of Object.entries(FONT)) {
    assert.equal(rows.length, 5, ch);
    assert.equal(new Set(rows.map((r) => r.length)).size, 1, ch);
  }
});

test("lyd kan genererast", () => {
  assert.ok(Math.abs(noteFreq("A4") - 440) < 1e-9);
  assert.ok(Math.abs(noteFreq("Bb1") - noteFreq("A#1")) < 1e-9);
  for (const build of [...Object.values(SFX), ...Object.values(MUSIC)]) assert.ok(build().length > 0);
});
