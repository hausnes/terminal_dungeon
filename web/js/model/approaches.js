// Måtar å kome forbi ein fiende på: pengar, sexy, utspekulert eller styrke.
//
// Kvar fiende lagar si eiga liste med Approach-objekt. Møte-scena
// (EncounterScene) kallar approach.start(encounter), og approach-objektet
// bestemmer sjølv om det skal løysast med ein gong, starte ein kamp eller eit
// minispel.

import { STAT_INFO } from "./stats.js";

export class Outcome {
  constructor({ success, speech = "", lines = [], hpLost = 0, gameOver = null, gameOverTitle = "GAME OVER", mood = "" }) {
    Object.assign(this, { success, speech, lines, hpLost, gameOver, gameOverTitle });
    this.mood = mood || (success ? "good" : "bad");
  }
}

export const KIND_STYLE = {
  pengar: ["PENGAR", "gold"],
  sexy: ["SEXY", "pink"],
  utspekulert: ["UTSPEKULERT", "purple"],
  styrke: ["STYRKE", "red"],
};

export const chanceColor = (c) => (c >= 0.7 ? "lime" : c >= 0.4 ? "yellow" : "red");

export class Approach {
  constructor(label, description) {
    this.kind = "styrke";
    this.label = label;
    this.description = description;
  }

  /** Kort tekst og farge som blir vist til høgre i menyen. */
  info(player) {
    return ["", "grey"];
  }

  start(encounter) {
    encounter.showOutcome(this.resolve(encounter.player, encounter.rng));
  }

  resolve(player, rng) {
    throw new Error("resolve() må overstyrast");
  }
}

export class PayApproach extends Approach {
  constructor(o) {
    super(o.label, o.description);
    this.kind = "pengar";
    Object.assign(this, { failHp: 3, failMoneyFrac: 0.5, rewardHp: 0 }, o);
  }

  info(player) {
    return [`Du har ${player.money} kr`, player.money >= this.cost ? "lime" : "red"];
  }

  resolve(player, rng) {
    if (player.spend(this.cost)) {
      const lines = [...this.successLines];
      if (this.rewardHp) {
        const got = player.heal(this.rewardHp);
        if (got) lines.push(`Du får ${got} HP tilbake.`);
      }
      return new Outcome({ success: true, speech: this.successSpeech, lines });
    }
    const lostHp = player.hurt(this.failHp);
    const lostMoney = player.loseMoney(Math.round(player.money * this.failMoneyFrac));
    const summary = `Du mistar ${lostHp} HP` + (lostMoney ? ` og ${lostMoney} kr.` : ".");
    return new Outcome({ success: false, speech: this.failSpeech, lines: [...this.failLines, summary], hpLost: lostHp });
  }
}

export class StatApproach extends Approach {
  constructor(o) {
    super(o.label, o.description);
    Object.assign(this, { hpLoss: 4, statLoss: 1 }, o);
    this.kind = o.stat;
  }

  chance(player) {
    const value = player.stats.get(this.stat);
    if (value >= this.required) return 1;
    return Math.round((0.6 * value / this.required) * 100) / 100;
  }

  info(player) {
    const c = this.chance(player);
    return [`Sjanse ${Math.round(c * 100)}%`, chanceColor(c)];
  }

  resolve(player, rng) {
    if (rng.random() < this.chance(player)) {
      return new Outcome({ success: true, speech: this.successSpeech, lines: [...this.successLines] });
    }
    const lostHp = player.hurt(this.hpLoss);
    const lostStat = -player.stats.change(this.stat, -this.statLoss);
    const label = STAT_INFO[this.stat].label.toLowerCase();
    const summary = `Du mistar ${lostHp} HP og ${lostStat} ${label}.`;
    return new Outcome({ success: false, speech: this.failSpeech, lines: [...this.failLines, summary], hpLost: lostHp });
  }
}

/** Startar eit minispel. Vinn du, kjem du forbi. Tapar du, er spelet over. */
export class MinigameApproach extends Approach {
  constructor(o) {
    super(o.label, o.description);
    Object.assign(this, o);
    this.kind = o.stat;
  }

  info(player) {
    return ["Minispel!", "yellow"];
  }

  start(encounter) {
    encounter.startMinigame(this.minigame, (ok) => encounter.showOutcome(this.outcome(ok)));
  }

  outcome(ok) {
    if (ok) return new Outcome({ success: true, speech: this.successSpeech, lines: [...this.successLines] });
    return new Outcome({ success: false, speech: this.failSpeech, lines: [this.failReason], gameOver: this.failReason });
  }
}

export class FightApproach extends Approach {
  info(player) {
    return ["Kamp!", "red"];
  }

  start(encounter) {
    encounter.startBattle();
  }
}
