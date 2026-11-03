"""Eigenskapane til spelaren: Styrke, Utspekulert og Sexy."""

from __future__ import annotations

import random

from ..config import STAT_MAX

STAT_INFO = {
    "styrke": {
        "label": "Styrke", "short": "STY", "color": "red",
        "desc": "Meir skade i kamp, og litt meir helse.",
    },
    "utspekulert": {
        "label": "Utspekulert", "short": "UTS", "color": "purple",
        "desc": "Lur, stjel og snakk deg ut av ting.",
    },
    "sexy": {
        "label": "Sexy", "short": "SEX", "color": "pink",
        "desc": "Sjarmer folk til å gi deg ting.",
    },
}


class Stats:
    MAX = STAT_MAX
    NAMES = tuple(STAT_INFO)

    def __init__(self, styrke: int = 1, utspekulert: int = 1, sexy: int = 1):
        self._values: dict[str, int] = {}
        for name, value in zip(self.NAMES, (styrke, utspekulert, sexy)):
            self._values[name] = self._clamp(value)

    @classmethod
    def roll(cls, rng: random.Random) -> "Stats":
        return cls(*(rng.randint(1, cls.MAX) for _ in cls.NAMES))

    def _clamp(self, value: int) -> int:
        return max(0, min(self.MAX, int(value)))

    def __getitem__(self, name: str) -> int:
        return self._values[name]

    def change(self, name: str, delta: int) -> int:
        """Endrar ein stat og returnerer kor mykje han faktisk endra seg."""
        old = self._values[name]
        self._values[name] = self._clamp(old + delta)
        return self._values[name] - old

    def items(self):
        return self._values.items()

    def __repr__(self):
        return f"Stats({', '.join(f'{k}={v}' for k, v in self._values.items())})"
