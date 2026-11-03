"""Utforsking: spring rundt i gangen og fang pengar og ting som fyk rundt."""

from __future__ import annotations

import math

from ..model.items import BigCoin, CinnamonBun, Coin, LotteryTicket, Wallet, WEAPON_TYPES
from .base import Scene
from .ui import DOWN, LEFT, RIGHT, UP, draw_big, draw_hud

# Spelbart område i lerret-koordinatar (inklusive)
AX0, AX1 = 1, 78
AY0, AY1 = 4, 20


class Mover:
    """Noko som flyg rundt og sprett i veggar og pultar."""

    def __init__(self, x, y, vx, vy):
        self.x, self.y, self.vx, self.vy = x, y, vx, vy

    @property
    def cell(self):
        return int(round(self.x)), int(round(self.y))

    def step(self, dt, blocked):
        nx = self.x + self.vx * dt
        if blocked(int(round(nx)), int(round(self.y))):
            self.vx = -self.vx
            nx = self.x
        ny = self.y + self.vy * dt
        if blocked(int(round(nx)), int(round(ny))):
            self.vy = -self.vy
            ny = self.y
        self.x, self.y = nx, ny


class Pickup(Mover):
    def __init__(self, item, x, y, vx, vy):
        super().__init__(x, y, vx, vy)
        self.item = item
        self.age = 0.0


class Homework(Mover):
    glyph, color, damage = "§", "red", 2


class Substitute:
    """Vikaren: går sakte mot deg og tek pengar i «mobilbot»."""

    glyph, color = "V", "magenta"

    def __init__(self, x, y, speed):
        self.x, self.y, self.speed = float(x), float(y), speed

    @property
    def cell(self):
        return int(round(self.x)), int(round(self.y))

    def step(self, dt, tx, ty, blocked):
        dx, dy = tx - self.x, ty - self.y
        if abs(dx) > 0.5:
            nx = self.x + math.copysign(self.speed * dt, dx)
            if not blocked(int(round(nx)), int(round(self.y))):
                self.x = nx
        if abs(dy) > 0.5:
            ny = self.y + math.copysign(self.speed * 0.5 * dt, dy)
            if not blocked(int(round(self.x)), int(round(ny))):
                self.y = ny


class ExploreScene(Scene):
    music = "explore"
    READY_TIME = 2.2
    WARNING_TIME = 2.0
    DASH_COOLDOWN = 1.2

    def __init__(self, game, stage, index, total):
        super().__init__(game)
        self.stage = stage
        self.index = index
        self.total = total
        self.enemy = stage.enemy()
        self.phase = "ready"
        self.phase_t = 0.0
        self.elapsed = 0.0
        self.px, self.py = 40, 12
        self.last_dir = (1, 0)
        self.dash_cd = 0.0
        self.invuln = 0.0
        self.leaving = False
        self.spawn_t = 0.0
        self.last_tick = 99
        self.obstacles = self._make_obstacles()
        self.pickups: list[Pickup] = []
        self.hazards = [self._make_homework() for _ in range(stage.hazards)]
        self.chasers: list[Substitute] = []
        self.specials = self._schedule_specials()

    # ------------------------------------------------------------ oppsett
    def _make_obstacles(self):
        rng = self.rng
        desks = []
        for bx, by in ((9, 7), (63, 7), (9, 16), (63, 16), (36, 7)):
            desks.append((bx + rng.randint(-3, 3), by + rng.randint(-1, 1), 8, 2))
        return desks

    def _make_homework(self):
        x, y, vx, vy = self._edge_launch(self.rng.uniform(7, 11))
        return Homework(x, y, vx, vy)

    def _schedule_specials(self):
        rng, t = self.rng, self.stage.explore_time
        specials = []
        for _ in range(self.stage.weapons):
            specials.append((rng.uniform(1.0, t - 2.0), rng.choice(WEAPON_TYPES)()))
        specials.append((rng.uniform(2.0, t - 1.5), Wallet(rng.randint(35, 70))))
        if rng.random() < 0.65:
            specials.append((rng.uniform(1.0, t - 2.0), CinnamonBun()))
        if rng.random() < 0.2:
            specials.append((rng.uniform(2.0, t - 2.0), LotteryTicket()))
        specials.sort(key=lambda s: s[0])
        return specials

    def blocked(self, x, y):
        if x < AX0 or x > AX1 or y < AY0 or y > AY1:
            return True
        for ox, oy, w, h in self.obstacles:
            if ox <= x < ox + w and oy <= y < oy + h:
                return True
        return False

    def _edge_launch(self, speed):
        rng = self.rng
        side = rng.choice("lrtb")
        if side == "l":
            x, y, ang = AX0, rng.uniform(AY0, AY1), 0.0
        elif side == "r":
            x, y, ang = AX1, rng.uniform(AY0, AY1), math.pi
        elif side == "t":
            x, y, ang = rng.uniform(AX0, AX1), AY0, math.pi / 2
        else:
            x, y, ang = rng.uniform(AX0, AX1), AY1, -math.pi / 2
        ang += rng.uniform(-1.0, 1.0)
        return x, y, math.cos(ang) * speed, math.sin(ang) * speed * 0.5

    def launch(self, item):
        x, y, vx, vy = self._edge_launch(self.rng.uniform(*item.speed))
        self.pickups.append(Pickup(item, x, y, vx, vy))
        self.fx.burst(x, y, 5, "·.", (item.color, "grey"), speed=5, life=0.3, gravity=0)

    # ------------------------------------------------------------ input
    def handle_key(self, key):
        if self.phase == "warning" or self.leaving:
            return
        if key in UP:
            self._move(0, -1, 1)
        elif key in DOWN:
            self._move(0, 1, 1)
        elif key in LEFT:
            self._move(-1, 0, 2)
        elif key in RIGHT:
            self._move(1, 0, 2)
        elif key == " " and self.dash_cd <= 0:
            self._dash()

    def _move(self, dx, dy, steps):
        self.last_dir = (dx, dy)
        for _ in range(steps):
            nx, ny = self.px + dx, self.py + dy
            if self.blocked(nx, ny):
                break
            self.px, self.py = nx, ny
            self._collect()

    def _dash(self):
        dx, dy = self.last_dir
        steps = 9 if dx else 4
        self.dash_cd = self.DASH_COOLDOWN
        self.sound.play("dash")
        for _ in range(steps):
            nx, ny = self.px + dx, self.py + dy
            if self.blocked(nx, ny):
                break
            self.fx.burst(self.px, self.py, 1, "░·", ("sky", "blue"), speed=2, life=0.35, gravity=0)
            self.px, self.py = nx, ny
            self._collect()

    # ------------------------------------------------------------ logikk
    def _collect(self):
        for p in list(self.pickups):
            cx, cy = p.cell
            if abs(cx - self.px) <= 1 and cy == self.py:
                self.pickups.remove(p)
                msg = p.item.apply(self.player)
                self.sound.play(p.item.sound)
                self.fx.burst(cx, cy, 14, "*+·.", (p.item.color, "yellow", "white"), speed=14, life=0.6)
                self.fx.text(cx, cy - 1, msg, p.item.color, life=1.0)

    def _hit_player(self, damage, text, money=0):
        if self.invuln > 0:
            return
        self.invuln = 1.3
        lost = self.player.hurt(damage)
        stolen = self.player.lose_money(money) if money else 0
        self.sound.play("hurt")
        self.r.shake(1, 0.25)
        self.r.flash("darkred", 0.08)
        label = f"-{lost} HP" + (f" -{stolen} kr" if stolen else "")
        self.fx.text(self.px, self.py - 1, label, "red")
        self.fx.burst(self.px, self.py, 8, "x*·", ("red", "orange"), speed=10, life=0.5)
        if not self.player.alive and not self.leaving:
            self.leaving = True
            self.game.game_over(text)

    def update(self, dt):
        super().update(dt)
        self.dash_cd = max(0.0, self.dash_cd - dt)
        self.invuln = max(0.0, self.invuln - dt)
        self.phase_t += dt

        if self.phase == "ready" and self.phase_t >= self.READY_TIME:
            self.phase, self.phase_t = "play", 0.0
            self.sound.play("confirm")
        elif self.phase == "play":
            self._update_play(dt)
        elif self.phase == "warning" and self.phase_t >= self.WARNING_TIME and not self.leaving:
            self.leaving = True
            enemy, stage = self.enemy, self.stage
            from .encounter import EncounterScene

            self.game.fade_to(lambda: EncounterScene(self.game, enemy, stage))

        for p in list(self.pickups):
            p.step(dt, self.blocked)
            p.age += dt
            if p.age > p.item.lifetime:
                self.pickups.remove(p)
                self.fx.burst(p.x, p.y, 3, "·", ("grey",), speed=3, life=0.3, gravity=0)
        if self.phase != "ready":
            self._collect()

    def _update_play(self, dt):
        self.elapsed += dt
        left = self.time_left
        if left <= 0:
            self.phase, self.phase_t = "warning", 0.0
            self.sound.play("warning")
            self.r.shake(1, 0.4)
            return
        whole = int(math.ceil(left))
        if whole <= 3 and whole != self.last_tick:
            self.last_tick = whole
            self.sound.play("tick")

        # nye myntar
        self.spawn_t -= dt
        if self.spawn_t <= 0:
            self.spawn_t = self.stage.spawn_interval * self.rng.uniform(0.6, 1.4)
            self.launch(Coin() if self.rng.random() < 0.85 else BigCoin())
        while self.specials and self.specials[0][0] <= self.elapsed:
            self.launch(self.specials.pop(0)[1])

        # vikarar kjem etter litt
        if len(self.chasers) < self.stage.chasers and self.elapsed > 2.0:
            corner = self.rng.choice([(AX0 + 1, AY0), (AX1 - 1, AY0), (AX0 + 1, AY1), (AX1 - 1, AY1)])
            self.chasers.append(Substitute(*corner, speed=5.5 + self.index))
            self.sound.play("whoosh")

        for h in self.hazards:
            h.step(dt, self.blocked)
            if h.cell == (self.px, self.py):
                self._hit_player(h.damage, "Du drukna i lekser og svima av i gangen.")
        for c in self.chasers:
            c.step(dt, self.px, self.py, self.blocked)
            if c.cell == (self.px, self.py) and self.invuln <= 0:
                self._hit_player(2, "Vikaren konfiskerte både mobilen og motet ditt.", money=5)
                c.x, c.y = (AX1 - 1, AY0) if self.px < 40 else (AX0 + 1, AY1)

    @property
    def time_left(self):
        return max(0.0, self.stage.explore_time - self.elapsed)

    # ------------------------------------------------------------ teikning
    def draw(self, r):
        stage = self.stage
        draw_hud(r, self.player, 0)
        r.text(0, 1, f"{stage.title} av {self.total}", stage.color, bold=True)
        r.text(len(stage.title) + 6, 1, f"· {stage.location}", "light")

        r.box(0, 2, 80, 20, stage.color, style="round")
        lockers = ("▐▒▒▌" * 20)[: AX1 - AX0 + 1]
        r.text(AX0, 3, lockers, "navy")
        for y in range(AY0, AY1 + 1, 2):
            for x in range(2 + (y % 4), AX1, 8):
                r.text(x, y, "·", "dark")
        for ox, oy, w, h in self.obstacles:
            r.text(ox, oy, "▄" * w, "brown")
            r.text(ox, oy + 1, "▀" * w, "coffee")

        for p in self.pickups:
            remaining = p.item.lifetime - p.age
            if remaining > 1.5 or int(self.t * 10) % 2 == 0:
                r.text(*p.cell, p.item.glyph, p.item.color, bold=True)
        for h in self.hazards:
            r.text(*h.cell, h.glyph, h.color, bold=True)
        for c in self.chasers:
            r.text(*c.cell, c.glyph, c.color, bold=True)

        if self.invuln <= 0 or int(self.t * 12) % 2 == 0:
            r.text(self.px, self.py, "@", "yellow", bold=True)
        self.fx.draw(r)

        self._draw_timer(r)
        self._draw_legend(r)
        if self.phase == "ready":
            self._draw_ready(r)
        elif self.phase == "warning":
            self._draw_warning(r)

    def _draw_timer(self, r):
        frac = self.time_left / self.stage.explore_time
        color = "lime" if frac > 0.5 else "yellow" if frac > 0.25 else "red"
        label = f"{self.enemy.name} dukkar opp om {self.time_left:4.1f} s "
        r.text(1, 22, label, color, bold=True)
        r.bar(len(label) + 1, 22, 30, frac, color)
        dash = "SPURT KLAR" if self.dash_cd <= 0 else "spurt ...."
        r.text(68, 22, dash, "sky" if self.dash_cd <= 0 else "dark", bold=True)

    def _draw_legend(self, r):
        legend = [("¤", "gold", "5kr"), ("Ø", "orange", "20kr"), ("▣", "lime", "lommebok"),
                  ("★", "magenta", "lodd"), ("♥", "pink", "bolle"), ("╪", "cyan", "linjal"),
                  ("&", "green", "matpakke"), ("¦", "white", "kritt"), ("§", "red", "lekse!"),
                  ("V", "magenta", "vikar!")]
        x = 1
        for glyph, color, label in legend:
            r.text(x, 23, glyph, color, bold=True)
            r.text(x + 1, 23, label, "grey")
            x += len(label) + 2

    def _draw_ready(self, r):
        r.box(14, 8, 52, 8, self.stage.color, style="double", fill=True)
        r.center(9, f"{self.stage.title.upper()} · {self.stage.location}", fg=self.stage.color, bold=True)
        r.center(11, "Fang pengar og ting som fyk rundt!", fg="white")
        r.center(12, f"Om {self.stage.explore_time:.0f} sekund kjem {self.enemy.name}.", fg="light")
        left = self.READY_TIME - self.phase_t
        word = "Klar..." if left > 1.4 else "Ferdig..." if left > 0.6 else "GÅ!"
        r.center(14, word, fg="yellow", bold=True)

    def _draw_warning(self, r):
        name = self.enemy.name.upper() + "!"
        color = "red" if int(self.t * 8) % 2 == 0 else "yellow"
        r.fill(2, 8, 76, 9)
        draw_big(r, 9, name, lambda x, y: color)
        r.center(15, "DUKKAR OPP!", fg=color, bold=True)
