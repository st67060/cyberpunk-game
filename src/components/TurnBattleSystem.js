import { BattleSystem } from './BattleSystem.js';

/**
 * TurnBattleSystem implements a speed based battle mechanic.
 * Each side gains action points every frame based on its SPD stat.
 * When a side reaches the gauge threshold, it performs an action.
 */
export class TurnBattleSystem {
  static init(game) {
    game.playerGauge = 0;
    game.enemyGauge = 0;
    game.gaugeThreshold = 100;
  }

  static update(game, delta) {
    if (game.state !== 'battle') return;
    const char = game.character;
    const enemy = game.enemy;

    // Accumulate gauges according to speed stats
    game.playerGauge += char.stats.spd * delta;
    game.enemyGauge += enemy.spd * delta;

    // When nobody is currently attacking, resolve turns
    if (!game.playerAttacking && !game.enemyAttacking && char.hp > 0 && enemy.hp > 0) {
      if (game.playerGauge >= game.gaugeThreshold) {
        game.playerGauge -= game.gaugeThreshold;
        BattleSystem.doPlayerAttack(game);
      } else if (game.enemyGauge >= game.gaugeThreshold) {
        game.enemyGauge -= game.gaugeThreshold;
        BattleSystem.doEnemyAttack(game);
      }
    }
  }
}
