export const ABILITIES = {
  'Netrunner': [
    {
      name: 'Data Spike',
      cost: 0,
      price: 0,
      cooldown: 0,
      description: 'Basic attack that reduces enemy DEF by 5% (rounded).',
      damage: 'ATK x10',
      getDamage(game) {
        return game.character.stats.atk * 10;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 10;
        const reduction = Math.round(enemy.def * 0.05);
        enemy.def = Math.max(1, enemy.def - reduction);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.6; // extend flash duration
      }
    },
    {
      name: 'Echo Loop',
      cost: 25,
      price: 50,
      cooldown: 2,
      description: 'The next card activates twice on the following turn.',
      execute(game) {
        game.echoLoopActive = true;
        game.spawnFloatingText('Echo Loop', game.playerAvatarX, game.playerAvatarY - 160, 0x00e0ff, 32);
      }
    },
    {
      name: 'Glitch Pulse',
      cost: 40,
      price: 1500,
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
      cost: 35,
      price: 4500,
      cooldown: 3,
      damage: 'ATK x30',
      description: 'Deals 300% damage (ATK x30) but the player is stunned next turn.',
      getDamage(game) {
        return game.character.stats.atk * 30;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 30;
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.6;
        game.playerStunTurns = 1;
      }
    },
    {
      name: 'Stat Hijack',
      cost: 45,
      price: 350,
      cooldown: 4,
      description: "Steals 15% of the enemy's ATK.",
      execute(game) {
        const char = game.character;
        const enemy = game.enemy;
        const amount = Math.round(enemy.atk * 0.15);
        enemy.atk = Math.max(1, enemy.atk - amount);
        char.stats.atk += amount;
        game.statHijackAmount = (game.statHijackAmount || 0) + amount;
        game.statHijackTurns = 3;
        game.spawnFloatingText(`+${amount} ATK`, game.playerAvatarX, game.playerAvatarY - 160, 0x00e0ff, 32);
      }
    },
    {
      name: 'Trojan Spike',
      cost: 20,
      price: 200,
      cooldown: 2,
      damage: 'ATK x5',
      description: 'Starts at 50% damage (ATK x5) and increases by 40% per use, up to 300%.',
      getDamage(game) {
        const mult = game.trojanSpikeMult || 0.5;
        return Math.round(game.character.stats.atk * 10 * mult);
      },
      execute(game) {
        const char = game.character;
        const enemy = game.enemy;
        const mult = game.trojanSpikeMult || 0.5;
        const dmg = Math.round(char.stats.atk * 10 * mult);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0x00e0ff, 36);
        game.enemyFlashTimer = 0.6;
        game.trojanSpikeMult = Math.min(3, mult + 0.4);
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
        let critChance = 0.3;
        if (game.perfectFocusCritBonus) critChance += game.perfectFocusCritBonus;
        const crit = Math.random() < critChance;
        if (crit) {
          dmg *= 2;
          game.spawnFloatingText('CRIT!', game.enemyAvatarX, game.enemyAvatarY, 0xff0000, 36);
        }
        if (game.perfectFocusReady) {
          dmg *= 2;
          game.perfectFocusReady = false;
          game.perfectFocusCritBonus = 0;
        }
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, crit ? 0xff0000 : 0xff2e2e, 36);
        game.enemyFlashTimer = 0.6; // extend flash duration
      }
    },
    {
      name: 'Last Stand',
      cost: 35,
      cooldown: 2,
      damage: 'ATK x20',
      description: 'Deal 200% damage but reduce your DEF by 25% for 1 turn.',
      getDamage(game) {
        return game.character.stats.atk * 20;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 20;
        if (game.perfectFocusReady) {
          dmg *= 2;
          game.perfectFocusReady = false;
          game.perfectFocusCritBonus = 0;
        }
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0xff2e2e, 36);
        game.enemyFlashTimer = 0.6;
        const loss = Math.round(char.stats.def * 0.25);
        char.stats.def = Math.max(1, char.stats.def - loss);
        game.lastStandDefLoss = loss;
        game.lastStandTurns = 1;
      }
    },
    {
      name: 'Unrelenting Assault',
      cost: 75,
      cooldown: 9,
      description: 'Gain +5% ATK each turn for the rest of the battle.',
      execute(game) {
        game.unrelentingAssaultActive = true;
        game.spawnFloatingText('Assault', game.playerAvatarX, game.playerAvatarY - 160, 0xffe000, 32);
      }
    },
    {
      name: 'Execution',
      cost: 50,
      cooldown: 3,
      damage: 'ATK x15 (x30 if enemy <25% HP)',
      getDamage(game) {
        const base = game.character.stats.atk * 15;
        if (game.enemy.hp / game.enemy.maxHp < 0.25) return base * 2;
        return base;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 15;
        if (enemy.hp / enemy.maxHp < 0.25) dmg *= 2;
        if (game.perfectFocusReady) {
          dmg *= 2;
          game.perfectFocusReady = false;
          game.perfectFocusCritBonus = 0;
        }
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0xff2e2e, 36);
        game.enemyFlashTimer = 0.6;
      }
    },
    {
      name: 'Blade Flurry',
      cost: 35,
      cooldown: 2,
      damage: '2 hits of ATK x7.5',
      getDamage(game) {
        return Math.round(game.character.stats.atk * 7.5 * 2 * 1.45);
      },
      execute(game) {
        const { character: char, enemy } = game;
        for (let i = 0; i < 2; i++) {
          let dmg = char.stats.atk * 7.5;
          let critChance = 0.45;
          if (game.perfectFocusCritBonus) critChance += game.perfectFocusCritBonus;
          const crit = Math.random() < critChance;
          if (crit) {
            dmg *= 2;
            game.spawnFloatingText('CRIT!', game.enemyAvatarX, game.enemyAvatarY - 30 * i, 0xff0000, 30);
          }
          if (game.perfectFocusReady) {
            dmg *= 2;
            game.perfectFocusReady = false;
            game.perfectFocusCritBonus = 0;
          }
          enemy.hp = Math.max(0, enemy.hp - dmg);
          game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY - 30 * i, crit ? 0xff0000 : 0xff2e2e, 30);
          game.enemyFlashTimer = 0.6;
        }
      }
    },
    {
      name: 'Perfect Focus',
      cost: 20,
      cooldown: 3,
      description: 'Skip your turn. Next attack deals +100% damage and +30% crit chance.',
      execute(game) {
        game.perfectFocusReady = true;
        game.perfectFocusCritBonus = 0.3;
        game.spawnFloatingText('Focused', game.playerAvatarX, game.playerAvatarY - 160, 0xffe000, 32);
      }
    },
    {
      name: 'Bloodbath',
      cost: 30,
      cooldown: 2,
      damage: 'ATK x10 +25% per 10% HP advantage',
      getDamage(game) {
        const char = game.character;
        const enemy = game.enemy;
        const diff = Math.floor(((char.hp / char.maxHp) - (enemy.hp / enemy.maxHp)) * 10);
        const mult = 1 + Math.max(0, diff) * 0.25;
        return Math.round(char.stats.atk * 10 * mult);
      },
      execute(game) {
        const { character: char, enemy } = game;
        const diff = Math.floor(((char.hp / char.maxHp) - (enemy.hp / enemy.maxHp)) * 10);
        const mult = 1 + Math.max(0, diff) * 0.25;
        let dmg = char.stats.atk * 10 * mult;
        if (game.perfectFocusReady) {
          dmg *= 2;
          game.perfectFocusReady = false;
          game.perfectFocusCritBonus = 0;
        }
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, 0xff2e2e, 36);
        game.enemyFlashTimer = 0.6;
      }
    },
    {
      name: 'Ghost Step',
      cost: 50,
      cooldown: 3,
      damage: 'ATK x10 (50% stun)',
      getDamage(game) {
        return game.character.stats.atk * 10;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 10;
        let critChance = 0.3;
        if (game.perfectFocusCritBonus) critChance += game.perfectFocusCritBonus;
        const crit = Math.random() < critChance;
        if (crit) {
          dmg *= 2;
          game.spawnFloatingText('CRIT!', game.enemyAvatarX, game.enemyAvatarY, 0xff0000, 36);
        }
        if (game.perfectFocusReady) {
          dmg *= 2;
          game.perfectFocusReady = false;
          game.perfectFocusCritBonus = 0;
        }
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, crit ? 0xff0000 : 0xff2e2e, 36);
        game.enemyFlashTimer = 0.6;
        if (Math.random() < 0.5) {
          game.enemyStunTurns = 1;
          game.spawnFloatingText('Stunned!', game.enemyAvatarX, game.enemyAvatarY - 160, 0xff0000, 32);
        }
      }
    },
    {
      name: 'Heartpiercer',
      cost: 40,
      cooldown: 5,
      damage: 'ATK x10 (ignore DEF)',
      description: 'Strike ignoring DEF and reduce enemy DEF by 10% for 3 turns.',
      getDamage(game) {
        return game.character.stats.atk * 10;
      },
      execute(game) {
        const { character: char, enemy } = game;
        let dmg = char.stats.atk * 10;
        let critChance = 0.3;
        if (game.perfectFocusCritBonus) critChance += game.perfectFocusCritBonus;
        const crit = Math.random() < critChance;
        if (crit) {
          dmg *= 2;
          game.spawnFloatingText('CRIT!', game.enemyAvatarX, game.enemyAvatarY, 0xff0000, 36);
        }
        if (game.perfectFocusReady) {
          dmg *= 2;
          game.perfectFocusReady = false;
          game.perfectFocusCritBonus = 0;
        }
        enemy.hp = Math.max(0, enemy.hp - dmg);
        game.spawnFloatingText(`-${dmg}`, game.enemyAvatarX, game.enemyAvatarY, crit ? 0xff0000 : 0xff2e2e, 36);
        game.enemyFlashTimer = 0.6;
        const reduction = Math.round(enemy.def * 0.1);
        enemy.def = Math.max(1, enemy.def - reduction);
        game.heartpiercerDefLoss = (game.heartpiercerDefLoss || 0) + reduction;
        game.heartpiercerDefTurns = 3;
        game.spawnFloatingText('Heartpiercer', game.playerAvatarX, game.playerAvatarY - 160, 0xffe000, 32);
      }
    },
    {
      name: 'Crimson Dance',
      cost: 50,
      cooldown: 4,
      damage: '3 hits 25%-150%',
      getDamage(game) {
        const base = game.character.stats.atk * 10;
        return Math.round(base * 0.875 * 3); // average
      },
      execute(game) {
        const { character: char, enemy } = game;
        for (let i = 0; i < 3; i++) {
          const mult = 0.25 + Math.random() * 1.25;
          let dmg = char.stats.atk * 10 * mult;
          if (game.perfectFocusReady) {
            dmg *= 2;
            game.perfectFocusReady = false;
          }
          enemy.hp = Math.max(0, enemy.hp - dmg);
          game.spawnFloatingText(`-${Math.round(dmg)}`, game.enemyAvatarX, game.enemyAvatarY - 20 * i, 0xff2e2e, 30);
          game.enemyFlashTimer = 0.6;
        }
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
