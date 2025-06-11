export class BattleSystem {
  static init(game) {
    BattleSystem._timer = 0;
    BattleSystem._delay = 90; // základní delay mezi akcemi
    BattleSystem._state = 'idle'; // 'idle' | 'attacking' | 'cooldown'
  }

  static update(game, delta) {
    if (!game.battleStarted) return;

    // Konec bitvy – výhra/prohra
    if (game.enemy.hp <= 0) {
      game.battleStarted = false;
      game.battleResult = 'win';
      game.initUI();
      return;
    }
    if (game.character.hp <= 0) {
      game.battleStarted = false;
      game.battleResult = 'lose';
      game.initUI();
      return;
    }

    // Odpočet časovače
    if (BattleSystem._timer > 0) {
      BattleSystem._timer -= delta;
      return;
    }

    // Fázový přechod
    switch (BattleSystem._state) {
      case 'idle':
        BattleSystem._state = 'attacking';
        BattleSystem._timer = 90; // příprava na útok (např. animace)
        return;

      case 'attacking':
        if (game.battleTurn === 'player') {
          BattleSystem.playerAttack(game);
          game.battleTurn = 'enemy';
        } else {
          BattleSystem.enemyAttack(game);
          game.battleTurn = 'player';
        }
        BattleSystem._state = 'cooldown';
        BattleSystem._timer = 120; // pauza po útoku
        return;

      case 'cooldown':
        BattleSystem._state = 'idle';
        return;
    }
  }

  static calculateDamage(atk, def) {
    return atk * 10;
  }

  static didDodge(def) {
    const chance = def * 0.005;
    return Math.random() < chance;
  }

  static didCrit(spd) {
    const chance = spd * 0.005;
    return Math.random() < chance;
  }

  static playerAttack(game) {
    const { character: char, enemy } = game;
    game.playerAttacking = true;

    if (BattleSystem.didDodge(enemy.def)) {
      game.spawnFloatingText('DODGED', game.enemyAvatarX, game.enemyAvatarY - 140, 0xffffff, 36);
      return;
    }

    let dmg = BattleSystem.calculateDamage(char.stats.atk, enemy.def);
    const crit = BattleSystem.didCrit(char.stats.spd);

    if (crit) {
      dmg *= 2;
      game.spawnFloatingText('CRIT!', game.enemyAvatarX, game.enemyAvatarY - 160, 0xff0000, 36);
    }

    enemy.hp = Math.max(0, enemy.hp - dmg);
    game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 140, crit ? 0xff0000 : 0xff2e2e, 36);
    game.enemyFlashTimer = 0.2;
  }

  static enemyAttack(game) {
    const { character: char, enemy } = game;
    game.enemyAttacking = true;

    if (BattleSystem.didDodge(char.stats.def)) {
      game.spawnFloatingText('DODGED', game.playerAvatarX, game.playerAvatarY - 140, 0xffffff, 36);
      return;
    }

    let dmg = BattleSystem.calculateDamage(enemy.atk, char.stats.def);
    const crit = BattleSystem.didCrit(enemy.spd);

    if (crit) {
      dmg *= 2;
      game.spawnFloatingText('CRIT!', game.playerAvatarX, game.playerAvatarY - 160, 0xff0000, 36);
    }

    char.hp = Math.max(0, char.hp - dmg);
    game.spawnFloatingText(`-${dmg}`, game.playerAvatarX, game.playerAvatarY - 140, crit ? 0xff0000 : 0xffe000, 36);
    game.playerFlashTimer = 0.2;
  }
}
