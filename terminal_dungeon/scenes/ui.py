"""Felles UI-hjelparar: tastar, HUD, stor skrift og skrivemaskintekst."""

from __future__ import annotations

import curses
import textwrap

from ..art import FONT
from ..config import CANVAS_W
from ..model.stats import STAT_INFO, Stats

UP = (curses.KEY_UP, "w", "W")
DOWN = (curses.KEY_DOWN, "s", "S")
LEFT = (curses.KEY_LEFT, "a", "A")
RIGHT = (curses.KEY_RIGHT, "d", "D")
ENTER = ("\n", "\r", curses.KEY_ENTER)
CONFIRM = ENTER + (" ",)
BACKSPACE = (curses.KEY_BACKSPACE, "\x7f", "\b", "\x08")


def hp_color(frac: float) -> str:
    return "lime" if frac > 0.6 else "yellow" if frac > 0.3 else "red"


def hp_bar(r, x, y, w, hp, max_hp, label=True):
    frac = hp / max_hp if max_hp else 0
    r.bar(x, y, w, frac, hp_color(frac))
    if label:
        r.text(x + w + 1, y, f"{hp}/{max_hp}", hp_color(frac), bold=True)


def stat_pips(value: int) -> str:
    return "■" * value + "□" * (Stats.MAX - value)


def draw_hud(r, player, y=23):
    """Ei linje med namn, helse, pengar, stats og våpen."""
    if player is None:
        return
    x = 0
    r.text(x, y, player.name[:12], "white", bold=True)
    x += min(12, len(player.name)) + 1
    r.text(x, y, "♥", "red", bold=True)
    hp_bar(r, x + 2, y, 10, player.hp, player.max_hp)
    x += 2 + 10 + 7
    money = f"{player.money} kr"
    r.text(x, y, money, "gold", bold=True)
    x += len(money) + 2
    for name, value in player.stats.items():
        info = STAT_INFO[name]
        s = f"{info['short']} {value}"
        r.text(x, y, s, info["color"], bold=True)
        x += len(s) + 1
    x += 1
    for w in player.inventory.values():
        if w.uses:
            s = f"{w.glyph}{w.uses_text()}"
            r.text(x, y, s, w.color, bold=True)
            x += len(s) + 1


def big_width(s: str) -> int:
    glyphs = [FONT.get(c.upper(), FONT[" "]) for c in s]
    return sum(len(g[0]) for g in glyphs) + max(0, len(glyphs) - 1)


def draw_big(r, y, s, color_fn, x=None, bold=True):
    """Teiknar tekst med blokkskrifta. color_fn(x, y) -> farge."""
    if x is None:
        x = (CANVAS_W - big_width(s)) // 2
    cx = x
    for ch in s:
        glyph = FONT.get(ch.upper(), FONT[" "])
        for row, line in enumerate(glyph):
            for i, c in enumerate(line):
                if c != " ":
                    r.text(cx + i, y + row, c, color_fn(cx + i, y + row), bold=bold)
        cx += len(glyph[0]) + 1


def wrap(text: str, width: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        lines.extend(textwrap.wrap(para, width) or [""])
    return lines


class TypeWriter:
    """Tekst som kjem fram bokstav for bokstav."""

    def __init__(self, text: str, width: int, cps: float = 55.0):
        self.lines = wrap(text, width) if text else []
        self.total = sum(len(line) for line in self.lines)
        self.shown = 0.0
        self.cps = cps

    @property
    def done(self) -> bool:
        return self.shown >= self.total

    def skip(self):
        self.shown = self.total

    def update(self, dt):
        self.shown = min(self.total, self.shown + self.cps * dt)

    def draw(self, r, x, y, fg="white", max_lines=10, bold=False):
        left = int(self.shown)
        for i, line in enumerate(self.lines[:max_lines]):
            if left <= 0:
                break
            r.text(x, y + i, line[:left], fg, bold=bold)
            left -= len(line)
