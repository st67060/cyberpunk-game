import { ABILITIES } from '../data/abilities.js';

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
    // first slot is the class basic ability if available
    const baseAbility = pool[0] || { name: '???', description: '', execute() {} };
    BattleSystem.currentAbilities.push(baseAbility);
    // remaining slots are placeholders for future abilities
    for (let i = 1; i < 3; i++) {
      const ability = pool[i] || { name: '???', description: '', execute() {} };
      BattleSystem.currentAbilities.push(ability);
    }
    if (typeof game.showAbilityOptions === 'function') {
      game.showAbilityOptions(BattleSystem.currentAbilities);
    }
  }

  static useAbility(game, ability) {
    if (!game.battleStarted) return;
    ability.execute(game);
    BattleSystem.applyDrone(game);
    BattleSystem.checkBattleEnd(game);
    if (!game.battleStarted) return;
    BattleSystem.turn = 'enemy';
    BattleSystem.enemyAttack(game);
    BattleSystem.applyDrone(game);
    BattleSystem.checkBattleEnd(game);
    if (!game.battleStarted) return;
    BattleSystem.turn = 'player';
    BattleSystem.generateAbilities(game);
  }

  static applyDrone(game) {
    if (game.character.cls.name === 'Techie' && game.droneDamage > 0) {
      const dmg = game.droneDamage;
      game.enemy.hp = Math.max(0, game.enemy.hp - dmg);
      game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 120, 0x00ff8a, 24);
    }
  }

  static calculateDamage(atk, def) {
    return atk * 10;
  }

  static enemyAttack(game) {
    const { character: char, enemy } = game;
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
    game.playerFlashTimer = 0.2;
  }

  static didDodge(def) {
    const chance = def * 0.005;
    return Math.random() < chance;
  }

  static checkBattleEnd(game) {
    if (game.enemy.hp <= 0) {
      game.battleStarted = false;
      game.battleResult = 'win';
      game.initUI();
    } else if (game.character.hp <= 0) {
      game.battleStarted = false;
      game.battleResult = 'lose';
      game.initUI();
    }
  }
}
