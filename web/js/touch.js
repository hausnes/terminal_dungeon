// Spelkontrollar for mobil og nettbrett.
//
// - Styrespak (venstre): gir retningstastane UP/DOWN/LEFT/RIGHT. Du kan dra fingeren
//   rundt utan å sleppe, og retninga blir halden inne så lenge fingeren ligg der.
// - ENTER og MELLOMROM (høgre) og ESC (oppe til høgre) – same namn som i spelteksten.
// - Når ei scene vil ha tekst (namn, maskinskriving), opnar vi skjermtastaturet via
//   eit usynleg tekstfelt.

const SENTINEL = " "; // tekstfeltet er aldri tomt, så sletting gir alltid ei hending

export class TouchControls {
  constructor(game, sound) {
    this.game = game;
    this.sound = sound;
    this.root = document.getElementById("touch");
    this.dpad = document.getElementById("dpad");
    this.kbd = document.getElementById("kbd");
    this.input = document.getElementById("textin");
    this.arrows = Object.fromEntries([...this.dpad.querySelectorAll(".arrow")].map((el) => [el.dataset.dir, el]));
    this.enabled = false;
    this.dir = null;
    this.dpadPointer = null;
    this.setupDpad();
    this.setupButtons();
    this.setupInput();
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.game.touch = true;
    this.root.hidden = false;
    document.body.classList.add("touch");
    window.dispatchEvent(new Event("resize"));
  }

  buzz() {
    if (navigator.vibrate) navigator.vibrate(8);
  }

  press(key) {
    this.sound.unlock();
    this.game.keyDown(key);
    // Opne tastaturet med ein gong om scena vil ha tekst (må skje i same trykk)
    if (this.game.top?.wantsText) this.focusInput();
  }

  // ---------------------------------------------------------------- styrespak
  setDir(dir) {
    if (dir === this.dir) return;
    if (this.dir) {
      this.game.held.delete(this.dir);
      this.arrows[this.dir].classList.remove("active");
    }
    this.dir = dir;
    if (dir) {
      this.game.held.add(dir);
      this.arrows[dir].classList.add("active");
      this.buzz();
      this.press(dir);
    }
  }

  dirFrom(e) {
    const rect = this.dpad.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.14) return null; // dødsone i midten
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "RIGHT" : "LEFT";
    return dy > 0 ? "DOWN" : "UP";
  }

  setupDpad() {
    const d = this.dpad;
    d.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.enable();
      d.setPointerCapture(e.pointerId);
      this.dpadPointer = e.pointerId;
      this.setDir(this.dirFrom(e));
    });
    d.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.dpadPointer) this.setDir(this.dirFrom(e));
    });
    const release = (e) => {
      if (e.pointerId !== this.dpadPointer) return;
      this.dpadPointer = null;
      this.setDir(null);
    };
    d.addEventListener("pointerup", release);
    d.addEventListener("pointercancel", release);
  }

  // ---------------------------------------------------------------- knappar
  setupButtons() {
    for (const btn of this.root.querySelectorAll("[data-key]")) {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.enable();
        btn.classList.add("pressed");
        this.buzz();
        this.press(btn.dataset.key);
      });
      const up = () => btn.classList.remove("pressed");
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("pointerleave", up);
    }
    this.kbd.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.focusInput();
    });
  }

  // ---------------------------------------------------------------- skjermtastatur
  focusInput() {
    this.input.value = SENTINEL;
    this.input.focus({ preventScroll: true });
    this.input.setSelectionRange(1, 1);
  }

  setupInput() {
    const input = this.input;
    input.value = SENTINEL;
    input.addEventListener("input", (e) => {
      if (e.inputType && e.inputType.startsWith("delete")) {
        this.game.keyDown("BACKSPACE");
      } else {
        const typed = input.value.startsWith(SENTINEL) ? input.value.slice(1) : input.value;
        for (const ch of typed) this.game.keyDown(ch);
      }
      input.value = SENTINEL;
      input.setSelectionRange(1, 1);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.press("ENTER");
      } else if (e.key === "Escape") {
        e.preventDefault();
        input.blur();
        this.press("ESC");
      }
    });
  }

  /** Kallast kvart bilete: vis/skjul tastaturknappen og lukk tastaturet når det ikkje trengst. */
  update() {
    if (!this.enabled) return;
    const wants = Boolean(this.game.top?.wantsText);
    const focused = document.activeElement === this.input;
    this.kbd.hidden = !wants || focused;
    if (!wants && focused) this.input.blur();
  }
}
