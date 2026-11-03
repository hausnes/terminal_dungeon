// Eigenskapane til spelaren: Styrke, Utspekulert og Sexy.

import { STAT_MAX } from "../config.js";

export const STAT_INFO = {
  styrke: { label: "Styrke", short: "STY", color: "red", desc: "Meir skade i kamp, og litt meir helse." },
  utspekulert: { label: "Utspekulert", short: "UTS", color: "purple", desc: "Lur, stjel og snakk deg ut av ting." },
  sexy: { label: "Sexy", short: "SEX", color: "pink", desc: "Sjarmer folk til å gi deg ting." },
};

export class Stats {
  static MAX = STAT_MAX;
  static NAMES = Object.keys(STAT_INFO);

  constructor(styrke = 1, utspekulert = 1, sexy = 1) {
    this.values = {};
    [styrke, utspekulert, sexy].forEach((v, i) => {
      this.values[Stats.NAMES[i]] = Stats.clamp(v);
    });
  }

  static clamp(value) {
    return Math.max(0, Math.min(Stats.MAX, Math.trunc(value)));
  }

  static roll(rng) {
    return new Stats(...Stats.NAMES.map(() => rng.randint(1, Stats.MAX)));
  }

  get(name) {
    return this.values[name];
  }

  /** Endrar ein stat og returnerer kor mykje han faktisk endra seg. */
  change(name, delta) {
    const old = this.values[name];
    this.values[name] = Stats.clamp(old + delta);
    return this.values[name] - old;
  }

  entries() {
    return Object.entries(this.values);
  }
}
