"""Turbasert kamp. Angrepa (model/attacks.py) styrer kampen gjennom metodane her."""

from __future__ import annotations

from .. import art
from .base import Scene
from .ui import CONFIRM, DOWN, LEFT, RIGHT, UP, draw_hud, hp_bar, wrap

ENEMY_POS = (17, 6)
PLAYER_POS = (63, 8)


class BattleScene(Scene):
    def __init__(self, game, enemy):
        super().__init__(game)
        self.enemy = enemy
        self.music = "boss" if enemy.is_boss else "battle"
        self.log_lines: list[tuple[str, str]] = []
        self.sel = 0
        self.state = "intro"
        self.enemy_shake = 0.0
        self.pose = "idle"
        self.pose_t = 0.0
        self.dying = 0.0
        self.finished = False

    def enter(self):
        self.log(self.enemy.fight_start, self.enemy.color)
        self.sound.play("whoosh")
        self.after(1.2, self.begin_player_turn)

    # ------------------------------------------------------------ API for angrep
    def log(self, text, color="white"):
        for line in wrap(text, 76):
            self.log_lines.append((line, color))
        self.log_lines = self.log_lines[-12:]

    def enemy_hit_chance(self, base):
        return base * (0.5 if self.enemy.blinded > 0 else 1.0)

    def hurt_player(self, amount, sound="hurt"):
        dealt = self.player.hurt(amount)
        self.sound.play(sound)
        self.r.shake(2 if amount >= 6 else 1, 0.3)
        self.r.flash("darkred", 0.08)
        self.set_pose("hurt", 0.5)
        self.player_text(f"-{dealt}", "red")
        self.fx.burst(PLAYER_POS[0], PLAYER_POS[1], 10, "x*·", ("red", "orange"), speed=12, life=0.5)
        return dealt

    def player_text(self, text, color):
        self.fx.text(PLAYER_POS[0], PLAYER_POS[1] - 2, text, color, life=1.0)

    def enemy_projectile(self, glyph, color, on_arrive):
        self.fx.projectile(ENEMY_POS[0] + 6, ENEMY_POS[1], PLAYER_POS[0] - 1, PLAYER_POS[1], glyph, color,
                           on_arrive, duration=0.45, arc=3.0)

    def run_minigame(self, key, callback):
        from .minigames import MINIGAMES

        self.push_child(MINIGAMES[key](self.game, self.player, self.enemy), callback)

    def expel(self, text):
        self._end(lambda: self.game.game_over(text, "UTVIST!"), 1.4)
        self.sound.play("expel")
        self.r.shake(3, 0.6)

    def sit_on(self):
        self.log("SITT PÅ! Lars set seg til rette på fanget ditt...", "magenta")
        self.sound.play("boom")
        self.r.shake(3, 0.8)
        self.r.flash("purple", 0.2)
        self._end(lambda: self.game.game_over(
            "Rektor Lars sette seg på fanget ditt og vil aldri reise seg att. Ingen vitnemål i år.", "SITT PÅ!"), 1.8)

    def set_pose(self, pose, duration):
        self.pose, self.pose_t = pose, duration

    def _end(self, fn, delay):
        if self.finished:
            return
        self.finished = True
        self.state = "done"
        self._timers.clear()
        self.after(delay, fn)

    # ------------------------------------------------------------ turar
    def begin_player_turn(self):
        if self.finished:
            return
        if self.player.skip_turns > 0:
            self.player.skip_turns -= 1
            self.set_pose("sleep", 1.0)
            self.log("Zzz... du søv framleis.", "grey")
            self.sound.play("yawn")
            self.after(1.0, self.enemy_turn)
            return
        self.state = "choose"
        self.sel = min(self.sel, len(self.player.weapons()) - 1)

    def player_attack(self, weapon):
        self.state = "busy"
        strike = weapon.strike(self.player, self.rng)
        self.log(f"Du {weapon.verb}!", "sky")
        self.set_pose("attack", 0.4)
        self.sound.play("dash")
        self.fx.projectile(PLAYER_POS[0] - 2, PLAYER_POS[1], ENEMY_POS[0] + 6, ENEMY_POS[1],
                           weapon.projectile, weapon.projectile_color,
                           lambda: self._player_hit(weapon, strike), duration=0.4, arc=2.5)

    def _player_hit(self, weapon, strike):
        ex, ey = ENEMY_POS
        if strike.hit:
            dealt = self.enemy.hurt(strike.damage)
            self.player.record["skade"] += dealt
            self.enemy_shake = 0.4
            self.sound.play("crit" if strike.crit else weapon.hit_sound)
            self.fx.burst(ex, ey, 16 if strike.crit else 10, "*+x·", ("yellow", "orange", "white"), speed=16, life=0.6)
            self.fx.text(ex, ey - 3, f"KRITISK! -{dealt}" if strike.crit else f"-{dealt}",
                         "yellow" if strike.crit else "white", life=1.1)
            self.log(f"{'KRITISK treff' if strike.crit else 'Treff'}! {self.enemy.name} tek {dealt} skade.",
                     "yellow" if strike.crit else "white")
            extra = weapon.on_hit(self.enemy, self.rng)
            if extra:
                self.log(extra, "lime")
        else:
            self.sound.play("whoosh")
            self.fx.text(ex, ey - 3, "BOM", "grey")
            self.log("Bom! Du trefte berre lufta.", "grey")
        self.after(0.8, self._after_player)

    def _after_player(self):
        if not self.enemy.alive:
            self._win()
        else:
            self.enemy_turn()

    def enemy_turn(self):
        if self.finished:
            return
        self.state = "enemy"
        enemy = self.enemy
        if not enemy.on_turn_start(self):
            return
        if enemy.stunned > 0:
            enemy.stunned -= 1
            self.log(f"{enemy.name} er for kvalm til å gjere noko!", "green")
            self.after(1.0, self._after_enemy)
            return
        attack = enemy.choose_attack(self.rng)
        attack.execute(self, self._after_enemy)

    def _after_enemy(self):
        if self.finished:
            return
        if self.enemy.blinded > 0:
            self.enemy.blinded -= 1
        if not self.player.alive:
            self._lose()
        else:
            self.begin_player_turn()

    def _win(self):
        self.log(f"{self.enemy.name} er slått!", "lime")
        self.sound.play("win")
        self.dying = 0.001
        self.fx.burst(ENEMY_POS[0], ENEMY_POS[1], 40, "*+·★", ("gold", "yellow", "lime", "white"), speed=24, life=1.2)
        self._end(lambda: self.game.pop("won"), 2.2)

    def _lose(self):
        if self.enemy.is_boss:
            self.log(f"{self.enemy.name} vann kampen...", "red")
            self.sound.play("lose")
            self._end(lambda: self.game.game_over(
                f"Rektor {self.enemy.name} vann kampen. Ingen vitnemål på deg i år."), 2.0)
        else:
            self.player.hp = 1
            self.log("Du ligg rett ut... men kjem deg på beina med 1 HP.", "orange")
            self.sound.play("lose")
            self._end(lambda: self.game.pop("lost"), 2.2)

    # ------------------------------------------------------------ input/oppdatering
    def handle_key(self, key):
        if self.state != "choose":
            return
        weapons = self.player.weapons()
        n = len(weapons)
        if key in LEFT:
            self.sel = (self.sel - 1) % n
        elif key in RIGHT:
            self.sel = (self.sel + 1) % n
        elif key in UP:
            self.sel = (self.sel - 2) % n if n > 2 else self.sel
        elif key in DOWN:
            self.sel = (self.sel + 2) % n if n > 2 else self.sel
        elif key in CONFIRM:
            self.player_attack(weapons[self.sel])
            return
        else:
            return
        self.sound.play("select")

    def update(self, dt):
        super().update(dt)
        self.enemy_shake = max(0.0, self.enemy_shake - dt)
        if self.pose_t > 0:
            self.pose_t -= dt
            if self.pose_t <= 0:
                self.pose = "idle"
        if self.dying:
            self.dying += dt

    # ------------------------------------------------------------ teikning
    def draw(self, r):
        enemy, player = self.enemy, self.player
        r.center(0, f"»»  KAMP MOT {enemy.name.upper()}  ««", fg="red", bold=True)

        jx = self.rng.randint(-2, 2) if self.enemy_shake > 0 else 0
        sink = int(min(self.dying, 1.5) * 8) if self.dying else 0
        if not self.dying or int(self.t * 10) % 2 == 0:
            for i, line in enumerate(enemy.art):
                r.text(1 + jx, 1 + i + sink, line[:38], enemy.color, bold=not self.dying, dim=bool(self.dying))

        x = 42
        r.text(x, 2, enemy.name.upper(), enemy.color, bold=True)
        r.text(x + len(enemy.name) + 1, 2, enemy.title, "grey")
        hp_bar(r, x, 3, 26, enemy.hp, enemy.max_hp)
        status = []
        if enemy.stunned:
            status.append(("KVALM", "green"))
        if enemy.blinded:
            status.append(("BLIND", "white"))
        sx = x
        for label, color in status:
            r.text(sx, 4, f"[{label}]", color, bold=True)
            sx += len(label) + 3
        if hasattr(enemy, "charge_max"):
            frac = enemy.charge / enemy.charge_max
            danger = enemy.charge >= enemy.charge_max - 3
            color = ("red" if int(self.t * 6) % 2 == 0 else "magenta") if danger else "purple"
            r.text(x, 5, "SITT PÅ", color, bold=True)
            r.bar(x + 8, 5, 18, frac, color, full="▓")
            r.text(x + 27, 5, f"{enemy.charge}/{enemy.charge_max}", color)

        pose = art.PLAYER_POSES[self.pose]
        px = PLAYER_POS[0] - 2 + (1 if self.pose == "attack" else 0)
        for i, line in enumerate(pose):
            r.text(px, PLAYER_POS[1] - 1 + i, line, "yellow", bold=True)
        r.text(x + 14, 11, player.name[:12], "white", bold=True)
        hp_bar(r, x + 14, 12, 14, player.hp, player.max_hp)

        r.box(0, 13, 80, 5, "grey", style="round", title="Kamplogg")
        for i, (text, color) in enumerate(self.log_lines[-3:]):
            r.text(2, 14 + i, text, color)

        active = self.state == "choose"
        r.box(0, 18, 80, 5, "yellow" if active else "dark", style="round", title="Vel angrep")
        weapons = player.weapons()
        for i, w in enumerate(weapons[:4]):
            cx, cy = 2 + (i % 2) * 39, 19 + i // 2
            selected = active and i == self.sel
            lo, hi = w.damage_range(player)
            r.text(cx, cy, "▶" if selected else " ", "yellow", bold=True)
            r.text(cx + 2, cy, f"{w.name:<16}", "yellow" if selected else "white" if active else "grey", bold=selected)
            r.text(cx + 19, cy, f"{lo}-{hi} skade {int(w.accuracy * 100)}% {w.uses_text()}", "light" if active else "dark")
        if active and weapons:
            r.text(2, 21, weapons[min(self.sel, len(weapons) - 1)].description[:76], "grey")
        elif self.state == "enemy":
            r.text(2, 21, f"{enemy.name} sin tur...", "orange")

        draw_hud(r, player, 23)
        self.fx.draw(r)
