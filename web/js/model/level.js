// Brett og etappar. Vil du ha fleire brett, legg du til nye Stage-ar eller ein ny Level.

import { Alec, Lars, Mercedes } from "./enemies.js";

export class Stage {
  constructor(title, location, enemy, o = {}) {
    this.title = title;
    this.location = location;
    this.enemy = enemy; // klassen til fienden
    Object.assign(this, {
      exploreTime: 10, // sekund med utforsking før fienden dukkar opp
      hazards: 1, // lekser som sprett rundt
      chasers: 0, // vikarar som jagar deg
      spawnInterval: 0.45, // kor ofte det kjem nye myntar
      weapons: 2, // kor mange våpen som dukkar opp
      color: "sky",
    }, o);
  }
}

export class Level {
  constructor(name, stages) {
    this.name = name;
    this.stages = stages;
  }
}

export function amalieSkram() {
  return new Level("Amalie Skram VGS", [
    new Stage("Etappe 1", "1. etasje · Gangen ved Kaffe Diem", Mercedes, { hazards: 1, chasers: 0, color: "sky" }),
    new Stage("Etappe 2", "2. etasje · Korridoren til IT-kontoret", Alec, { hazards: 2, chasers: 1, color: "lime" }),
    new Stage("Etappe 3", "Administrasjonen · Rektorgangen", Lars,
      { hazards: 3, chasers: 1, spawnInterval: 0.4, weapons: 3, color: "orange" }),
  ]);
}
