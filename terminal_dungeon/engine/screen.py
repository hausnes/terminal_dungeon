"""Teiknemotor: ein tynn, objektorientert innpakning rundt curses.

Renderer-klassen tek seg av fargar, klipping, risting av skjermen og blink,
slik at resten av spelet berre treng å seie "teikn denne teksten her".
"""

from __future__ import annotations

import curses
import random

from ..config import CANVAS_H, CANVAS_W

# namn -> (256-fargar, fallback i 8-fargar)
PALETTE = {
    "white": (231, 7),
    "light": (252, 7),
    "grey": (245, 7),
    "dark": (240, 4),
    "red": (196, 1),
    "darkred": (124, 1),
    "orange": (208, 3),
    "yellow": (226, 3),
    "gold": (220, 3),
    "green": (40, 2),
    "lime": (118, 2),
    "darkgreen": (28, 2),
    "cyan": (51, 6),
    "sky": (117, 6),
    "blue": (33, 4),
    "navy": (19, 4),
    "magenta": (201, 5),
    "pink": (218, 5),
    "purple": (141, 5),
    "brown": (130, 3),
    "coffee": (137, 3),
    "skin": (223, 7),
    "black": (16, 0),
}

RAINBOW = [196, 202, 208, 214, 220, 226, 190, 154, 118, 82, 46, 48, 51, 45, 39, 33, 63, 93, 129, 165, 201, 199]


def approx_basic(index: int) -> int:
    """Gjer om ein 256-farge til næraste av dei 8 grunnfargane."""
    if index < 16:
        return index % 8 or 7
    if index >= 232:
        return 7
    index -= 16
    r, g, b = index // 36, (index // 6) % 6, index % 6
    bits = (1 if r >= 3 else 0) | (2 if g >= 3 else 0) | (4 if b >= 3 else 0)
    return bits or 4


class Renderer:
    BOX = {
        "single": "┌┐└┘─│",
        "double": "╔╗╚╝═║",
        "round": "╭╮╰╯─│",
        "heavy": "┏┓┗┛━┃",
    }

    def __init__(self, stdscr):
        self.scr = stdscr
        self.has_colors = curses.has_colors()
        self.rich = self.has_colors and curses.COLORS >= 256
        self.max_pairs = curses.COLOR_PAIRS if self.has_colors else 0
        self._pairs: dict[tuple[int, int], int] = {}
        self._attrs: dict[tuple, int] = {}
        self._next_pair = 1
        self.rows, self.cols = stdscr.getmaxyx()
        self.ox = self.oy = 0  # kvar lerretet ligg på skjermen
        self.sx = self.sy = 0  # risting
        self.too_small = False
        self._shake_t = 0.0
        self._shake_p = 0
        self._flash_t = 0.0
        self._flash_c = "red"
        self.rng = random.Random()

    # ------------------------------------------------------------ fargar
    def _color_num(self, color) -> int:
        if color is None:
            return -1
        if isinstance(color, str):
            rich, basic = PALETTE[color]
        else:
            rich, basic = color, approx_basic(color)
        return rich if self.rich else basic

    def pair(self, fg, bg=None) -> int:
        key = (self._color_num(fg), self._color_num(bg))
        if key in self._pairs:
            return self._pairs[key]
        if not self.has_colors or self._next_pair >= self.max_pairs:
            return 0
        try:
            curses.init_pair(self._next_pair, key[0], key[1])
        except curses.error:
            return 0
        self._pairs[key] = self._next_pair
        self._next_pair += 1
        return self._pairs[key]

    def attr(self, fg="white", bg=None, bold=False, dim=False, reverse=False, underline=False) -> int:
        key = (fg, bg, bold, dim, reverse, underline)
        cached = self._attrs.get(key)
        if cached is not None:
            return cached
        a = curses.color_pair(self.pair(fg, bg))
        if bold:
            a |= curses.A_BOLD
        if dim:
            a |= curses.A_DIM
        if reverse:
            a |= curses.A_REVERSE
        if underline:
            a |= curses.A_UNDERLINE
        self._attrs[key] = a
        return a

    # ------------------------------------------------------------ effektar
    def shake(self, power: int = 1, duration: float = 0.25):
        self._shake_p = max(self._shake_p if self._shake_t > 0 else 0, power)
        self._shake_t = max(self._shake_t, duration)

    def flash(self, color: str = "red", duration: float = 0.08):
        self._flash_c = color
        self._flash_t = duration

    # ------------------------------------------------------------ ramme
    def begin_frame(self, dt: float):
        self.rows, self.cols = self.scr.getmaxyx()
        self.too_small = self.rows < CANVAS_H or self.cols < CANVAS_W
        self.ox = max(0, (self.cols - CANVAS_W) // 2)
        self.oy = max(0, (self.rows - CANVAS_H) // 2)
        if self._shake_t > 0:
            self._shake_t -= dt
            p = self._shake_p
            self.sx = self.rng.randint(-2 * p, 2 * p)
            self.sy = self.rng.randint(-1, 1) if p >= 2 else 0
        else:
            self.sx = self.sy = 0
        bg = 0
        if self._flash_t > 0:
            self._flash_t -= dt
            bg = curses.color_pair(self.pair("white", self._flash_c))
        try:
            self.scr.bkgd(" ", bg)
        except curses.error:
            pass
        self.scr.erase()

    def end_frame(self):
        self.scr.refresh()

    def draw_size_warning(self):
        lines = [
            "Terminalvindauget er for lite!",
            f"Spelet treng minst {CANVAS_W}x{CANVAS_H}, du har {self.cols}x{self.rows}.",
            "Gjer vindauget større (eller zoom ut med Cmd/Ctrl og minus).",
        ]
        for i, line in enumerate(lines):
            if i >= self.rows:
                break
            try:
                self.scr.addstr(i, 0, line[: max(0, self.cols - 1)], self.attr("yellow", bold=True))
            except curses.error:
                pass

    # ------------------------------------------------------------ teikning
    def text(self, x, y, s, fg="white", bg=None, bold=False, dim=False, reverse=False, underline=False):
        if not s:
            return
        x, y = int(x), int(y)
        if y < 0 or y >= CANVAS_H:
            return
        if x < 0:
            s = s[-x:]
            x = 0
        if x + len(s) > CANVAS_W:
            s = s[: CANVAS_W - x]
        if not s:
            return
        sy = self.oy + y + self.sy
        sx = self.ox + x + self.sx
        if sy < 0 or sy >= self.rows:
            return
        if sx < 0:
            s = s[-sx:]
            sx = 0
        if sx + len(s) > self.cols:
            s = s[: self.cols - sx]
        if sy == self.rows - 1 and sx + len(s) >= self.cols:
            s = s[: self.cols - 1 - sx]
        if not s:
            return
        try:
            self.scr.addstr(sy, sx, s, self.attr(fg, bg, bold, dim, reverse, underline))
        except curses.error:
            pass

    def center(self, y, s, **kw):
        self.text((CANVAS_W - len(s)) // 2, y, s, **kw)

    def box(self, x, y, w, h, fg="white", style="single", title=None, title_fg=None, fill=False, bold=False):
        tl, tr, bl, br, hz, vt = self.BOX[style]
        self.text(x, y, tl + hz * (w - 2) + tr, fg, bold=bold)
        for i in range(1, h - 1):
            if fill:
                self.text(x + 1, y + i, " " * (w - 2))
            self.text(x, y + i, vt, fg, bold=bold)
            self.text(x + w - 1, y + i, vt, fg, bold=bold)
        self.text(x, y + h - 1, bl + hz * (w - 2) + br, fg, bold=bold)
        if title:
            self.text(x + 2, y, f" {title} ", title_fg or fg, bold=True)

    def fill(self, x, y, w, h, ch=" ", fg="white", bg=None):
        for i in range(h):
            self.text(x, y + i, ch * w, fg, bg)

    def bar(self, x, y, w, frac, fg="green", empty_fg="dark", full="█", empty="░"):
        n = max(0, min(w, int(round(frac * w))))
        self.text(x, y, full * n, fg)
        self.text(x + n, y, empty * (w - n), empty_fg)
