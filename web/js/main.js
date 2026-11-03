// Startpunkt i nettlesaren: kopla tastatur, lyd og canvas til spelet.
//
// Valfrie parametrar i adressa:
//   ?stage=3   start på etappe 3 (øv på rektor)
//   ?seed=42   fast tilfeldigheit
//   ?mute      start utan lyd

import { CanvasDisplay } from "./engine/screen.js";
import { SoundManager } from "./engine/sound.js";
import { Game } from "./game.js";
import { Random } from "./rng.js";

const params = new URLSearchParams(window.location.search);
const seedParam = params.get("seed");
const stage = Math.max(1, Number(params.get("stage")) || 1);

const canvas = document.getElementById("screen");
const display = new CanvasDisplay(canvas);
const sound = new SoundManager(!params.has("mute"));

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

const game = new Game({
  sound,
  rng: new Random(seedParam === null ? null : Number(seedParam)),
  startStage: stage - 1,
  onFullscreen: toggleFullscreen,
});
game.start();

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

window.addEventListener("keydown", (e) => {
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
  canvas.focus();
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
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
