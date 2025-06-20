import { Graphics } from 'pixi.js';
import { BLEND_MODES } from '@pixi/constants';
import { ABILITIES } from '../data/abilities.js';

const ENEMY_DELAY = 500;
const PLAYER_EFFECT_DELAY = 300;
const UI_DELAY = 300;

export class BattleSystem {
  static init(game) {
    BattleSystem.turn = 'player';
    BattleSystem.awaitingChoice = true;
    game.echoLoopActive = false;
    game.trojanSpikeMult = 0.5;
    game.statHijackTurns = 0;
    game.statHijackAmount = 0;
    if (game.character && Array.isArray(game.character.abilities)) {
      game.character.abilities.forEach(ab => { ab.cooldownRemaining = 0; });
    }
    BattleSystem.generateAbilities(game);
  }

  static update(game, delta) {
    // turn-based system does not act automatically
  }

  static generateAbilities(game) {
    const known = game.character.loadout || [];
    BattleSystem.currentAbilities = [];
    const basic = known[0];
    if (basic) BattleSystem.currentAbilities.push(basic);
    const available = known.slice(1).filter(a => (a.cooldownRemaining || 0) === 0);
    for (let i = 0; i < 2; i++) {
      const ability = available[i] || { name: '???', description: '', execute() {} };
      BattleSystem.currentAbilities.push(ability);
    }
    if (typeof game.showAbilityOptions === 'function') {
      game.showAbilityOptions(BattleSystem.currentAbilities);
    }
  }

  static async useAbility(game, ability) {
    if (!game.battleStarted || BattleSystem.turn !== 'player') return;
    await BattleSystem.playerTurn(game, ability);
    if (!game.battleStarted) return;

    // apply cooldown for used ability
    if (ability.cooldown !== undefined) {
      ability.cooldownRemaining = (ability.cooldown || 0) + 1;
    }

    BattleSystem.turn = 'enemy';
    await BattleSystem.delay(ENEMY_DELAY);
    await BattleSystem.enemyTurn(game);
    BattleSystem.applyStatusEffects(game);
    if (!game.battleStarted) return;
    BattleSystem.tickCooldowns(game);
    await BattleSystem.delay(UI_DELAY);

    BattleSystem.turn = 'player';
    BattleSystem.generateAbilities(game);
  }

  static async playerTurn(game, ability) {
    // trigger player attack animation and effect
    game.playerAttacking = true;
    game.attackAnimProgress = 0;
    await BattleSystem.spawnPlayerAttackEffect(game);
    await BattleSystem.delay(PLAYER_EFFECT_DELAY);

    ability.execute(game);
    if (game.echoLoopActive && ability.name !== 'Echo Loop') {
      await BattleSystem.delay(PLAYER_EFFECT_DELAY);
      ability.execute(game);
      game.echoLoopActive = false;
    }
    await BattleSystem.applyDrone(game);
    BattleSystem.checkBattleEnd(game);
  }

  static async enemyTurn(game) {
    await BattleSystem.enemyAttack(game);
    await BattleSystem.applyDrone(game);
    BattleSystem.checkBattleEnd(game);
  }

  static tickCooldowns(game) {
    if (!game.character || !game.character.abilities) return;
    for (const ab of game.character.abilities) {
      if (ab.cooldownRemaining > 0) ab.cooldownRemaining -= 1;
    }
  }

  static async applyDrone(game) {
    if (game.character.cls.name === 'Techie' && game.droneDamage > 0) {
      if (game.droneDisabledTurns > 0) {
        game.droneDisabledTurns -= 1;
        return;
      }
      let attacks = game.holoDecoyActive ? 2 : 1;
      let i = 0;
      while (i < attacks) {
        let dmg = game.droneDamage;
        if (game.overclockTurns > 0) {
          dmg = Math.round(dmg * 3);
          game.overclockTurns -= 1;
        }
        let crit = false;
        if (game.droneCritChance && Math.random() < game.droneCritChance) {
          dmg *= 2;
          crit = true;
          game.spawnFloatingText('CRIT!', game.enemyAvatarX, game.enemyAvatarY, 0xff0000, 28);
        }
        game.enemy.hp = Math.max(0, game.enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, crit ? 0xff0000 : 0x00ff8a, 24);
        await BattleSystem.spawnDroneAttackEffect(game);
        if (game.criticalLoopActive && crit && !game.criticalLoopUsed) {
          attacks += 1;
          game.criticalLoopUsed = true;
        }
        i++;
      }
      game.criticalLoopActive = false;
      game.criticalLoopUsed = false;
    }
  }

  static applyStatusEffects(game) {
    if (game.glitchPulseTurns > 0) {
      const dmg = game.glitchPulseDamage || Math.round(game.character.stats.atk * 5 + game.enemy.maxHp * 0.03);
      game.enemy.hp = Math.max(0, game.enemy.hp - dmg);
      game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0x00e0ff, 24);
      game.enemyFlashTimer = 0.6;
      game.glitchPulseTurns -= 1;
    }
    if (game.statHijackTurns > 0) {
      game.statHijackTurns -= 1;
      if (game.statHijackTurns === 0 && game.statHijackAmount) {
        game.character.stats.atk = Math.max(1, game.character.stats.atk - game.statHijackAmount);
        game.enemy.atk += game.statHijackAmount;
        game.statHijackAmount = 0;
      }
    }
    if (game.omegaStrikeDelay > 0) {
      game.omegaStrikeDelay -= 1;
      if (game.omegaStrikeDelay === 0) {
        const dmg = Math.round(game.character.stats.atk * 15);
        game.enemy.hp = Math.max(0, game.enemy.hp - dmg);
          game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0x00ff8a, 24);
        game.enemyFlashTimer = 0.6;
      }
    }
    if (game.autoMedkitActive) {
      const heal = Math.round(game.character.maxHp * 0.01);
      game.character.hp = Math.min(game.character.maxHp, game.character.hp + heal);
      game.spawnFloatingText(`+${heal}`, game.playerAvatarX, game.playerAvatarY, 0x00ff8a, 24);
    }
  }

  static calculateDamage(atk, def) {
    const base = atk * 10;
    const dmg = Math.round(base - def * 5);
    return Math.max(1, dmg);
  }
 static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async spawnPlayerAttackEffect(game) {
    if (game.charShape && game.battleContainer) {
      const cls = game.character.cls.name;
      const effect = new Graphics();
      if (cls === 'Street Samurai') {
        effect.beginFill(0xffffff);
        effect.drawRect(-20, -4, 40, 8);
        effect.endFill();
      } else if (cls === 'Netrunner') {
        effect.beginFill(0x00ffff);
        effect.drawCircle(0, 0, 12);
        effect.endFill();
      } else {
        effect.beginFill(0xffa000);
        effect.drawCircle(0, 0, 10);
        effect.endFill();
      }
      effect.alpha = 0.85;
      effect.blendMode = BLEND_MODES.ADD;
      effect.x = game.charShape.x + 30;
      effect.y = game.charShape.y;
      effect.zIndex = 8;
      game.battleContainer.addChild(effect);
      game.attackEffect = effect;
      game.attackEffectAnimProgress = 0;
      game.battleContainer.sortChildren();
      if (game.enemyShape) {
        const zone = new Graphics();
        zone.beginFill(0xff0000, 0.2);
        zone.drawCircle(0, 0, 60);
        zone.endFill();
        zone.x = game.enemyShape.x;
        zone.y = game.enemyShape.y;
        zone.zIndex = 6;
        game.battleContainer.addChild(zone);
        game.attackZone = zone;
        game.attackZoneLife = 0;
        game.battleContainer.sortChildren();
      }
    }
  }

  static async spawnDroneAttackEffect(game) {
    if (game.charShape && game.battleContainer) {
      const effect = new Graphics();
      effect.beginFill(0xffe066);
      effect.drawCircle(0, 0, 10);
      effect.endFill();
      effect.alpha = 0.85;
      effect.blendMode = BLEND_MODES.ADD;
      effect.x = game.charShape.x + 30;
      effect.y = game.charShape.y - 40;
      effect.zIndex = 8;
      game.battleContainer.addChild(effect);
      game.droneAttackEffect = effect;
      game.droneAttackEffectAnimProgress = 0;
      game.battleContainer.sortChildren();
    }
  }

  static async enemyAttack(game) {
    const { character: char, enemy } = game;
    game.enemyAttacking = true;
    game.attackAnimProgress = 0;
    if (game.enemyShape && game.charShape && game.battleContainer) {
      const effect = new Graphics();
      effect.beginFill(0xff0000);
      effect.drawCircle(0, 0, 12);
      effect.endFill();
      effect.alpha = 0.85;
      effect.blendMode = BLEND_MODES.ADD;
      effect.x = game.enemyShape.x - 30;
      effect.y = game.enemyShape.y;
      effect.zIndex = 8;
      game.battleContainer.addChild(effect);
      game.enemyAttackEffect = effect;
      game.enemyAttackEffectAnimProgress = 0;
      game.battleContainer.sortChildren();
      const zone = new Graphics();
      zone.beginFill(0xff0000, 0.2);
      zone.drawCircle(0, 0, 60);
      zone.endFill();
      zone.x = game.charShape.x;
      zone.y = game.charShape.y;
      zone.zIndex = 6;
      game.battleContainer.addChild(zone);
      game.enemyAttackZone = zone;
      game.enemyAttackZoneLife = 0;
      game.battleContainer.sortChildren();
    }
    await BattleSystem.delay(400);
    let dmg = BattleSystem.calculateDamage(enemy.atk, char.stats.def);
    const crit = Math.random() < enemy.spd * 0.005;
    if (crit) {
      dmg *= 2;
        game.spawnFloatingText('CRIT!', game.playerAvatarX, game.playerAvatarY, 0xff0000, 36);
    }
    if (game.guardModeTurns > 0) {
      dmg = Math.round(dmg * 0.5);
      game.guardModeTurns -= 1;
    }
    char.hp = Math.max(0, char.hp - dmg);
      game.spawnFloatingText(`-${dmg}`, game.playerAvatarX, game.playerAvatarY, crit ? 0xff0000 : 0xffe000, 36);
    game.playerFlashTimer = 0.6; // extend hit flash duration
  }


  static checkBattleEnd(game) {
    if (game.enemy.hp <= 0) {
      game.battleStarted = false;
      game.battleResult = 'win';
      // wait a moment so victory animations remain visible
      setTimeout(() => game.initUI(), 500);
    } else if (game.character.hp <= 0) {
      game.battleStarted = false;
      game.battleResult = 'lose';
      // short delay ensures defeat effects are seen
      setTimeout(() => game.initUI(), 500);
    }
  }
}
