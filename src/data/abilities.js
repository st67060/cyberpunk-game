export const BASIC_ATTACK = {
  name: 'Basic Attack',
  description: 'A straightforward strike dealing damage.',
  execute(game) {
    const { character: char, enemy } = game;
    const dmg = char.stats.atk * 10;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 140, 0xffe000, 36);
    game.enemyFlashTimer = 0.2;
  }
};

export const ABILITIES = {
  'Netrunner': [
    {
      name: 'Data Spike',
      description: 'Deals damage and reduces enemy DEF by 5% for the battle.',
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 10;
        enemy.def = Math.max(1, enemy.def * 0.95);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 140, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.2;
      }
    }
  ],
  'Street Samurai': [
    {
      name: 'Blade Strike',
      description: 'Attack with 30% chance to critically hit.',
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 10;
        const crit = Math.random() < 0.3;
        if (crit) {
          dmg *= 2;
          game.spawnFloatingText('CRIT!', game.enemyAvatarX, game.enemyAvatarY - 160, 0xff0000, 36);
        }
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 140, crit ? 0xff0000 : 0xff2e2e, 36);
        game.enemyFlashTimer = 0.2;
      }
    }
  ],
  'Techie': [
    {
      name: 'Drone Boost',
      description: 'Increase drone damage by 50%.',
      execute(game) {
        game.droneDamage = Math.round(game.droneDamage * 1.5);
        game.spawnFloatingText('DRONE +50%', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
        game.enemyFlashTimer = 0.2;
      }
    }
  ]
};
