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
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.6; // extend flash duration
      }
    },
    {
      name: 'Echo Loop',
      cost: 50,
      cooldown: 2,
      description: 'The next card activates twice on the following turn.',
      execute(game) {
        game.echoLoopActive = true;
        game.spawnFloatingText('Echo Loop', game.playerAvatarX, game.playerAvatarY - 160, 0x00e0ff, 32);
      }
    },
    {
      name: 'Glitch Pulse',
      cost: 1500,
      cooldown: 3,
      description: 'For the next 2 turns, additional damage is dealt after each enemy action.',
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
      description: 'Attack for 200% damage with a 50% chance to take 10% of your own HP.',
      getDamage(game) {
        return game.character.stats.atk * 20;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 20;
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.6;
        if (Math.random() < 0.5) {
          const recoil = Math.round(char.maxHp * 0.1);
          char.hp = Math.max(0, char.hp - recoil);
          game.spawnFloatingText(`-${recoil}`, game.playerAvatarX, game.playerAvatarY, 0xff0000, 36);
          game.playerFlashTimer = 0.6;
        }
      }
    },
    {
      name: 'Stat Hijack',
      cost: 350,
      cooldown: 4,
      description: 'Steals 20% of the enemy\'s ATK for 3 turns.',
      execute(game) {
        const char = game.character;
        const enemy = game.enemy;
        const amount = Math.round(enemy.atk * 0.2);
        enemy.atk = Math.max(1, enemy.atk - amount);
        char.stats.atk += amount;
        game.statHijackAmount = (game.statHijackAmount || 0) + amount;
        game.statHijackTurns = 3;
        game.spawnFloatingText(`+${amount} ATK`, game.playerAvatarX, game.playerAvatarY - 160, 0x00e0ff, 32);
      }
    },
    {
      name: 'Trojan Spike',
      cost: 200,
      cooldown: 1,
      damage: 'ATK x0.5',
      description: 'Deals damage equal to 50% ATK, multiplying by 1.5× with each use.',
      getDamage(game) {
        const mult = game.trojanSpikeMult || 0.5;
        return Math.round(game.character.stats.atk * mult);
      },
      execute(game) {
        const char = game.character;
        const enemy = game.enemy;
        const mult = game.trojanSpikeMult || 0.5;
        const dmg = Math.round(char.stats.atk * mult);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.6;
        game.trojanSpikeMult = mult * 1.5;
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
          game.spawnFloatingText('CRIT!', game.enemyAvatarX, game.enemyAvatarY, 0xff0000, 36);
        }
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, crit ? 0xff0000 : 0xff2e2e, 36);
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
    },
    {
      name: 'Overclock Drone',
      cost: 0,
      cooldown: 1,
      description: 'Greatly increases drone damage for 1 turn.',
      execute(game) {
        game.overclockTurns = 1;
        game.spawnFloatingText('Overclocked', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    },
    {
      name: 'Reinforced Core',
      cost: 0,
      cooldown: 5,
      description: 'Permanently increases max HP by 10%.',
      execute(game) {
        const char = game.character;
        const prev = char.maxHp;
        char.baseStats.hp = Math.round(char.baseStats.hp * 1.1);
        char.updateStats();
        const diff = char.maxHp - prev;
        char.hp = Math.min(char.maxHp, char.hp + diff);
        game.spawnFloatingText('+HP', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    },
    {
      name: 'Omega Drone Strike',
      cost: 0,
      cooldown: 2,
      description: 'After 2 turns the drone deals massive damage.',
      execute(game) {
        game.omegaStrikeDelay = 2;
        game.spawnFloatingText('Omega Armed', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    },
    {
      name: 'Smart Targeting',
      cost: 0,
      cooldown: 2,
      description: 'Permanently increases drone crit chance by 15%.',
      execute(game) {
        game.droneCritChance = (game.droneCritChance || 0) + 0.15;
        game.spawnFloatingText('CRIT +15%', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    },
    {
      name: 'Self-destruction',
      cost: 0,
      cooldown: 4,
      damage: 'ATK x25',
      description: 'Massive damage but drone disabled for 2 turns.',
      getDamage(game) {
        return game.character.stats.atk * 25;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 25;
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.droneDisabledTurns = 2;
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0xff2e2e, 36);
        game.enemyFlashTimer = 0.6;
      }
    },
    {
      name: 'Auto-Medkit',
      cost: 0,
      cooldown: 8,
      description: 'Heal 1% of max HP each turn until battle ends.',
      execute(game) {
        game.autoMedkitActive = true;
        game.spawnFloatingText('Auto-Medkit', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    },
    {
      name: 'Critical Loop',
      cost: 0,
      cooldown: 1,
      description: 'If the drone critically hits this turn it attacks again.',
      execute(game) {
        game.criticalLoopActive = true;
        game.spawnFloatingText('Critical Loop', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    },
    {
      name: 'Guard Mode',
      cost: 0,
      cooldown: 5,
      description: 'Take only 50% damage for the next 2 enemy turns.',
      execute(game) {
        game.guardModeTurns = 2;
        game.spawnFloatingText('Guard Mode', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    },
    {
      name: 'Nanite Fortification',
      cost: 0,
      cooldown: 0,
      description: 'Instantly heal 20% of max HP.',
      execute(game) {
        const heal = Math.round(game.character.maxHp * 0.2);
        game.character.hp = Math.min(game.character.maxHp, game.character.hp + heal);
        game.spawnFloatingText(`+${heal}`, game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    },
    {
      name: 'Holo Decoy',
      cost: 0,
      cooldown: 50,
      description: 'Creates a drone copy so it attacks twice each round.',
      execute(game) {
        game.holoDecoyActive = true;
        game.spawnFloatingText('Holo Decoy', game.playerAvatarX, game.playerAvatarY - 160, 0x00ff8a, 32);
      }
    }
  ]
};
