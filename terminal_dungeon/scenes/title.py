"""Tittelskjerm, hjelpeskjerm og pausemeny."""

from __future__ import annotations

from ..config import CANVAS_H, CANVAS_W
from ..engine.screen import RAINBOW
from .base import Scene
from .ui import CONFIRM, DOWN, ENTER, UP, draw_big


class TitleScene(Scene):
    music = "title"

    def __init__(self, game):
        super().__init__(game)
        self.sel = 0
        rng = self.rng
        self.drops = [[rng.uniform(0, CANVAS_W), rng.uniform(0, CANVAS_H), rng.uniform(14, 26)] for _ in range(70)]
        self.next_lightning = rng.uniform(4, 8)
        self.lightning = 0.0

    def options(self):
        return ["Start nytt spel", "Korleis spele?", f"Lyd: {'PÅ' if self.sound.enabled else 'AV'}", "Avslutt"]

    def handle_key(self, key):
        if key in UP:
            self.sel = (self.sel - 1) % 4
            self.sound.play("select")
        elif key in DOWN:
            self.sel = (self.sel + 1) % 4
            self.sound.play("select")
        elif key in CONFIRM:
            self.sound.play("confirm")
            if self.sel == 0:
                self.game.new_run()
            elif self.sel == 1:
                self.game.push(HelpScene(self.game))
            elif self.sel == 2:
                self.sound.toggle()
            else:
                self.game.quit()
        elif key in ("q", "Q"):
            self.game.quit()

    def update(self, dt):
        super().update(dt)
        for d in self.drops:
            d[1] += d[2] * dt
            if d[1] >= CANVAS_H - 1:
                self.fx.burst(d[0], CANVAS_H - 1, 2, ".", ("sky", "blue"), speed=6, life=0.3, gravity=10)
                d[0] = self.rng.uniform(0, CANVAS_W)
                d[1] = -self.rng.uniform(0, 4)
        self.lightning -= dt
        self.next_lightning -= dt
        if self.next_lightning <= 0:
            self.next_lightning = self.rng.uniform(6, 12)
            self.lightning = 0.15
            self.r.flash("navy", 0.12)
            self.sound.play("thunder")

    def draw(self, r):
        for x, y, speed in self.drops:
            r.text(x, y, "|" if speed > 20 else "'", "blue" if speed > 20 else "navy")
        r.text(0, CANVAS_H - 1, "~" * CANVAS_W, "navy")
        self.fx.draw(r)

        shift = int(self.t * 14)
        flash = self.lightning > 0
        draw_big(r, 1, "TERMINAL", lambda x, y: "white" if flash else RAINBOW[(x + y - shift) % len(RAINBOW)])
        draw_big(r, 7, "DUNGEON", lambda x, y: "white" if flash else RAINBOW[(x - y + shift) % len(RAINBOW)])
        r.center(13, "~ Eit eventyr på Amalie Skram VGS i Bergen ~", fg="sky", bold=True)

        r.box(27, 15, 26, 6, "blue", style="round", fill=True)
        for i, opt in enumerate(self.options()):
            selected = i == self.sel
            marker = "▶ " if selected and int(self.t * 3) % 2 == 0 else "  "
            r.text(30, 16 + i, marker + opt, "yellow" if selected else "light", bold=selected)
        r.center(22, "↑↓ vel · ENTER stadfest · ESC pause i spelet", fg="grey")


class HelpScene(Scene):
    overlay = True
    pausable = False

    LINES = [
        ("MÅL", "yellow", "Kom deg forbi Mercedes, Alec og rektor Lars – og få vitnemålet!"),
        ("UTFORSK", "sky", "Piltastar/WASD for å gå. MELLOMROM = spurt."),
        ("", "sky", "Plukk opp pengar og ting som flyg rundt. Unngå lekser § og vikaren V."),
        ("MØTE", "pink", "Vel korleis du kjem forbi: pengar, sexy, utspekulert eller styrke."),
        ("", "pink", "Feilar du, mistar du helse og stats – men du kan prøve noko anna."),
        ("KAMP", "red", "Vel våpen med piltastane. Linjal, matpakke og kritt slår hardare."),
        ("", "red", "Tapar du ein kamp, går du vidare med 1 HP. Mot rektor: game over."),
        ("STATS", "purple", "Styrke, Utspekulert og Sexy (1–10) blir trekt tilfeldig."),
        ("TASTAR", "grey", "ESC = pause (lyd av/på, avslutt)."),
    ]

    def handle_key(self, key):
        self.sound.play("select")
        self.game.pop()

    def draw(self, r):
        r.box(2, 3, 76, 17, "yellow", style="double", title="Korleis spele", fill=True)
        for i, (head, color, text) in enumerate(self.LINES):
            r.text(5, 5 + i, f"{head:<8}", color, bold=True)
            r.text(14, 5 + i, text, "light")
        r.center(17, "Trykk ein tast for å gå tilbake", fg="grey")


class PauseScene(Scene):
    overlay = True
    pausable = False

    def handle_key(self, key):
        if key in ENTER or key == "\x1b":
            self.sound.play("select")
            self.game.pop()
        elif key in ("m", "M"):
            self.sound.toggle()
        elif key in ("t", "T"):
            self.game.to_title()
        elif key in ("q", "Q"):
            self.game.quit()

    def draw(self, r):
        r.box(24, 7, 32, 10, "sky", style="double", title="PAUSE", fill=True)
        r.text(28, 9, "ENTER / ESC  Hald fram", "white")
        r.text(28, 10, f"M            Lyd {'AV' if self.sound.enabled else 'PÅ'}", "white")
        r.text(28, 11, "T            Til tittelskjermen", "white")
        r.text(28, 12, "Q            Avslutt spelet", "white")
        if not self.sound.available:
            r.text(28, 14, "(Fann ingen lydavspelar)", "grey")
