import { Graphics } from 'pixi.js';
import { ABILITIES, BASIC_ATTACK } from '../data/abilities.js';

const ENEMY_DELAY = 500;
const PLAYER_EFFECT_DELAY = 300;
const UI_DELAY = 300;

export class BattleSystem {
  static init(game) {
    BattleSystem.turn = 'player';
    BattleSystem.awaitingChoice = true;
    BattleSystem.generateAbilities(game);
  }

  static update(game, delta) {
    // turn-based system does not act automatically
  }

  static generateAbilities(game) {
    const pool = ABILITIES[game.character.cls.name] || [];
    BattleSystem.currentAbilities = [];
    // Basic attack is always available in the first slot
    BattleSystem.currentAbilities.push(BASIC_ATTACK);
    // Fill the rest with class abilities or placeholders
    for (let i = 0; i < 2; i++) {
      const ability = pool[i] || { name: '???', description: '', execute() {} };
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

    BattleSystem.turn = 'enemy';
    await BattleSystem.delay(ENEMY_DELAY);
    await BattleSystem.enemyTurn(game);
    if (!game.battleStarted) return;
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
    await BattleSystem.applyDrone(game);
    BattleSystem.checkBattleEnd(game);
  }

  static async enemyTurn(game) {
    await BattleSystem.enemyAttack(game);
    await BattleSystem.applyDrone(game);
    BattleSystem.checkBattleEnd(game);
  }

  static async applyDrone(game) {
    if (game.character.cls.name === 'Techie' && game.droneDamage > 0) {
      const dmg = game.droneDamage;
      game.enemy.hp = Math.max(0, game.enemy.hp - dmg);
      game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 120, 0x00ff8a, 24);
      await BattleSystem.spawnDroneAttackEffect(game);
    }
  }

  static calculateDamage(atk, def) {
    return atk * 10;
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
        effect.drawRect(-10, -2, 20, 4);
        effect.endFill();
      } else if (cls === 'Netrunner') {
        effect.beginFill(0x00ffff);
        effect.drawCircle(0, 0, 5);
        effect.endFill();
      } else {
        effect.beginFill(0xffa000);
        effect.drawCircle(0, 0, 4);
        effect.endFill();
      }
      effect.x = game.charShape.x + 30;
      effect.y = game.charShape.y;
      effect.zIndex = 8;
      game.battleContainer.addChild(effect);
      game.attackEffect = effect;
      game.attackEffectAnimProgress = 0;
    }
  }

  static async spawnDroneAttackEffect(game) {
    if (game.charShape && game.battleContainer) {
      const effect = new Graphics();
      effect.beginFill(0xffe066);
      effect.drawCircle(0, 0, 4);
      effect.endFill();
      effect.x = game.charShape.x + 30;
      effect.y = game.charShape.y - 40;
      effect.zIndex = 8;
      game.battleContainer.addChild(effect);
      game.droneAttackEffect = effect;
      game.droneAttackEffectAnimProgress = 0;
    }
  }

  static async enemyAttack(game) {
    const { character: char, enemy } = game;
    game.enemyAttacking = true;
    game.attackAnimProgress = 0;
    if (game.enemyShape && game.charShape && game.battleContainer) {
      const effect = new Graphics();
      effect.beginFill(0xff0000);
      effect.drawCircle(0, 0, 5);
      effect.endFill();
      effect.x = game.enemyShape.x - 30;
      effect.y = game.enemyShape.y;
      effect.zIndex = 8;
      game.battleContainer.addChild(effect);
      game.enemyAttackEffect = effect;
      game.enemyAttackEffectAnimProgress = 0;
    }
    await BattleSystem.delay(400);
    if (BattleSystem.didDodge(char.stats.def)) {
      game.spawnFloatingText('DODGED', game.playerAvatarX, game.playerAvatarY - 140, 0xffffff, 36);
      return;
    }
    let dmg = BattleSystem.calculateDamage(enemy.atk, char.stats.def);
    const crit = Math.random() < enemy.spd * 0.005;
    if (crit) {
      dmg *= 2;
      game.spawnFloatingText('CRIT!', game.playerAvatarX, game.playerAvatarY - 160, 0xff0000, 36);
    }
    char.hp = Math.max(0, char.hp - dmg);
    game.spawnFloatingText(`-${dmg}`, game.playerAvatarX, game.playerAvatarY - 140, crit ? 0xff0000 : 0xffe000, 36);
    game.playerFlashTimer = 0.6; // extend hit flash duration
  }

  static didDodge(def) {
    const chance = def * 0.005;
    return Math.random() < chance;
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
