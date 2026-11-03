"""Brett og etappar. Vil du ha fleire brett, legg du til nye Stage-ar eller ein ny Level."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .enemies import Alec, Enemy, Lars, Mercedes


@dataclass
class Stage:
    title: str
    location: str
    enemy: Callable[[], Enemy]
    explore_time: float = 10.0  # sekund med utforsking før fienden dukkar opp
    hazards: int = 1  # lekser som sprett rundt
    chasers: int = 0  # vikarar som jagar deg
    spawn_interval: float = 0.45  # kor ofte det kjem nye myntar
    weapons: int = 2  # kor mange våpen som dukkar opp
    color: str = "sky"


@dataclass
class Level:
    name: str
    stages: list[Stage]


def amalie_skram() -> Level:
    return Level("Amalie Skram VGS", [
        Stage("Etappe 1", "1. etasje · Gangen ved Kaffe Diem", Mercedes,
              hazards=1, chasers=0, color="sky"),
        Stage("Etappe 2", "2. etasje · Korridoren til IT-kontoret", Alec,
              hazards=2, chasers=1, color="lime"),
        Stage("Etappe 3", "Administrasjonen · Rektorgangen", Lars,
              hazards=3, chasers=1, spawn_interval=0.4, weapons=3, color="orange"),
    ])
