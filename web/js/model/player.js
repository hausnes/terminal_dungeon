// Spelfiguren.

import { BASE_HP } from "../config.js";
import { BareHands } from "./items.js";

export class Player {
  constructor(name, stats, money) {
    this.name = name;
    this.stats = stats;
    this.maxHp = BASE_HP + stats.get("styrke");
    this.hp = this.maxHp;
    this.money = money;
    this.fists = new BareHands();
    this.inventory = new Map(); // key -> Weapon
    this.skipTurns = 0;
    this.record = { kroner: 0, ting: 0, skade: 0 };
  }

  get alive() {
    return this.hp > 0;
  }

  hurt(amount) {
    const actual = Math.max(0, Math.min(this.hp, amount));
    this.hp -= actual;
    return actual;
  }

  heal(amount) {
    const actual = Math.max(0, Math.min(this.maxHp - this.hp, amount));
    this.hp += actual;
    return actual;
  }

  earn(amount) {
    this.money += amount;
    this.record.kroner += amount;
  }

  spend(amount) {
    if (amount > this.money) return false;
    this.money -= amount;
    return true;
  }

  loseMoney(amount) {
    const actual = Math.max(0, Math.min(this.money, amount));
    this.money -= actual;
    return actual;
  }

  addWeapon(weapon) {
    this.record.ting += 1;
    const existing = this.inventory.get(weapon.key);
    if (existing) existing.uses += weapon.uses;
    else this.inventory.set(weapon.key, weapon);
  }

  /** Alle våpen som kan brukast no – dask med handa er alltid med. */
  weapons() {
    return [this.fists, ...[...this.inventory.values()].filter((w) => w.uses)];
  }
}
