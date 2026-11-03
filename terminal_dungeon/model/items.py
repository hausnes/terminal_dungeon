"""Ting du kan plukke opp: pengar, mat og våpen.

Kvar ting er ein klasse. Vil du lage ein ny ting, arvar du frå Item
(eller Coin/Weapon) og overstyrer det som skal vere annleis.
"""

from __future__ import annotations

from dataclasses import dataclass


class Item:
    name = "Ting"
    glyph = "?"
    color = "white"
    sound = "item"
    description = ""
    speed = (7.0, 12.0)  # kor fort tingen flyg rundt i utforskinga (rutar/sek)
    lifetime = 6.0  # sekund før tingen forsvinn

    def apply(self, player) -> str:
        """Kva som skjer når spelaren plukkar opp tingen. Returnerer ein kort tekst."""
        raise NotImplementedError


# ---------------------------------------------------------------- pengar
class Coin(Item):
    name = "Femkroning"
    glyph = "¤"
    color = "gold"
    sound = "coin"
    value = 5
    speed = (6.0, 14.0)
    lifetime = 6.5

    def __init__(self, value: int | None = None):
        if value is not None:
            self.value = value

    def apply(self, player) -> str:
        player.earn(self.value)
        return f"+{self.value} kr"


class BigCoin(Coin):
    name = "Tjuekroning"
    glyph = "Ø"
    color = "orange"
    sound = "bigcoin"
    value = 20
    speed = (11.0, 17.0)
    lifetime = 5.0


class Wallet(Coin):
    name = "Lommebok"
    glyph = "▣"
    color = "lime"
    sound = "bigcoin"
    value = 50
    speed = (14.0, 20.0)
    lifetime = 4.5


class LotteryTicket(Coin):
    name = "Vinnarlodd"
    glyph = "★"
    color = "magenta"
    sound = "jackpot"
    value = 300
    speed = (20.0, 28.0)
    lifetime = 3.5


# ---------------------------------------------------------------- mat
class CinnamonBun(Item):
    name = "Kanelbolle"
    glyph = "♥"
    color = "pink"
    sound = "heal"
    heal = 8
    speed = (6.0, 10.0)

    def apply(self, player) -> str:
        got = player.heal(self.heal)
        return f"+{got} HP" if got else "Mett!"


# ---------------------------------------------------------------- våpen
@dataclass
class Strike:
    hit: bool
    damage: int
    crit: bool = False


class Weapon(Item):
    name = "Våpen"
    min_dmg = 1
    max_dmg = 2
    accuracy = 0.9
    default_uses: int | None = 1  # None = uendeleg
    strength_div = 4  # styrke // dette = ekstra skade
    verb = "angrip"
    projectile = "*"
    projectile_color = "white"
    hit_sound = "hit"
    speed = (9.0, 14.0)
    lifetime = 5.5

    def __init__(self, uses: int | None = None):
        self.uses = self.default_uses if uses is None else uses

    @property
    def key(self) -> str:
        return type(self).__name__

    def bonus(self, player) -> int:
        return player.stats["styrke"] // self.strength_div

    def damage_range(self, player) -> tuple[int, int]:
        b = self.bonus(player)
        return self.min_dmg + b, self.max_dmg + b

    def uses_text(self) -> str:
        return "∞" if self.uses is None else f"x{self.uses}"

    def strike(self, player, rng) -> Strike:
        if self.uses is not None:
            self.uses = max(0, self.uses - 1)
        if rng.random() >= self.accuracy:
            return Strike(False, 0)
        lo, hi = self.damage_range(player)
        dmg = rng.randint(lo, hi)
        crit = rng.random() < 0.1
        if crit:
            dmg = int(dmg * 1.5 + 0.5)
        return Strike(True, dmg, crit)

    def on_hit(self, enemy, rng) -> str | None:
        """Ekstra effekt når våpenet treff. Returnerer ein loggtekst eller None."""
        return None

    def apply(self, player) -> str:
        player.add_weapon(self)
        return f"{self.name}!"


class BareHands(Weapon):
    name = "Dask"
    description = "Ein slapp dask med handa. Alltid tilgjengeleg."
    min_dmg, max_dmg = 1, 3
    accuracy = 0.9
    default_uses = None
    strength_div = 3
    verb = "daskar"
    projectile = "*"
    projectile_color = "skin"
    hit_sound = "slap"


class Ruler(Weapon):
    name = "Linjal"
    glyph = "╪"
    color = "cyan"
    description = "Ein 30 cm stållinjal. Solid og påliteleg."
    min_dmg, max_dmg = 3, 5
    accuracy = 0.85
    default_uses = 5
    verb = "slår med linjalen"
    projectile = "═"
    projectile_color = "cyan"


class RottenLunch(Weapon):
    name = "Råtten matpakke"
    glyph = "&"
    color = "green"
    description = "Leverpostei frå august. Stor skade, kan gjere fienden kvalm."
    min_dmg, max_dmg = 6, 9
    accuracy = 0.7
    default_uses = 1
    verb = "kastar den råtne matpakka"
    projectile = "&"
    projectile_color = "green"
    hit_sound = "hit"

    def on_hit(self, enemy, rng):
        if rng.random() < 0.5:
            enemy.stunned = max(enemy.stunned, 1)
            return f"{enemy.name} blir kvalm av lukta og mistar neste tur!"
        return None


class Chalk(Weapon):
    name = "Kritt"
    glyph = "¦"
    color = "white"
    description = "Treff nesten alltid. Krittstøv kan gjere fienden blind."
    min_dmg, max_dmg = 2, 4
    accuracy = 0.95
    default_uses = 3
    verb = "kastar kritt"
    projectile = "¦"
    projectile_color = "white"

    def on_hit(self, enemy, rng):
        if rng.random() < 0.4:
            enemy.blinded = 2
            return f"Krittstøv i auga! {enemy.name} ser dårleg i 2 rundar."
        return None


WEAPON_TYPES = [Ruler, RottenLunch, Chalk]
