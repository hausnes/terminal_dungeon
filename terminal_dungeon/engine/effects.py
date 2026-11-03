"""Visuelle effektar: partiklar, flytande tekst og prosjektil."""

from __future__ import annotations

import math
import random


class Effect:
    alive = True

    def update(self, dt: float):
        pass

    def draw(self, r):
        pass


class Particle(Effect):
    def __init__(self, x, y, vx, vy, life, chars="*+.", colors=("white",), gravity=0.0):
        self.x, self.y, self.vx, self.vy = x, y, vx, vy
        self.life = life
        self.age = 0.0
        self.chars = chars
        self.colors = colors
        self.gravity = gravity

    def update(self, dt):
        self.age += dt
        if self.age >= self.life:
            self.alive = False
            return
        self.vy += self.gravity * dt
        self.x += self.vx * dt
        self.y += self.vy * dt

    def draw(self, r):
        f = self.age / self.life
        ch = self.chars[min(len(self.chars) - 1, int(f * len(self.chars)))]
        color = self.colors[min(len(self.colors) - 1, int(f * len(self.colors)))]
        r.text(round(self.x), round(self.y), ch, color, bold=f < 0.5)


class FloatingText(Effect):
    def __init__(self, x, y, text, color="white", life=1.0, rise=3.0):
        self.x, self.y = x, y
        self.text = text
        self.color = color
        self.life = life
        self.rise = rise
        self.age = 0.0

    def update(self, dt):
        self.age += dt
        if self.age >= self.life:
            self.alive = False

    def draw(self, r):
        y = self.y - self.rise * self.age
        r.text(round(self.x - len(self.text) / 2), round(y), self.text, self.color, bold=True)


class Projectile(Effect):
    """Noko som flyg frå A til B, og kallar on_arrive når det treff."""

    def __init__(self, x0, y0, x1, y1, duration, glyph, color, on_arrive=None, arc=2.0):
        self.x0, self.y0, self.x1, self.y1 = x0, y0, x1, y1
        self.duration = duration
        self.glyph = glyph
        self.color = color
        self.on_arrive = on_arrive
        self.arc = arc
        self.age = 0.0
        self.trail: list[tuple[float, float]] = []

    def pos(self):
        f = min(1.0, self.age / self.duration)
        x = self.x0 + (self.x1 - self.x0) * f
        y = self.y0 + (self.y1 - self.y0) * f - self.arc * math.sin(math.pi * f)
        return x, y

    def update(self, dt):
        self.trail.append(self.pos())
        self.trail = self.trail[-4:]
        self.age += dt
        if self.age >= self.duration and self.alive:
            self.alive = False
            if self.on_arrive:
                self.on_arrive()

    def draw(self, r):
        for i, (x, y) in enumerate(self.trail[:-1]):
            r.text(round(x), round(y), "·", self.color, dim=True)
        x, y = self.pos()
        r.text(round(x), round(y), self.glyph, self.color, bold=True)


class Effects:
    """Ei samling effektar som blir oppdatert og teikna saman."""

    def __init__(self, rng=None):
        self.items: list[Effect] = []
        self.rng = rng or random.Random()

    def add(self, effect: Effect) -> Effect:
        self.items.append(effect)
        return effect

    def burst(self, x, y, n=12, chars="*+·.", colors=("gold", "yellow", "white"), speed=12.0, life=0.6, gravity=8.0):
        for _ in range(n):
            ang = self.rng.uniform(0, 2 * math.pi)
            sp = self.rng.uniform(0.3, 1.0) * speed
            self.add(
                Particle(
                    x, y, math.cos(ang) * sp, math.sin(ang) * sp * 0.5,
                    life * self.rng.uniform(0.6, 1.2), chars, colors, gravity,
                )
            )

    def text(self, x, y, s, color="white", life=1.0, rise=3.0):
        return self.add(FloatingText(x, y, s, color, life, rise))

    def projectile(self, x0, y0, x1, y1, glyph, color, on_arrive=None, duration=0.45, arc=2.0):
        return self.add(Projectile(x0, y0, x1, y1, duration, glyph, color, on_arrive, arc))

    def clear(self):
        self.items.clear()

    def update(self, dt):
        for e in list(self.items):
            e.update(dt)
        self.items = [e for e in self.items if e.alive]

    def draw(self, r):
        for e in self.items:
            e.draw(r)
