"""Spelfiguren."""

from __future__ import annotations

from ..config import BASE_HP
from .items import BareHands, Weapon
from .stats import Stats


class Player:
    def __init__(self, name: str, stats: Stats, money: int):
        self.name = name
        self.stats = stats
        self.max_hp = BASE_HP + stats["styrke"]
        self.hp = self.max_hp
        self.money = money
        self.fists = BareHands()
        self.inventory: dict[str, Weapon] = {}
        self.skip_turns = 0
        self.record = {"kroner": 0, "ting": 0, "skade": 0}

    @property
    def alive(self) -> bool:
        return self.hp > 0

    def hurt(self, amount: int) -> int:
        actual = max(0, min(self.hp, amount))
        self.hp -= actual
        return actual

    def heal(self, amount: int) -> int:
        actual = max(0, min(self.max_hp - self.hp, amount))
        self.hp += actual
        return actual

    def earn(self, amount: int):
        self.money += amount
        self.record["kroner"] += amount

    def spend(self, amount: int) -> bool:
        if amount > self.money:
            return False
        self.money -= amount
        return True

    def lose_money(self, amount: int) -> int:
        actual = max(0, min(self.money, amount))
        self.money -= actual
        return actual

    def add_weapon(self, weapon: Weapon):
        self.record["ting"] += 1
        existing = self.inventory.get(weapon.key)
        if existing:
            existing.uses += weapon.uses
        else:
            self.inventory[weapon.key] = weapon

    def weapons(self) -> list[Weapon]:
        """Alle våpen som kan brukast no – dask med handa er alltid med."""
        return [self.fists] + [w for w in self.inventory.values() if w.uses]
