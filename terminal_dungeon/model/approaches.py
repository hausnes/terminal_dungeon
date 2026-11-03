"""Måtar å kome forbi ein fiende på: pengar, sexy, utspekulert eller styrke.

Kvar fiende lagar si eiga liste med Approach-objekt. Møte-scena
(EncounterScene) kallar approach.start(encounter), og approach-objektet
bestemmer sjølv om det skal løysast med ein gong, starte ein kamp eller eit
minispel.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .stats import STAT_INFO


@dataclass
class Outcome:
    success: bool
    speech: str = ""  # det fienden seier
    lines: list[str] = field(default_factory=list)  # forteljing
    hp_lost: int = 0
    game_over: str | None = None  # grunn, dersom spelet er over
    game_over_title: str = "GAME OVER"
    mood: str = ""  # "good"/"bad" – styrer effektane

    def __post_init__(self):
        if not self.mood:
            self.mood = "good" if self.success else "bad"


KIND_STYLE = {
    "pengar": ("PENGAR", "gold"),
    "sexy": ("SEXY", "pink"),
    "utspekulert": ("UTSPEKULERT", "purple"),
    "styrke": ("STYRKE", "red"),
}


class Approach:
    kind = "styrke"

    def __init__(self, label: str, description: str):
        self.label = label
        self.description = description

    def info(self, player) -> tuple[str, str]:
        """Kort tekst + farge som blir vist til høgre i menyen."""
        return "", "grey"

    def start(self, encounter):
        encounter.show_outcome(self.resolve(encounter.player, encounter.rng))

    def resolve(self, player, rng) -> Outcome:
        raise NotImplementedError


def chance_color(chance: float) -> str:
    return "lime" if chance >= 0.7 else "yellow" if chance >= 0.4 else "red"


class PayApproach(Approach):
    kind = "pengar"

    def __init__(self, cost, label, description, success_speech, success_lines, fail_speech, fail_lines,
                 fail_hp=3, fail_money_frac=0.5, reward_hp=0):
        super().__init__(label, description)
        self.cost = cost
        self.success_speech = success_speech
        self.success_lines = success_lines
        self.fail_speech = fail_speech
        self.fail_lines = fail_lines
        self.fail_hp = fail_hp
        self.fail_money_frac = fail_money_frac
        self.reward_hp = reward_hp

    def info(self, player):
        return f"Du har {player.money} kr", "lime" if player.money >= self.cost else "red"

    def resolve(self, player, rng):
        if player.spend(self.cost):
            lines = list(self.success_lines)
            if self.reward_hp:
                got = player.heal(self.reward_hp)
                if got:
                    lines.append(f"Du får {got} HP tilbake.")
            return Outcome(True, self.success_speech, lines)
        lost_hp = player.hurt(self.fail_hp)
        lost_money = player.lose_money(int(round(player.money * self.fail_money_frac)))
        summary = f"Du mistar {lost_hp} HP"
        summary += f" og {lost_money} kr." if lost_money else "."
        return Outcome(False, self.fail_speech, list(self.fail_lines) + [summary], hp_lost=lost_hp)


class StatApproach(Approach):
    def __init__(self, stat, required, label, description, success_speech, success_lines,
                 fail_speech, fail_lines, hp_loss=4, stat_loss=1):
        super().__init__(label, description)
        self.kind = stat
        self.stat = stat
        self.required = required
        self.success_speech = success_speech
        self.success_lines = success_lines
        self.fail_speech = fail_speech
        self.fail_lines = fail_lines
        self.hp_loss = hp_loss
        self.stat_loss = stat_loss

    def chance(self, player) -> float:
        value = player.stats[self.stat]
        if value >= self.required:
            return 1.0
        return round(0.6 * value / self.required, 2)

    def info(self, player):
        c = self.chance(player)
        return f"Sjanse {int(c * 100)}%", chance_color(c)

    def resolve(self, player, rng):
        if rng.random() < self.chance(player):
            return Outcome(True, self.success_speech, list(self.success_lines))
        lost_hp = player.hurt(self.hp_loss)
        lost_stat = -player.stats.change(self.stat, -self.stat_loss)
        label = STAT_INFO[self.stat]["label"].lower()
        summary = f"Du mistar {lost_hp} HP og {lost_stat} {label}."
        return Outcome(False, self.fail_speech, list(self.fail_lines) + [summary], hp_lost=lost_hp)


class MinigameApproach(Approach):
    """Startar eit minispel. Vinn du, kjem du forbi. Tapar du, er spelet over."""

    def __init__(self, stat, minigame, label, description, success_speech, success_lines, fail_speech,
                 fail_reason):
        super().__init__(label, description)
        self.kind = stat
        self.minigame = minigame
        self.success_speech = success_speech
        self.success_lines = success_lines
        self.fail_speech = fail_speech
        self.fail_reason = fail_reason

    def info(self, player):
        return "Minispel!", "yellow"

    def start(self, encounter):
        encounter.start_minigame(self.minigame, lambda ok: encounter.show_outcome(self.outcome(ok)))

    def outcome(self, ok: bool) -> Outcome:
        if ok:
            return Outcome(True, self.success_speech, list(self.success_lines))
        return Outcome(False, self.fail_speech, [self.fail_reason], game_over=self.fail_reason)


class FightApproach(Approach):
    kind = "styrke"

    def info(self, player):
        return "Kamp!", "red"

    def start(self, encounter):
        encounter.start_battle()
