// Game: scene-stabelen, overgangar og flyten gjennom spelet.
//
// Game veit ingenting om nettlesaren. main.js matar inn tastetrykk og kallar
// frame(dt) for kvart bilete; testane gjer det same utan nettlesar.

import { CANVAS_H, CANVAS_W, MAX_DT } from "./config.js";
import { Renderer } from "./engine/screen.js";
import { amalieSkram } from "./model/level.js";
import { CharacterScene } from "./scenes/character.js";
import { GameOverScene, VictoryScene } from "./scenes/ending.js";
import { ExploreScene } from "./scenes/explore.js";
import { PauseScene, TitleScene } from "./scenes/title.js";

/** Ein diagonal "wipe" mellom to scener. */
class Transition {
  static DURATION = 0.35;

  constructor(game, factory) {
    this.game = game;
    this.factory = factory;
    this.phase = "out";
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.phase === "out" && this.t >= Transition.DURATION) {
      this.game.replace(this.factory());
      this.phase = "in";
      this.t = 0;
    } else if (this.phase === "in" && this.t >= Transition.DURATION && this.game.transition === this) {
      this.game.transition = null;
    }
  }

  draw(r) {
    let f = Math.min(1, this.t / Transition.DURATION);
    if (this.phase === "in") f = 1 - f;
    const edge = Math.floor(f * (CANVAS_W + CANVAS_H + 6)) - 3;
    for (let y = 0; y < CANVAS_H; y++) {
      const w = edge - (CANVAS_H - 1 - y);
      if (w > 0) r.text(0, y, "█".repeat(Math.min(w, CANVAS_W)), "navy");
      r.text(Math.max(0, w), y, "▓▒░", "blue");
    }
  }
}

export class Game {
  constructor({ sound, rng, startStage = 0, onFullscreen = null }) {
    this.sound = sound;
    this.rng = rng;
    this.r = new Renderer(rng);
    this.stack = [];
    this.transition = null;
    this.player = null;
    this.level = null;
    this.stageIndex = 0;
    this.startStage = startStage;
    this.held = new Set(); // retningstastar som blir haldne inne
    this.onFullscreen = onFullscreen;
  }

  // ------------------------------------------------------------ scene-stabel
  get top() {
    return this.stack[this.stack.length - 1] ?? null;
  }

  push(scene) {
    this.stack.push(scene);
    scene.enter();
    this._syncMusic();
  }

  pop(result = null) {
    this.stack.pop();
    if (this.top) this.top.resume(result);
    this._syncMusic();
  }

  replace(scene) {
    this.stack = [scene];
    scene.enter();
    this._syncMusic();
  }

  fadeTo(factory) {
    this.transition = new Transition(this, factory);
  }

  _syncMusic() {
    let name = "";
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].music !== null) {
        name = this.stack[i].music;
        break;
      }
    }
    this.sound.music(name);
  }

  // ------------------------------------------------------------ spelflyt
  start() {
    this.replace(new TitleScene(this));
  }

  newRun() {
    this.level = amalieSkram();
    this.stageIndex = Math.min(this.startStage, this.level.stages.length - 1);
    this.fadeTo(() => new CharacterScene(this));
  }

  startLevel(player) {
    this.player = player;
    this.beginStage();
  }

  beginStage() {
    const stage = this.level.stages[this.stageIndex];
    const index = this.stageIndex;
    const total = this.level.stages.length;
    this.fadeTo(() => new ExploreScene(this, stage, index, total));
  }

  stageCleared() {
    this.stageIndex += 1;
    if (this.stageIndex >= this.level.stages.length) this.fadeTo(() => new VictoryScene(this));
    else this.beginStage();
  }

  gameOver(reason, title = "GAME OVER") {
    this.fadeTo(() => new GameOverScene(this, reason, title));
  }

  toTitle() {
    this.fadeTo(() => new TitleScene(this));
  }

  toggleFullscreen() {
    if (this.onFullscreen) this.onFullscreen();
  }

  // ------------------------------------------------------------ input
  /** key er eit teikn ("a", " ") eller eit namn ("UP", "ENTER", "ESC", "BACKSPACE"). */
  keyDown(key) {
    if (this.transition) return;
    const top = this.top;
    if (!top) return;
    if (key === "ESC" && top.pausable) {
      this.push(new PauseScene(this));
      return;
    }
    top.handleKey(key);
  }

  // ------------------------------------------------------------ eitt bilete
  frame(dt) {
    dt = Math.min(dt, MAX_DT);
    if (this.top) this.top.update(dt);
    if (this.transition) this.transition.update(dt);
    const r = this.r;
    r.beginFrame(dt);
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start].overlay) start--;
    for (const scene of this.stack.slice(Math.max(0, start))) scene.draw(r);
    if (this.transition) this.transition.draw(r);
  }
}
