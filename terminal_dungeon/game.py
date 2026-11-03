"""Game: hovudløkka, scene-stabelen og flyten gjennom spelet."""

from __future__ import annotations

import curses
import time

from .config import CANVAS_H, CANVAS_W, FPS, MAX_DT
from .engine.screen import Renderer
from .model.level import amalie_skram


class Transition:
    """Ein diagonal "wipe" mellom to scener."""

    DURATION = 0.35

    def __init__(self, game, factory):
        self.game = game
        self.factory = factory
        self.phase = "out"
        self.t = 0.0

    def update(self, dt):
        self.t += dt
        if self.phase == "out" and self.t >= self.DURATION:
            self.game.replace(self.factory())
            self.phase, self.t = "in", 0.0
        elif self.phase == "in" and self.t >= self.DURATION:
            if self.game.transition is self:
                self.game.transition = None

    def draw(self, r):
        f = min(1.0, self.t / self.DURATION)
        if self.phase == "in":
            f = 1.0 - f
        edge = int(f * (CANVAS_W + CANVAS_H + 6)) - 3
        for y in range(CANVAS_H):
            w = edge - (CANVAS_H - 1 - y)
            if w > 0:
                r.text(0, y, "█" * min(w, CANVAS_W), "navy")
            r.text(max(0, w), y, "▓▒░", "blue")


class Game:
    def __init__(self, stdscr, sound, rng, start_stage: int = 0):
        self.scr = stdscr
        self.r = Renderer(stdscr)
        self.sound = sound
        self.rng = rng
        self.stack: list = []
        self.transition: Transition | None = None
        self.running = True
        self.player = None
        self.level = None
        self.stage_index = 0
        self.start_stage = start_stage

    # ------------------------------------------------------------ scene-stabel
    @property
    def top(self):
        return self.stack[-1] if self.stack else None

    def push(self, scene):
        self.stack.append(scene)
        scene.enter()
        self._sync_music()

    def pop(self, result=None):
        if self.stack:
            self.stack.pop()
        if self.stack:
            self.top.resume(result)
        self._sync_music()

    def replace(self, scene):
        self.stack = [scene]
        scene.enter()
        self._sync_music()

    def fade_to(self, factory):
        self.transition = Transition(self, factory)

    def _sync_music(self):
        name = ""
        for scene in reversed(self.stack):
            if scene.music is not None:
                name = scene.music
                break
        self.sound.music(name)

    # ------------------------------------------------------------ spelflyt
    def new_run(self):
        from .scenes.character import CharacterScene

        self.level = amalie_skram()
        self.stage_index = min(self.start_stage, len(self.level.stages) - 1)
        self.fade_to(lambda: CharacterScene(self))

    def start_level(self, player):
        self.player = player
        self.begin_stage()

    def begin_stage(self):
        from .scenes.explore import ExploreScene

        stage = self.level.stages[self.stage_index]
        index, total = self.stage_index, len(self.level.stages)
        self.fade_to(lambda: ExploreScene(self, stage, index, total))

    def stage_cleared(self):
        from .scenes.ending import VictoryScene

        self.stage_index += 1
        if self.stage_index >= len(self.level.stages):
            self.fade_to(lambda: VictoryScene(self))
        else:
            self.begin_stage()

    def game_over(self, reason: str, title: str = "GAME OVER"):
        from .scenes.ending import GameOverScene

        self.fade_to(lambda: GameOverScene(self, reason, title))

    def to_title(self):
        from .scenes.title import TitleScene

        self.fade_to(lambda: TitleScene(self))

    def quit(self):
        self.running = False

    # ------------------------------------------------------------ hovudløkke
    def run(self):
        frame = 1.0 / FPS
        last = time.monotonic()
        while self.running and self.stack:
            start = time.monotonic()
            dt = min(start - last, MAX_DT)
            last = start
            self._handle_input()
            if not self.r.too_small:
                if self.top:
                    self.top.update(dt)
                if self.transition:
                    self.transition.update(dt)
            self._draw(dt)
            spent = time.monotonic() - start
            if spent < frame:
                time.sleep(frame - spent)

    ARROWS = {"A": curses.KEY_UP, "B": curses.KEY_DOWN, "C": curses.KEY_RIGHT, "D": curses.KEY_LEFT}

    def _read_keys(self) -> list:
        keys = []
        for _ in range(64):
            try:
                keys.append(self.scr.get_wch())
            except curses.error:
                break
        # Nokre terminalar sender piltastar som rå ESC-sekvensar curses ikkje kjenner att.
        out, i = [], 0
        while i < len(keys):
            k = keys[i]
            if (k == "\x1b" and i + 2 < len(keys) and keys[i + 1] in ("[", "O")
                    and keys[i + 2] in self.ARROWS):
                out.append(self.ARROWS[keys[i + 2]])
                i += 3
                continue
            out.append(k)
            i += 1
        return out

    def _handle_input(self):
        from .scenes.title import PauseScene

        for key in self._read_keys():
            if key == curses.KEY_RESIZE or self.transition is not None:
                continue
            top = self.top
            if top is None:
                return
            if key == "\x1b" and top.pausable:
                self.push(PauseScene(self))
                continue
            top.handle_key(key)

    def _draw(self, dt):
        r = self.r
        r.begin_frame(dt)
        if r.too_small:
            r.draw_size_warning()
            r.end_frame()
            return
        start = len(self.stack) - 1
        while start > 0 and self.stack[start].overlay:
            start -= 1
        for scene in self.stack[start:]:
            scene.draw(r)
        if self.transition:
            self.transition.draw(r)
        r.end_frame()
