import * as PIXI from 'pixi.js';
import { BloomFilter } from '@pixi/filter-bloom';
import { BlurFilter } from 'pixi.js';

export class BattleSystem {
  static doPlayerAttack(game) {
    const char = game.character;
    const enemy = game.enemy;
    // Zahájení hráčova útoku
    game.playerAttacking = true;
    game.attackAnimProgress = 0;
    let baseAtk = char.stats.atk;
    let critChance = 0.1;
    let critMultiplier = 2;
    // Úprava kritických hodnot podle schopností a třídy
    if (char.skillTree.powerStrike.unlocked) {
      critMultiplier += char.skillTree.powerStrike.level * 0.1;
    }
    if (char.cls.name === 'Street Samurai') {
      critChance = 0.2;
      critMultiplier = 3;
      if (char.skillTree.powerStrike.unlocked) {
        critMultiplier += char.skillTree.powerStrike.level * 0.1;
      }
    }
    // Úprava útočných/obranných koeficientů podle třídy
    let atkMultiplier = (char.cls.name === 'Netrunner') ? 12 : 10;
    let defMultiplier = (char.cls.name === 'Techie') ? 6 : 5;
    // Výpočet poškození způsobeného nepříteli
    let playerDmg = Math.max(1, (baseAtk + Math.floor(Math.random() * 3)) * atkMultiplier - enemy.def * defMultiplier);
    let playerCrit = false;
    if (Math.random() < critChance) {
      playerDmg = Math.floor(playerDmg * critMultiplier);
      playerCrit = true;
    }
    // Bonus za combo – po rychlých po sobě jdoucích útocích roste poškození
    if (game.comboCount > 0 && game.comboTimer < game.comboTimerMax) {
      game.comboCount++;
      playerDmg = Math.floor(playerDmg * (1 + game.comboCount * 0.1));
      game.spawnFloatingText(`x${game.comboCount}`, game.charShape.x, game.charShape.y - 40, 0xffe000, 20, -20);
    } else {
      game.comboCount = 1;
    }
    game.comboTimer = 0;
    // Aplikace zásahu – ubrání HP nepřítele
    enemy.hp = Math.max(0, enemy.hp - playerDmg);
    // Pokud nebyly inicializovány sprity postav, obnovit UI
    if (!game.charShape || !game.enemyShape) {
      game.playerAttacking = false;
      game.initUI();
      return;
    }
    // Zobrazení poletujícího textu s poškozením
    const textColor = playerCrit ? 0xffe000 : 0xffffff;
    const textSize = playerCrit ? 32 : 24;
    game.spawnFloatingText(playerDmg.toString(), game.enemyShape.x + game.enemyShape.width / 2, game.enemyShape.y, textColor, textSize, -30);
    // Odstranění předchozího efektu útoku (pokud existuje)
    if (game.attackEffect) {
      game.stage.removeChild(game.attackEffect);
      game.attackEffect.destroy();
      game.attackEffect = null;
    }
    game.attackEffectAnimProgress = 0;
    // Vytvoření vizuálního efektu útoku (různý pro různé třídy)
    if (char.cls.name === 'Street Samurai') {
      // Efekt seku (trojúhelníkový tvar se zářivkou)
      const slash = new PIXI.Graphics();
      slash.beginFill(0x00ffe0, 0.8);
      slash.drawPolygon([0, 0, 50, -20, 70, 0, 20, 20]);
      slash.endFill();
      slash.x = game.charShape.x + 30;
      slash.y = game.charShape.y - 10;
      slash.rotation = -Math.PI / 4;
      slash.filters = [new BloomFilter({ threshold: 0.2, bloomScale: 1.5, blur: 10, quality: 5 })];
      game.attackEffect = slash;
      game.stage.addChild(game.attackEffect);
    } else if (char.cls.name === 'Netrunner' || char.cls.name === 'Techie') {
      // Efekt střely (malý kruh jako projektil)
      const bullet = new PIXI.Graphics();
      bullet.beginFill(0xffa500);
      bullet.drawCircle(0, 0, 8);
      bullet.endFill();
      bullet.x = game.charShape.x + 30;
      bullet.y = game.charShape.y;
      game.attackEffect = bullet;
      game.stage.addChild(game.attackEffect);
    }
    // (Pozn.: Další efekty pro jiné třídy by mohly být doplněny obdobně)

    // Krátké zvýraznění nepřítele při zásahu
    game.enemyFlashTimer = 0.1;

    // Kontrola existence sprite; pokud chybí, znovu vykreslit UI
    if (!game.charShape || !game.enemyShape) {
      game.enemyAttacking = false;
      game.initUI();
      return;
    }

    // Pokud nepřítel zemřel, ukončí se boj
    if (enemy.hp <= 0) {
      game.battleTurn = 'none';
      game.playerAttacking = false;
      game.initUI();
      return;
    }

    // Přepnutí na tah nepřítele a nastavení odpočtu pro další útok
    game.playerAttacking = false;
    game.battleTurn = 'enemy';
    game.autoBattleTimer = game.autoBattleDelay;
  }

  static doEnemyAttack(game) {
    const char = game.character;
    const enemy = game.enemy;
    // Zahájení útoku nepřítele
    game.enemyAttacking = true;
    game.attackAnimProgress = 0;
    const baseAtk = enemy.atk;
    // Nastavení šance na kritický zásah pro nepřítele (boss má vyšší)
    const critChance = enemy.isBoss ? 0.15 : 0.1;
    const critMultiplier = enemy.isBoss ? 2.5 : 2;
    // Základní násobitele útoku a obrany
    const atkMultiplier = 10;
    let defMultiplier = (char.cls.name === 'Techie') ? 6 : 5;
    // Výpočet poškození hráče nepřítelem
    let enemyDmg = Math.max(1, (baseAtk + Math.floor(Math.random() * 3)) * atkMultiplier - char.stats.def * defMultiplier);
    let enemyCrit = false;
    if (Math.random() < critChance) {
      enemyDmg = Math.floor(enemyDmg * critMultiplier);
      enemyCrit = true;
    }
    // Šance, že útok nepřítele bude zesílen rychlostí nepřítele
    const enemySpdMultiplier = 0.005;
    if (Math.random() < enemy.spd * enemySpdMultiplier) {
      enemyDmg = Math.floor(enemyDmg * 1.5);
    }
    // Redukce poškození díky hráčově schopnosti "cyberShield"
    if (char.skillTree.cyberShield.unlocked) {
      const shieldReduction = char.skillTree.cyberShield.level * 0.005;
      enemyDmg = Math.floor(enemyDmg * (1 - shieldReduction));
    }
    // Výpočet šance na uhnutí hráče
    let isDodged = false;
    let playerSpdMultiplier = (char.cls.name === 'Street Samurai') ? 0.007 : 0.005;
    let playerDodgeChance = char.stats.spd * playerSpdMultiplier;
    if (char.skillTree.quickstep.unlocked) {
      playerDodgeChance += char.skillTree.quickstep.level * 0.01;
    }
    playerDodgeChance = Math.min(0.65, playerDodgeChance);
    if (Math.random() < playerDodgeChance) {
      enemyDmg = 0;
      isDodged = true;
    }
    // Kontrola série útoků bez zásahu – po dvou "nic" úderech nepřítel zasáhne alespoň minimálně
    if (game.playerAttacksWithoutDamage >= 2 && enemyDmg === 0) {
      enemyDmg = Math.max(1, Math.floor(enemy.atk * 0.5));
      game.playerAttacksWithoutDamage = 0;
    }
    // Aplikace poškození hráče
    char.hp = Math.max(0, char.hp - enemyDmg);
    // Zobrazení poletujícího textu (buď "DODGED!" nebo číslo poškození)
    const textColor = enemyCrit ? 0xff2e2e : 0xffffff;
    const textSize = enemyCrit ? 32 : 24;
    if (isDodged) {
      game.spawnFloatingText("DODGED!", game.charShape.x + game.charShape.width / 2, game.charShape.y, 0x00ff8a, 28, -30);
      game.playerAttacksWithoutDamage++;
    } else {
      game.spawnFloatingText(enemyDmg.toString(), game.charShape.x + game.charShape.width / 2, game.charShape.y, textColor, textSize, -30);
      if (enemyDmg > 0) {
        // Zásah hráče přeruší případné combo
        game.comboCount = 0;
        game.comboTimer = 0;
        // Efekt "krve" při zásahu hráče (malé červené částice)
        if (!game.bloodEffects) game.bloodEffects = [];
        for (let i = 0; i < 7; i++) {
          const blood = new PIXI.Graphics();
          const angle = Math.random() * Math.PI * 2;
          const x = game.charShape.x + game.charShape.width / 2 + Math.cos(angle) * 12;
          const y = game.charShape.y + Math.sin(angle) * 10;
          blood.beginFill(0xff2e2e, 0.7 + Math.random() * 0.3);
          blood.drawCircle(0, 0, 4 + Math.random() * 5);
          blood.endFill();
          blood.x = x;
          blood.y = y;
          blood.alpha = 1;
          blood.vx = Math.cos(angle) * (1.5 + Math.random() * 1.5);
          blood.vy = Math.sin(angle) * (1.5 + Math.random() * 1.5);
          blood.life = 0;
          blood.filters = [new BlurFilter(2)];
          game.stage.addChild(blood);
          game.bloodEffects.push(blood);
        }
        game.playerAttacksWithoutDamage = 0;
      } else {
        game.playerAttacksWithoutDamage++;
      }
    }
    // Krátké zvýraznění hráčovy postavy při zásahu (flash efekt)
    game.playerFlashTimer = 0.1;
    // Pokud sprity postav neexistují (např. hráč zemřel a UI je pryč), obnovit UI
    if (!game.charShape || !game.enemyShape) {
      game.enemyAttacking = false;
      game.initUI();
      return;
    }
    // Pokud hráč zemřel útokem, ukončit boj (porážka)
    if (char.hp <= 0) {
      game.battleTurn = 'none';
      game.enemyAttacking = false;
      game.initUI();
      return;
    }
    // Jinak pokračuje hráčův tah
    game.enemyAttacking = false;
    game.battleTurn = 'player';
  }
}
