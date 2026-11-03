// Tilfeldigheit med same metodar som Python sin random-modul.
// Gi eit frø (seed) for å få same rekkjefølgje kvar gong, t.d. ?seed=42 i adressa.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Random {
  constructor(seed = null) {
    this._next = seed === null || seed === undefined ? Math.random : mulberry32(seed);
  }

  random() {
    return this._next();
  }

  /** Heiltal frå og med a til og med b. */
  randint(a, b) {
    return a + Math.floor(this._next() * (b - a + 1));
  }

  uniform(a, b) {
    return a + (b - a) * this._next();
  }

  choice(items) {
    return items[Math.floor(this._next() * items.length)];
  }

  /** Vel eitt element med vekting. */
  choices(items, weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = this._next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }

  shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this._next() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  sample(items, k) {
    return this.shuffle([...items]).slice(0, k);
  }
}
