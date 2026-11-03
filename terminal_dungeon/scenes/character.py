"""Innskriving: vel namn, og la spelet trekkje stats med ein spelautomat-effekt."""

from __future__ import annotations

from ..config import START_MONEY
from ..model.player import Player
from ..model.stats import STAT_INFO, Stats
from .base import Scene
from .ui import BACKSPACE, ENTER, stat_pips

BEST = {
    "styrke": "Du er sterk som ein Brann-supporter etter tap.",
    "utspekulert": "Du kunne ha selt paraply til ein bergensar.",
    "sexy": "Folk snur seg etter deg på Torgallmenningen.",
}
WORST = {
    "styrke": "Men du slit med å opne ein yoghurt.",
    "utspekulert": "Men du gløymer alltid kva du skulle lyge om.",
    "sexy": "Men du går med sandalar og sokkar. Heile året.",
}


def flavour(stats: Stats) -> list[str]:
    values = dict(stats.items())
    best = max(values, key=values.get)
    worst = min(values, key=values.get)
    if values[best] == values[worst]:
        return ["Du er heilt gjennomsnittleg. Det er òg ein slags superkraft."]
    return [BEST[best], WORST[worst]]


class CharacterScene(Scene):
    music = "title"
    MAX_NAME = 12
    SETTLE = 0.6
    GAP = 0.45

    def __init__(self, game):
        super().__init__(game)
        self.phase = "name"
        self.name = ""
        self.rerolls = 2
        self.hero: Player | None = None
        self.roll_t = 0.0
        self.settled = [False] * 4
        self.tick_t = 0.0

    @property
    def rolling(self):
        return not all(self.settled)

    def start_roll(self):
        self.hero = Player(self.name, Stats.roll(self.rng), self.rng.randint(*START_MONEY))
        self.roll_t = 0.0
        self.settled = [False] * 4
        self.phase = "roll"
        self.sound.play("dash")

    def handle_key(self, key):
        if self.phase == "name":
            if key in ENTER:
                self.name = self.name.strip() or "Eleven"
                self.start_roll()
            elif key in BACKSPACE:
                self.name = self.name[:-1]
                self.sound.play("typekey")
            elif isinstance(key, str) and len(key) == 1 and key.isprintable() and len(self.name) < self.MAX_NAME:
                self.name += key
                self.sound.play("typekey")
        elif self.phase == "roll" and not self.rolling:
            if key in ENTER:
                self.sound.play("confirm")
                self.game.start_level(self.hero)
            elif key in ("r", "R") and self.rerolls > 0:
                self.rerolls -= 1
                self.start_roll()

    def update(self, dt):
        super().update(dt)
        if self.phase != "roll" or not self.rolling:
            return
        self.roll_t += dt
        self.tick_t -= dt
        if self.tick_t <= 0:
            self.tick_t = 0.07
            self.sound.play("tick")
        for i in range(4):
            if not self.settled[i] and self.roll_t >= self.SETTLE + i * self.GAP:
                self.settled[i] = True
                self.sound.play("ding")
                self.fx.burst(37, 5 + i * 2, 10, "*+·", ("gold", "yellow", "white"), speed=14, life=0.5)

    def draw(self, r):
        r.box(0, 0, 80, 24, "sky", style="double", title="INNSKRIVING · AMALIE SKRAM VGS")
        if self.phase == "name":
            r.center(5, "Velkomen som ny elev!", fg="yellow", bold=True)
            r.center(7, "Kva heiter du?", fg="white")
            r.box(25, 9, 30, 3, "yellow", style="round")
            cursor = "_" if int(self.t * 3) % 2 == 0 else " "
            r.text(27, 10, self.name + cursor, "white", bold=True)
            r.center(13, "Skriv namnet ditt og trykk ENTER", fg="grey")
            r.center(16, "Stats blir trekte tilfeldig etterpå. Kvar runde blir unik!", fg="sky")
            return

        hero = self.hero
        r.center(2, f"Elevkort for {hero.name}", fg="yellow", bold=True)
        for i, name in enumerate(Stats.NAMES):
            info = STAT_INFO[name]
            y = 5 + i * 2
            value = hero.stats[name] if self.settled[i] else self.rng.randint(1, Stats.MAX)
            r.text(10, y, f"{info['label']:<12}", info["color"], bold=True)
            r.text(24, y, stat_pips(value), info["color"] if self.settled[i] else "grey")
            r.text(36, y, f"{value:>2}", "white", bold=True)
            r.text(41, y, info["desc"], "grey")
        y = 11
        money = hero.money if self.settled[3] else self.rng.randint(*START_MONEY)
        r.text(10, y, "Lommepengar", "gold", bold=True)
        r.text(24, y, f"{money} kr", "gold", bold=True)
        r.text(41, y, "Du treng meir. Mykje meir.", "grey")

        if not self.rolling:
            r.text(10, 13, f"Helse: {hero.max_hp} HP (24 + styrke)", "lime")
            for j, line in enumerate(flavour(hero.stats)):
                r.center(15 + j, line, fg="sky")
            r.center(19, "ENTER = start spelet", fg="yellow", bold=True)
            if self.rerolls:
                r.center(20, f"R = trekk på nytt ({self.rerolls} att)", fg="light")
        self.fx.draw(r)
