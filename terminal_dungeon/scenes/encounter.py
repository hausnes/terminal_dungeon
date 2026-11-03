"""Møte med ein fiende: dialog, og val av korleis du vil kome forbi."""

from __future__ import annotations

from ..model.approaches import KIND_STYLE, Outcome
from .base import Scene
from .ui import CONFIRM, DOWN, UP, TypeWriter, draw_hud, wrap


class EncounterScene(Scene):
    BUBBLE_W = 40

    def __init__(self, game, enemy, stage):
        super().__init__(game)
        self.enemy = enemy
        self.stage = stage
        self.music = "boss" if enemy.is_boss else "battle"
        self.approaches = enemy.approaches()
        self.used: set[int] = set()
        self.sel = 0
        self.phase = "intro"
        self.speech = TypeWriter(enemy.intro, self.BUBBLE_W - 4)
        self.narration: TypeWriter | None = None
        self.outcome: Outcome | None = None
        self.mood_t = 0.0
        self.busy = False
        self._leaving = False

    def enter(self):
        self.sound.play("whoosh")

    # ------------------------------------------------------------ handlingar
    def start_battle(self):
        from .battle import BattleScene

        self.busy = True
        self.push_child(BattleScene(self.game, self.enemy), self._after_battle)

    def start_minigame(self, key, callback):
        from .minigames import MINIGAMES

        self.busy = True
        self.push_child(MINIGAMES[key](self.game, self.player, self.enemy), callback)

    def _after_battle(self, result):
        if result == "won":
            self.show_outcome(Outcome(True, self.enemy.fight_won, [f"Du slo {self.enemy.name}! Vegen vidare er open."]))
        else:
            self.show_outcome(Outcome(True, self.enemy.fight_lost,
                                      ["Du tapte kampen, men kjem deg vidare med 1 HP. Det blir tøft mot rektor..."],
                                      mood="bad"))

    def show_outcome(self, outcome: Outcome):
        self.busy = False
        self.outcome = outcome
        self.phase = "outcome"
        self.speech = TypeWriter(outcome.speech, self.BUBBLE_W - 4)
        self.narration = TypeWriter(" ".join(outcome.lines), 74, cps=70)
        self.mood_t = 0.6
        if outcome.mood == "good":
            self.sound.play("win")
            self.fx.burst(20, 6, 30, "*+·★", ("gold", "yellow", "lime", "white"), speed=20, life=0.9)
        else:
            self.sound.play("hurt" if not outcome.game_over else "lose")
            self.r.shake(2, 0.35)
            self.r.flash("darkred", 0.1)
            if outcome.hp_lost:
                self.fx.text(62, 22, f"-{outcome.hp_lost} HP", "red", life=1.4)

    def _finish_outcome(self):
        o = self.outcome
        if o.game_over:
            self.game.game_over(o.game_over, o.game_over_title)
        elif not self.player.alive:
            self.game.game_over(f"Du svima av framfor {self.enemy.name}. Nokon ringde helsesjukepleiaren.")
        elif o.success:
            self.game.stage_cleared()
        else:
            self.phase = "menu"
            self.speech = TypeWriter("Noko meir du vil prøve deg på?", self.BUBBLE_W - 4)
            self._select_next()
            self.outcome = None

    def _select_next(self):
        for i in range(len(self.approaches)):
            j = (self.sel + i) % len(self.approaches)
            if j not in self.used:
                self.sel = j
                return

    # ------------------------------------------------------------ input
    def handle_key(self, key):
        if self.busy:
            return
        if self.phase == "intro":
            if key in CONFIRM:
                if not self.speech.done:
                    self.speech.skip()
                else:
                    self.phase = "menu"
                    self.sound.play("confirm")
        elif self.phase == "menu":
            if key in UP or key in DOWN:
                step = -1 if key in UP else 1
                for _ in range(len(self.approaches)):
                    self.sel = (self.sel + step) % len(self.approaches)
                    if self.sel not in self.used:
                        break
                self.sound.play("select")
            elif key in CONFIRM:
                if not self.speech.done:
                    self.speech.skip()
                    return
                self.sound.play("confirm")
                self.used.add(self.sel)
                self.approaches[self.sel].start(self)
        elif self.phase == "outcome" and self.outcome is not None and key in CONFIRM:
            if not (self.speech.done and self.narration.done):
                self.speech.skip()
                self.narration.skip()
            elif not self._leaving:
                self.sound.play("select")
                if self.outcome.success or self.outcome.game_over:
                    self._leaving = True
                self._finish_outcome()

    def update(self, dt):
        super().update(dt)
        self.speech.update(dt)
        if self.narration:
            self.narration.update(dt)
        self.mood_t = max(0.0, self.mood_t - dt)

    # ------------------------------------------------------------ teikning
    def draw(self, r):
        enemy = self.enemy
        r.center(0, f"── {enemy.location} ──", fg="grey")
        slide = max(0.0, 1.0 - self.t / 0.5)
        px = 1 - int(slide * 40)
        jiggle = 1 if self.mood_t > 0 and int(self.t * 20) % 2 == 0 else 0
        for i, line in enumerate(enemy.art):
            r.text(px + jiggle, 1 + i, line, enemy.color, bold=True)

        bx = 80 - self.BUBBLE_W - 1
        r.text(bx, 1, enemy.name.upper(), enemy.color, bold=True)
        r.text(bx + len(enemy.name) + 1, 1, f"· {enemy.title}", "grey")
        r.box(bx, 2, self.BUBBLE_W, 10, "white", style="round")
        r.text(bx - 1, 6, "◀", "white", bold=True)
        self.speech.draw(r, bx + 2, 3, "white", max_lines=8)

        if self.phase == "outcome" and self.narration:
            color = "lime" if self.outcome and self.outcome.mood == "good" else "orange"
            r.box(0, 13, 80, 9, color, style="round", title="Kva skjedde")
            self.narration.draw(r, 2, 15, "white", max_lines=5)
            if self.speech.done and self.narration.done and int(self.t * 2) % 2 == 0:
                r.text(66, 20, "▼ ENTER", "yellow", bold=True)
        elif self.phase == "menu" or self.phase == "intro":
            active = self.phase == "menu"
            r.box(0, 13, 80, 9, "yellow" if active else "dark", style="round",
                  title=f"Korleis vil du kome forbi {enemy.name}?")
            for i, ap in enumerate(self.approaches):
                y = 14 + i
                used = i in self.used
                tag, tag_color = KIND_STYLE[ap.kind]
                selected = active and i == self.sel
                marker = "▶" if selected else " "
                r.text(2, y, marker, "yellow", bold=True)
                r.text(4, y, f"[{tag:^11}]", "dark" if used else tag_color, bold=not used)
                r.text(19, y, ap.label, "dark" if used else "yellow" if selected else "white", bold=selected)
                if used:
                    r.text(62, y, "(prøvd)", "dark")
                else:
                    info, info_color = ap.info(self.player)
                    r.text(62, y, info, info_color, bold=True)
            if active:
                desc = self.approaches[self.sel].description
                for j, line in enumerate(wrap(desc, 74)[:2]):
                    r.text(3, 19 + j, line, "light")
            elif self.speech.done and int(self.t * 2) % 2 == 0:
                r.text(66, 20, "▼ ENTER", "yellow", bold=True)

        r.text(0, 22, "↑↓ vel · ENTER stadfest · ESC pause", "grey")
        draw_hud(r, self.player, 23)
        self.fx.draw(r)
