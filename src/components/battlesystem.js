export class BattleSystem {
  static init(game) {
    // Reset turn timer and configure base delay between actions (in frames)
    BattleSystem._timer = 0;
    BattleSystem._delay = 60; // roughly 1 second at 60fps
  }

  static update(game, delta) {
    if (!game.battleStarted) return;
    if (game.character.hp <= 0 || game.enemy.hp <= 0) {
      game.battleStarted = false;
      return;
    }
    if (BattleSystem._timer > 0) {
      BattleSystem._timer -= delta;
      return;
    }
    if (game.battleTurn === 'player') {
      BattleSystem.playerAttack(game);
      game.battleTurn = 'enemy';
    } else {
      BattleSystem.enemyAttack(game);
      game.battleTurn = 'player';
    }
    BattleSystem._timer = BattleSystem._delay;
  }

  static calculateDamage(atk, def) {
    const base = atk - def * 0.5;
    return Math.max(1, Math.round(base + Math.random() * 2));
  }

  static playerAttack(game) {
    const { character: char, enemy } = game;
    const dmg = BattleSystem.calculateDamage(char.stats.atk, enemy.def);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 140, 0xff2e2e);
    game.playerAttacking = true;
    game.enemyFlashTimer = 0.2;
  }

  static enemyAttack(game) {
    const { character: char, enemy } = game;
    const dmg = BattleSystem.calculateDamage(enemy.atk, char.stats.def);
    char.hp = Math.max(0, char.hp - dmg);
    game.spawnFloatingText(`-${dmg}`, game.playerAvatarX, game.playerAvatarY - 140, 0xffe000);
    game.enemyAttacking = true;
    game.playerFlashTimer = 0.2;
  }
}
