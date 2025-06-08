import { BattleSystem } from "./BattleSystem.js";
export class StaminaBattleSystem {
  static init(game) {
    game.playerStamina = game.staminaMax;
    game.enemyStamina = game.staminaMax;
  }

  static update(game, delta) {
    if (game.state !== 'battle') return;
    const char = game.character;
    const enemy = game.enemy;
    // Regenerate stamina based on speed
    game.playerStamina = Math.min(game.staminaMax, game.playerStamina + char.stats.spd * delta);
    game.enemyStamina = Math.min(game.staminaMax, game.enemyStamina + enemy.spd * delta);

    const cost = game.staminaThreshold;
    // When nobody is attacking, resolve turns based on stamina
    if (!game.playerAttacking && !game.enemyAttacking && char.hp > 0 && enemy.hp > 0) {
      if (game.playerStamina >= cost) {
        game.playerStamina -= cost;
        BattleSystem.doPlayerAttack(game);
      } else if (game.enemyStamina >= cost) {
        game.enemyStamina -= cost;
        BattleSystem.doEnemyAttack(game);
      }
    }
  }
}
