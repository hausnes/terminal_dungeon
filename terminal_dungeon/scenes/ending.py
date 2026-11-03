"""Game over og siger (vitnemål med fyrverkeri)."""

from __future__ import annotations

from ..engine.screen import RAINBOW
from ..model.stats import STAT_INFO
from .base import Scene
from .ui import ENTER, big_width, draw_big, wrap


def _summary(game) -> list[tuple[str, str]]:
    p = game.player
    if p is None:
        return []
    rec = p.record
    return [
        (f"Kroner samla: {rec['kroner']}", "gold"),
        (f"Ting funne: {rec['ting']}", "cyan"),
        (f"Skade gjort: {rec['skade']}", "red"),
        (f"Kom til etappe {min(game.stage_index + 1, len(game.level.stages))} av {len(game.level.stages)}", "sky"),
    ]


class GameOverScene(Scene):
    music = ""
    pausable = False

    def __init__(self, game, reason, title="GAME OVER"):
        super().__init__(game)
        self.reason = reason
        self.title = title

    def enter(self):
        self.sound.play("expel" if self.title != "GAME OVER" else "lose")
        self.r.shake(2, 0.5)

    def handle_key(self, key):
        if self.t < 1.0:
            return
        if key in ENTER:
            self.sound.play("confirm")
            self.game.new_run()
        elif key in ("t", "T"):
            self.game.to_title()
        elif key in ("q", "Q", "\x1b"):
            self.game.quit()

    def update(self, dt):
        super().update(dt)
        if self.rng.random() < dt * 20:
            self.fx.burst(self.rng.uniform(0, 80), 0, 1, "|!:.", ("red", "darkred"), speed=1, life=1.6, gravity=12)

    def draw(self, r):
        self.fx.draw(r)
        jitter = self.rng.randint(-2, 2) if self.t < 1.2 else 0
        x = (80 - big_width(self.title)) // 2 + jitter
        draw_big(r, 3, self.title, lambda cx, cy: "red" if (cx + cy + int(self.t * 10)) % 7 else "darkred", x=x)
        for i, line in enumerate(wrap(self.reason, 66)[:3]):
            r.center(10 + i, line, fg="white", bold=True)
        for i, (text, color) in enumerate(_summary(self.game)):
            r.center(14 + i, text, fg=color)
        if self.t > 1.0:
            r.center(20, "ENTER = prøv igjen  ·  T = tittel  ·  Q = avslutt", fg="yellow", bold=True)


class VictoryScene(Scene):
    music = "victory"
    pausable = False

    def __init__(self, game):
        super().__init__(game)
        self.next_firework = 0.2

    def enter(self):
        self.sound.play("win")

    def handle_key(self, key):
        if self.t < 1.5:
            return
        if key in ENTER:
            self.sound.play("confirm")
            self.game.new_run()
        elif key in ("t", "T"):
            self.game.to_title()
        elif key in ("q", "Q", "\x1b"):
            self.game.quit()

    def update(self, dt):
        super().update(dt)
        self.next_firework -= dt
        if self.next_firework <= 0:
            self.next_firework = self.rng.uniform(0.25, 0.7)
            x = self.rng.choice([self.rng.uniform(3, 18), self.rng.uniform(62, 77)])
            y = self.rng.uniform(2, 12)
            colors = self.rng.choice([("gold", "yellow"), ("magenta", "pink"), ("cyan", "sky"), ("lime", "green")])
            self.fx.burst(x, y, 28, "*+·.", colors + ("white",), speed=18, life=1.2, gravity=5)
            if self.rng.random() < 0.5:
                self.sound.play("hat")

    def draw(self, r):
        p = self.player
        self.fx.draw(r)
        shift = int(self.t * 12)
        draw_big(r, 1, "VITNEMÅL", lambda x, y: RAINBOW[(x + shift) % len(RAINBOW)])
        r.box(16, 7, 48, 14, "gold", style="double", fill=True)
        r.center(8, "AMALIE SKRAM VIDAREGÅANDE SKULE", fg="gold", bold=True)
        r.center(9, "─" * 30, fg="gold")
        r.center(10, "Det blir med dette stadfesta at", fg="light")
        r.center(11, p.name.upper(), fg="white", bold=True)
        r.center(12, "har fullført og bestått vidaregåande opplæring.", fg="light")
        x = 22
        for name, value in p.stats.items():
            info = STAT_INFO[name]
            s = f"{info['label']}: {value}"
            r.text(x, 14, s, info["color"], bold=True)
            x += len(s) + 3
        r.center(15, f"Helse att: {p.hp}/{p.max_hp}  ·  Kroner att: {p.money}", fg="lime")
        r.center(16, f"Samla {p.record['kroner']} kr · {p.record['ting']} ting · {p.record['skade']} skade", fg="grey")
        r.text(40, 18, "Lars, rektor (motvillig)", "purple")
        r.text(40, 19, "~~~~~~~~~~~~~~~~~~~~~~~", "purple")
        if self.t > 1.5:
            r.center(22, "Gratulerer! ENTER = spel igjen  ·  T = tittel  ·  Q = avslutt", fg="yellow", bold=True)
