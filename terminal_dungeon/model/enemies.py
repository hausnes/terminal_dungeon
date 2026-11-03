"""Fiendane på Amalie Skram VGS.

Ein ny fiende lagar du ved å arve frå Enemy og fylle inn tekst,
angrep (make_attacks) og måtar å kome forbi på (approaches).
"""

from __future__ import annotations

from .. import art
from .approaches import FightApproach, MinigameApproach, PayApproach, StatApproach
from .attacks import Attack, DoxAttack, ExpelAttack, MinigameAttack


class Enemy:
    name = "Fiende"
    title = ""
    location = ""
    max_hp = 20
    color = "white"
    art: list[str] = []
    is_boss = False
    intro = ""
    fight_start = ""
    fight_won = ""  # når spelaren vinn kampen
    fight_lost = ""  # når spelaren tapar kampen

    def __init__(self):
        self.hp = self.max_hp
        self.stunned = 0
        self.blinded = 0
        self.attacks = self.make_attacks()

    @property
    def alive(self) -> bool:
        return self.hp > 0

    def hurt(self, amount: int) -> int:
        actual = max(0, min(self.hp, amount))
        self.hp -= actual
        return actual

    def make_attacks(self) -> list[Attack]:
        return []

    def approaches(self) -> list:
        return []

    def choose_attack(self, rng) -> Attack:
        return rng.choices(self.attacks, weights=[a.weight for a in self.attacks])[0]

    def on_turn_start(self, battle) -> bool:
        """Kallast før fienden angrip. Returner False for å avbryte turen."""
        return True


class Mercedes(Enemy):
    name = "Mercedes"
    title = "Barista på Kaffe Diem"
    location = "Kaffe Diem · 1. etasje"
    max_hp = 20
    color = "coffee"
    art = art.MERCEDES
    intro = ("Hei, vennen! Du ser trøytt ut. Utan ein karamell-milkshake frå Kaffe Diem kjem du "
             "ingen stad i dag. Femti kroner, takk.")
    fight_start = "Du vil slåss? Greitt. Eg har kokt kaffe sidan klokka sju!"
    fight_won = "Au, au! Ta milkshaken då, og forsvinn!"
    fight_lost = "Hah! Gå no, før eg bryggjer ei ny kanne."

    def make_attacks(self):
        return [
            Attack("Varm kaffe", 35, 0.55, (6, 9), "~", "coffee", "coffee",
                   "Mercedes kastar VARM KAFFE!", "Kaffen treff! Du tek {dmg} skade.",
                   "Kaffen skvett i golvet. Puh!"),
            Attack("Slapp", 55, 1.0, (2, 3), ")", "skin", "slap",
                   "Mercedes gir deg ein SLAPP!", "Klask! {dmg} skade."),
            ExpelAttack("Utvising", 10, 0.12, (0, 0), "!", "red", "expel",
                        "Mercedes ringjer rektor og krev UTVISING!",
                        "Mercedes fekk deg utvist frå Amalie Skram. Det var det.",
                        "Rektor tok ikkje telefonen. Heldigvis!"),
        ]

    def approaches(self):
        return [
            PayApproach(
                50, "Kjøp milkshake (50 kr)", "Betal som ein vanleg, lovlydig elev. Gir litt helse òg.",
                "Takk for handelen! Ha ein fin dag, vennen.",
                ["Du får ein iskald karamell-milkshake. Energien strøymer gjennom kroppen!"],
                "Dette er jo berre lommerusk! Kom tilbake når du har femti kroner.",
                ["Mercedes feiar myntane dine ned i tipskrukka."],
                fail_hp=3, fail_money_frac=0.5, reward_hp=6,
            ),
            StatApproach(
                "sexy", 6, "Sjarmer Mercedes", "Blunk, smil og håp at ho spanderer.",
                "Å, du er då for søt! Denne er på huset.",
                ["Mercedes rekkjer deg ein milkshake med ekstra krem."],
                "Hæ? Har du fått noko i auget?",
                ["Blunket ditt såg meir ut som eit krampeanfall. Pinleg."],
                hp_loss=4, stat_loss=1,
            ),
            StatApproach(
                "utspekulert", 6, "Stjel milkshaken", "Vent til ho snur seg, og grip sjansen.",
                "...Kvar vart det av den milkshaken?!",
                ["Du sniker deg ut med milkshaken under genseren. Kaldt, men verdt det."],
                "Eg ser deg! Hendene vekk frå disken!",
                ["Mercedes slår deg over fingrane med ei kaffiskei."],
                hp_loss=4, stat_loss=1,
            ),
            FightApproach("Slåss mot Mercedes", "Ho har varm kaffe. Du har... hender."),
        ]


class Alec(Enemy):
    name = "Alec"
    title = "IT-ansvarleg"
    location = "IT-kontoret · 2. etasje"
    max_hp = 25
    color = "cyan"
    art = art.ALEC
    intro = ("Datamaskina di ser ut som ho har vore gjennom ein vaskemaskin. Eg har 47 saker i køen. "
             "Kva får eg for å hoppe over dei?")
    fight_start = "Feil val. Eg veit kva du søkte på i går."
    fight_won = "Greitt, greitt! PC-en din er fiksa. Berre gå!"
    fight_lost = "Du burde ha sendt ein supportsak."

    def make_attacks(self):
        return [
            DoxAttack("DOXing", 20, 0.25, (6, 9), "@", "cyan", "hurt",
                      "Alec startar DOXING! Tastaturet glør...",
                      "Han legg ut skjermtida di på Insta! {dmg} skade, og alle stats -1.",
                      "Wi-fi-en fall ut. DOXinga feila!"),
            Attack("Dask med PC", 70, 1.0, (2, 4), "▬", "grey", "hit",
                   "Alec daskar deg med PC-en!", "Bonk! {dmg} skade."),
            ExpelAttack("Utvising", 10, 0.10, (0, 0), "!", "red", "expel",
                        "Alec sender e-post til rektor om UTVISING!",
                        "Alec fekk deg utvist. Han hadde loggført alt.",
                        "E-posten hamna i spamfilteret!"),
        ]

    def approaches(self):
        return [
            PayApproach(
                100, "Betal for ekspressfiks (100 kr)", "Pengar snakkar. Òg på IT-kontoret.",
                "Hundre kroner? Då flyttar du deg fram i køen.",
                ["Alec trykkjer Ctrl+Alt+Delete med dramatisk tyngd. PC-en verkar igjen!"],
                "Prøver du å svindle IT-avdelinga?!",
                ["Alec konfiskerer lommeboka di «for sikkerheitssjekk»."],
                fail_hp=4, fail_money_frac=1.0,
            ),
            StatApproach(
                "sexy", 7, "Sjarmer Alec", "Ein liten flørt med IT-guden.",
                "Eh... ja... e-eg kan sikkert sjå på det no med ein gong.",
                ["Alec raudnar og fiksar PC-en på rekordtid."],
                "Eg er immun mot sosial manipulering. Eg har teke kurs.",
                ["Alec held eit ti minutt langt foredrag om phishing. Det tappar deg."],
                hp_loss=5, stat_loss=2,
            ),
            StatApproach(
                "utspekulert", 7, "Lat som det hastar", "Du har presentasjon om fem minutt! (Eigentleg ikkje.)",
                "Presentasjon? Om fem minutt?! Gi meg maskina!",
                ["Alec fiksar PC-en i panikk. Du glir vidare med eit lurt smil."],
                "Timeplanen din seier at du har fri no. Eg har tilgang til alt.",
                ["Avslørt! Alec viser timeplanen din på storskjermen."],
                hp_loss=5, stat_loss=2,
            ),
            FightApproach("Slåss mot Alec", "Han har ein laptop og null tolmod."),
        ]


class Lars(Enemy):
    name = "Lars"
    title = "Rektor"
    location = "Rektorkontoret"
    max_hp = 38
    color = "purple"
    art = art.LARS
    is_boss = True
    charge_max = 14
    intro = ("Så. Du trur du skal få vitnemål, du? Ingen forlèt Amalie Skram utan å gå forbi meg. "
             "Og eg er... vanskeleg å gå forbi.")
    fight_start = "Du vil slåss mot rektor? Eg har sete i møte sidan 1998. Eg er klar."
    fight_won = "Nei... nei! Greitt! Her er vitnemålet ditt!"
    fight_lost = ""

    def __init__(self):
        super().__init__()
        self.charge = 0

    def make_attacks(self):
        return [
            Attack("Myndig blikk", 45, 0.85, (3, 5), "*", "purple", "hit",
                   "Lars sender deg eit MYNDIG BLIKK.", "Blikket brenn. {dmg} skade.",
                   "Du ser vekk i tide!"),
            MinigameAttack("Fråværsreglementet", 30, "mash",
                           "Lars byrjar å snakke om Udir sitt reglement om FRÅVÆR...",
                           "Du heldt deg vaken! Lars mistar tråden.",
                           "Du sovna! Lars får to gratis angrep.", fail_skip=2),
            MinigameAttack("Datasamlinga", 25, "typing",
                           "Lars viser deg DATASAMLINGA si! «Skriv dette av, fort!»",
                           "Du skreiv det feilfritt. Lars er nesten imponert.",
                           "For seint! Lars mimrar om Commodore i ein time. 8 skade.", fail_damage=8),
        ]

    def on_turn_start(self, battle):
        self.charge += 1
        battle.sound.play("charge")
        if self.charge >= self.charge_max:
            battle.sit_on()
            return False
        if self.charge == self.charge_max - 2:
            battle.log("Lars ser på fanget ditt... SITT PÅ er nesten ladd!", "magenta")
        return True

    def approaches(self):
        return [
            PayApproach(
                1000, "Kjøp vitnemålet (1000 kr)", "Korrupsjon er eit sterkt ord. Kall det ei gåve.",
                "Tusen kroner... Eg ser at du har forstått korleis verda fungerer.",
                ["Lars stemplar vitnemålet ditt med eit fornøgd nikk."],
                "Er dette ein vits? Tusen kroner, sa eg!",
                ["Lars sukkar så djupt at du mistar motet."],
                fail_hp=5, fail_money_frac=0.0,
            ),
            MinigameApproach(
                "sexy", "rhythm", "Vrikk på rumpa",
                "Dans i takt med musikken i 10 sekund. Éin feil, og spelet er over!",
                "Eg... eg har aldri sett noko liknande. Ta vitnemålet ditt og gå.",
                ["Rektor Lars er så imponert at han signerer vitnemålet med skjelvande hand."],
                "Nei, nei, nei. Det der var ikkje i takt.",
                "Du mista takta. Rektor Lars ristar på hovudet og kallar inn foreldra dine.",
            ),
            MinigameApproach(
                "utspekulert", "quiz", "«Far min er advokat!»",
                "Svar rett på 3 juss-spørsmål. Eitt feil svar, og spelet er over!",
                "Ehm... ja. Vi treng jo ikkje å involvere advokatar.",
                ["Lars kremtar nervøst og skyv vitnemålet over pulten."],
                "Advokat, seier du? Far din bør lese seg opp.",
                "Bløffen vart avslørt. Lars sender deg rett på dør – utan vitnemål.",
            ),
            FightApproach("Slåss mot rektor Lars", "Han ladar opp «Sitt på». Vinn før det er for seint!"),
        ]
