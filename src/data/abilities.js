export const ABILITIES = {
  'Netrunner': [
    {
      name: 'Data Spike',
      cost: 0,
      cooldown: 0,
      description: 'Deals damage and reduces enemy DEF by 5% for the battle.',
      damage: 'ATK x10',
      getDamage(game) {
        return game.character.stats.atk * 10;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 10;
        enemy.def = Math.max(1, enemy.def * 0.95);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 140, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.6; // extend flash duration
      }
    },
    {
      name: 'Echo Loop',
      cost: 50,
      cooldown: 2,
      description: 'Následující karta se příští kolo aktivuje 2×.',
      execute(game) {
        game.echoLoopActive = true;
        game.spawnFloatingText('Echo Loop', game.playerAvatarX, game.playerAvatarY - 160, 0x00e0ff, 32);
      }
    },
    {
      name: 'Glitch Pulse',
      cost: 1500,
      cooldown: 3,
      description: 'Příští 2 kola po každém tahu nepřítele obdrží dodatečné poškození.',
      execute(game) {
        const char = game.character;
        const enemy = game.enemy;
        const dmg = Math.round(char.stats.atk * 5 + enemy.maxHp * 0.03);
        game.glitchPulseDamage = dmg;
        game.glitchPulseTurns = 2;
        game.spawnFloatingText('Glitch Pulse', game.enemyAvatarX, game.enemyAvatarY - 160, 0x00e0ff, 32);
      }
    },
    {
      name: 'Overload Attack',
      cost: 4500,
      cooldown: 1,
      damage: 'ATK x20',
      description: 'Útok za 200% DMG, 50% šance utržit 10% vlastního HP.',
      getDamage(game) {
        return game.character.stats.atk * 20;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 20;
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 140, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.6;
        if (Math.random() < 0.5) {
          const recoil = Math.round(char.maxHp * 0.1);
          char.hp = Math.max(0, char.hp - recoil);
          game.spawnFloatingText(`-${recoil}`, game.playerAvatarX, game.playerAvatarY - 140, 0xff0000, 36);
          game.playerFlashTimer = 0.6;
        }
      }
    }
  ],
  'Street Samurai': [
    {
      name: 'Blade Strike',
      cost: 0,
      cooldown: 0,
      description: 'Attack with 30% chance to critically hit.',
      damage: 'ATK x10 (30% crit)',
      getDamage(game) {
        return Math.round(game.character.stats.atk * 10 * 1.3);
      },
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
        game.enemyFlashTimer = 0.6; // extend flash duration
      }
    }
  ],
  'Techie': [
    {
      name: 'Drone Boost',
      cost: 0,
      cooldown: 0,
      description: 'Increase drone damage by 50%.',
      execute(game) {
        game.droneDamage = Math.round(game.droneDamage * 1.5);
        game.spawnFloatingText('DRONE +50%', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
        game.enemyFlashTimer = 0.6; // extend flash duration
      }
    }
  ]
};
