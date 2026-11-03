// Visuelle effektar: partiklar, flytande tekst og prosjektil.

export class Effect {
  constructor() {
    this.alive = true;
  }
  update(dt) {}
  draw(r) {}
}

export class Particle extends Effect {
  constructor(x, y, vx, vy, life, chars = "*+.", colors = ["white"], gravity = 0) {
    super();
    Object.assign(this, { x, y, vx, vy, life, chars, colors, gravity, age: 0 });
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.life) {
      this.alive = false;
      return;
    }
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(r) {
    const f = this.age / this.life;
    const ch = this.chars[Math.min(this.chars.length - 1, Math.floor(f * this.chars.length))];
    const color = this.colors[Math.min(this.colors.length - 1, Math.floor(f * this.colors.length))];
    r.text(Math.round(this.x), Math.round(this.y), ch, color, { bold: f < 0.5 });
  }
}

export class FloatingText extends Effect {
  constructor(x, y, text, color = "white", life = 1.0, rise = 3.0) {
    super();
    Object.assign(this, { x, y, text, color, life, rise, age: 0 });
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.life) this.alive = false;
  }

  draw(r) {
    const y = this.y - this.rise * this.age;
    r.text(Math.round(this.x - this.text.length / 2), Math.round(y), this.text, this.color, { bold: true });
  }
}

/** Noko som flyg frå A til B, og kallar onArrive når det treff. */
export class Projectile extends Effect {
  constructor(x0, y0, x1, y1, duration, glyph, color, onArrive = null, arc = 2.0) {
    super();
    Object.assign(this, { x0, y0, x1, y1, duration, glyph, color, onArrive, arc, age: 0, trail: [] });
  }

  pos() {
    const f = Math.min(1, this.age / this.duration);
    const x = this.x0 + (this.x1 - this.x0) * f;
    const y = this.y0 + (this.y1 - this.y0) * f - this.arc * Math.sin(Math.PI * f);
    return [x, y];
  }

  update(dt) {
    this.trail.push(this.pos());
    this.trail = this.trail.slice(-4);
    this.age += dt;
    if (this.age >= this.duration && this.alive) {
      this.alive = false;
      if (this.onArrive) this.onArrive();
    }
  }

  draw(r) {
    for (const [x, y] of this.trail.slice(0, -1)) r.text(Math.round(x), Math.round(y), "·", this.color, { dim: true });
    const [x, y] = this.pos();
    r.text(Math.round(x), Math.round(y), this.glyph, this.color, { bold: true });
  }
}

/** Ei samling effektar som blir oppdatert og teikna saman. */
export class Effects {
  constructor(rng) {
    this.rng = rng;
    this.items = [];
  }

  add(effect) {
    this.items.push(effect);
    return effect;
  }

  burst(x, y, n = 12, chars = "*+·.", colors = ["gold", "yellow", "white"], speed = 12, life = 0.6, gravity = 8) {
    for (let i = 0; i < n; i++) {
      const ang = this.rng.uniform(0, 2 * Math.PI);
      const sp = this.rng.uniform(0.3, 1.0) * speed;
      this.add(new Particle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp * 0.5,
        life * this.rng.uniform(0.6, 1.2), chars, colors, gravity));
    }
  }

  text(x, y, s, color = "white", life = 1.0, rise = 3.0) {
    return this.add(new FloatingText(x, y, s, color, life, rise));
  }

  projectile(x0, y0, x1, y1, glyph, color, onArrive = null, duration = 0.45, arc = 2.0) {
    return this.add(new Projectile(x0, y0, x1, y1, duration, glyph, color, onArrive, arc));
  }

  clear() {
    this.items = [];
  }

  update(dt) {
    for (const e of [...this.items]) e.update(dt);
    this.items = this.items.filter((e) => e.alive);
  }

  draw(r) {
    for (const e of this.items) e.draw(r);
  }
}
