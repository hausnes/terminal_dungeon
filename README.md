# Terminal Dungeon

Ein dungeon crawler i retro-terminalstil. Spelet går føre seg på **Amalie Skram VGS** i Bergen, og målet er å kome seg forbi baristaen, IT-ansvarleg og rektor for å få vitnemålet.

**▶ Spel i nettlesaren: <https://hausnes.github.io/terminal_dungeon/web/>** (fungerer òg på mobil)

Prosjektet har to mål:

- **Objektorientert programmering.** Koden er bygd opp med klassar og arv, slik at det er enkelt å utvide spelet med fleire brett, fiendar, våpen og minispel.
- **Terminalkjensle.** Alt blir teikna som teikn i eit rutenett på 80 × 24, men med fargar, animasjonar, partikkeleffektar, musikk og lydeffektar. Ingen eksterne pakkar eller bibliotek trengst.

Spelet finst i to utgåver med same innhald:

| Utgåve | Mappe | Køyrer i |
|---|---|---|
| **Python** (originalen) | `terminal_dungeon/` | Terminalen, via `curses` |
| **JavaScript** | `web/` | Nettlesaren, på PC, Mac, mobil og nettbrett |

---

## Innhald

- [Tre måtar å spele på](#tre-måtar-å-spele-på)
- [Om spelet](#om-spelet)
- [Fiendane](#fiendane)
- [Ting du kan finne](#ting-du-kan-finne)
- [Kontrollar](#kontrollar)
- [Køyre frå kjeldekoden](#køyre-frå-kjeldekoden)
- [Oppbygging av koden](#oppbygging-av-koden)
- [Utvide spelet](#utvide-spelet)
- [Lage ein ny versjon](#lage-ein-ny-versjon)

---

## Tre måtar å spele på

| | Kva du treng | Passar for |
|---|---|---|
| [1. I nettlesaren](#1-i-nettlesaren) | Ingenting – berre ei lenkje | Alle, òg på mobil og nettbrett |
| [2. Programfil](#2-programfil-for-windows-og-mac) | Last ned og dobbeltklikk | PC og Mac utan Python |
| [3. Frå kjeldekoden](#køyre-frå-kjeldekoden) | Python 3.10+ | Utviklarar og elevar som vil sjå på koden |

### 1. I nettlesaren

Opne **<https://hausnes.github.io/terminal_dungeon/web/>**.

- **PC/Mac:** spel med tastaturet. Spelet skalerer seg etter vindauget, og du kan velje *Fullskjerm* i menyen.
- **Mobil og nettbrett:** hald telefonen **på langs**. Det dukkar opp ein styrespak til venstre, ENTER og MELLOMROM til høgre, og ESC (pause) oppe til høgre. Skjermtastaturet opnar seg når du skal skrive.
- **Tips:** legg spelet til på heimeskjermen, så opnar det i fullskjerm med eige ikon.
  - iPhone/iPad (Safari): *Del → Legg til på Hjem-skjerm*
  - Android (Chrome): *⋮ → Legg til på startskjermen*
- **Lyd:** lyden startar når du trykkjer på den første tasten eller knappen, fordi nettlesarar krev det.

Adressa kan ha nokre valfrie tillegg:

| Tillegg | Kva |
|---|---|
| `?stage=3` | Start på etappe 3 (øv på rektor) |
| `?seed=42` | Fast tilfeldigheit (same stats og same spel kvar gong) |
| `?mute` | Start utan lyd |
| `?touch` | Vis spelkontrollane for berøring, t.d. på ein PC med berøringsskjerm |

Til dømes: <https://hausnes.github.io/terminal_dungeon/web/?stage=3>

### 2. Programfil for Windows og Mac

Ferdige programfiler av Python-utgåva ligg under [Releases](https://github.com/hausnes/terminal_dungeon/releases/latest). Du treng ikkje installere Python.

| System | Fil | Første gong |
|---|---|---|
| Windows | `terminal_dungeon-windows.exe` | Ved åtvaringa «Windows beskytta PC-en»: trykk *Meir info → Køyr likevel*. |
| Mac (M1 eller nyare) | `terminal_dungeon-mac.zip` | Pakk ut og dobbeltklikk. Gå så til *Systeminnstillingar → Personvern og tryggleik → Opne likevel*. |

Terminalvindauget må vere minst **80 × 24 teikn**. På Windows blir det berre spelt éin lydeffekt om gongen, og det er ingen bakgrunnsmusikk.

### 3. Frå kjeldekoden

Sjå [Køyre frå kjeldekoden](#køyre-frå-kjeldekoden) lenger nede.

---

## Om spelet

### Spelfiguren

Når du startar spelet, skriv du inn namnet ditt. Så blir stats trekte tilfeldig, slik at kvar runde blir ulik:

| Stat | Verdi | Kva han gjer |
|---|---|---|
| **Styrke** | 1–10 | Meir skade i kamp, og meir helse (maks helse = 24 + styrke). |
| **Utspekulert** | 1–10 | Lure, stele og snakke deg ut av ting. |
| **Sexy** | 1–10 | Sjarmere folk til å gi deg det du vil ha. |

Du startar med mellom 10 og 20 kroner, og kan trekkje stats på nytt to gonger.

### Gangen i spelet

Brettet har tre etappar. Kvar etappe består av to delar:

1. **Utforsking (10 sekund).** Du spring rundt i gangen og fangar pengar og ting som fyk rundt på skjermen. Unngå lekser (`§`). Frå etappe 2 jagar òg ein vikar (`V`) deg.
2. **Møte med ein fiende.** Du vel korleis du vil kome forbi:

   | Val | Korleis det verkar |
   |---|---|
   | **Pengar** | Betal det fienden krev. Har du ikkje nok, går det ut over deg. |
   | **Sexy** / **Utspekulert** | Når staten din når kravet, lukkast du alltid. Er han lågare, er sjansen 60 % × stat / krav. Menyen viser sjansen. |
   | **Styrke** | Turbasert kamp. |

   Feilar du med pengar, sexy eller utspekulert, mistar du helse og/eller stats, men du kan prøve eit anna val. Kvart val kan berre brukast éin gong per fiende.

Tapar du ein kamp mot Mercedes eller Alec, går du vidare med 1 HP. Då blir det vanskelegare mot rektor. Går helsa til 0 utanom kamp, er spelet over.

---

## Fiendane

### 1. Mercedes – barista på Kaffe Diem

Du treng ein karamell-milkshake for å kome vidare. Mercedes har 20 HP.

| Val | Krav | Om det går gale |
|---|---|---|
| Kjøp milkshaken | 50 kr (gir òg +6 HP) | −3 HP og halvparten av pengane |
| Sjarmer Mercedes | Sexy 6 | −4 HP og −1 sexy |
| Stjel milkshaken | Utspekulert 6 | −4 HP og −1 utspekulert |
| Slåss | – | Kamp |

| Angrep | Skade | Treffsjanse |
|---|---|---|
| Varm kaffe | 6–9 | 55 % |
| Slapp | 2–3 | Treff alltid |
| Utvising | Game over | Liten |

### 2. Alec – IT-ansvarleg

Datamaskina di må fiksast før du kan gå vidare. Alec har 25 HP.

| Val | Krav | Om det går gale |
|---|---|---|
| Betal for ekspressfiks | 100 kr | −4 HP og **alle** pengane |
| Sjarmer Alec | Sexy 7 | −5 HP og −2 sexy |
| Lat som det hastar («eg har presentasjon!») | Utspekulert 7 | −5 HP og −2 utspekulert |
| Slåss | – | Kamp |

| Angrep | Skade | Treffsjanse |
|---|---|---|
| DOXing | 6–9 og −1 på alle stats | 25 % |
| Dask med PC | 2–4 | Treff alltid |
| Utvising | Game over | Liten |

### 3. Rektor Lars – sluttboss

Du får ikkje vitnemålet før du har kome forbi Lars. Her er det ingen andre sjansar: feilar du i eit av minispela, er spelet over.

| Val | Kva skjer |
|---|---|
| Kjøp vitnemålet | Kostar 1000 kr. Har du ikkje nok, mistar du 5 HP. |
| **Vrikk på rumpa** (sexy) | Rytmespel: trykk mellomrom i takt med musikken i 10 sekund. Éin feil, og spelet er over. Høg sexy gir større slingringsmonn. |
| **«Far min er advokat!»** (utspekulert) | Tre vanskelege juss-spørsmål med fire svaralternativ og 20 sekund per spørsmål. Eitt feil svar, og spelet er over. Med utspekulert 7 eller høgare blir eitt eller to feil svar fjerna. |
| **Slåss** (styrke) | Kamp mot Lars, som har 38 HP. |

Lars sine angrep:

| Angrep | Kva skjer |
|---|---|
| Myndig blikk | 3–5 skade |
| Udir sitt fråværsreglement | Minispel: trykk ← og → annankvar i 10 sekund for å halde deg vaken. Sovnar du, får Lars to gratis angrep. |
| Datasamlinga | Minispel: skriv av ei setning om gamle datamaskiner før tida går ut. Klarar du det ikkje, tek du 8 skade. |
| **Sitt på** | Lars ladar opp eitt steg kvar runde. Etter 14 rundar set han seg på fanget ditt, og spelet er over. |

---

## Ting du kan finne

Desse fyk rundt på skjermen under utforskinga og forsvinn etter nokre sekund.

| Symbol | Ting | Effekt |
|:---:|---|---|
| `¤` | Femkroning | +5 kr |
| `Ø` | Tjuekroning | +20 kr |
| `▣` | Lommebok | +35–70 kr (rask) |
| `★` | Vinnarlodd | +300 kr (sjeldan og svært rask) |
| `♥` | Kanelbolle | +8 HP |
| `╪` | Linjal | Våpen: 3–5 skade, 85 % treff, 5 bruk |
| `&` | Råtten matpakke | Våpen: 6–9 skade, 70 % treff, 1 bruk. 50 % sjanse for at fienden blir kvalm og mistar ein tur. |
| `¦` | Kritt | Våpen: 2–4 skade, 95 % treff, 3 bruk. 40 % sjanse for at fienden blir blind i to rundar. |
| `§` | Lekse | −2 HP om ho treff deg |
| `V` | Vikar | −2 HP og −5 kr om han tek deg |

Utan våpen kan du berre **daske** (1–3 skade, treff 90 %). Alle våpen gjer meir skade jo høgare styrke du har, og kvart slag har 10 % sjanse for kritisk treff.

---

## Kontrollar

| Tastatur | Mobil | Kva |
|---|---|---|
| Piltastar / WASD | Styrespak | Gå, og vel i menyar |
| Mellomrom | MELLOMROM | Spurt i utforskinga, dans i rytmespelet, trekk stats på nytt |
| Enter | ENTER | Stadfest, eller hopp over tekst |
| Esc | ESC | Pause: lyd av/på, fullskjerm (web), til tittelskjermen, avslutt (terminal) |
| Bokstavar | ⌨ Tastatur | Skriv namnet ditt og setningane i maskinskrivingsspelet |

---

## Køyre frå kjeldekoden

### Python-utgåva (terminal)

Krev **Python 3.10 eller nyare**. På Windows må du òg køyre `pip install windows-curses`.

```bash
python3 main.py              # eller: python3 -m terminal_dungeon
python3 main.py --mute       # utan lyd
python3 main.py --stage 3    # hopp rett til rektor (for å øve)
python3 -m unittest          # køyr testane
```

Spelet brukar fargar og Unicode, så ein moderne terminal fungerer best: macOS Terminal, iTerm2, VS Code eller Windows Terminal.

**Lyd:** All musikk og alle lydeffektar blir laga matematisk i `engine/sound.py` (chiptune med firkant- og trekantbølgjer) og lagra i `~/.cache/terminal_dungeon` første gong spelet startar. Avspelinga brukar `afplay` på macOS, `paplay`/`aplay` på Linux og `winsound` på Windows. I Windows blir det berre spelt éin lydeffekt om gongen, og det er ingen bakgrunnsmusikk.

### JavaScript-utgåva (nettlesar)

Webutgåva er rein HTML, CSS og JavaScript utan byggjesteg. Nettlesarar vil ikkje laste JavaScript-modular rett frå ei fil (`file://`), så du treng ein enkel lokal webserver:

```bash
python3 -m http.server 8000 --directory web   # opne så http://localhost:8000
node --test web/tests/                        # køyr testane (Node 22+)
```

Sjå [`web/README.md`](web/README.md) for meir om webutgåva.

---

## Oppbygging av koden

```
terminal_dungeon/          (repoet)
├── main.py                Startar Python-utgåva
├── terminal_dungeon/      Python-utgåva (sjå under)
├── tests/                 Testar for Python-utgåva
├── web/                   JavaScript-utgåva – same oppbygging, sjå web/README.md
└── .github/workflows/
    └── build.yml          Byggjer programfilene for Windows og Mac
```

Begge utgåvene er delte i tre lag:

- `engine/` kan teikne og spele lyd, men veit ingenting om sjølve spelet.
- `model/` inneheld spelreglane, utan nokon curses-kode, så han er lett å teste.
- `scenes/` set det heile saman til skjermane du ser.

```
terminal_dungeon/
├── game.py            Game: hovudløkka, scene-stabelen, overgangar og spelflyt
├── art.py             ASCII-portrett og blokkskrift
├── engine/
│   ├── screen.py      Renderer: fargar, klipping, risting og blink
│   ├── effects.py     Particle, FloatingText, Projectile
│   └── sound.py       Synthesizer og SoundManager
├── model/
│   ├── stats.py       Stats (Styrke, Utspekulert, Sexy)
│   ├── player.py      Player
│   ├── items.py       Item → Coin, Wallet, CinnamonBun, Weapon → Ruler, RottenLunch, Chalk
│   ├── attacks.py     Attack → ExpelAttack, DoxAttack, MinigameAttack
│   ├── approaches.py  Approach → PayApproach, StatApproach, MinigameApproach, FightApproach
│   ├── enemies.py     Enemy → Mercedes, Alec, Lars
│   └── level.py       Level og Stage
└── scenes/            Kvar skjerm er ei Scene
    ├── title.py       Tittelskjerm (med Bergens-regn), hjelp og pause
    ├── character.py   Innskriving og trekking av stats
    ├── explore.py     Utforsking med flygande pengar, lekser og vikar
    ├── encounter.py   Møte med fiende og val av strategi
    ├── battle.py      Turbasert kamp
    ├── minigames.py   Rytme, advokatquiz, hald deg vaken og maskinskriving
    └── ending.py      Game over og vitnemål
```

---

## Utvide spelet

Dei to utgåvene har kvar si kodebase med dei same klassane. Vil du at ei endring skal gjelde begge stader, må du gjere ho i både `terminal_dungeon/` (Python) og `web/js/` (JavaScript). Filnamna og klassane svarar til kvarandre, til dømes `model/enemies.py` og `model/enemies.js`.

**Ny fiende:** Lag ein subklasse av `Enemy` i `model/enemies.py`, med tekst, `make_attacks()` og `approaches()`. Legg han så til som ein ny `Stage` i `model/level.py`:

```python
Stage("Etappe 4", "Gymsalen", Gymlaerar, hazards=4, chasers=2, color="red")
```

**Nytt våpen:** Arv frå `Weapon` i `model/items.py`, og set skade, treffsjanse og tal på bruk. Overstyr `on_hit()` om våpenet skal ha ein spesialeffekt. Legg det til i `WEAPON_TYPES`, så dukkar det opp i utforskinga.

**Nytt minispel:** Arv frå `Minigame` i `scenes/minigames.py` og registrer det i `MINIGAMES`. Då kan både `MinigameApproach` (eit val i møtet) og `MinigameAttack` (eit angrep i kamp) bruke det.

---

## Lage ein ny versjon

**Webutgåva** blir publisert på GitHub Pages ved kvar push til `main`. Etter eitt eller to minutt ligg den nye utgåva ute. Pages er sett opp med *Deploy from a branch → `main` → `/ (root)`*, og difor ligg spelet under `/web/` i adressa.

**Programfilene** blir bygde av GitHub Actions (`.github/workflows/build.yml`). Ved kvar push til `main` blir dei bygde og testa. Når du pushar ein versjonstagg, blir det i tillegg laga ein ny release med filer til nedlasting:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Taggen kan òg lagast på GitHub under *Releases → Draft a new release*.
