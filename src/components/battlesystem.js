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
    game.playerEnergy = game.energyMax;
    game.enemyEnergy = game.energyMax;
    game.echoLoopActive = false;
    game.trojanSpikeMult = 0.5;
    game.statHijackTurns = 0;
    game.statHijackAmount = 0;
    if (game.character && Array.isArray(game.character.abilities)) {
      game.character.abilities.forEach(ab => { ab.cooldownRemaining = 0; });
    }
    // create randomized ability queue for this battle
    if (game.character && Array.isArray(game.character.loadout)) {
      const extra = game.character.loadout.slice(1);
      game.abilityQueue = extra.slice().sort(() => Math.random() - 0.5);
    } else {
      game.abilityQueue = [];
    }
    game.abilityQueueIndex = 0;
    BattleSystem.generateAbilities(game);
  }

  static update(game, delta) {
    // turn-based system does not act automatically
  }

  static regenerateEnergy(game) {
    const regen = Math.round(game.energyMax * 0.25);
    game.playerEnergy = Math.min(game.energyMax, game.playerEnergy + regen);
    game.enemyEnergy = Math.min(game.energyMax, game.enemyEnergy + regen);
  }

  static generateAbilities(game) {
    const loadout = game.character.loadout || [];
    BattleSystem.currentAbilities = [];
    const basic = loadout[0];
    if (basic) BattleSystem.currentAbilities.push(basic);

    const queue = game.abilityQueue || [];
    let added = 0;
    let attempts = 0;
    while (added < 2 && attempts < queue.length) {
      if (queue.length === 0) break;
      const idx = game.abilityQueueIndex % queue.length;
      const ability = queue[idx];
      game.abilityQueueIndex = (game.abilityQueueIndex + 1) % (queue.length || 1);
      attempts++;
      if (!ability) continue;
      if ((ability.cooldownRemaining || 0) > 0) continue;
      BattleSystem.currentAbilities.push(ability);
      added++;
    }
    while (BattleSystem.currentAbilities.length < 3) {
      BattleSystem.currentAbilities.push({ name: '???', description: '', execute() {} });
    }
    if (typeof game.showAbilityOptions === 'function') {
      game.showAbilityOptions(BattleSystem.currentAbilities);
    }
  }

  static async useAbility(game, ability) {
    if (!game.battleStarted || BattleSystem.turn !== 'player') return;
    const cost = ability.cost || 0;
    if (game.playerEnergy < cost) {
      game.spawnFloatingText('No Energy', game.playerAvatarX, game.playerAvatarY - 160, 0xff0000, 32);
      return;
    }
    game.playerEnergy = Math.max(0, game.playerEnergy - cost);
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
    BattleSystem.checkBattleEnd(game);
    if (!game.battleStarted) return;
    BattleSystem.tickCooldowns(game);
    BattleSystem.regenerateEnergy(game);
    await BattleSystem.delay(UI_DELAY);

    if (game.playerStunTurns > 0) {
      game.spawnFloatingText('Stunned!', game.playerAvatarX, game.playerAvatarY - 160, 0xff0000, 32);
      game.playerStunTurns -= 1;
      BattleSystem.turn = 'enemy';
      await BattleSystem.delay(ENEMY_DELAY);
      await BattleSystem.enemyTurn(game);
      BattleSystem.applyStatusEffects(game);
      BattleSystem.checkBattleEnd(game);
      if (!game.battleStarted) return;
      BattleSystem.tickCooldowns(game);
      BattleSystem.regenerateEnergy(game);
      await BattleSystem.delay(UI_DELAY);
    }

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
    if (game.enemyStunTurns > 0) {
      game.spawnFloatingText('Stunned!', game.enemyAvatarX, game.enemyAvatarY - 160, 0xff0000, 32);
      game.enemyStunTurns -= 1;
      await BattleSystem.delay(ENEMY_DELAY);
      return;
    }
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
    if (game.unrelentingAssaultActive) {
      const inc = Math.round(game.character.baseStats.atk * 0.05);
      game.character.stats.atk += inc;
      game.spawnFloatingText(`+${inc} ATK`, game.playerAvatarX, game.playerAvatarY - 160, 0xffe000, 24);
    }
    if (game.lastStandTurns > 0) {
      game.lastStandTurns -= 1;
      if (game.lastStandTurns === 0 && game.lastStandDefLoss) {
        game.character.stats.def = Math.max(1, game.character.stats.def + game.lastStandDefLoss);
        game.lastStandDefLoss = 0;
      }
    }
    if (game.heartpiercerDefTurns > 0) {
      game.heartpiercerDefTurns -= 1;
      if (game.heartpiercerDefTurns === 0 && game.heartpiercerDefLoss) {
        game.enemy.def = Math.max(1, game.enemy.def + game.heartpiercerDefLoss);
        game.heartpiercerDefLoss = 0;
      }
    }
    if (game.heartpiercerTurns > 0) {
      game.heartpiercerTurns -= 1;
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
    if (game.charShape && game.enemyShape && game.battleContainer && game.attacks) {
      const cls = game.character.cls.name;
      const atk = game.attacks[cls];
      if (atk) {
        const sprite = atk.play(
          game.battleContainer,
          game.charShape.x,
          game.charShape.y,
          game.enemyShape.x,
          game.enemyShape.y,
          game.app.ticker
        );
        game.attackEffect = sprite;
      }
      // projectile animation handled by Attack class
    }
  }

  static async spawnDroneAttackEffect(game) {
    if (game.charShape && game.enemyShape && game.battleContainer && game.attacks) {
      const atk = game.attacks['Techie'];
      if (atk) {
        const sprite = atk.play(
          game.battleContainer,
          game.charShape.x,
          game.charShape.y,
          game.enemyShape.x,
          game.enemyShape.y,
          game.app.ticker
        );
        game.droneAttackEffect = sprite;
      }
    }
  }

  static async enemyAttack(game) {
    const { character: char, enemy } = game;
    game.enemyAttacking = true;
    game.attackAnimProgress = 0;
    if (game.enemyShape && game.charShape && game.battleContainer && game.attacks) {
      const atk = game.attacks['Enemy'];
      if (atk) {
        const sprite = atk.play(
          game.battleContainer,
          game.enemyShape.x,
          game.enemyShape.y,
          game.charShape.x,
          game.charShape.y,
          game.app.ticker
        );
        game.enemyAttackEffect = sprite;
      }
      // projectile animation handled by Attack class
    }
    await BattleSystem.delay(400);
    let dmg = BattleSystem.calculateDamage(enemy.atk, char.stats.def);
    const crit = Math.random() < enemy.spd * 0.005;
    if (crit) {
      dmg *= 2;
      game.spawnFloatingText('CRIT!', game.playerAvatarX, game.playerAvatarY, 0xff0000, 36);
    }
    if (game.ghostStepActive) {
      dmg = 0;
      game.ghostStepActive = false;
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
