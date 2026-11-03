"""Startpunkt: `python -m terminal_dungeon`."""

from __future__ import annotations

import argparse
import locale
import os
import random
import sys


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        prog="terminal_dungeon",
        description="Ein dungeon crawler i terminalen, lagt til Amalie Skram VGS.",
    )
    parser.add_argument("--mute", action="store_true", help="start utan lyd")
    parser.add_argument("--seed", type=int, default=None, help="fast tilfeldigheit (for testing)")
    parser.add_argument(
        "--stage", type=int, default=1, help="kva etappe du startar på (1-3), nyttig for å øve på bossen"
    )
    parser.add_argument("--selftest", action="store_true", help=argparse.SUPPRESS)
    return parser.parse_args(argv)


def selftest() -> int:
    """Sjekkar at alle modular, curses og lydsynthesizeren er med (brukt av byggjet i CI)."""
    import curses  # noqa: F401

    from . import game  # noqa: F401
    from .engine import sound
    from .model.level import amalie_skram
    from .scenes import battle, character, encounter, ending, explore, minigames, title  # noqa: F401

    for stage in amalie_skram().stages:
        enemy = stage.enemy()
        assert len(enemy.approaches()) == 4 and enemy.attacks
    assert set(minigames.MINIGAMES) == {"rhythm", "quiz", "mash", "typing"}
    assert len(sound.SFX["coin"]()) > 0 and len(sound.MUSIC["title"]()) > 0
    print("selftest ok")
    return 0


def frozen() -> bool:
    """Sant når spelet køyrer som ferdigpakka programfil (PyInstaller)."""
    return getattr(sys, "frozen", False)


def wait_before_close():
    # Ved dobbeltklikk forsvinn vindauget med ein gong – gi folk tid til å lese.
    if frozen():
        try:
            input("\nTrykk Enter for å lukke vindauget...")
        except (EOFError, KeyboardInterrupt):
            pass


def main(argv=None) -> int:
    args = parse_args(argv)
    if args.selftest:
        return selftest()
    try:
        import curses
    except ImportError:
        print("Fann ikkje curses. På Windows: køyr `pip install windows-curses` først.")
        wait_before_close()
        return 1

    locale.setlocale(locale.LC_ALL, "")
    os.environ.setdefault("ESCDELAY", "25")

    from .engine.sound import SoundManager
    from .game import Game
    from .scenes.title import TitleScene

    sound = SoundManager(enabled=not args.mute)
    rng = random.Random(args.seed)

    def run(stdscr):
        try:
            curses.curs_set(0)
        except curses.error:
            pass
        stdscr.nodelay(True)
        stdscr.keypad(True)
        if curses.has_colors():
            curses.start_color()
            try:
                curses.use_default_colors()
            except curses.error:
                pass
        game = Game(stdscr, sound, rng, start_stage=max(0, args.stage - 1))
        game.replace(TitleScene(game))
        game.run()

    try:
        curses.wrapper(run)
    except KeyboardInterrupt:
        pass
    except Exception:
        if not frozen():
            raise
        import traceback

        traceback.print_exc()
        print("\nOi! Spelet krasja. Send gjerne teksten over til den som laga spelet.")
        wait_before_close()
        return 1
    finally:
        sound.shutdown()
    print("Takk for at du spelte Terminal Dungeon!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
