"""Angrep fiendane kan bruke i kamp.

Eit angrep får tilgang til kampen (`battle`) og kallar `done()` når det er
ferdig. Kampen tilbyr hjelpemetodar som log(), hurt_player(),
enemy_projectile(), run_minigame(), expel() og after().
"""

from __future__ import annotations

from .stats import Stats


class Attack:
    def __init__(self, name, weight, hit_chance=1.0, damage=(1, 2), projectile="*", color="white",
                 sound="hit", announce="", hit_text="Treff! {dmg} skade.", miss_text="Bom!"):
        self.name = name
        self.weight = weight
        self.hit_chance = hit_chance
        self.damage = damage
        self.projectile = projectile
        self.color = color
        self.sound = sound
        self.announce = announce
        self.hit_text = hit_text
        self.miss_text = miss_text

    def execute(self, battle, done):
        battle.log(self.announce, "orange")
        hit = battle.rng.random() < battle.enemy_hit_chance(self.hit_chance)

        def arrive():
            if hit:
                self.on_hit(battle)
            else:
                battle.log(self.miss_text, "grey")
                battle.player_text("BOM", "grey")
                battle.sound.play("whoosh")
            battle.after(0.8, done)

        battle.after(0.5, lambda: battle.enemy_projectile(self.projectile, self.color, arrive))

    def on_hit(self, battle):
        dmg = battle.rng.randint(*self.damage)
        dealt = battle.hurt_player(dmg, self.sound)
        battle.log(self.hit_text.format(dmg=dealt), "red")


class ExpelAttack(Attack):
    """Treff det, er spelet over."""

    def on_hit(self, battle):
        battle.expel(self.hit_text)


class DoxAttack(Attack):
    """Gjer skade og tek eitt poeng frå alle stats."""

    def on_hit(self, battle):
        super().on_hit(battle)
        for stat in Stats.NAMES:
            battle.player.stats.change(stat, -1)
        battle.sound.play("zap")


class MinigameAttack(Attack):
    """Startar eit minispel. Klarar du det ikkje, skjer det noko vondt."""

    def __init__(self, name, weight, minigame, announce, success_text, fail_text, fail_damage=0, fail_skip=0):
        super().__init__(name, weight, announce=announce)
        self.minigame = minigame
        self.success_text = success_text
        self.fail_text = fail_text
        self.fail_damage = fail_damage
        self.fail_skip = fail_skip

    def execute(self, battle, done):
        battle.log(self.announce, "orange")

        def result(ok):
            if ok:
                battle.log(self.success_text, "lime")
                battle.sound.play("confirm")
            else:
                battle.log(self.fail_text, "red")
                if self.fail_damage:
                    battle.hurt_player(self.fail_damage, "hurt")
                if self.fail_skip:
                    battle.player.skip_turns += self.fail_skip
            battle.after(0.9, done)

        battle.after(1.6, lambda: battle.run_minigame(self.minigame, result))
