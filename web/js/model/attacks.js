// Angrep fiendane kan bruke i kamp.
//
// Eit angrep får tilgang til kampen (battle) og kallar done() når det er
// ferdig. Kampen tilbyr hjelpemetodar som log(), hurtPlayer(),
// enemyProjectile(), runMinigame(), expel() og after().

import { Stats } from "./stats.js";

export class Attack {
  constructor(o) {
    Object.assign(this, {
      name: "", weight: 1, hitChance: 1, damage: [1, 2], projectile: "*", color: "white", sound: "hit",
      announce: "", hitText: "Treff! {dmg} skade.", missText: "Bom!",
    }, o);
  }

  execute(battle, done) {
    battle.log(this.announce, "orange");
    const hit = battle.rng.random() < battle.enemyHitChance(this.hitChance);
    const arrive = () => {
      if (hit) {
        this.onHit(battle);
      } else {
        battle.log(this.missText, "grey");
        battle.playerText("BOM", "grey");
        battle.sound.play("whoosh");
      }
      battle.after(0.8, done);
    };
    battle.after(0.5, () => battle.enemyProjectile(this.projectile, this.color, arrive));
  }

  onHit(battle) {
    const dmg = battle.rng.randint(...this.damage);
    const dealt = battle.hurtPlayer(dmg, this.sound);
    battle.log(this.hitText.replace("{dmg}", dealt), "red");
  }
}

/** Treff det, er spelet over. */
export class ExpelAttack extends Attack {
  onHit(battle) {
    battle.expel(this.hitText);
  }
}

/** Gjer skade og tek eitt poeng frå alle stats. */
export class DoxAttack extends Attack {
  onHit(battle) {
    super.onHit(battle);
    for (const stat of Stats.NAMES) battle.player.stats.change(stat, -1);
    battle.sound.play("zap");
  }
}

/** Startar eit minispel. Klarar du det ikkje, skjer det noko vondt. */
export class MinigameAttack extends Attack {
  constructor(o) {
    super({ failDamage: 0, failSkip: 0, ...o });
  }

  execute(battle, done) {
    battle.log(this.announce, "orange");
    const result = (ok) => {
      if (ok) {
        battle.log(this.successText, "lime");
        battle.sound.play("confirm");
      } else {
        battle.log(this.failText, "red");
        if (this.failDamage) battle.hurtPlayer(this.failDamage, "hurt");
        if (this.failSkip) battle.player.skipTurns += this.failSkip;
      }
      battle.after(0.9, done);
    };
    battle.after(1.6, () => battle.runMinigame(this.minigame, result));
  }
}
