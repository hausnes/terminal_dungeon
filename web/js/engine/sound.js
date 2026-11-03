// Lyd: ein liten chiptune-synthesizer og avspeling med Web Audio.
//
// Alle lydar blir laga matematisk (firkant-, trekant- og sagtannbølgjer og
// støy) – akkurat som i Python-versjonen. Nettlesarar tillèt ikkje lyd før
// brukaren har trykt på noko, så lyden blir slått på ved første tastetrykk.

import { Random } from "../rng.js";

export const RATE = 22050;

const NOTE_INDEX = {
  C: 0, "C#": 1, DB: 1, D: 2, "D#": 3, EB: 3, E: 4, F: 5, "F#": 6,
  GB: 6, G: 7, "G#": 8, AB: 8, A: 9, "A#": 10, BB: 10, B: 11,
};

/** 'A4' -> 440 */
export function noteFreq(note) {
  const name = note.slice(0, -1).toUpperCase();
  const octave = Number(note.slice(-1));
  const midi = 12 * (octave + 1) + NOTE_INDEX[name];
  return 440 * 2 ** ((midi - 69) / 12);
}

// ---------------------------------------------------------------- synth
function wave(kind, phase) {
  switch (kind) {
    case "square": return phase < 0.5 ? 1 : -1;
    case "pulse": return phase < 0.25 ? 1 : -1;
    case "tri": return 4 * Math.abs(phase - 0.5) - 1;
    case "saw": return 2 * phase - 1;
    default: return Math.sin(2 * Math.PI * phase);
  }
}

export function tone(freq, dur, kind = "square", vol = 0.3, o = {}) {
  const { freqEnd = null, attack = 0.004, release = 0.04, vibrato = 0, decay = 0 } = o;
  const n = Math.max(1, Math.floor(RATE * dur));
  const out = new Float32Array(n);
  const a = Math.max(1, Math.floor(attack * RATE));
  const rl = Math.max(1, Math.floor(release * RATE));
  const fEnd = freqEnd ?? freq;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    let f = freq + (fEnd - freq) * t;
    if (vibrato) f *= 1 + 0.03 * Math.sin((2 * Math.PI * vibrato * i) / RATE);
    phase += f / RATE;
    phase -= Math.floor(phase);
    let env = 1;
    if (i < a) env = i / a;
    if (n - i < rl) env *= (n - i) / rl;
    if (decay) env *= (1 - t) ** decay;
    out[i] = wave(kind, phase) * vol * env;
  }
  return out;
}

export function noise(dur, vol = 0.3, smooth = 0, decay = 1, seed = 7) {
  const rng = new Random(seed);
  const n = Math.max(1, Math.floor(RATE * dur));
  const out = new Float32Array(n);
  const k = 1 - smooth;
  let y = 0;
  for (let i = 0; i < n; i++) {
    y += k * (rng.uniform(-1, 1) - y);
    out[i] = y * vol * (1 - i / n) ** decay;
  }
  return out;
}

export function concat(...parts) {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function mixInto(base, part, offset) {
  const end = Math.min(base.length, offset + part.length);
  for (let i = Math.max(0, offset); i < end; i++) base[i] += part[i - offset];
}

export function mix(...parts) {
  const out = new Float32Array(Math.max(...parts.map((p) => p.length)));
  for (const p of parts) mixInto(out, p, 0);
  return out;
}

function arpeggio(notes, step, kind = "square", vol = 0.25, last = null) {
  const parts = notes.slice(0, -1).map((n) => tone(noteFreq(n), step, kind, vol, { release: 0.02 }));
  parts.push(tone(noteFreq(notes[notes.length - 1]), last ?? step * 3, kind, vol, { release: 0.12 }));
  return concat(...parts);
}

const repeat = (part, n) => concat(...Array(n).fill(part));

// ---------------------------------------------------------------- lydeffektar
export const SFX = {
  coin: () => concat(tone(988, 0.05, "square", 0.22), tone(1319, 0.12, "square", 0.22, { release: 0.08 })),
  bigcoin: () => arpeggio(["G5", "B5", "D6", "G6"], 0.045, "square", 0.22),
  jackpot: () => concat(repeat(arpeggio(["C5", "E5", "G5", "C6"], 0.04, "square", 0.22, 0.05), 3),
    tone(2093, 0.4, "square", 0.2, { vibrato: 8, release: 0.2 })),
  item: () => arpeggio(["C5", "E5", "G5", "C6", "E6"], 0.045, "pulse", 0.28),
  heal: () => tone(440, 0.35, "sine", 0.4, { freqEnd: 880, release: 0.15 }),
  hurt: () => mix(noise(0.25, 0.45, 0.3), tone(260, 0.25, "saw", 0.3, { freqEnd: 70 })),
  hit: () => mix(noise(0.12, 0.6, 0.5), tone(160, 0.12, "square", 0.3, { freqEnd: 60 })),
  crit: () => concat(mix(noise(0.1, 0.7), tone(200, 0.1, "square", 0.3, { freqEnd: 50 })),
    tone(1400, 0.15, "square", 0.2, { freqEnd: 1800 })),
  slap: () => mix(noise(0.08, 0.9, 0, 3), tone(900, 0.04, "square", 0.2)),
  coffee: () => concat(tone(500, 0.08, "sine", 0.3, { freqEnd: 300 }), noise(0.35, 0.4, 0.75, 1.5)),
  select: () => tone(880, 0.03, "square", 0.18),
  confirm: () => concat(tone(660, 0.04, "square", 0.2), tone(990, 0.08, "square", 0.2)),
  error: () => tone(110, 0.2, "square", 0.3),
  whoosh: () => noise(0.3, 0.35, 0.6, 0.5),
  dash: () => tone(300, 0.12, "tri", 0.35, { freqEnd: 900 }),
  kick: () => tone(150, 0.16, "sine", 0.9, { freqEnd: 40, release: 0.08 }),
  hat: () => noise(0.04, 0.3, 0, 3),
  clap: () => mix(noise(0.1, 0.55, 0.2, 2), tone(1200, 0.03, "square", 0.1)),
  tick: () => tone(1500, 0.015, "square", 0.15),
  ding: () => tone(1760, 0.3, "sine", 0.35, { release: 0.25 }),
  win: () => arpeggio(["C5", "E5", "G5", "C6", "G5", "C6"], 0.09, "square", 0.22, 0.5),
  lose: () => concat(tone(392, 0.25, "saw", 0.25), tone(370, 0.25, "saw", 0.25), tone(349, 0.25, "saw", 0.25),
    tone(330, 0.8, "saw", 0.25, { vibrato: 6, release: 0.3 })),
  expel: () => concat(tone(80, 0.6, "square", 0.4, { freqEnd: 30, decay: 1 }), noise(0.8, 0.5, 0.85, 1.5)),
  warning: () => repeat(concat(tone(880, 0.12, "square", 0.2), tone(660, 0.12, "square", 0.2)), 3),
  typekey: () => tone(2200, 0.012, "square", 0.08),
  typewrong: () => tone(180, 0.07, "square", 0.25),
  thunder: () => noise(1.6, 0.6, 0.93, 1.2, 3),
  charge: () => tone(200, 0.4, "saw", 0.22, { freqEnd: 600 }),
  zap: () => concat(...[1800, 300, 1600, 250, 1400, 200].map((f) => tone(f, 0.03, "square", 0.2))),
  boom: () => concat(noise(1.2, 0.8, 0.9, 1), tone(60, 0.8, "sine", 0.6, { freqEnd: 30 })),
  yawn: () => tone(500, 0.6, "sine", 0.3, { freqEnd: 200, vibrato: 4 }),
};

// ---------------------------------------------------------------- musikk
const pattern = (s) => s.replaceAll("|", " ").split(/\s+/).filter(Boolean).map((t) => (t === "." || t === "-" ? null : t));

export function buildTrack(bpm, lead, bass, drums, o = {}) {
  const { leadKind = "pulse", leadVol = 0.11, bassVol = 0.17 } = o;
  const step = 60 / bpm / 2; // åttandedelar
  const leadP = pattern(lead);
  const bassP = pattern(bass);
  const drumP = pattern(drums);
  const steps = Math.max(leadP.length, bassP.length);
  const buf = new Float32Array(Math.floor(steps * step * RATE) + 1);
  const cache = new Map();
  const cached = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  leadP.forEach((n, i) => {
    if (n) mixInto(buf, cached(`l${n}`, () => tone(noteFreq(n), step * 0.9, leadKind, leadVol, { release: 0.03 })),
      Math.floor(i * step * RATE));
  });
  bassP.forEach((n, i) => {
    if (n) mixInto(buf, cached(`b${n}`, () => tone(noteFreq(n), step * 0.95, "tri", bassVol, { release: 0.02 })),
      Math.floor(i * step * RATE));
  });
  const kit = {
    K: tone(140, 0.12, "sine", 0.5, { freqEnd: 45, release: 0.05 }),
    S: noise(0.1, 0.2, 0.3, 2),
    H: noise(0.03, 0.07, 0, 3),
  };
  for (let i = 0; i < steps; i++) {
    const d = drumP[i % drumP.length];
    if (!d) continue;
    for (const ch of d) if (kit[ch]) mixInto(buf, kit[ch], Math.floor(i * step * RATE));
  }
  return buf;
}

export const MUSIC = {
  title: () => buildTrack(104,
    "C5 E5 G5 B5 A5 G5 E5 . | A4 C5 E5 G5 F5 E5 C5 . | F4 A4 C5 E5 D5 C5 A4 . | G4 B4 D5 F5 E5 D5 B4 G4",
    "C3 . . . C3 . . . | A2 . . . A2 . . . | F2 . . . F2 . . . | G2 . . . G2 . . .",
    "K . . H S . . H", { leadKind: "tri", leadVol: 0.16 }),
  explore: () => buildTrack(144,
    "E5 . G5 E5 C5 . D5 E5 | F5 . A5 F5 D5 . E5 F5 | G5 . E5 C5 A4 . B4 C5 | D5 E5 D5 C5 B4 . G4 .",
    "C3 C4 C3 C4 C3 C4 C3 C4 | F2 F3 F2 F3 F2 F3 F2 F3 | A2 A3 A2 A3 A2 A3 A2 A3 | G2 G3 G2 G3 G2 G3 B2 G2",
    "K H S H K K S H"),
  battle: () => buildTrack(160,
    "A4 . C5 A4 E5 . D5 C5 | B4 . D5 B4 E5 . . . | A4 . C5 E5 A5 . G5 E5 | F5 E5 D5 B4 C5 B4 G#4 .",
    "A2 A2 A3 A2 A2 A2 A3 A2 | G2 G2 G3 G2 G2 G2 G3 G2 | F2 F2 F3 F2 F2 F2 F3 F2 | E2 E2 E3 E2 E2 E2 E3 E2",
    "K H S H K K S H", { leadKind: "square", leadVol: 0.09 }),
  boss: () => buildTrack(150,
    "D5 . . D5 Eb5 . D5 . | C5 . . A4 Bb4 . A4 . | D5 . F5 . A5 . G5 F5 | E5 . C#5 . A4 . . .",
    "D2 D2 D3 D2 D2 D2 C3 D2 | A1 A1 A2 A1 A1 A1 Bb1 A1 | D2 D2 D3 D2 Bb1 Bb1 Bb2 Bb1 | A1 A1 A2 A1 A1 A1 C#2 A1",
    "K . S K K . S S", { leadKind: "saw", leadVol: 0.08 }),
  victory: () => buildTrack(132,
    "C5 E5 G5 C6 . G5 C6 . | A5 . F5 . A5 C6 A5 . | G5 . E5 G5 C6 . B5 . | C6 . G5 E5 C5 . . .",
    "C3 G3 C3 G3 C3 G3 C3 G3 | F2 C3 F2 C3 F2 C3 F2 C3 | G2 D3 G2 D3 G2 D3 G2 D3 | C3 G3 C3 G3 C3 . . .",
    "K H S H K H S S"),
};

// ---------------------------------------------------------------- avspeling
const STORAGE_KEY = "terminal_dungeon_lyd";

function loadEnabled(fallback) {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

export class SoundManager {
  constructor(enabled = true) {
    this.AudioCtx = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
    this.available = Boolean(this.AudioCtx);
    this.enabled = loadEnabled(enabled);
    this.ctx = null;
    this.buffers = {};
    this.want = null;
    this.musicSrc = null;
    this.active = 0;
  }

  get unlocked() {
    return this.ctx !== null;
  }

  /** Må kallast frå ei brukarhandling (tastetrykk/klikk). */
  unlock() {
    if (!this.available) return;
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    this.ctx = new this.AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    const make = (samples) => {
      const buf = this.ctx.createBuffer(1, samples.length, RATE);
      buf.getChannelData(0).set(samples.map((s) => Math.max(-1, Math.min(1, s))));
      return buf;
    };
    for (const [name, build] of Object.entries(SFX)) this.buffers[name] = make(build());
    for (const [name, build] of Object.entries(MUSIC)) this.buffers[`music_${name}`] = make(build());
    this._startMusic();
  }

  play(name) {
    if (!this.enabled || !this.ctx || this.active > 12) return;
    const buf = this.buffers[name];
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    this.active++;
    src.onended = () => this.active--;
    src.start();
  }

  music(name) {
    name = name || null;
    if (name === this.want) return;
    this.want = name;
    this._stopMusic();
    this._startMusic();
  }

  _startMusic() {
    if (!this.enabled || !this.ctx || !this.want || this.musicSrc) return;
    const buf = this.buffers[`music_${this.want}`];
    if (!buf) return;
    this.musicSrc = this.ctx.createBufferSource();
    this.musicSrc.buffer = buf;
    this.musicSrc.loop = true;
    this.musicSrc.connect(this.master);
    this.musicSrc.start();
  }

  _stopMusic() {
    if (this.musicSrc) {
      try {
        this.musicSrc.stop();
      } catch {
        // allereie stoppa
      }
      this.musicSrc = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      window.localStorage.setItem(STORAGE_KEY, this.enabled ? "1" : "0");
    } catch {
      // lagring er ikkje tilgjengeleg – greitt
    }
    if (this.enabled) {
      this.unlock();
      this._startMusic();
    } else {
      this._stopMusic();
    }
    return this.enabled;
  }
}
