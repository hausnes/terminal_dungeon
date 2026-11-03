// Startpunkt i nettlesaren: kopla tastatur, lyd og canvas til spelet.
//
// Valfrie parametrar i adressa:
//   ?stage=3   start på etappe 3 (øv på rektor)
//   ?seed=42   fast tilfeldigheit
//   ?mute      start utan lyd
//   ?touch     vis spelkontrollane for berøring (t.d. på PC med berøringsskjerm)

import { CanvasDisplay } from "./engine/screen.js";
import { SoundManager } from "./engine/sound.js";
import { Game } from "./game.js";
import { Random } from "./rng.js";
import { TouchControls } from "./touch.js";

const params = new URLSearchParams(window.location.search);
const seedParam = params.get("seed");
const stage = Math.max(1, Number(params.get("stage")) || 1);

const canvas = document.getElementById("screen");
const display = new CanvasDisplay(canvas);
const sound = new SoundManager(!params.has("mute"));

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    return;
  }
  const req = document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
  // På Android kan vi låse skjermen i liggjande format når spelet er i fullskjerm
  req?.then(() => screen.orientation?.lock?.("landscape")).catch(() => {});
}

const game = new Game({
  sound,
  rng: new Random(seedParam === null ? null : Number(seedParam)),
  startStage: stage - 1,
  onFullscreen: toggleFullscreen,
});
game.start();

// ---------------------------------------------------------------- mobil
const touch = new TouchControls(game, sound);
if (params.has("touch") || window.matchMedia("(pointer: coarse)").matches) touch.enable();
window.addEventListener("touchstart", () => touch.enable(), { once: true, passive: true });

/** Pause spelet (om scena tillèt det), t.d. når brukaren byter app. */
function autoPause() {
  game.held.clear();
  if (game.top?.pausable) game.keyDown("ESC");
}

/** Er telefonen på høgkant med for lite plass til teksten? Be brukaren snu han. */
function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  const rotate = touch.enabled && portrait && display.cssCell < 6.5;
  if (rotate && !document.body.classList.contains("rotate")) autoPause();
  document.body.classList.toggle("rotate", rotate);
}
window.addEventListener("resize", checkOrientation);
checkOrientation();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});

// ---------------------------------------------------------------- tastatur
const NAMED = {
  ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
  Enter: "ENTER", Escape: "ESC", Backspace: "BACKSPACE",
};
const HELD = { UP: "UP", DOWN: "DOWN", LEFT: "LEFT", RIGHT: "RIGHT", w: "UP", W: "UP", s: "DOWN", S: "DOWN",
  a: "LEFT", A: "LEFT", d: "RIGHT", D: "RIGHT" };

function normalise(e) {
  if (NAMED[e.key]) return NAMED[e.key];
  if (e.key === "Spacebar") return " ";
  if ([...e.key].length === 1) return e.key;
  return null;
}

const textInput = document.getElementById("textin");

window.addEventListener("keydown", (e) => {
  if (e.target === textInput) return; // skjermtastaturet blir handtert i touch.js
  if (e.ctrlKey || e.metaKey || e.altKey) return; // la nettlesarsnarvegar vere i fred
  const key = normalise(e);
  if (key === null) return;
  e.preventDefault();
  sound.unlock();
  if (HELD[key]) game.held.add(HELD[key]);
  // Spelet lagar si eiga repetering for rørsle, så vi ignorerer tastaturet si (unnateke sletting).
  if (e.repeat && key !== "BACKSPACE") return;
  game.keyDown(key);
});

window.addEventListener("keyup", (e) => {
  const key = normalise(e);
  if (key && HELD[key]) game.held.delete(HELD[key]);
});

window.addEventListener("blur", () => game.held.clear());
canvas.addEventListener("pointerdown", () => {
  sound.unlock();
  // Trykk på skjermen opnar tastaturet når spelet ventar på tekst
  if (touch.enabled && game.top?.wantsText) touch.focusInput();
  else canvas.focus();
});
canvas.focus();

// ---------------------------------------------------------------- hovudløkke
game.frame(0);
display.render(game.r); // teikn første bilete med ein gong

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  game.frame(dt);
  display.render(game.r);
  touch.update();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
