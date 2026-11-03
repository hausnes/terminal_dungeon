// Fiendane på Amalie Skram VGS.
//
// Ein ny fiende lagar du ved å arve frå Enemy og fylle inn tekst,
// angrep (makeAttacks) og måtar å kome forbi på (approaches).

import * as art from "../art.js";
import { FightApproach, MinigameApproach, PayApproach, StatApproach } from "./approaches.js";
import { Attack, DoxAttack, ExpelAttack, MinigameAttack } from "./attacks.js";

export class Enemy {
  constructor(cfg) {
    Object.assign(this, {
      name: "Fiende", title: "", location: "", maxHp: 20, color: "white", art: [], isBoss: false,
      intro: "", fightStart: "", fightWon: "", fightLost: "",
    }, cfg);
    this.hp = this.maxHp;
    this.stunned = 0;
    this.blinded = 0;
    this.attacks = this.makeAttacks();
  }

  get alive() {
    return this.hp > 0;
  }

  hurt(amount) {
    const actual = Math.max(0, Math.min(this.hp, amount));
    this.hp -= actual;
    return actual;
  }

  makeAttacks() {
    return [];
  }

  approaches() {
    return [];
  }

  chooseAttack(rng) {
    return rng.choices(this.attacks, this.attacks.map((a) => a.weight));
  }

  /** Kallast før fienden angrip. Returner false for å avbryte turen. */
  onTurnStart(battle) {
    return true;
  }
}

export class Mercedes extends Enemy {
  constructor() {
    super({
      name: "Mercedes", title: "Barista på Kaffe Diem", location: "Kaffe Diem · 1. etasje", maxHp: 20,
      color: "coffee", art: art.MERCEDES,
      intro: "Hei, vennen! Du ser trøytt ut. Utan ein karamell-milkshake frå Kaffe Diem kjem du ingen stad i dag. Femti kroner, takk.",
      fightStart: "Du vil slåss? Greitt. Eg har kokt kaffe sidan klokka sju!",
      fightWon: "Au, au! Ta milkshaken då, og forsvinn!",
      fightLost: "Hah! Gå no, før eg bryggjer ei ny kanne.",
    });
  }

  makeAttacks() {
    return [
      new Attack({ name: "Varm kaffe", weight: 35, hitChance: 0.55, damage: [6, 9], projectile: "~", color: "coffee",
        sound: "coffee", announce: "Mercedes kastar VARM KAFFE!", hitText: "Kaffen treff! Du tek {dmg} skade.",
        missText: "Kaffen skvett i golvet. Puh!" }),
      new Attack({ name: "Slapp", weight: 55, hitChance: 1, damage: [2, 3], projectile: ")", color: "skin",
        sound: "slap", announce: "Mercedes gir deg ein SLAPP!", hitText: "Klask! {dmg} skade." }),
      new ExpelAttack({ name: "Utvising", weight: 10, hitChance: 0.12, damage: [0, 0], projectile: "!", color: "red",
        sound: "expel", announce: "Mercedes ringjer rektor og krev UTVISING!",
        hitText: "Mercedes fekk deg utvist frå Amalie Skram. Det var det.",
        missText: "Rektor tok ikkje telefonen. Heldigvis!" }),
    ];
  }

  approaches() {
    return [
      new PayApproach({
        cost: 50, label: "Kjøp milkshake (50 kr)", description: "Betal som ein vanleg, lovlydig elev. Gir litt helse òg.",
        successSpeech: "Takk for handelen! Ha ein fin dag, vennen.",
        successLines: ["Du får ein iskald karamell-milkshake. Energien strøymer gjennom kroppen!"],
        failSpeech: "Dette er jo berre lommerusk! Kom tilbake når du har femti kroner.",
        failLines: ["Mercedes feiar myntane dine ned i tipskrukka."],
        failHp: 3, failMoneyFrac: 0.5, rewardHp: 6,
      }),
      new StatApproach({
        stat: "sexy", required: 6, label: "Sjarmer Mercedes", description: "Blunk, smil og håp at ho spanderer.",
        successSpeech: "Å, du er då for søt! Denne er på huset.",
        successLines: ["Mercedes rekkjer deg ein milkshake med ekstra krem."],
        failSpeech: "Hæ? Har du fått noko i auget?",
        failLines: ["Blunket ditt såg meir ut som eit krampeanfall. Pinleg."],
        hpLoss: 4, statLoss: 1,
      }),
      new StatApproach({
        stat: "utspekulert", required: 6, label: "Stjel milkshaken", description: "Vent til ho snur seg, og grip sjansen.",
        successSpeech: "...Kvar vart det av den milkshaken?!",
        successLines: ["Du sniker deg ut med milkshaken under genseren. Kaldt, men verdt det."],
        failSpeech: "Eg ser deg! Hendene vekk frå disken!",
        failLines: ["Mercedes slår deg over fingrane med ei kaffiskei."],
        hpLoss: 4, statLoss: 1,
      }),
      new FightApproach("Slåss mot Mercedes", "Ho har varm kaffe. Du har... hender."),
    ];
  }
}

export class Alec extends Enemy {
  constructor() {
    super({
      name: "Alec", title: "IT-ansvarleg", location: "IT-kontoret · 2. etasje", maxHp: 25, color: "cyan", art: art.ALEC,
      intro: "Datamaskina di ser ut som ho har vore gjennom ein vaskemaskin. Eg har 47 saker i køen. Kva får eg for å hoppe over dei?",
      fightStart: "Feil val. Eg veit kva du søkte på i går.",
      fightWon: "Greitt, greitt! PC-en din er fiksa. Berre gå!",
      fightLost: "Du burde ha sendt ein supportsak.",
    });
  }

  makeAttacks() {
    return [
      new DoxAttack({ name: "DOXing", weight: 20, hitChance: 0.25, damage: [6, 9], projectile: "@", color: "cyan",
        sound: "hurt", announce: "Alec startar DOXING! Tastaturet glør...",
        hitText: "Han legg ut skjermtida di på Insta! {dmg} skade, og alle stats -1.",
        missText: "Wi-fi-en fall ut. DOXinga feila!" }),
      new Attack({ name: "Dask med PC", weight: 70, hitChance: 1, damage: [2, 4], projectile: "▬", color: "grey",
        sound: "hit", announce: "Alec daskar deg med PC-en!", hitText: "Bonk! {dmg} skade." }),
      new ExpelAttack({ name: "Utvising", weight: 10, hitChance: 0.1, damage: [0, 0], projectile: "!", color: "red",
        sound: "expel", announce: "Alec sender e-post til rektor om UTVISING!",
        hitText: "Alec fekk deg utvist. Han hadde loggført alt.",
        missText: "E-posten hamna i spamfilteret!" }),
    ];
  }

  approaches() {
    return [
      new PayApproach({
        cost: 100, label: "Betal for ekspressfiks (100 kr)", description: "Pengar snakkar. Òg på IT-kontoret.",
        successSpeech: "Hundre kroner? Då flyttar du deg fram i køen.",
        successLines: ["Alec trykkjer Ctrl+Alt+Delete med dramatisk tyngd. PC-en verkar igjen!"],
        failSpeech: "Prøver du å svindle IT-avdelinga?!",
        failLines: ["Alec konfiskerer lommeboka di «for sikkerheitssjekk»."],
        failHp: 4, failMoneyFrac: 1,
      }),
      new StatApproach({
        stat: "sexy", required: 7, label: "Sjarmer Alec", description: "Ein liten flørt med IT-guden.",
        successSpeech: "Eh... ja... e-eg kan sikkert sjå på det no med ein gong.",
        successLines: ["Alec raudnar og fiksar PC-en på rekordtid."],
        failSpeech: "Eg er immun mot sosial manipulering. Eg har teke kurs.",
        failLines: ["Alec held eit ti minutt langt foredrag om phishing. Det tappar deg."],
        hpLoss: 5, statLoss: 2,
      }),
      new StatApproach({
        stat: "utspekulert", required: 7, label: "Lat som det hastar",
        description: "Du har presentasjon om fem minutt! (Eigentleg ikkje.)",
        successSpeech: "Presentasjon? Om fem minutt?! Gi meg maskina!",
        successLines: ["Alec fiksar PC-en i panikk. Du glir vidare med eit lurt smil."],
        failSpeech: "Timeplanen din seier at du har fri no. Eg har tilgang til alt.",
        failLines: ["Avslørt! Alec viser timeplanen din på storskjermen."],
        hpLoss: 5, statLoss: 2,
      }),
      new FightApproach("Slåss mot Alec", "Han har ein laptop og null tolmod."),
    ];
  }
}

export class Lars extends Enemy {
  constructor() {
    super({
      name: "Lars", title: "Rektor", location: "Rektorkontoret", maxHp: 38, color: "purple", art: art.LARS, isBoss: true,
      intro: "Så. Du trur du skal få vitnemål, du? Ingen forlèt Amalie Skram utan å gå forbi meg. Og eg er... vanskeleg å gå forbi.",
      fightStart: "Du vil slåss mot rektor? Eg har sete i møte sidan 1998. Eg er klar.",
      fightWon: "Nei... nei! Greitt! Her er vitnemålet ditt!",
    });
    this.chargeMax = 14;
    this.charge = 0;
  }

  makeAttacks() {
    return [
      new Attack({ name: "Myndig blikk", weight: 45, hitChance: 0.85, damage: [3, 5], projectile: "*", color: "purple",
        sound: "hit", announce: "Lars sender deg eit MYNDIG BLIKK.", hitText: "Blikket brenn. {dmg} skade.",
        missText: "Du ser vekk i tide!" }),
      new MinigameAttack({ name: "Fråværsreglementet", weight: 30, minigame: "mash",
        announce: "Lars byrjar å snakke om Udir sitt reglement om FRÅVÆR...",
        successText: "Du heldt deg vaken! Lars mistar tråden.",
        failText: "Du sovna! Lars får to gratis angrep.", failSkip: 2 }),
      new MinigameAttack({ name: "Datasamlinga", weight: 25, minigame: "typing",
        announce: "Lars viser deg DATASAMLINGA si! «Skriv dette av, fort!»",
        successText: "Du skreiv det feilfritt. Lars er nesten imponert.",
        failText: "For seint! Lars mimrar om Commodore i ein time. 8 skade.", failDamage: 8 }),
    ];
  }

  onTurnStart(battle) {
    this.charge += 1;
    battle.sound.play("charge");
    if (this.charge >= this.chargeMax) {
      battle.sitOn();
      return false;
    }
    if (this.charge === this.chargeMax - 2) battle.log("Lars ser på fanget ditt... SITT PÅ er nesten ladd!", "magenta");
    return true;
  }

  approaches() {
    return [
      new PayApproach({
        cost: 1000, label: "Kjøp vitnemålet (1000 kr)", description: "Korrupsjon er eit sterkt ord. Kall det ei gåve.",
        successSpeech: "Tusen kroner... Eg ser at du har forstått korleis verda fungerer.",
        successLines: ["Lars stemplar vitnemålet ditt med eit fornøgd nikk."],
        failSpeech: "Er dette ein vits? Tusen kroner, sa eg!",
        failLines: ["Lars sukkar så djupt at du mistar motet."],
        failHp: 5, failMoneyFrac: 0,
      }),
      new MinigameApproach({
        stat: "sexy", minigame: "rhythm", label: "Vrikk på rumpa",
        description: "Dans i takt med musikken i 10 sekund. Éin feil, og spelet er over!",
        successSpeech: "Eg... eg har aldri sett noko liknande. Ta vitnemålet ditt og gå.",
        successLines: ["Rektor Lars er så imponert at han signerer vitnemålet med skjelvande hand."],
        failSpeech: "Nei, nei, nei. Det der var ikkje i takt.",
        failReason: "Du mista takta. Rektor Lars ristar på hovudet og kallar inn foreldra dine.",
      }),
      new MinigameApproach({
        stat: "utspekulert", minigame: "quiz", label: "«Far min er advokat!»",
        description: "Svar rett på 3 juss-spørsmål. Eitt feil svar, og spelet er over!",
        successSpeech: "Ehm... ja. Vi treng jo ikkje å involvere advokatar.",
        successLines: ["Lars kremtar nervøst og skyv vitnemålet over pulten."],
        failSpeech: "Advokat, seier du? Far din bør lese seg opp.",
        failReason: "Bløffen vart avslørt. Lars sender deg rett på dør – utan vitnemål.",
      }),
      new FightApproach("Slåss mot rektor Lars", "Han ladar opp «Sitt på». Vinn før det er for seint!"),
    ];
  }
}
