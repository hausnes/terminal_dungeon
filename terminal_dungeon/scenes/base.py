"""Grunnklassen for alle scener."""

from __future__ import annotations

from ..engine.effects import Effects


class Scene:
    music: str | None = None  # None = arv musikken frå scena under, "" = stille
    overlay = False  # teiknar scena under seg (t.d. pausemenyen)
    pausable = True  # ESC opnar pausemenyen

    def __init__(self, game):
        self.game = game
        self.t = 0.0
        self.fx = Effects(game.rng)
        self._timers: list[list] = []
        self._child_cb = None

    # snarvegar
    @property
    def player(self):
        return self.game.player

    @property
    def sound(self):
        return self.game.sound

    @property
    def rng(self):
        return self.game.rng

    @property
    def r(self):
        return self.game.r

    # livssyklus
    def enter(self):
        pass

    def resume(self, result=None):
        cb, self._child_cb = self._child_cb, None
        if cb:
            cb(result)

    def push_child(self, scene, callback):
        """Legg ei ny scene oppå denne, og kall callback(resultat) når ho er ferdig."""
        self._child_cb = callback
        self.game.push(scene)

    def after(self, delay: float, fn):
        self._timers.append([delay, fn])

    def update(self, dt: float):
        self.t += dt
        self.fx.update(dt)
        if self._timers:
            due = []
            for timer in self._timers:
                timer[0] -= dt
                if timer[0] <= 0:
                    due.append(timer)
            for timer in due:
                self._timers.remove(timer)
                timer[1]()

    def handle_key(self, key):
        pass

    def draw(self, r):
        pass
