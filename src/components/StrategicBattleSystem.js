import { BattleSystem } from './BattleSystem.js';

export class StrategicBattleSystem {
  static init(game) {
    game.playerEnergy = 0;
    game.enemyEnergy = 0;
    game.energyMax = 100;
    game.energyThreshold = 50;
  }

  static update(game, delta) {
    if (game.state !== 'battle') return;
    const char = game.character;
    const enemy = game.enemy;

    game.playerEnergy = Math.min(game.energyMax, game.playerEnergy + char.stats.spd * delta);
    game.enemyEnergy = Math.min(game.energyMax, game.enemyEnergy + enemy.spd * delta);

    if (!game.playerAttacking && !game.enemyAttacking && char.hp > 0 && enemy.hp > 0) {
      const pEn = game.playerEnergy;
      const eEn = game.enemyEnergy;
      if (pEn < game.energyThreshold && eEn < game.energyThreshold) return;

      if (pEn >= eEn) {
        const cost = pEn >= game.energyMax ? game.energyMax : game.energyThreshold;
        const mult = pEn >= game.energyMax ? 1.5 : 1;
        game.playerEnergy -= cost;
        BattleSystem.doPlayerAttack(game, mult);
      } else {
        const cost = eEn >= game.energyMax ? game.energyMax : game.energyThreshold;
        const mult = eEn >= game.energyMax ? 1.5 : 1;
        game.enemyEnergy -= cost;
        BattleSystem.doEnemyAttack(game, mult);
      }
    }
  }
}
