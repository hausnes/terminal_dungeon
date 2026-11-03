// Ting du kan plukke opp: pengar, mat og våpen.
//
// Kvar ting er ein klasse. Vil du lage ein ny ting, arvar du frå Item
// (eller Coin/Weapon) og sender inn det som skal vere annleis.

export class Item {
  constructor(cfg = {}) {
    this.name = "Ting";
    this.glyph = "?";
    this.color = "white";
    this.sound = "item";
    this.description = "";
    this.speed = [7, 12]; // kor fort tingen flyg rundt (ruter per sekund)
    this.lifetime = 6; // sekund før tingen forsvinn
    Object.assign(this, cfg);
  }

  /** Kva som skjer når spelaren plukkar opp tingen. Returnerer ein kort tekst. */
  apply(player) {
    throw new Error("apply() må overstyrast");
  }
}

// ---------------------------------------------------------------- pengar
export class Coin extends Item {
  constructor(value = null, cfg = {}) {
    super({ name: "Femkroning", glyph: "¤", color: "gold", sound: "coin", value: 5, speed: [6, 14], lifetime: 6.5, ...cfg });
    if (value !== null) this.value = value;
  }

  apply(player) {
    player.earn(this.value);
    return `+${this.value} kr`;
  }
}

export class BigCoin extends Coin {
  constructor(value = null) {
    super(value, { name: "Tjuekroning", glyph: "Ø", color: "orange", sound: "bigcoin", value: 20, speed: [11, 17], lifetime: 5 });
  }
}

export class Wallet extends Coin {
  constructor(value = null) {
    super(value, { name: "Lommebok", glyph: "▣", color: "lime", sound: "bigcoin", value: 50, speed: [14, 20], lifetime: 4.5 });
  }
}

export class LotteryTicket extends Coin {
  constructor(value = null) {
    super(value, { name: "Vinnarlodd", glyph: "★", color: "magenta", sound: "jackpot", value: 300, speed: [20, 28], lifetime: 3.5 });
  }
}

// ---------------------------------------------------------------- mat
export class CinnamonBun extends Item {
  constructor() {
    super({ name: "Kanelbolle", glyph: "♥", color: "pink", sound: "heal", heal: 8, speed: [6, 10] });
  }

  apply(player) {
    const got = player.heal(this.heal);
    return got ? `+${got} HP` : "Mett!";
  }
}

// ---------------------------------------------------------------- våpen
export class Weapon extends Item {
  constructor(cfg = {}, uses = null) {
    super({
      name: "Våpen", minDmg: 1, maxDmg: 2, accuracy: 0.9, defaultUses: 1, strengthDiv: 4,
      verb: "angrip", projectile: "*", projectileColor: "white", hitSound: "hit",
      speed: [9, 14], lifetime: 5.5, ...cfg,
    });
    this.uses = uses ?? this.defaultUses; // null = uendeleg
  }

  bonus(player) {
    return Math.floor(player.stats.get("styrke") / this.strengthDiv);
  }

  damageRange(player) {
    const b = this.bonus(player);
    return [this.minDmg + b, this.maxDmg + b];
  }

  usesText() {
    return this.uses === null ? "∞" : `x${this.uses}`;
  }

  strike(player, rng) {
    if (this.uses !== null) this.uses = Math.max(0, this.uses - 1);
    if (rng.random() >= this.accuracy) return { hit: false, damage: 0, crit: false };
    const [lo, hi] = this.damageRange(player);
    let damage = rng.randint(lo, hi);
    const crit = rng.random() < 0.1;
    if (crit) damage = Math.floor(damage * 1.5 + 0.5);
    return { hit: true, damage, crit };
  }

  /** Ekstra effekt når våpenet treff. Returnerer ein loggtekst eller null. */
  onHit(enemy, rng) {
    return null;
  }

  apply(player) {
    player.addWeapon(this);
    return `${this.name}!`;
  }
}

export class BareHands extends Weapon {
  constructor() {
    super({
      key: "BareHands", name: "Dask", description: "Ein slapp dask med handa. Alltid tilgjengeleg.",
      minDmg: 1, maxDmg: 3, accuracy: 0.9, defaultUses: null, strengthDiv: 3, verb: "daskar",
      projectile: "*", projectileColor: "skin", hitSound: "slap",
    });
  }
}

export class Ruler extends Weapon {
  constructor(uses = null) {
    super({
      key: "Ruler", name: "Linjal", glyph: "╪", color: "cyan",
      description: "Ein 30 cm stållinjal. Solid og påliteleg.",
      minDmg: 3, maxDmg: 5, accuracy: 0.85, defaultUses: 5, verb: "slår med linjalen",
      projectile: "═", projectileColor: "cyan",
    }, uses);
  }
}

export class RottenLunch extends Weapon {
  constructor(uses = null) {
    super({
      key: "RottenLunch", name: "Råtten matpakke", glyph: "&", color: "green",
      description: "Leverpostei frå august. Stor skade, kan gjere fienden kvalm.",
      minDmg: 6, maxDmg: 9, accuracy: 0.7, defaultUses: 1, verb: "kastar den råtne matpakka",
      projectile: "&", projectileColor: "green",
    }, uses);
  }

  onHit(enemy, rng) {
    if (rng.random() < 0.5) {
      enemy.stunned = Math.max(enemy.stunned, 1);
      return `${enemy.name} blir kvalm av lukta og mistar neste tur!`;
    }
    return null;
  }
}

export class Chalk extends Weapon {
  constructor(uses = null) {
    super({
      key: "Chalk", name: "Kritt", glyph: "¦", color: "white",
      description: "Treff nesten alltid. Krittstøv kan gjere fienden blind.",
      minDmg: 2, maxDmg: 4, accuracy: 0.95, defaultUses: 3, verb: "kastar kritt",
      projectile: "¦", projectileColor: "white",
    }, uses);
  }

  onHit(enemy, rng) {
    if (rng.random() < 0.4) {
      enemy.blinded = 2;
      return `Krittstøv i auga! ${enemy.name} ser dårleg i 2 rundar.`;
    }
    return null;
  }
}

export const WEAPON_TYPES = [Ruler, RottenLunch, Chalk];
