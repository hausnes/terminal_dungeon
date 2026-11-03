# terminal_dungeon

Ein dungeon crawler i terminalen, vha. Python.

Eit fokus på å bruke OOP-koding i Python, og halde oss til kva me kan få til i terminalen.

Spelet består av 1 nivå du må gjennomføre for å runde spelet. Prinsippa i koden er lagt opp slik at du enkelt kan utvide spelet med fleire brett og fleire fiendar etterkvart.

Når spelaren startar spelet blir det oppretta ein spelfigur med ulike stats: "Styrke", "Utspekulert" og "Sexy". Kvar verdi har ei maksgrense på 10. Verdiane du blir gitt er random, og det blir til at kvart spel kan bli unikt med tanke på korleis du kan overleve eller overvinne nivåa. Alle spelkarakterar får ein pengesum ved oppstart mellom 10 og 20 kroner.

Spelet foregår på Amalie Skram VGS, ein vidaregåande skule i Bergen. På skulen møter du ulike fiendar eller hindringar. Eksempelvis:
- Karakteren "Mercedes" som du må handle hos på Kaffe Diem for å kome vidare. Vara du treng kostar 50 kroner.
    - Vinn-kriterier:
        - Bruke pengar som du har plukka opp dersom du har dette. Startsummen du får er ikkje nok. Dersom du forsøker dette utan å ha nok peng mistar du helse og ein viss sum pengar.
        - Bruke "Sexy"-staten for å sjarmere ho til å gje deg ein kaffe. Dersom du forsøker dette utan å ha nok stats, og %-messig sjanse inntreff, mistar du helse og litt sexy-stat.
        - Bruke "Utspekulert" ved at du stjel milkshaken. Dersom du ikkje har nok stats, og ikkje blir oppdaga, mistar du helse og utspekulert-stat.
        - Bruke "Styrke" med at du slåss mot ho. Mercedes har spesialangrep der ho kan hive varm kaffe på deg, "Slappe" deg med handa eller utvise deg frå skulen. Varm kaffe er eit spesialangrep som kan gjere stor skade, men det er ein viss sjanse for at det ikkje treff. Slapp-ingen gjer mindre skade, men treff alltid. Utvisning avsluttar spelet, men har liten sjanse for å treffe. Spelaren kan utan spesielle items berre slå ("daske"), noko som gjer lite skade. Har du plukka opp ein linjal, ein råtten matpakke eller eit kritt kan du bruke desse for å gjere ulik skade. Kampen foregår til ein har tapt. Spelet blir ikkje avslutta om du tapar, men du går vidare med 1 HP, og har derfor mindre sjanse for å klare kamp mot rektor.
- Karakteren "Alec" på IT-kontoret, som du må få fiksa datamaskina di hjå før du kan kome vidare i spelet.
    - Vinn-kriterier:
        - Bruke pengar for å betale han, dersom du har nok. Dette kostar 100 kroner. Om mislykka, mist helse og alle pengane.
        - Bruke sexy for å sjarmere. Om mislykka, mist helse og sexy.
        - Bruke utspekulert for å sei det hastar fordi du har ein presentasjon. Om du ikkje overtalar han mistar du utspekulert-stat og helse.
        - Bruke styrke for å slåss mot han. Alex har spesialangrepa "DOXing" der du mistar ein del helse, styrke, sexy og utspekulert - men det er liten sjanse for at inntreff. Han har og angrepet "Dask med PC" som alltid treff, men gjer lite skade. Utvisning avsluttar spelet, men har liten sjanse for å treffe. Spelaren kan utan spesielle items berre slå ("daske"), noko som gjer lite skade. Har du plukka opp ein linjal, ein råtten matpakke eller eit kritt kan du bruke desse for å gjere ulik skade. Kampen foregår til ein har tapt. Spelet blir ikkje avslutta om du tapar, men du går vidare med 1 HP, og har derfor mindre sjanse for å klare kamp mot rektor.
- Slutt-bossen rektor, "Lars". Du får ikkje vitnemålet før du klarar å slå han.
    - Vinn-kriterier:
        - Bruke pengar for å betale han, dersom du har nok. Dette kostar 1000 kroner.
        - Bruke sexy for å sjarmere. Startar eit minispel der du må vrikke på rumpa i ein fast takt med musikken. Om du bommar ein einaste gong i løpet av 10 sekund er spelet over.
        - Bruke utspekulert for å lure han. Tru med at far din er advokat, noko som startar eit minispel der du må svare på nokre vanskelege fleirvalgsspørsmål som berre advokatar veit svaret på. Svarar du feil på eit av dei 3 spørsmåla så er spelet over.
        - Bruke styrke for å slåss mot han. Lars har spesialangrepa "Snakk om Udirs reglement om fråver", der du må trykke raskt på ein knapp over 10 sekund for å halde deg vaken. Om ikkje mistar du ein tur, og rektor kan angripe deg fleire gonger utan at du kan gjere noko. Han kan og vise deg samlinga si med datamaskiner, der du må skrive ein tekst du blir presentert fort for å ikkje miste helse. Han ladar under kampen opp superangrepet sitt "Sitt på", der han sluttar spelet med å sitte på fanget ditt, så du må rekke å gjere kampen ferdig innan eit visst antall rundar. 

Du må altså gjennom Mercedes og Alec før du kan nå bossen Lars. Mellom kampane så kan du gå rundt og utforske for å finne pengar og items. Som nemnt tidlegare kan du plukke opp injal, ein råtten matpakke eller eit kritt.

Sjølv om spelet foregår i terminalen skal det vere grafikk som gjer spelopplevinga spanande. Spelverda kan vere ein skjerm, men du kan gå rundt og utforske. Eg er usikker på korleis dette kan bli gjort, men ynskjer ein kul effekt - og ei spanande oppleving. Kan det vere ein ide at pengane og items fyk rundt på skjermen slik at det er litt utfordrande å ta dei? Forslaget mitt er at du etter visse tidsintervall møter kamp, eksempelvis 10 sek utforsking/samling og så Mercedes, 10 sek utforsking/samling og så Alec, for at du etter nye 10 sek med utforsking/samling møter rektor.

---

## Korleis spele

Krev berre Python 3.10+ – ingen eksterne pakkar.

```bash
python3 main.py              # eller: python3 -m terminal_dungeon
python3 main.py --mute       # utan lyd
python3 main.py --stage 3    # hopp rett til rektor (for å øve)
```

Terminalen må vere minst **80×24** teikn. Spelet brukar fargar og Unicode, så ein moderne terminal (macOS Terminal, iTerm2, VS Code, Windows Terminal) fungerer best. På Windows må du først køyre `pip install windows-curses`.

| Tast | Kva |
|---|---|
| Piltastar / WASD | Gå, vel i menyar |
| Mellomrom | Spurt (i utforskinga), dans (i rytmespelet) |
| Enter | Stadfest / hopp over tekst |
| Esc | Pause (lyd av/på, til tittel, avslutt) |

**Lyd:** All musikk og alle lydeffektar blir laga matematisk i `engine/sound.py` (chiptune med firkant- og trekantbølgjer) og lagra i `~/.cache/terminal_dungeon` første gong. Avspelinga brukar `afplay` (macOS), `paplay`/`aplay` (Linux) eller `winsound` (Windows).

**Testar:** `python3 -m unittest`

## Oppbygging (OOP)

```
terminal_dungeon/
├── game.py            Game: hovudløkka, scene-stabel, overgangar og spelflyt
├── art.py             ASCII-portrett og blokkskrift
├── engine/            Generell motor – veit ingenting om sjølve spelet
│   ├── screen.py      Renderer: fargar, klipping, risting, blink
│   ├── effects.py     Particle, FloatingText, Projectile
│   └── sound.py       Synthesizer + SoundManager
├── model/             Spelreglane – ingen curses her, lett å teste
│   ├── stats.py       Stats (Styrke, Utspekulert, Sexy)
│   ├── player.py      Player
│   ├── items.py       Item → Coin/Wallet/…, CinnamonBun, Weapon → Ruler/RottenLunch/Chalk
│   ├── attacks.py     Attack → ExpelAttack, DoxAttack, MinigameAttack
│   ├── approaches.py  Approach → PayApproach, StatApproach, MinigameApproach, FightApproach
│   ├── enemies.py     Enemy → Mercedes, Alec, Lars
│   └── level.py       Level og Stage
└── scenes/            Kvar skjerm er ei Scene
    ├── title.py       Tittel (med Bergens-regn), hjelp, pause
    ├── character.py   Innskriving og trekking av stats
    ├── explore.py     Utforsking med flygande pengar, lekser og vikar
    ├── encounter.py   Møte med fiende og val av strategi
    ├── battle.py      Turbasert kamp
    ├── minigames.py   Rytme, advokatquiz, hald-deg-vaken, maskinskriving
    └── ending.py      Game over og vitnemål
```

### Utvide spelet

**Ny fiende:** lag ein subklasse av `Enemy` i `model/enemies.py`, med tekst, `make_attacks()` og `approaches()`. Legg han så til som ein ny `Stage` i `model/level.py`:

```python
Stage("Etappe 4", "Gymsalen", Gymlaerar, hazards=4, chasers=2, color="red")
```

**Nytt våpen:** arv frå `Weapon` i `model/items.py`, set skade/treffsjanse/bruk, og overstyr `on_hit()` om det skal ha ein spesialeffekt. Legg det i `WEAPON_TYPES`, så dukkar det opp i utforskinga.

**Nytt minispel:** arv frå `Minigame` i `scenes/minigames.py` og registrer det i `MINIGAMES`. Då kan både `MinigameApproach` og `MinigameAttack` bruke det.
