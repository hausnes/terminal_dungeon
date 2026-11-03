# Terminal Dungeon – web

Web-versjon av spelet, skriven i JS.

Dette er ei omskriving av Python-versjonen til JavaScript, med same klassar, reglar, tekstar, musikk og lydeffektar. Han krev ingen installering og ingen byggjesteg: berre HTML, CSS og ES-modular som nettlesaren køyrer direkte.

**Spel her:** <https://hausnes.github.io/terminal_dungeon/web/>

## Kva som er annleis enn i terminalen

| | Terminal (Python) | Nettlesar (JS) |
|---|---|---|
| Teikning | `curses` | `<canvas>` med eit rutenett på 80 × 24 teikn. Blokk- og rammeteikn blir teikna som former, så dei heng saman. |
| Lyd | WAV-filer via `afplay`/`winsound` | Web Audio. Lyden blir slått på ved første tastetrykk, fordi nettlesarar krev det. |
| Rørsle | Tastaturet si eiga repetering | Jamn rørsle når du held inne piltastane |
| Storleik | Terminalen må vere minst 80 × 24 | Skalerer automatisk til vindauget |
| Meny | «Avslutt» | «Fullskjerm» |

Spelet krev tastatur, og fungerer difor ikkje på mobil eller nettbrett.

## Valfrie parametrar i adressa

| Parameter | Kva |
|---|---|
| `?stage=3` | Start på etappe 3 (øv på rektor) |
| `?seed=42` | Fast tilfeldigheit (same stats og same spel kvar gong) |
| `?mute` | Start utan lyd |

Lyd av/på blir hugsa i nettlesaren til neste gong.

## Køyre lokalt

ES-modular kan ikkje lastast rett frå fila (`file://`), så du treng ein enkel webserver:

```bash
python3 -m http.server 8000 --directory web
```

Opne så <http://localhost:8000>.

## Testar

Spelmodellen kan testast utan nettlesar med Node (versjon 22 eller nyare):

```bash
node --test web/tests/
```

## Publisere på GitHub Pages

1. Gå til *Settings → Pages* i repoet.
2. Under *Build and deployment* vel du *Source: Deploy from a branch*, *Branch: `main`* og mappa */ (root)*.
3. Trykk *Save*. Etter eitt eller to minutt ligg spelet på `https://hausnes.github.io/terminal_dungeon/web/`.

Seinare oppdateringar blir publiserte automatisk kvar gong du pushar til `main`.

## Oppbygging

```
web/
├── index.html            Sida med <canvas>
├── style.css
├── js/
│   ├── main.js           Startpunkt: koplar tastatur, lyd og canvas til spelet
│   ├── game.js           Game: scene-stabel, overgangar og spelflyt
│   ├── config.js, rng.js, art.js
│   ├── engine/
│   │   ├── screen.js     Renderer (rutenettet) og CanvasDisplay (teiknar det)
│   │   ├── effects.js    Particle, FloatingText, Projectile
│   │   └── sound.js      Synthesizer og SoundManager (Web Audio)
│   ├── model/            Spelreglane – same klassar som i Python
│   │   ├── stats.js, player.js, items.js, attacks.js
│   │   ├── approaches.js, enemies.js, level.js
│   └── scenes/           Tittel, innskriving, utforsking, møte, kamp, minispel, slutt
└── tests/
    └── model.test.js
```

Game veit ingenting om nettlesaren: `main.js` sender inn tastetrykk med `game.keyDown()` og kallar `game.frame(dt)` for kvart bilete. Difor kan heile spelet òg køyrast og testast i Node.

## Utvide spelet

Det fungerer på same måte som i Python-versjonen:

- **Ny fiende:** arv frå `Enemy` i `model/enemies.js`, og legg han til som ein ny `Stage` i `model/level.js`.
- **Nytt våpen:** arv frå `Weapon` i `model/items.js`, og legg det til i `WEAPON_TYPES`.
- **Nytt minispel:** arv frå `Minigame` i `scenes/minigames.js`, og registrer det i `MINIGAMES`.
