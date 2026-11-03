// Grunnklassen for alle scener.

import { Effects } from "../engine/effects.js";

export class Scene {
  constructor(game) {
    this.game = game;
    this.music = null; // null = arv musikken frå scena under, "" = stille
    this.overlay = false; // teiknar scena under seg (t.d. pausemenyen)
    this.pausable = true; // ESC opnar pausemenyen
    this.t = 0;
    this.fx = new Effects(game.rng);
    this._timers = [];
    this._childCb = null;
  }

  get player() { return this.game.player; }
  get sound() { return this.game.sound; }
  get rng() { return this.game.rng; }
  get r() { return this.game.r; }

  /** Sant når scena ventar på at brukaren skal skrive (opnar tastaturet på mobil). */
  get wantsText() { return false; }

  enter() {}

  resume(result) {
    const cb = this._childCb;
    this._childCb = null;
    if (cb) cb(result);
  }

  /** Legg ei ny scene oppå denne, og kall callback(resultat) når ho er ferdig. */
  pushChild(scene, callback) {
    this._childCb = callback;
    this.game.push(scene);
  }

  after(delay, fn) {
    this._timers.push({ left: delay, fn });
  }

  clearTimers() {
    this._timers = [];
  }

  update(dt) {
    this.t += dt;
    this.fx.update(dt);
    if (!this._timers.length) return;
    const due = [];
    for (const timer of this._timers) {
      timer.left -= dt;
      if (timer.left <= 0) due.push(timer);
    }
    for (const timer of due) {
      const i = this._timers.indexOf(timer);
      if (i >= 0) {
        this._timers.splice(i, 1);
        timer.fn();
      }
    }
  }

  handleKey(key) {}

  draw(r) {}
}
