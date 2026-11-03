"""Testar for spelmodellen. Køyr med: python3 -m unittest"""

import random
import unittest

from terminal_dungeon.art import FONT
from terminal_dungeon.engine.sound import note_freq
from terminal_dungeon.model.approaches import PayApproach, StatApproach
from terminal_dungeon.model.enemies import Alec, Lars, Mercedes
from terminal_dungeon.model.items import BareHands, Chalk, Coin, Ruler
from terminal_dungeon.model.level import amalie_skram
from terminal_dungeon.model.player import Player
from terminal_dungeon.model.stats import Stats


def make_player(styrke=5, utspekulert=5, sexy=5, money=15):
    return Player("Test", Stats(styrke, utspekulert, sexy), money)


class StatsTest(unittest.TestCase):
    def test_clamped(self):
        s = Stats(15, -3, 5)
        self.assertEqual((s["styrke"], s["utspekulert"], s["sexy"]), (10, 0, 5))
        self.assertEqual(s.change("sexy", 10), 5)
        self.assertEqual(s["sexy"], 10)

    def test_roll_in_range(self):
        rng = random.Random(1)
        for _ in range(200):
            for _, v in Stats.roll(rng).items():
                self.assertTrue(1 <= v <= 10)


class PlayerTest(unittest.TestCase):
    def test_hurt_and_heal(self):
        p = make_player(styrke=6)
        self.assertEqual(p.max_hp, 30)
        self.assertEqual(p.hurt(100), 30)
        self.assertFalse(p.alive)
        self.assertEqual(p.heal(5), 5)

    def test_weapons_stack(self):
        p = make_player()
        Ruler().apply(p)
        Ruler().apply(p)
        self.assertEqual(p.inventory["Ruler"].uses, 10)
        self.assertEqual([w.name for w in p.weapons()], ["Dask", "Linjal"])

    def test_coin(self):
        p = make_player(money=10)
        Coin().apply(p)
        self.assertEqual(p.money, 15)
        self.assertEqual(p.record["kroner"], 5)


class WeaponTest(unittest.TestCase):
    def test_uses_run_out(self):
        p = make_player()
        chalk = Chalk()
        rng = random.Random(3)
        for _ in range(3):
            chalk.strike(p, rng)
        self.assertEqual(chalk.uses, 0)
        p.add_weapon(chalk)
        self.assertNotIn(chalk, p.weapons())

    def test_fists_infinite(self):
        fists = BareHands()
        p = make_player(styrke=9)
        self.assertEqual(fists.damage_range(p), (4, 6))
        fists.strike(p, random.Random())
        self.assertIsNone(fists.uses)


class ApproachTest(unittest.TestCase):
    def test_pay_success_and_fail(self):
        pay = next(a for a in Mercedes().approaches() if isinstance(a, PayApproach))
        rich = make_player(money=60)
        self.assertTrue(pay.resolve(rich, random.Random()).success)
        self.assertEqual(rich.money, 10)
        poor = make_player(money=20)
        out = pay.resolve(poor, random.Random())
        self.assertFalse(out.success)
        self.assertEqual(poor.money, 10)
        self.assertEqual(out.hp_lost, 3)

    def test_alec_takes_all_money_on_fail(self):
        pay = next(a for a in Alec().approaches() if isinstance(a, PayApproach))
        p = make_player(money=99)
        pay.resolve(p, random.Random())
        self.assertEqual(p.money, 0)

    def test_stat_chance(self):
        charm = next(a for a in Mercedes().approaches() if isinstance(a, StatApproach) and a.stat == "sexy")
        self.assertEqual(charm.chance(make_player(sexy=6)), 1.0)
        self.assertEqual(charm.chance(make_player(sexy=3)), 0.3)
        p = make_player(sexy=0)
        out = charm.resolve(p, random.Random())
        self.assertFalse(out.success)
        self.assertEqual(p.stats["sexy"], 0)


class EnemyTest(unittest.TestCase):
    def test_all_enemies_have_four_approaches(self):
        for cls in (Mercedes, Alec, Lars):
            enemy = cls()
            self.assertEqual(len(enemy.approaches()), 4)
            self.assertTrue(enemy.attacks)
            self.assertIn(enemy.choose_attack(random.Random()), enemy.attacks)

    def test_level(self):
        level = amalie_skram()
        self.assertEqual([s.enemy.__name__ for s in level.stages], ["Mercedes", "Alec", "Lars"])


class AssetTest(unittest.TestCase):
    def test_font_rows_consistent(self):
        for ch, rows in FONT.items():
            self.assertEqual(len(rows), 5, ch)
            self.assertEqual(len({len(r) for r in rows}), 1, ch)

    def test_note_freq(self):
        self.assertAlmostEqual(note_freq("A4"), 440.0)
        self.assertAlmostEqual(note_freq("A5"), 880.0)
        self.assertAlmostEqual(note_freq("Bb1"), note_freq("A#1"))


if __name__ == "__main__":
    unittest.main()
