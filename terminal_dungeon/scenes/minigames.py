"""Minispel. Kvart minispel er ei scene som returnerer True (klart) eller False."""

from __future__ import annotations

import math

from .. import art
from .base import Scene
from .ui import DOWN, ENTER, LEFT, RIGHT, UP, draw_big, wrap


class Minigame(Scene):
    music = ""
    title = "Minispel"
    subtitle = ""
    instructions: list[str] = []
    color = "yellow"
    COUNTDOWN = 3.0

    def __init__(self, game, player, enemy=None):
        super().__init__(game)
        self.hero = player
        self.enemy = enemy
        self.phase = "intro"
        self.cd = 0.0
        self.last_cd = 0
        self.success: bool | None = None
        self.result_text = ""

    # -- overstyr desse
    def start(self):
        pass

    def play_update(self, dt):
        pass

    def play_key(self, key):
        pass

    def draw_play(self, r):
        pass

    def extra_instructions(self) -> list[str]:
        return []

    # -- felles
    def handle_key(self, key):
        if self.phase == "intro" and (key in ENTER or key == " "):
            self.phase = "countdown"
            self.cd = self.COUNTDOWN
            self.last_cd = 0
        elif self.phase == "play":
            self.play_key(key)

    def update(self, dt):
        super().update(dt)
        if self.phase == "countdown":
            self.cd -= dt
            n = int(math.ceil(self.cd))
            if n != self.last_cd and n > 0:
                self.last_cd = n
                self.sound.play("tick")
            if self.cd <= 0:
                self.phase = "play"
                self.sound.play("confirm")
                self.start()
        elif self.phase == "play":
            self.play_update(dt)

    def finish(self, success: bool, text: str):
        if self.phase != "play":
            return
        self.phase = "result"
        self.success = success
        self.result_text = text
        self.sound.play("win" if success else "lose")
        if not success:
            self.r.shake(2, 0.4)
            self.r.flash("darkred", 0.12)
        else:
            self.fx.burst(40, 10, 40, "*+·★", ("gold", "yellow", "lime", "white"), speed=24, life=1.0)
        self.after(2.0, lambda: self.game.pop(success))

    def draw(self, r):
        r.box(0, 0, 80, 24, self.color, style="double", title=self.title)
        if self.phase == "intro":
            r.center(2, self.subtitle, fg=self.color, bold=True)
            y = 5
            for text in self.instructions + self.extra_instructions():
                for line in wrap(text, 70):
                    r.text(5, y, line, "white")
                    y += 1
                y += 1
            if int(self.t * 2) % 2 == 0:
                r.center(21, "Trykk ENTER når du er klar!", fg="yellow", bold=True)
            return
        self.draw_play(r)
        if self.phase == "countdown":
            n = str(max(1, int(math.ceil(self.cd))))
            r.fill(30, 7, 20, 7)
            draw_big(r, 8, n, lambda x, y: "yellow")
        elif self.phase == "result":
            color = "lime" if self.success else "red"
            r.box(12, 6, 56, 11, color, style="double", fill=True)
            draw_big(r, 7, "BRA!" if self.success else "FEIL!", lambda x, y: color)
            for i, line in enumerate(wrap(self.result_text, 50)[:3]):
                r.center(13 + i, line, fg="white", bold=True)
        self.fx.draw(r)


# ====================================================================== rytme
class RhythmMinigame(Minigame):
    title = "VRIKK PÅ RUMPA"
    subtitle = "Rektor Lars set på musikk. Vis kva du har!"
    color = "pink"
    instructions = [
        "Trykk MELLOMROM akkurat når ein ● er inne i ramma [ ].",
        "Dansen varer i 10 sekund. Bommar du ein einaste gong, eller trykkjer i utakt, er spelet over!",
    ]
    BPM = 100
    DURATION = 10.0
    SPEED = 22.0  # rutar per sekund
    ZONE_X = 14
    LANE_Y = 17
    LEAD_IN = 2

    def extra_instructions(self):
        return [f"Sexy-staten din ({self.hero.stats['sexy']}) gir deg ±{int(self.window * 1000)} ms slingringsmonn."]

    @property
    def window(self):
        return 0.10 + 0.012 * self.hero.stats["sexy"]

    def start(self):
        period = 60.0 / self.BPM
        self.period = period
        self.pt = 0.0
        self.beats = [period * (k + self.LEAD_IN) for k in range(int(self.DURATION / period))]
        self.hit = set()
        self.next_half = 0
        self.frame = 0
        self.combo = 0

    def play_update(self, dt):
        self.pt += dt
        half = self.period / 2
        while self.next_half * half <= self.pt:
            idx = self.next_half
            self.sound.play("kick" if idx % 2 == 0 else "hat")
            if idx % 4 == 2:
                self.sound.play("clap")
            self.next_half += 1
        for i, b in enumerate(self.beats):
            if i not in self.hit and self.pt > b + self.window:
                self.finish(False, "Du mista ein takt! Lars ristar på hovudet.")
                return
        if self.pt > self.beats[-1] + self.window + 0.4:
            self.finish(True, "Perfekt takt! Lars applauderer motvillig.")

    def play_key(self, key):
        if key != " ":
            return
        candidates = [(abs(self.pt - b), i) for i, b in enumerate(self.beats) if i not in self.hit]
        if not candidates:
            return
        diff, i = min(candidates)
        if diff <= self.window:
            self.hit.add(i)
            self.frame ^= 1
            self.combo += 1
            word = "PERFEKT!" if diff < self.window * 0.4 else "BRA!"
            self.fx.text(40, 5, word, "yellow" if word == "PERFEKT!" else "lime", life=0.6)
            self.fx.burst(self.ZONE_X + 1, self.LANE_Y, 10, "*+·", ("pink", "magenta", "white"), speed=14, life=0.5)
        else:
            self.finish(False, "Utakt! Du trakka i takten og rektor såg det.")

    def draw_play(self, r):
        dancer = art.DANCER[getattr(self, "frame", 0)]
        for i, line in enumerate(dancer):
            r.text(34, 7 + i, line, "pink", bold=True)
        if self.phase in ("play", "result"):
            r.text(30, 12, f"Combo: {self.combo}", "magenta", bold=True)
            frac = min(1.0, self.pt / (self.beats[-1] + 0.4))
            r.text(4, 2, "Dansen:", "grey")
            r.bar(12, 2, 60, frac, "pink")
        y = self.LANE_Y
        r.text(2, y - 1, "─" * 76, "dark")
        r.text(2, y + 1, "─" * 76, "dark")
        pulse = self.phase == "play" and (self.pt % self.period) < 0.12
        r.text(self.ZONE_X - 1, y, "[ ]", "yellow" if pulse else "white", bold=True)
        if self.phase in ("play", "result"):
            for i, b in enumerate(self.beats):
                if i in self.hit:
                    continue
                x = self.ZONE_X + (b - self.pt) * self.SPEED
                if 2 <= x < 78:
                    r.text(round(x), y, "●", "magenta", bold=True)
        r.text(4, 20, "MELLOMROM i takt!", "grey")


# ====================================================================== quiz
QUESTIONS = [
    ("Kva er den alminnelege foreldingsfristen for eit pengekrav i Noreg?",
     ["3 år", "5 år", "10 år", "1 år"]),
    ("Kva tyder det latinske prinsippet «in dubio pro reo»?",
     ["Tvilen skal kome den tiltalte til gode", "Lova gjeld ikkje bakover i tid",
      "Ingen kan dømmast to gonger for same sak", "Den som påstår noko, må bevise det"]),
    ("Kva heiter prinsippet om at ingen skal straffast to gonger for same forhold?",
     ["Ne bis in idem", "Lex posterior", "Pacta sunt servanda", "Habeas corpus"]),
    ("Kor gammal må ein vere for å kunne straffast i Noreg?",
     ["15 år", "14 år", "16 år", "18 år"]),
    ("Kva paragraf i Grunnlova handlar om ytringsfridom?",
     ["§ 100", "§ 1", "§ 112", "§ 49"]),
    ("Kor mange dommarar sit vanlegvis i ei avdeling i Høgsterett?",
     ["5", "3", "7", "11"]),
    ("Kva tyder «pacta sunt servanda»?",
     ["Avtalar skal haldast", "Lova er lik for alle", "Ingen straff utan lov", "Den nyaste lova gjeld"]),
    ("Kor lang er reklamasjonsfristen etter forbrukarkjøpslova for ting som skal vare vesentleg lenger enn to år?",
     ["5 år", "2 år", "3 år", "10 år"]),
    ("Kva heiter prinsippet om at ei nyare lov går framfor ei eldre?",
     ["Lex posterior", "Lex superior", "Lex specialis", "Lex mercatoria"]),
    ("Kva organ handsamar ofte små sivile tvistar før dei kan gå til tingretten?",
     ["Forliksrådet", "Lagmannsretten", "Sivilombodet", "Trygderetten"]),
    ("Kva for lov regulerer korleis offentleg forvaltning skal handsame saker?",
     ["Forvaltningslova", "Offentleglova", "Domstollova", "Straffeprosesslova"]),
]


class QuizMinigame(Minigame):
    title = "«FAR MIN ER ADVOKAT!»"
    subtitle = "Lars: «Advokat, seier du? Då kan du sikkert svare på dette.»"
    color = "purple"
    instructions = [
        "Du får 3 vanskelege juss-spørsmål. Vel svar med ↑↓ (eller 1–4) og trykk ENTER.",
        "Du har 20 sekund per spørsmål. Eitt feil svar, og spelet er over!",
    ]
    TIME = 20.0

    def __init__(self, game, player, enemy=None):
        super().__init__(game, player, enemy)
        self.hints = max(0, (player.stats["utspekulert"] - 4) // 3)
        self.questions = []
        for q, options in self.rng.sample(QUESTIONS, 3):
            correct = options[0]
            wrong = options[1:]
            self.rng.shuffle(wrong)
            shown = [correct] + wrong[: len(wrong) - self.hints]
            self.rng.shuffle(shown)
            self.questions.append((q, shown, shown.index(correct)))
        self.qi = 0
        self.sel = 0
        self.q_t = 0.0
        self.locked = False

    def extra_instructions(self):
        if self.hints:
            return [f"Du er utspekulert ({self.hero.stats['utspekulert']}), så du ser gjennom {self.hints} "
                    f"feil svar per spørsmål!"]
        return ["(Med høgare Utspekulert hadde du fått hjelp her...)"]

    def start(self):
        self.q_t = self.TIME

    def play_update(self, dt):
        if self.locked:
            return
        self.q_t -= dt
        if self.q_t <= 0:
            self.finish(False, "Tida er ute! Lars smiler breitt.")

    def play_key(self, key):
        if self.locked:
            return
        q, options, correct = self.questions[self.qi]
        if key in UP:
            self.sel = (self.sel - 1) % len(options)
            self.sound.play("select")
        elif key in DOWN:
            self.sel = (self.sel + 1) % len(options)
            self.sound.play("select")
        elif isinstance(key, str) and key in "1234" and int(key) <= len(options):
            self.sel = int(key) - 1
            self._answer()
        elif key in ENTER:
            self._answer()

    def _answer(self):
        q, options, correct = self.questions[self.qi]
        if self.sel != correct:
            self.finish(False, f"Feil! Rett svar var «{options[correct]}».")
            return
        self.sound.play("ding")
        self.fx.burst(10, 9 + self.sel * 2, 14, "*+·", ("lime", "white"), speed=14, life=0.5)
        if self.qi == len(self.questions) - 1:
            self.finish(True, "Tre av tre! Lars sveittar.")
            return
        self.locked = True

        def next_q():
            self.qi += 1
            self.sel = 0
            self.q_t = self.TIME
            self.locked = False

        self.after(0.8, next_q)

    def draw_play(self, r):
        q, options, correct = self.questions[self.qi]
        r.text(4, 2, f"Spørsmål {self.qi + 1} av {len(self.questions)}", "purple", bold=True)
        frac = max(0.0, self.q_t / self.TIME) if self.phase != "countdown" else 1.0
        r.bar(28, 2, 40, frac, "lime" if frac > 0.4 else "red")
        for i, line in enumerate(wrap(q, 70)[:3]):
            r.text(5, 4 + i, line, "white", bold=True)
        for i, opt in enumerate(options):
            y = 9 + i * 2
            selected = i == self.sel
            color = "lime" if self.locked and i == correct else "yellow" if selected else "light"
            r.text(6, y, f"{'▶' if selected else ' '} {i + 1}. {opt}", color, bold=selected)
        r.text(5, 19, "Lars: «Hm. Interessant. Din far, ja...»", "grey")


# ====================================================================== hald deg vaken
DRONE = ("... og i følgje forskrift til opplæringslova skal fråværet førast i kvar time, og "
         "dokumentert fråvær inntil ti skuledagar per skuleår kan strykast, men berre dersom "
         "eleven ber om det, og så må vi sjølvsagt sjå på den absolutte fråværsgrensa, som eg "
         "har snakka om før, og som eg kjem til å snakke om igjen, fordi det er viktig ...   ")


class MashMinigame(Minigame):
    title = "UDIR SITT FRÅVÆRSREGLEMENT"
    subtitle = "Lars snakkar. Og snakkar. Og snakkar..."
    color = "sky"
    instructions = [
        "Trykk ← og → (eller A og D) ANNANKVAR så fort du kan for å halde auga opne i 10 sekund.",
        "Vakenmåla søkk heile tida. Når ho når botnen, sovnar du – og Lars får to gratis angrep.",
        "Same tast to gonger på rad tel ikkje. Så nei, du kan ikkje berre halde inne knappen.",
    ]
    DURATION = 10.0

    def start(self):
        self.awake = 0.65
        self.pt = 0.0
        self.last_side = None
        self.presses = 0
        self.warn_t = 0.0

    def play_update(self, dt):
        self.pt += dt
        self.warn_t = max(0.0, self.warn_t - dt)
        decay = 0.22 + 0.2 * (self.pt / self.DURATION)
        self.awake -= decay * dt
        if self.awake <= 0:
            self.awake = 0
            self.sound.play("yawn")
            self.finish(False, "Zzz... du sovna midt i paragraf 3-3.")
        elif self.pt >= self.DURATION:
            self.finish(True, "Du heldt deg vaken! Lars mistar tråden.")
        if self.rng.random() < dt * 3 and self.awake < 0.4:
            self.fx.text(self.rng.randint(50, 70), 10, "z", "sky", life=1.2, rise=4)

    def play_key(self, key):
        side = "l" if key in LEFT else "r" if key in RIGHT else None
        if side is None:
            return
        if side == self.last_side:
            self.warn_t = 0.8  # same tast to gonger (eller halde inne) tel ikkje
            return
        self.last_side = side
        self.presses += 1
        self.awake = min(1.0, self.awake + 0.06)
        if self.presses % 3 == 0:
            self.sound.play("tick")

    def draw_play(self, r):
        awake = getattr(self, "awake", 0.65)
        eyes = art.EYES["open" if awake > 0.55 else "half" if awake > 0.25 else "closed"]
        for i, line in enumerate(eyes):
            r.center(5 + i, line, fg="white", bold=True)
        r.text(6, 11, "Vaken:", "sky", bold=True)
        color = "lime" if awake > 0.55 else "yellow" if awake > 0.25 else "red"
        r.bar(14, 11, 56, awake, color)
        if self.phase in ("play", "result"):
            r.text(6, 13, "Tid:", "grey")
            r.bar(14, 13, 56, min(1.0, self.pt / self.DURATION), "grey")
            offset = int(self.pt * 18) % len(DRONE)
            ticker = (DRONE[offset:] + DRONE)[:72]
            r.text(4, 17, ticker, "dark" if awake < 0.3 else "grey")
            if self.warn_t > 0:
                r.center(19, "Annankvar! ← → ← → ← →", fg="red", bold=True)
            else:
                r.center(19, "← → ← → ← →  FORT!", fg="yellow", bold=True)


# ====================================================================== maskinskriving
SENTENCES = [
    "Commodore 64 er den mest selde datamaskina.",
    "Amiga 500 hadde 512 kilobyte minne.",
    "Den første Macintosh kom i 1984.",
    "IBM PC kom på marknaden i 1981.",
    "ZX Spectrum vart laga av Sinclair.",
    "Norsk Data laga minimaskiner i Oslo.",
]


class TypingMinigame(Minigame):
    title = "DATASAMLINGA TIL LARS"
    subtitle = "«Sjå på denne! Kan du skrive av skiltet? FORT!»"
    color = "cyan"
    instructions = [
        "Skriv av setninga så fort du kan, før tida går ut.",
        "Feil tast blir ikkje skriven – berre prøv igjen. Store/små bokstavar spelar inga rolle.",
        "Klarar du det ikkje i tide, tek du 8 skade.",
    ]

    def __init__(self, game, player, enemy=None):
        super().__init__(game, player, enemy)
        self.target = self.rng.choice(SENTENCES)
        self.time_limit = len(self.target) / 3.0 + 3.0

    def start(self):
        self.pos = 0
        self.left = self.time_limit
        self.errors = 0
        self.err_t = 0.0

    def play_update(self, dt):
        self.left -= dt
        self.err_t = max(0.0, self.err_t - dt)
        if self.left <= 0:
            self.finish(False, f"For seint! Du kom til teikn {self.pos} av {len(self.target)}.")

    def play_key(self, key):
        if not isinstance(key, str) or len(key) != 1 or not key.isprintable():
            return
        if key.lower() == self.target[self.pos].lower():
            self.pos += 1
            self.sound.play("typekey")
            if self.pos >= len(self.target):
                self.finish(True, f"Feilfritt på {self.time_limit - self.left:.1f} sekund! ({self.errors} feiltrykk)")
        else:
            self.errors += 1
            self.err_t = 0.2
            self.sound.play("typewrong")

    def draw_play(self, r):
        for i, line in enumerate(art.COMPUTERS):
            r.center(2 + i, line, fg="cyan")
        x0 = (80 - len(self.target)) // 2
        pos = getattr(self, "pos", 0)
        r.box(x0 - 2, 10, len(self.target) + 4, 3, "white", style="round")
        r.text(x0, 11, self.target[:pos], "lime", bold=True)
        if pos < len(self.target):
            cur_color = "red" if getattr(self, "err_t", 0) > 0 else "yellow"
            r.text(x0 + pos, 11, self.target[pos], cur_color, bold=True, underline=True)
            r.text(x0 + pos + 1, 11, self.target[pos + 1:], "grey")
        if self.phase in ("play", "result"):
            frac = max(0.0, self.left / self.time_limit)
            r.text(6, 15, f"Tid: {max(0.0, self.left):4.1f} s", "white", bold=True)
            r.bar(20, 15, 50, frac, "lime" if frac > 0.4 else "red")
            r.text(6, 17, f"Feiltrykk: {self.errors}", "orange")


MINIGAMES = {
    "rhythm": RhythmMinigame,
    "quiz": QuizMinigame,
    "mash": MashMinigame,
    "typing": TypingMinigame,
}
