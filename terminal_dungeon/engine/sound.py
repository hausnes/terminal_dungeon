"""Lyd: ein liten chiptune-synthesizer og ein lydavspelar.

Alle lydar blir laga matematisk (firkantbølgjer, trekantbølgjer og støy),
lagra som WAV-filer i ein cache-mappe første gong, og spelt av med
systemet sin innebygde avspelar (afplay på macOS, paplay/aplay på Linux,
winsound på Windows). Ingen eksterne pakkar trengst.
"""

from __future__ import annotations

import array
import math
import os
import random
import shutil
import subprocess
import sys
import tempfile
import threading
import wave

RATE = 22050
VERSION = 1

_NOTE_INDEX = {
    "C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4, "F": 5, "F#": 6,
    "GB": 6, "G": 7, "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11,
}


def note_freq(note: str) -> float:
    """'A4' -> 440.0"""
    name, octave = note[:-1].upper(), int(note[-1])
    midi = 12 * (octave + 1) + _NOTE_INDEX[name]
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---------------------------------------------------------------- synth
def _zeros(n: int) -> array.array:
    return array.array("f", bytes(4 * n))


def _wave(kind: str, phase: float) -> float:
    if kind == "square":
        return 1.0 if phase < 0.5 else -1.0
    if kind == "pulse":
        return 1.0 if phase < 0.25 else -1.0
    if kind == "tri":
        return 4.0 * abs(phase - 0.5) - 1.0
    if kind == "saw":
        return 2.0 * phase - 1.0
    return math.sin(2 * math.pi * phase)


def tone(freq, dur, kind="square", vol=0.3, freq_end=None, attack=0.004, release=0.04, vibrato=0.0, decay=0.0):
    n = max(1, int(RATE * dur))
    out = _zeros(n)
    phase = 0.0
    a = max(1, int(attack * RATE))
    rl = max(1, int(release * RATE))
    f_end = freq if freq_end is None else freq_end
    for i in range(n):
        t = i / n
        f = freq + (f_end - freq) * t
        if vibrato:
            f *= 1 + 0.03 * math.sin(2 * math.pi * vibrato * i / RATE)
        phase += f / RATE
        phase -= int(phase)
        env = 1.0
        if i < a:
            env = i / a
        if n - i < rl:
            env *= (n - i) / rl
        if decay:
            env *= (1 - t) ** decay
        out[i] = _wave(kind, phase) * vol * env
    return out


def noise(dur, vol=0.3, smooth=0.0, decay=1.0, seed=7):
    rng = random.Random(seed)
    n = max(1, int(RATE * dur))
    out = _zeros(n)
    y = 0.0
    k = 1.0 - smooth
    for i in range(n):
        x = rng.uniform(-1, 1)
        y += k * (x - y)
        out[i] = y * vol * (1 - i / n) ** decay
    return out


def silence(dur):
    return _zeros(int(RATE * dur))


def concat(*parts):
    out = array.array("f")
    for p in parts:
        out.extend(p)
    return out


def mix_into(base, part, offset: int):
    end = min(len(base), offset + len(part))
    for i in range(max(0, offset), end):
        base[i] += part[i - offset]


def mix(*parts):
    out = _zeros(max(len(p) for p in parts))
    for p in parts:
        mix_into(out, p, 0)
    return out


def save_wav(path: str, samples):
    ints = array.array("h", (int(max(-1.0, min(1.0, s)) * 32000) for s in samples))
    if sys.byteorder == "big":
        ints.byteswap()
    tmp = path + ".tmp"
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(ints.tobytes())
    os.replace(tmp, path)


def arpeggio(notes, step, kind="square", vol=0.25, last=None):
    parts = [tone(note_freq(n), step, kind, vol, release=0.02) for n in notes[:-1]]
    parts.append(tone(note_freq(notes[-1]), last or step * 3, kind, vol, release=0.12))
    return concat(*parts)


# ---------------------------------------------------------------- lydeffektar
SFX = {
    "coin": lambda: concat(tone(988, 0.05, "square", 0.22), tone(1319, 0.12, "square", 0.22, release=0.08)),
    "bigcoin": lambda: arpeggio(["G5", "B5", "D6", "G6"], 0.045, "square", 0.22),
    "jackpot": lambda: concat(*[arpeggio(["C5", "E5", "G5", "C6"], 0.04, "square", 0.22, last=0.05)] * 3,
                              tone(2093, 0.4, "square", 0.2, vibrato=8, release=0.2)),
    "item": lambda: arpeggio(["C5", "E5", "G5", "C6", "E6"], 0.045, "pulse", 0.28),
    "heal": lambda: tone(440, 0.35, "sine", 0.4, freq_end=880, release=0.15),
    "hurt": lambda: mix(noise(0.25, 0.45, smooth=0.3), tone(260, 0.25, "saw", 0.3, freq_end=70)),
    "hit": lambda: mix(noise(0.12, 0.6, smooth=0.5), tone(160, 0.12, "square", 0.3, freq_end=60)),
    "crit": lambda: concat(mix(noise(0.1, 0.7), tone(200, 0.1, "square", 0.3, freq_end=50)),
                           tone(1400, 0.15, "square", 0.2, freq_end=1800)),
    "slap": lambda: mix(noise(0.08, 0.9, decay=3), tone(900, 0.04, "square", 0.2)),
    "coffee": lambda: concat(tone(500, 0.08, "sine", 0.3, freq_end=300), noise(0.35, 0.4, smooth=0.75, decay=1.5)),
    "select": lambda: tone(880, 0.03, "square", 0.18),
    "confirm": lambda: concat(tone(660, 0.04, "square", 0.2), tone(990, 0.08, "square", 0.2)),
    "error": lambda: tone(110, 0.2, "square", 0.3),
    "whoosh": lambda: noise(0.3, 0.35, smooth=0.6, decay=0.5),
    "dash": lambda: tone(300, 0.12, "tri", 0.35, freq_end=900),
    "kick": lambda: tone(150, 0.16, "sine", 0.9, freq_end=40, release=0.08),
    "hat": lambda: noise(0.04, 0.3, decay=3),
    "clap": lambda: mix(noise(0.1, 0.55, smooth=0.2, decay=2), tone(1200, 0.03, "square", 0.1)),
    "tick": lambda: tone(1500, 0.015, "square", 0.15),
    "ding": lambda: tone(1760, 0.3, "sine", 0.35, release=0.25),
    "win": lambda: arpeggio(["C5", "E5", "G5", "C6", "G5", "C6"], 0.09, "square", 0.22, last=0.5),
    "lose": lambda: concat(tone(392, 0.25, "saw", 0.25), tone(370, 0.25, "saw", 0.25),
                           tone(349, 0.25, "saw", 0.25), tone(330, 0.8, "saw", 0.25, vibrato=6, release=0.3)),
    "expel": lambda: concat(tone(80, 0.6, "square", 0.4, freq_end=30, decay=1),
                            noise(0.8, 0.5, smooth=0.85, decay=1.5)),
    "warning": lambda: concat(*[concat(tone(880, 0.12, "square", 0.2), tone(660, 0.12, "square", 0.2))] * 3),
    "typekey": lambda: tone(2200, 0.012, "square", 0.08),
    "typewrong": lambda: tone(180, 0.07, "square", 0.25),
    "thunder": lambda: noise(1.6, 0.6, smooth=0.93, decay=1.2, seed=3),
    "charge": lambda: tone(200, 0.4, "saw", 0.22, freq_end=600),
    "zap": lambda: concat(*[tone(f, 0.03, "square", 0.2) for f in (1800, 300, 1600, 250, 1400, 200)]),
    "boom": lambda: concat(noise(1.2, 0.8, smooth=0.9, decay=1), tone(60, 0.8, "sine", 0.6, freq_end=30)),
    "yawn": lambda: tone(500, 0.6, "sine", 0.3, freq_end=200, vibrato=4),
}


# ---------------------------------------------------------------- musikk
def _pattern(s: str):
    return [None if tok in (".", "-") else tok for tok in s.replace("|", " ").split()]


def build_track(bpm, lead, bass, drums, lead_kind="pulse", lead_vol=0.11, bass_vol=0.17, repeats=3):
    step = 60.0 / bpm / 2  # åttandedelar
    lead_p, bass_p, drum_p = _pattern(lead), _pattern(bass), _pattern(drums)
    steps = max(len(lead_p), len(bass_p))
    buf = _zeros(int(steps * step * RATE) + 1)
    cache: dict = {}

    def cached(key, maker):
        if key not in cache:
            cache[key] = maker()
        return cache[key]

    for i, n in enumerate(lead_p):
        if n:
            mix_into(buf, cached(("l", n), lambda: tone(note_freq(n), step * 0.9, lead_kind, lead_vol, release=0.03)),
                     int(i * step * RATE))
    for i, n in enumerate(bass_p):
        if n:
            mix_into(buf, cached(("b", n), lambda: tone(note_freq(n), step * 0.95, "tri", bass_vol, release=0.02)),
                     int(i * step * RATE))
    kit = {
        "K": tone(140, 0.12, "sine", 0.5, freq_end=45, release=0.05),
        "S": noise(0.10, 0.2, smooth=0.3, decay=2),
        "H": noise(0.03, 0.07, decay=3),
    }
    for i in range(steps):
        d = drum_p[i % len(drum_p)]
        if d:
            for ch in d:
                if ch in kit:
                    mix_into(buf, kit[ch], int(i * step * RATE))
    out = array.array("f")
    for _ in range(repeats):
        out.extend(buf)
    return out


MUSIC = {
    "title": lambda: build_track(
        104,
        "C5 E5 G5 B5 A5 G5 E5 . | A4 C5 E5 G5 F5 E5 C5 . | F4 A4 C5 E5 D5 C5 A4 . | G4 B4 D5 F5 E5 D5 B4 G4",
        "C3 . . . C3 . . . | A2 . . . A2 . . . | F2 . . . F2 . . . | G2 . . . G2 . . .",
        "K . . H S . . H",
        lead_kind="tri", lead_vol=0.16,
    ),
    "explore": lambda: build_track(
        144,
        "E5 . G5 E5 C5 . D5 E5 | F5 . A5 F5 D5 . E5 F5 | G5 . E5 C5 A4 . B4 C5 | D5 E5 D5 C5 B4 . G4 .",
        "C3 C4 C3 C4 C3 C4 C3 C4 | F2 F3 F2 F3 F2 F3 F2 F3 | A2 A3 A2 A3 A2 A3 A2 A3 | G2 G3 G2 G3 G2 G3 B2 G2",
        "K H S H K K S H",
    ),
    "battle": lambda: build_track(
        160,
        "A4 . C5 A4 E5 . D5 C5 | B4 . D5 B4 E5 . . . | A4 . C5 E5 A5 . G5 E5 | F5 E5 D5 B4 C5 B4 G#4 .",
        "A2 A2 A3 A2 A2 A2 A3 A2 | G2 G2 G3 G2 G2 G2 G3 G2 | F2 F2 F3 F2 F2 F2 F3 F2 | E2 E2 E3 E2 E2 E2 E3 E2",
        "K H S H K K S H",
        lead_kind="square", lead_vol=0.09,
    ),
    "boss": lambda: build_track(
        150,
        "D5 . . D5 Eb5 . D5 . | C5 . . A4 Bb4 . A4 . | D5 . F5 . A5 . G5 F5 | E5 . C#5 . A4 . . .",
        "D2 D2 D3 D2 D2 D2 C3 D2 | A1 A1 A2 A1 A1 A1 Bb1 A1 | D2 D2 D3 D2 Bb1 Bb1 Bb2 Bb1 | A1 A1 A2 A1 A1 A1 C#2 A1",
        "K . S K K . S S",
        lead_kind="saw", lead_vol=0.08,
    ),
    "victory": lambda: build_track(
        132,
        "C5 E5 G5 C6 . G5 C6 . | A5 . F5 . A5 C6 A5 . | G5 . E5 G5 C6 . B5 . | C6 . G5 E5 C5 . . .",
        "C3 G3 C3 G3 C3 G3 C3 G3 | F2 C3 F2 C3 F2 C3 F2 C3 | G2 D3 G2 D3 G2 D3 G2 D3 | C3 G3 C3 G3 C3 . . .",
        "K H S H K H S S",
    ),
}


# ---------------------------------------------------------------- avspeling
class _Backend:
    def __init__(self):
        self.kind = None
        self.base: list[str] = []
        self.ws = None
        if sys.platform == "darwin" and shutil.which("afplay"):
            self.kind, self.base = "proc", ["afplay"]
        elif sys.platform.startswith("win"):
            try:
                import winsound

                self.kind, self.ws = "winsound", winsound
            except ImportError:
                pass
        else:
            for cmd in (["paplay"], ["pw-play"], ["aplay", "-q"]):
                if shutil.which(cmd[0]):
                    self.kind, self.base = "proc", cmd
                    break


class SoundManager:
    MAX_SFX = 6

    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self.backend = _Backend()
        self.available = self.backend.kind is not None
        self.paths: dict[str, str] = {}
        self._procs: list[subprocess.Popen] = []
        self._want_music: str | None = None
        self._music_thread: threading.Thread | None = None
        self._music_stop = threading.Event()
        self._lock = threading.Lock()
        self._dir = self._cache_dir() if self.available else None
        if self._dir:
            threading.Thread(target=self._prepare, daemon=True).start()

    @staticmethod
    def _cache_dir():
        bases = [os.path.join(os.path.expanduser("~"), ".cache", "terminal_dungeon"),
                 os.path.join(tempfile.gettempdir(), "terminal_dungeon")]
        for base in bases:
            path = os.path.join(base, f"lyd_v{VERSION}")
            try:
                os.makedirs(path, exist_ok=True)
                if os.access(path, os.W_OK):
                    return path
            except OSError:
                continue
        return None

    def _prepare(self):
        jobs = list(SFX.items()) + [("music_" + k, v) for k, v in MUSIC.items()]
        for name, builder in jobs:
            path = os.path.join(self._dir, name + ".wav")
            try:
                if not os.path.exists(path):
                    save_wav(path, builder())
            except Exception:
                continue
            self.paths[name] = path
            if name == f"music_{self._want_music}":
                self._start_music()

    # -------------------------------------------------------- lydeffektar
    def play(self, name: str):
        if not (self.enabled and self.available):
            return
        path = self.paths.get(name)
        if not path:
            return
        if self.backend.kind == "winsound":
            ws = self.backend.ws
            ws.PlaySound(path, ws.SND_FILENAME | ws.SND_ASYNC | ws.SND_NODEFAULT)
            return
        self._procs = [p for p in self._procs if p.poll() is None]
        if len(self._procs) >= self.MAX_SFX:
            return
        try:
            self._procs.append(self._spawn(path))
        except OSError:
            pass

    def _spawn(self, path):
        return subprocess.Popen(
            self.backend.base + [path],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

    # -------------------------------------------------------- musikk
    def music(self, name: str | None):
        name = name or None
        if name == self._want_music:
            return
        self._want_music = name
        self._stop_music()
        if name:
            self._start_music()

    def _start_music(self):
        with self._lock:
            if not (self.enabled and self.available) or self.backend.kind != "proc":
                return
            if self._music_thread and self._music_thread.is_alive():
                return
            path = self.paths.get(f"music_{self._want_music}")
            if not path:
                return
            stop = threading.Event()
            self._music_stop = stop
            self._music_thread = threading.Thread(target=self._music_loop, args=(path, stop), daemon=True)
            self._music_thread.start()

    def _music_loop(self, path, stop: threading.Event):
        while not stop.is_set():
            try:
                proc = self._spawn(path)
            except OSError:
                return
            while proc.poll() is None:
                if stop.wait(0.05):
                    proc.terminate()
                    try:
                        proc.wait(timeout=1)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                    return

    def _stop_music(self):
        with self._lock:
            self._music_stop.set()
            thread, self._music_thread = self._music_thread, None
        if thread:
            thread.join(timeout=1.0)

    # -------------------------------------------------------- styring
    def toggle(self) -> bool:
        self.enabled = not self.enabled
        if self.enabled:
            self._start_music()
        else:
            self._stop_music()
            for p in self._procs:
                p.terminate()
            self._procs.clear()
        return self.enabled

    def shutdown(self):
        self.enabled = False
        self._stop_music()
        for p in self._procs:
            try:
                p.terminate()
            except OSError:
                pass
