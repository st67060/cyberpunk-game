import { Application, Container, Sprite, Text, Graphics, Assets, BlurFilter } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import { BloomFilter } from '@pixi/filter-bloom';
import { DropShadowFilter } from '@pixi/filter-drop-shadow';
import { CRTFilter } from '@pixi/filter-crt';
import { GlitchFilter } from '@pixi/filter-glitch';

import { Button } from './Button.js';
import { StatBar } from './StatBar.js';
import { Character } from './Character.js';
import { Enemy } from './Enemy.js';
import { BattleSystem } from './battlesystem.js';

import { CLASSES } from '../data/classes.js';
import { DUNGEON_ENEMIES } from '../data/dungeonEnemies.js';
import { WEAPON_ITEMS } from '../data/weaponItems.js';
import { ARMOR_ITEMS } from '../data/armorItems.js';
import { ITEM_ASSETS } from '../data/itemAssets.js';
import { ENEMY_ASSETS } from '../data/enemyAssets.js';
import { BOSS_ENEMIES } from '../data/bossEnemies.js';
import { ABILITY_ASSETS } from '../data/abilityAssets.js';
import { ABILITIES } from '../data/abilities.js';

const CLASS_AVATAR_SIZE = 200;

export class Game {
  constructor(app) {
    // Uložení reference na PIXI.Application
    this.app = app;
    // Vytvoření hlavního kontejneru hry a přidání do scény aplikace
    this.stage = new Container();
    // Allow explicit zIndex ordering for children
    this.stage.sortableChildren = true;
    this.app.stage.addChild(this.stage);
    // Výchozí stav hry a základní proměnné
    this.state = 'loading';
    // At game start no class is selected
    this.classIdx = -1;
    this.selectedClass = null;
    this.character = null;
    this.enemy = null;
    this.dungeonLevel = 1;
    this.message = '';
    this.battleTurn = 'player';
    this.battleAnim = 0;
    this.playerAttacking = false;
    this.enemyAttacking = false;
    this.attackAnimProgress = 0;
    this.floatingTexts = [];
    this.shopIdx = 0;
    this.playerWeaponSprite = null;
    this.attackEffect = null;
    this.attackEffectAnimProgress = 0;
    this.enemyAttackEffect = null;
    this.enemyAttackEffectAnimProgress = 0;
    this.droneAttackEffect = null;
    this.droneAttackEffectAnimProgress = 0;
    this.attackZone = null;
    this.attackZoneLife = 0;
    this.enemyAttackZone = null;
    this.enemyAttackZoneLife = 0;
    this.shopType = 'weapon';
    // Cache nabídek obchodu (předměty k prodeji podle typu)
    this.shopItemsCache = {
      weapon: WEAPON_ITEMS,
      armor: ARMOR_ITEMS,
      ability: []
    };
    this.bossesDefeated = 0;
    this.currentBossIndex = 0;
    this.bgDistortFilter = null;
    this.glitchFilter = null;
    this.glitchTimer = 0;
    this.nextGlitchIn = 0;
    this.logoSprite = null;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboTimerMax = 2.0;
    this.lastAttackWasCombo = false;
    this.shopItemsContainer = null;
    this.shopScrollMask = null;
    this.shopScrollStartY = 0;
    this.shopScrollStartMouseY = 0;
    this.isScrollingShop = false;
    this.playerAttacksWithoutDamage = 0;
    this.scrapEffects = [];
    this.bloodEffects = [];
    this.screenShakeDuration = 0;
    this.screenShakeIntensity = 0;
    this.playerFlashTimer = 0;
    this.enemyFlashTimer = 0;
    this.playerEnergy = 0;
    this.enemyEnergy = 0;
    this.energyMax = 100;
    this.energyThreshold = 50;
    this.droneDamage = 5;
    this.glitchPulseTurns = 0;
    this.glitchPulseDamage = 0;
    this.echoLoopActive = false;
    this.trojanSpikeMult = 0.5;
    this.statHijackTurns = 0;
    this.statHijackAmount = 0;
    this.playerStatsText = null;
    this.enemyStatsText = null;
    this.abilityButtons = null;
    this.battleStarted = false;
    this.battleResult = null;
    // Nastavení hudby na pozadí
    this.musicVolume = 0.5;
    this.musicMuted = false;
    this.bgMusic = new Audio('/assets/background_music.ogg');
    this.bgMusic.loop = true;
    this.bgMusic.volume = this.musicVolume;
    // Načtení všech assetů (obrázků) a po dokončení přechod na obrazovku výběru postavy
    this.loadAssets().then(() => {
      this.state = 'charcreate';
      this.initUI();
      // Music playback will start after the first user interaction
    });
  }

  async loadAssets() {
    // Sestavení pole URL všech obrázků, které je třeba načíst
    const assets = CLASSES.map(c => c.texture);
    // Přidání pozadí Vaultu 404 a všech item/enemy assetů
    assets.push('/assets/background.png');
    Object.values(ITEM_ASSETS).forEach(url => assets.push(url));
    Object.values(ENEMY_ASSETS).forEach(url => assets.push(url));
    Object.values(ABILITY_ASSETS).forEach(url => assets.push(url));
    BOSS_ENEMIES.forEach(boss => { if (boss.texture) assets.push(boss.texture); });
    // Přidání obrázků rámečků pro postavy v souboji
    assets.push('/assets/frame.png');
    assets.push('/assets/frame.png');
    assets.push('/assets/Logo.png');
    // Attack effect assets were removed; effects are drawn via PIXI Graphics
    // Načtení všech assetů pomocí Pixi Assets API
    await Assets.load(assets);
    // Vytvoření sprite pro pozadí hry a aplikace CRT filtru (zkreslení obrazu)
    this.backgroundSprite = Sprite.from('/assets/background.png');
    this.backgroundSprite.width = this.app.screen.width;
    this.backgroundSprite.height = this.app.screen.height;
    this.backgroundSprite.zIndex = 0;
    this.bgDistortFilter = new CRTFilter({
      curvature: 2, lineWidth: 0, lineContrast: 0,
      noise: 0.08, noiseSize: 2,
      vignetting: 0.18, vignettingAlpha: 0.38, vignettingBlur: 0.3,
      seed: Math.random()
    });
    this.bgDistortFilter.time = 0;
    this.glitchFilter = new GlitchFilter();
    this.glitchFilter.enabled = false;
    this.nextGlitchIn = 3 + Math.random() * 5;
    this.backgroundSprite.filters = [this.bgDistortFilter, this.glitchFilter];

    this.logoSprite = Sprite.from('/assets/Logo.png');
    this.logoSprite.width = 120;
    this.logoSprite.height = 120;
    this.logoSprite.x = 10;
    this.logoSprite.y = 10;
    this.logoSprite.zIndex = 10;
  }

  async startBattle() {
    BattleSystem.init(this);
    await this.createBattleUI();
  }

  spawnFloatingText(text, x, y, color = 0xffffff, fontSize = 24, offsetY = 0) {
    // Vytvoření poletujícího textu (např. poškození nebo zprávy) na scéně
    const floatingText = new Text(text, {
      fontFamily: 'monospace',
      fontSize,
      fill: color,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 4
    });
    floatingText.anchor.set(0.5);
    floatingText.x = x;
    floatingText.y = y + offsetY;
    floatingText.initialY = y + offsetY;
    floatingText.alpha = 1;
    floatingText.life = 0;
    floatingText.scale.set(1);
    floatingText.zIndex = 5;
    this.floatingTexts.push(floatingText);
    if (this.state === 'battle' && this.battleContainer) {
      this.battleContainer.addChild(floatingText);
    } else {
      this.stage.addChild(floatingText);
    }
  }

  // ... (další metody Game: initUI(), createBattleUI(), createShopUI(), aj., viz níže) ...

  initUI() {
    // Inicializace nebo obnova uživatelského rozhraní podle aktuálního stavu hry
    this.ui = {};
    this.stage.removeChildren();
    const currentResult = this.battleResult;
    const showBattleResult = this.state === 'battle' && currentResult !== null;
    this.resetBattleState();
    this.battleResult = showBattleResult ? currentResult : null;
    // Odpojení posuvu myší (např. z obchodu)
    this.app.view.onwheel = null;
    // Přidání pozadí (pokud již bylo načteno)
    if (!this.backgroundSprite) {
      // Ještě nejsou načtena potřebná assety, UI nelze inicializovat
      return;
    }
    this.stage.addChild(this.backgroundSprite);
    if (this.logoSprite) {
      this.stage.addChild(this.logoSprite);
    }
    if (this.state === 'charcreate') {
      // Screen for selecting a character class
      const titleText = new Text('Choose Your Class', {
        fontFamily: 'monospace', fontSize: 28, fill: 0xffffff
      });
      titleText.anchor.set(0.5);
      titleText.x = this.app.screen.width / 2;
      titleText.y = 60;
      this.stage.addChild(titleText);

      // Render all available classes side by side
      const gap = this.app.screen.width / 4;
      CLASSES.forEach((cls, i) => {
        const avatar = Sprite.from(cls.texture);
        avatar.anchor.set(0.5);
        const sizeMultiplier = i === this.classIdx ? 1.2 : 1;
        avatar.width = CLASS_AVATAR_SIZE * sizeMultiplier;
        avatar.height = CLASS_AVATAR_SIZE * sizeMultiplier;
        avatar.x = gap * (i + 1);
        avatar.y = 230;
        const glow = new GlowFilter({
          distance: 15,
          outerStrength: i === this.classIdx ? 5 : 1.5,
          innerStrength: 0,
          color: cls.color
        });
        avatar.filters = [glow];
        // Width and height already apply the desired scaling
        avatar.interactive = true;
        avatar.buttonMode = true;
        avatar.on('pointerdown', () => {
          this.classIdx = i;
          this.selectedClass = cls;
          this.initUI();
        });



        this.stage.addChild(avatar);

        const nameText = new Text(cls.name, {
          fontFamily: 'monospace', fontSize: 20, fill: cls.color
        });
        nameText.anchor.set(0.5);
        nameText.x = avatar.x;
        nameText.y = avatar.y + CLASS_AVATAR_SIZE / 2 + 30;
        this.stage.addChild(nameText);
      });

      if (this.selectedClass) {
        // Start Game button is shown only when a class is selected
        const startBtn = new Button('Start Game', this.app.screen.width / 2 - 85, 420, 170, 50, 0x00e0ff);
        startBtn.on('pointerdown', () => {
          // Vytvoření hráčovy postavy a přechod do hlavního menu hry
          this.character = new Character(this.selectedClass);
          // ihned přepočítej statistiky pro jistotu
          if (this.character.updateStats) {
            this.character.updateStats();
          }
          this.state = 'mainmenu';
          this.initUI();
          // Play background music after user interaction to avoid autoplay blocks
          this.playBackgroundMusic();
        });
        this.stage.addChild(startBtn);

        // Description in a comic-cyberpunk style frame
        const frameWidth = this.app.screen.width - 160;
        const frameX = this.app.screen.width / 2 - frameWidth / 2;
        const frameY = startBtn.y + 60;
        const descFrame = new Graphics();
        descFrame.lineStyle(4, 0xff00ff, 1);
        descFrame.beginFill(0x000000, 0.6);
        descFrame.drawRoundedRect(frameX, frameY, frameWidth, 90, 12);
        descFrame.endFill();
        descFrame.filters = [new GlowFilter({ distance: 10, outerStrength: 2, innerStrength: 0, color: 0xff00ff })];
        this.stage.addChild(descFrame);

        const descText = new Text(this.selectedClass.desc, {
          fontFamily: 'Bangers, monospace',
          fontSize: 16,
          fill: 0xffffff,
          wordWrap: true,
          wordWrapWidth: frameWidth - 20,
          align: 'center'
        });
        descText.anchor.set(0.5);
        descText.x = this.app.screen.width / 2;
        descText.y = frameY + 45;
        this.stage.addChild(descText);
      }
    } else if (this.state === 'mainmenu') {
      // Hlavní menu se třemi tlačítky
      const dungeonBtn = new Button('Vault 404', this.app.screen.width / 2 - 85, 250, 170, 50, 0xff2e2e);
      dungeonBtn.on('pointerdown', () => {
        this.state = 'dungeon';
        this.message = '';
        this.initUI();
      });
      this.stage.addChild(dungeonBtn);

      const profileBtn = new Button('Profile', this.app.screen.width / 2 - 85, 320, 170, 50, 0x00e0ff);
      profileBtn.on('pointerdown', () => {
        this.state = 'profile';
        this.initUI();
      });
      this.stage.addChild(profileBtn);

      const shopBtn = new Button('Market', this.app.screen.width / 2 - 85, 390, 170, 50, 0x00e0ff);
      shopBtn.on('pointerdown', () => {
        this.state = 'shop';
        this.initUI();
      });
      this.stage.addChild(shopBtn);

      const settingsBtn = new Button('Settings', this.app.screen.width / 2 - 85, 460, 170, 50, 0x00e0ff);
      settingsBtn.on('pointerdown', () => {
        this.state = 'settings';
        this.initUI();
      });
      this.stage.addChild(settingsBtn);
      // (Případně další prvky hlavního menu by byly zde)
    } else if (this.state === 'profile') {
      // Screen with detailed player information, avatar and stat upgrades
      const char = this.character;

      // Semi-transparent panel behind profile info
      const panelWidth = 420;
      const panelHeight = 560;
      const panelX = this.app.screen.width / 2 - panelWidth / 2;
      const panelY = 90;
      const infoPanel = new Graphics();
      infoPanel.beginFill(0x000000, 0.6);
      infoPanel.drawRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
      infoPanel.endFill();
      this.stage.addChild(infoPanel);

      const title = new Text('Player Profile', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
      title.anchor.set(0.5);
      title.x = this.app.screen.width / 2;
      title.y = 60;
      this.stage.addChild(title);

      const avatar = Sprite.from(char.avatar);
      avatar.anchor.set(0.5);
      avatar.width = 130;
      avatar.height = 130;
      avatar.x = this.app.screen.width / 2;
      avatar.y = panelY + 60;
      avatar.filters = [char.glowFilter];
      this.stage.addChild(avatar);

      const classText = new Text(`Class: ${char.cls.name}`, { fontFamily: 'monospace', fontSize: 22, fill: 0xffffff });
      classText.anchor.set(0.5);
      classText.x = this.app.screen.width / 2;
      classText.y = avatar.y + 70;
      this.stage.addChild(classText);

      const levelText = new Text(`Level: ${char.level}`, { fontFamily: 'monospace', fontSize: 22, fill: 0xffffff });
      levelText.anchor.set(0.5);
      levelText.x = this.app.screen.width / 2;
      levelText.y = classText.y + 30;
      this.stage.addChild(levelText);

      const levelBar = new StatBar('EXP', char.exp, char.expToNext, this.app.screen.width / 2 - 100, levelText.y + 10, 200, 16, 0x00e0ff);
      this.stage.addChild(levelBar);

      const statHeader = new Text(`Stat Points: ${char.statPoints}`, { fontFamily: 'monospace', fontSize: 20, fill: 0xffe000 });
      statHeader.anchor.set(0.5);
      statHeader.x = this.app.screen.width / 2;
      statHeader.y = levelBar.y + 30;
      this.stage.addChild(statHeader);

      const statInfo = [
        {
          key: 'hp',
          label: `HP: ${char.hp}/${char.maxHp}`
        },
        {
          key: 'atk',
          label: `ATK: ${char.stats.atk} \u223c ${BattleSystem.calculateDamage(char.stats.atk, 0)}dmg`
        },
        {
          key: 'def',
          label: `DEF: ${char.stats.def} \u223c ${(char.stats.def * 0.5).toFixed(1)}% dodge, ${Math.min(char.stats.def * 0.5, 80).toFixed(1)}% block`
        },
        {
          key: 'spd',
          label: `SPD: ${char.stats.spd} \u223c x${(1 + char.stats.spd * 0.01).toFixed(2)} rewards`
        }
      ];
      let y = statHeader.y + 10;
      for (const s of statInfo) {
        const statLabel = new Text(s.label, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
        statLabel.anchor.set(0, 0.5);
        statLabel.x = this.app.screen.width / 2 - 90;
        statLabel.y = y + 20;
        this.stage.addChild(statLabel);

        const cost = char.statPoints > 0 ? '1 SP' : `${char.statCosts[s.key]}G`;
        const costText = new Text(cost, { fontFamily: 'monospace', fontSize: 14, fill: 0xcccccc });
        costText.anchor.set(1, 0.5);
        costText.x = this.app.screen.width / 2 + 130;
        costText.y = y + 20;
        this.stage.addChild(costText);

        const upBtn = new Button('+', this.app.screen.width / 2 + 140, y, 40, 40, 0x00ff8a);
        upBtn.on('pointerdown', () => {
          char.spendStat(s.key);
          this.initUI();
        });
        this.stage.addChild(upBtn);
        y += 50;
      }

      const goldText = new Text(`Gold: ${char.gold}`, { fontFamily: 'monospace', fontSize: 20, fill: 0xffe000 });
      goldText.anchor.set(0.5);
      goldText.x = this.app.screen.width / 2;
      goldText.y = y + 10;
      this.stage.addChild(goldText);

      const weaponText = new Text(`Weapon: ${char.weapon.name}`, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
      weaponText.anchor.set(0, 0.5);
      weaponText.x = this.app.screen.width / 2 - 30;
      weaponText.y = y + 40;
      this.stage.addChild(weaponText);

      if (ITEM_ASSETS[char.weapon.name]) {
        const weaponSprite = Sprite.from(ITEM_ASSETS[char.weapon.name]);
        weaponSprite.width = 48;
        weaponSprite.height = 48;
        weaponSprite.anchor.set(1, 0.5);
        weaponSprite.x = weaponText.x - 10;
        weaponSprite.y = weaponText.y;
        this.stage.addChild(weaponSprite);
      }

      const armorText = new Text(`Armor: ${char.armor.name}`, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
      armorText.anchor.set(0, 0.5);
      armorText.x = this.app.screen.width / 2 - 30;
      armorText.y = y + 70;
      this.stage.addChild(armorText);

      if (ITEM_ASSETS[char.armor.name]) {
        const armorSprite = Sprite.from(ITEM_ASSETS[char.armor.name]);
        armorSprite.width = 48;
        armorSprite.height = 48;
        armorSprite.anchor.set(1, 0.5);
        armorSprite.x = armorText.x - 10;
        armorSprite.y = armorText.y;
        this.stage.addChild(armorSprite);
      }

      const skillsBtn = new Button('Skill Tree', this.app.screen.width / 2 - 85, armorText.y + 40, 170, 50, 0x00e0ff);
      skillsBtn.on('pointerdown', () => {
        this.state = 'skilltree';
        this.initUI();
      });
      this.stage.addChild(skillsBtn);

      const backBtn = new Button('Back', 20, this.app.screen.height - 60, 100, 40, 0x222c33);
      backBtn.on('pointerdown', () => {
        this.state = 'mainmenu';
        this.initUI();
      });
        this.stage.addChild(backBtn);
      } else if (this.state === 'skilltree') {
        const title = new Text('Skill Tree', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 60;
        this.stage.addChild(title);

        const info = new Text('Skill editor coming soon.', { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
        info.anchor.set(0.5);
        info.x = this.app.screen.width / 2;
        info.y = this.app.screen.height / 2;
        this.stage.addChild(info);

        const backBtn = new Button('Back', 20, this.app.screen.height - 60, 100, 40, 0x222c33);
        backBtn.on('pointerdown', () => {
          this.state = 'profile';
          this.initUI();
        });
        this.stage.addChild(backBtn);
      } else if (this.state === 'dungeon') {
      // Herní obrazovka Vault 404 – zobrazení nepřítele nebo výzvy k souboji
      const dungeonText = new Text(`Vault 404 - Level ${this.dungeonLevel}`, { fontFamily: 'monospace', fontSize: 28, fill: 0xffffff });
      dungeonText.anchor.set(0.5);
      dungeonText.x = this.app.screen.width / 2;
      dungeonText.y = 80;
      this.stage.addChild(dungeonText);
      if (this.message) {
        // Zobrazení případné zprávy (např. po poražení bosse)
        const messageText = new Text(this.message, { fontFamily: 'monospace', fontSize: 20, fill: 0xffe000 });
        messageText.anchor.set(0.5);
        messageText.x = this.app.screen.width / 2;
        messageText.y = 120;
        this.stage.addChild(messageText);
        this.message = ''; // zprávu zobrazíme jen jednou
      }
      // Tlačítko "Battle Enemy" pro zahájení souboje s náhodným nepřítelem
      const battleBtn = new Button('Battle Enemy', this.app.screen.width / 2 - 105, 300, 210, 60, 0xff2e2e);
      battleBtn.on('pointerdown', () => {
        // Vybrání náhodného nepřítele ze seznamu pro daný Vault 404 level
        const randomEnemyTemplate = DUNGEON_ENEMIES[Math.floor(Math.random() * DUNGEON_ENEMIES.length)];
        this.enemy = new Enemy(randomEnemyTemplate, this.character.level, false, this.character);
        // Přechod do stavu boje a nastavení hráčova tahu na začátek
        this.battleTurn = 'player';
        this.resetBattleState();
        this.battleResult = null;
        this.state = 'battle';
        this.initUI();
      });
      this.stage.addChild(battleBtn);
      // Tlačítko "Battle Boss" pro souboj s aktuálním bossem
      const bossBtn = new Button('Battle Boss', this.app.screen.width / 2 - 105, 380, 210, 60, 0xffe000);
      bossBtn.on('pointerdown', () => {
        if (this.currentBossIndex >= BOSS_ENEMIES.length) {
          this.message = 'All bosses defeated!';
          this.initUI();
          return;
        }
        const bossTemplate = BOSS_ENEMIES[this.currentBossIndex];
        if (this.character.level < bossTemplate.requiredPlayerLevel) {
          this.message = `Boss requires level ${bossTemplate.requiredPlayerLevel}`;
          this.initUI();
          return;
        }
        this.enemy = new Enemy(bossTemplate, this.character.level, true, this.character);
        // Zahájení nového boje s bossem
        this.battleTurn = 'player';
        this.resetBattleState();
        this.battleResult = null;
        this.state = 'battle';
        this.initUI();
      });
      this.stage.addChild(bossBtn);
      // Tlačítko "Market" pro otevření obchodu
      const shopBtn = new Button('Market', this.app.screen.width / 2 - 55, 460, 110, 50, 0x00e0ff);
      shopBtn.on('pointerdown', () => {
        this.state = 'shop';
        this.initUI();
      });
      this.stage.addChild(shopBtn);

      const backBtn = new Button('Back', 20, this.app.screen.height - 60, 100, 40, 0x222c33);
      backBtn.on('pointerdown', () => {
        this.state = 'mainmenu';
        this.initUI();
      });
      this.stage.addChild(backBtn);
    } else if (this.state === 'shop') {
      // Zobrazení nabídky obchodu (zbraně/zbroje)
      this.createShopUI();
      } else if (this.state === 'battle') {
        this.startBattle();
      }
    else if (this.state === 'settings') {
      const title = new Text('Settings', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
      title.anchor.set(0.5);
      title.x = this.app.screen.width / 2;
      title.y = 60;
      this.stage.addChild(title);

      const volumeText = new Text(`Volume: ${Math.round(this.musicVolume * 100)}%`, { fontFamily: 'monospace', fontSize: 24, fill: 0xffffff });
      volumeText.anchor.set(0.5);
      volumeText.x = this.app.screen.width / 2;
      volumeText.y = 120;
      this.stage.addChild(volumeText);

      const volDownBtn = new Button('-', this.app.screen.width / 2 - 90, 160, 60, 50, 0x00e0ff);
      volDownBtn.on('pointerdown', () => {
        this.adjustVolume(-0.1);
        volumeText.text = `Volume: ${Math.round(this.musicVolume * 100)}%`;
      });
      this.stage.addChild(volDownBtn);

      const volUpBtn = new Button('+', this.app.screen.width / 2 + 30, 160, 60, 50, 0x00e0ff);
      volUpBtn.on('pointerdown', () => {
        this.adjustVolume(0.1);
        volumeText.text = `Volume: ${Math.round(this.musicVolume * 100)}%`;
      });
      this.stage.addChild(volUpBtn);

      const muteBtn = new Button(this.musicMuted ? 'Unmute' : 'Mute', this.app.screen.width / 2 - 85, 220, 170, 50, 0x00e0ff);
      muteBtn.on('pointerdown', () => {
        this.toggleMute();
        muteBtn.t.text = this.musicMuted ? 'Unmute' : 'Mute';
        volumeText.text = `Volume: ${Math.round(this.musicVolume * 100)}%`;
      });
      this.stage.addChild(muteBtn);

      const fsBtn = new Button('Toggle Fullscreen', this.app.screen.width / 2 - 120, 290, 240, 50, 0x00e0ff);
      fsBtn.on('pointerdown', () => { this.toggleFullscreen(); });
      this.stage.addChild(fsBtn);

      const backBtn = new Button('Back', 20, this.app.screen.height - 60, 100, 40, 0x222c33);
      backBtn.on('pointerdown', () => { this.state = 'mainmenu'; this.initUI(); });
      this.stage.addChild(backBtn);
    }
  }

  async createBattleUI() {
    const enemy = this.enemy;
    const char = this.character;
    // Ensure avatar textures are loaded
    const toLoad = [];
    if (!Assets.cache.get(char.avatar)) toLoad.push(char.avatar);
    if (!Assets.cache.get(enemy.avatar)) toLoad.push(enemy.avatar);
    if (toLoad.length) {
      try {
        await Assets.load(toLoad);
      } catch (err) {
        console.error('Failed loading avatars', err);
      }
    }
    // Kontejner pro prvky boje
    this.battleContainer = new Container();
    this.battleContainer.sortableChildren = true;
    this.battleContainer.zIndex = 1;
    this.stage.addChild(this.battleContainer);
    // Pozice avatarů hráče a nepřítele
    const AVATAR_SIZE = 280;
    const AVATAR_BG_SIZE = AVATAR_SIZE + 20;
    this.playerAvatarX = this.app.screen.width / 4;
    this.playerAvatarY = this.app.screen.height / 2 - 50;
    this.enemyAvatarX = this.app.screen.width * 3 / 4;
    this.enemyAvatarY = this.app.screen.height / 2 - 50;
    // Rámečky pod avátory (s efekty)
    const playerBgSprite = Sprite.from('/assets/frame.png');
    playerBgSprite.width = AVATAR_BG_SIZE;
    playerBgSprite.height = AVATAR_BG_SIZE;
    playerBgSprite.anchor.set(0.5);
    playerBgSprite.x = this.playerAvatarX;
    playerBgSprite.y = this.playerAvatarY;
    playerBgSprite.zIndex = 0;
    playerBgSprite.filters = [
      new GlowFilter({ distance: 15, outerStrength: 1, innerStrength: 0, color: 0xffa500, quality: 0.5 }),
      new DropShadowFilter({ distance: 0, blur: 8, color: 0x000000, alpha: 0.5 })
    ];
    this.battleContainer.addChild(playerBgSprite);
    const charAvatar = Sprite.from(char.avatar);
    charAvatar.width = AVATAR_SIZE;
    charAvatar.height = AVATAR_SIZE;
    charAvatar.anchor.set(0.5);
    this.charShape = charAvatar;
    charAvatar.x = this.playerAvatarX;
    charAvatar.y = this.playerAvatarY;
    // Ensure avatar renders above its background
    charAvatar.zIndex = 5;
    // Apply cyberpunk glow effect on the player's avatar
    charAvatar.filters = [char.glowFilter];
    this.battleContainer.addChild(charAvatar);
    // Popisek a úroveň hráče
    const charNameText = new Text('ME', { fontFamily: 'monospace', fontSize: 32, fill: 0xffa500, fontWeight: 'bold' });
    charNameText.anchor.set(0.5);
    charNameText.x = this.playerAvatarX - 30;
    charNameText.y = this.playerAvatarY - AVATAR_SIZE / 2 - 30;
    this.battleContainer.addChild(charNameText);
    const playerLevelText = new Text(`Lv. ${char.level}`, { fontFamily: 'monospace', fontSize: 24, fill: 0xffffff });
    playerLevelText.anchor.set(0.5);
    playerLevelText.x = charNameText.x + charNameText.width / 2 + 30;
    playerLevelText.y = charNameText.y;
    this.battleContainer.addChild(playerLevelText);
    // HP bar hráče
    this.charHpBar = new StatBar('HP', char.hp, char.maxHp, this.playerAvatarX - 100, this.playerAvatarY + AVATAR_SIZE / 2 + 20, 200, 24, 0xffa500);
    this.battleContainer.addChild(this.charHpBar);
    this.playerEnergyBar = new StatBar("ENG", this.playerEnergy, this.energyMax, this.playerAvatarX - 100, this.playerAvatarY + AVATAR_SIZE / 2 + 50, 200, 12, 0x00e0ff);
    this.battleContainer.addChild(this.playerEnergyBar);
    // Text s hráčovými staty (ATK, DEF, SPD)
    const playerStatsText = new Text(`ATK: ${char.stats.atk} | DEF: ${char.stats.def} | SPD: ${char.stats.spd}`,
      { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff });
    playerStatsText.anchor.set(0.5);
    playerStatsText.x = this.playerAvatarX;
    playerStatsText.y = this.playerAvatarY + AVATAR_SIZE / 2 + 60;
    this.battleContainer.addChild(playerStatsText);
    this.playerStatsText = playerStatsText;
    // Rámeček pro nepřítele
    const enemyBgSprite = Sprite.from('/assets/frame.png');
    enemyBgSprite.width = AVATAR_BG_SIZE;
    enemyBgSprite.height = AVATAR_BG_SIZE;
    enemyBgSprite.anchor.set(0.5);
    enemyBgSprite.x = this.enemyAvatarX;
    enemyBgSprite.y = this.enemyAvatarY;
    enemyBgSprite.zIndex = 0;
    enemyBgSprite.filters = [
      new GlowFilter({ distance: 15, outerStrength: 1, innerStrength: 0, color: 0xff2e2e, quality: 0.5 }),
      new DropShadowFilter({ distance: 0, blur: 8, color: 0x000000, alpha: 0.5 })
    ];
    this.battleContainer.addChild(enemyBgSprite);
    // Sprite nepřítele (obrázek buď specifický pro bosse, nebo obecný z ENEMY_ASSETS)
    const enemyTexture = enemy.avatar;
    const enemySprite = Sprite.from(enemyTexture);
    enemySprite.width = AVATAR_SIZE;
    enemySprite.height = AVATAR_SIZE;
    enemySprite.anchor.set(0.5);
    this.enemyShape = enemySprite;
    enemySprite.x = this.enemyAvatarX;
    enemySprite.y = this.enemyAvatarY;
    // Ensure enemy avatar appears above its background
    enemySprite.zIndex = 5;
    // Filtry pro nepřátelský avatar (záře, bloom, stín)
    // Some filters caused the enemy avatar to disappear on certain setups
    // enemySprite.filters = [
    //   new GlowFilter({ distance: 25, outerStrength: 4, innerStrength: 0, color: enemy.color, quality: 0.5 }),
    //   new BloomFilter({ threshold: 0.2, bloomScale: 2.5, blur: 18, quality: 0.5 }),
    //   new DropShadowFilter({ distance: 0, blur: 16, color: 0x000000, alpha: 0.7 })
    // ];
    this.battleContainer.addChild(enemySprite);
    // Popisek nepřítele (jméno a úroveň)
    const enemyNameText = new Text(`${enemy.name} (Lv. ${enemy.level})`, { fontFamily: 'monospace', fontSize: 32, fill: enemy.color, fontWeight: 'bold' });
    enemyNameText.anchor.set(0.5);
    enemyNameText.x = this.enemyAvatarX;
    enemyNameText.y = this.enemyAvatarY - AVATAR_SIZE / 2 - 30;
    this.battleContainer.addChild(enemyNameText);
    // HP bar nepřítele
    this.enemyHpBar = new StatBar('HP', enemy.hp, enemy.maxHp, this.enemyAvatarX - 100, this.enemyAvatarY + AVATAR_SIZE / 2 + 20, 200, 24, 0xff2e2e);
    this.battleContainer.addChild(this.enemyHpBar);
    this.enemyEnergyBar = new StatBar("ENG", this.enemyEnergy, this.energyMax, this.enemyAvatarX - 100, this.enemyAvatarY + AVATAR_SIZE / 2 + 50, 200, 12, 0xff2e2e);
    this.battleContainer.addChild(this.enemyEnergyBar);
    // Text se staty nepřítele
    const enemyStatsText = new Text(`ATK: ${enemy.atk} | DEF: ${enemy.def} | SPD: ${enemy.spd}`,
      { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff });
    enemyStatsText.anchor.set(0.5);
    enemyStatsText.x = this.enemyAvatarX;
    enemyStatsText.y = this.enemyAvatarY + AVATAR_SIZE / 2 + 60;
    this.battleContainer.addChild(enemyStatsText);
    this.enemyStatsText = enemyStatsText;
    // Přidání již vytvořených floatingTexts (např. při opakovaném vykreslení)
    this.floatingTexts.forEach(text => this.battleContainer.addChild(text));
    // Kontejner pro tlačítka ve spodní části (Continue, apod.)
    const buttonContainer = new Container();
    buttonContainer.x = this.app.screen.width / 2;
    buttonContainer.y = this.app.screen.height - 80;
    buttonContainer.zIndex = 2;
    this.battleContainer.addChild(buttonContainer);
    // Kontrola, zda je boj již rozhodnut
    if (this.battleResult === 'win') {
      // Vítězství
      const winMsg = new Text('VICTORY!', { fontFamily: 'monospace', fontSize: 48, fill: 0x00e0ff, fontWeight: 'bold', stroke: 0x000000, strokeThickness: 6 });
      winMsg.anchor.set(0.5);
      winMsg.x = this.app.screen.width / 2;
      winMsg.y = this.app.screen.height / 2 - 50;
      winMsg.filters = [
        new GlowFilter({ distance: 15, outerStrength: 2.5, innerStrength: 0, color: 0x00e0ff, quality: 0.5 }),
        new BloomFilter({ threshold: 0.1, bloomScale: 1.8, blur: 10, quality: 0.5 }),
        new DropShadowFilter({ distance: 6, color: 0x000000, alpha: 0.7, blur: 4 })
      ];
      this.battleContainer.addChild(winMsg);
      const spdMultiplier = 1 + char.stats.spd * 0.01;
      const goldGain = Math.round(enemy.gold * spdMultiplier);
      const expGain = Math.round(enemy.exp * spdMultiplier);
      const lootText = new Text(`+${goldGain} Gold   +${expGain} EXP`, { fontFamily: 'monospace', fontSize: 28, fill: 0xffe000 });
      lootText.anchor.set(0.5);
      lootText.x = this.app.screen.width / 2;
      lootText.y = this.app.screen.height / 2 + 20;
      this.battleContainer.addChild(lootText);
      const contBtn = new Button('Continue', 0, 0, 180, 52, 0x222c33);
      contBtn.on('pointerdown', () => {
        // Odměna za vítězství - zohledňuje SPD hráče
        char.gold += goldGain;
        char.gainExp(expGain);
        char.hp = char.maxHp;
        if (enemy.isBoss) {
          this.bossesDefeated++;
          this.currentBossIndex++;
          this.message = `You defeated ${enemy.name}!`;
        }
        this.dungeonLevel++;
        this.state = 'dungeon';
        this.initUI();
      });
      buttonContainer.addChild(contBtn);
      // Vycentrování tlačítka
      buttonContainer.x = this.app.screen.width / 2 - contBtn.w / 2;
      buttonContainer.y = this.app.screen.height - 80;
    } else if (this.battleResult === 'lose') {
      // Porážka hráče
      let goldLost = 0;
      let defeatMsg = '';
      if (enemy.isBoss) {
        goldLost = Math.floor(char.gold * 0.2);
        char.gold = Math.max(0, char.gold - goldLost);
        defeatMsg = `Lost ${goldLost} Gold!`;
      } else {
        defeatMsg = `You were defeated!`;
      }
      const loseMsg = new Text('DEFEAT!', { fontFamily: 'monospace', fontSize: 48, fill: 0xff2e2e, fontWeight: 'bold', stroke: 0x000000, strokeThickness: 6 });
      loseMsg.anchor.set(0.5);
      loseMsg.x = this.app.screen.width / 2;
      loseMsg.y = this.app.screen.height / 2 - 50;
      loseMsg.filters = [
        new GlowFilter({ distance: 15, outerStrength: 2.5, innerStrength: 0, color: 0xff2e2e, quality: 0.5 }),
        new BloomFilter({ threshold: 0.1, bloomScale: 1.8, blur: 10, quality: 0.5 }),
        new DropShadowFilter({ distance: 6, color: 0x000000, alpha: 0.7, blur: 4 })
      ];
      this.battleContainer.addChild(loseMsg);
      const goldLossText = new Text(defeatMsg, { fontFamily: 'monospace', fontSize: 28, fill: 0xffe000 });
      goldLossText.anchor.set(0.5);
      goldLossText.x = this.app.screen.width / 2;
      goldLossText.y = this.app.screen.height / 2 + 20;
      this.battleContainer.addChild(goldLossText);
      const continueBtn = new Button('Continue', 0, 0, 180, 52, 0x222c33);
      continueBtn.on('pointerdown', () => {
        // Návrat do Vaultu 404 (hráč při porážce nezískává nic, jen se vynuluje HP)
        char.hp = char.maxHp;
        this.state = 'dungeon';
        this.message = '';
        this.initUI();
      });
      buttonContainer.addChild(continueBtn);
      // Vycentrování tlačítka
      buttonContainer.x = this.app.screen.width / 2 - continueBtn.w / 2;
      buttonContainer.y = this.app.screen.height - 80;
    } else if (!this.battleStarted && this.battleResult === null) {
      const startBtn = new Button('Start', 0, 0, 180, 52, 0x00e0ff);
      startBtn.on('pointerdown', () => {
        this.battleStarted = true;
        buttonContainer.removeChild(startBtn);
        BattleSystem.generateAbilities(this);
      });
      buttonContainer.addChild(startBtn);
      buttonContainer.x = this.app.screen.width / 2 - startBtn.w / 2;
      buttonContainer.y = this.app.screen.height - 80;
    }
  }

  showAbilityOptions(abilities) {
    if (!this.battleContainer) return;
    if (this.abilityButtons) {
      this.battleContainer.removeChild(this.abilityButtons);
      this.abilityButtons.destroy({ children: true });
    }
    const overlay = new Container();
    overlay.zIndex = 10;
    const bg = new Graphics();
    bg.beginFill(0x000000, 0.6);
    bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.endFill();
    overlay.addChild(bg);

    const cardWidth = 325;
    const cardHeight = 350; // increased height for larger attack cards
    const startX = this.app.screen.width / 2 - 512;
    const startY = this.app.screen.height / 2 - cardHeight / 2;
    abilities.forEach((ab, idx) => {
      const card = new Button(ab.name, startX + idx * 350, startY, cardWidth, cardHeight, 0x2e3c43);
      // reposition title
      card.t.style.fontSize = 20;
      card.t.anchor.set(0.5, 0);
      card.t.y = 160; // position title below enlarged icon

      if (ABILITY_ASSETS[ab.name]) {
        const icon = Sprite.from(ABILITY_ASSETS[ab.name]);
        icon.width = 144; // double icon size
        icon.height = 144;
        icon.anchor.set(0.5, 0);
        icon.x = card.w / 2;
        icon.y = 6;
        card.addChild(icon);
      }

      const desc = new Text(ab.description, {
        fontFamily: 'monospace',
        fontSize: 14,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: cardWidth - 40,
        align: 'center'
      });
      desc.anchor.set(0.5, 0);
      desc.x = card.w / 2;
      desc.y = 220; // moved down to avoid overlap with icon
      card.addChild(desc);

      if (ab.cooldown !== undefined && ab.cooldown > 0) {
        const cdText = new Text(`CD: ${ab.cooldown}`, {
          fontFamily: 'monospace', fontSize: 14, fill: 0xffe000
        });
        cdText.anchor.set(0.5, 0);
        cdText.x = card.w / 2;
        cdText.y = card.h - 42;
        card.addChild(cdText);
      }

      if (typeof ab.getDamage === 'function') {
        const approx = ab.getDamage(this);
        const dmgText = new Text(`DMG: ~${approx}`, {
          fontFamily: 'monospace', fontSize: 14, fill: 0xffe000
        });
        dmgText.anchor.set(0.5, 0);
        dmgText.x = card.w / 2;
        dmgText.y = card.h - 24;
        card.addChild(dmgText);
      } else if (ab.damage) {
        const dmgText = new Text(`DMG: ${ab.damage}`, {
          fontFamily: 'monospace', fontSize: 14, fill: 0xffe000
        });
        dmgText.anchor.set(0.5, 0);
        dmgText.x = card.w / 2;
        dmgText.y = card.h - 24;
        card.addChild(dmgText);
      }

      card.on('pointerdown', () => {
        if (this.battleStarted) {
          this.battleContainer.removeChild(overlay);
          this.abilityButtons = null;
          BattleSystem.useAbility(this, ab);
        }
      });
      overlay.addChild(card);
    });
    this.battleContainer.addChild(overlay);
    this.abilityButtons = overlay;
  }

  createShopUI() {
    // (Základní implementace UI obchodu – zobrazení seznamu zbraní či zbrojí k prodeji)
    const shopTitle = new Text('Market', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
    shopTitle.anchor.set(0.5, 0);
    shopTitle.x = this.app.screen.width / 2;
    shopTitle.y = 20;
    this.stage.addChild(shopTitle);
    // Šířka nabídky obchodu
    const shopWidth = Math.min(1000, this.app.screen.width * 0.8);
    const startX = this.app.screen.width / 2 - shopWidth / 2;
    // Tlačítka pro přepínání kategorií
    const weaponsTab = new Button('Weapons', startX, 60, 120, 40, 0x00e0ff);
    const armorsTab = new Button('Armors', startX + 130, 60, 120, 40, 0x00e0ff);
    const abilitiesTab = new Button('Abilities', startX + 260, 60, 120, 40, 0x00e0ff);
    weaponsTab.on('pointerdown', () => { this.shopType = 'weapon'; this.initUI(); });
    armorsTab.on('pointerdown', () => { this.shopType = 'armor'; this.initUI(); });
    abilitiesTab.on('pointerdown', () => { this.shopType = 'ability'; this.initUI(); });
    this.stage.addChild(weaponsTab, armorsTab, abilitiesTab);
    // Vykreslení seznamu položek obchodu
    this.shopItemsContainer = new Container();
    const shopMaskY = 120;
    const shopMaskH = 400;
    // Maska pro posuvnou oblast položek (aby seznam nepřetékal)
    this.shopScrollMask = new Graphics();
    this.shopScrollMask.beginFill(0xff0000);
    this.shopScrollMask.drawRect(startX, shopMaskY, shopWidth, shopMaskH);
    this.shopScrollMask.endFill();
    this.shopItemsContainer.mask = this.shopScrollMask;
    this.stage.addChild(this.shopScrollMask, this.shopItemsContainer);
    // Seznam položek k zobrazení (podle zvolené záložky)
    if (this.shopType === 'ability') {
      this.shopItemsCache.ability = [...ABILITIES[this.character.cls.name]]
        .sort((a, b) => (a.cost || 0) - (b.cost || 0));
    }
    const itemsToShow = this.shopItemsCache[this.shopType];
    let y = 0;
    for (const itemTemplate of itemsToShow) {
      // Podklad pro jednu položku
      const itemBox = new Graphics();
      itemBox.beginFill(0x2e3c43);
      itemBox.drawRoundedRect(startX, y + shopMaskY, shopWidth, 80, 14);
      itemBox.endFill();
      this.shopItemsContainer.addChild(itemBox);
      // Obrázek položky (pokud existuje v assetech)
      if (this.shopType !== 'ability' && ITEM_ASSETS[itemTemplate.name]) {
        const itemSprite = Sprite.from(ITEM_ASSETS[itemTemplate.name]);
        itemSprite.width = 72;
        itemSprite.height = 72;
        itemSprite.x = startX + 12;
        itemSprite.y = y + shopMaskY + 4;
        itemSprite.filters = [new GlowFilter({ distance: 8, outerStrength: 1.5, innerStrength: 0, color: 0xffa500 })];
        this.shopItemsContainer.addChild(itemSprite);
      } else if (this.shopType === 'ability' && ABILITY_ASSETS[itemTemplate.name]) {
        const icon = Sprite.from(ABILITY_ASSETS[itemTemplate.name]);
        icon.width = 72;
        icon.height = 72;
        icon.x = startX + 12;
        icon.y = y + shopMaskY + 4;
        icon.filters = [new GlowFilter({ distance: 8, outerStrength: 1.5, innerStrength: 0, color: 0xffa500 })];
        this.shopItemsContainer.addChild(icon);
      }
      // Název položky
      const itemNameText = new Text(itemTemplate.name, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
      itemNameText.x = startX + 80;
      itemNameText.y = y + shopMaskY + 10;
      this.shopItemsContainer.addChild(itemNameText);
      if (this.shopType === 'ability') {
        const desc = new Text(itemTemplate.description, { fontFamily: 'monospace', fontSize: 16, fill: 0x00ff8a, wordWrap: true, wordWrapWidth: shopWidth - 200 });
        desc.x = startX + 80;
        desc.y = y + shopMaskY + 36;
        this.shopItemsContainer.addChild(desc);
        if (itemTemplate.cooldown !== undefined && itemTemplate.cooldown > 0) {
          const cd = new Text(`CD: ${itemTemplate.cooldown}`, { fontFamily: 'monospace', fontSize: 14, fill: 0xffe000 });
          cd.x = startX + shopWidth - 220;
          cd.y = y + shopMaskY + 10;
          this.shopItemsContainer.addChild(cd);
        }
      } else {
        const statValue = this.shopType === 'weapon'
          ? this.character.getWeaponStat(itemTemplate, this.character.level)
          : this.character.getArmorStat(itemTemplate, this.character.level);
        const statLabel = this.shopType === 'weapon' ? 'ATK' : 'HP';
        const statText = new Text(`${statLabel}: ${statValue}`, { fontFamily: 'monospace', fontSize: 18, fill: 0x00ff8a });
        statText.x = startX + 80;
        statText.y = y + shopMaskY + 40;
        this.shopItemsContainer.addChild(statText);
      }
      // Cena
      const priceVal = this.shopType === 'ability' ? itemTemplate.cost : itemTemplate.baseCost;
      const priceText = new Text(`${priceVal} G`, { fontFamily: 'monospace', fontSize: 18, fill: 0xffe000 });
      priceText.x = startX + shopWidth - 140;
      priceText.y = y + shopMaskY + 20;
      this.shopItemsContainer.addChild(priceText);
      // Kontrola, zda již hráč položku vlastní
      let owned = false;
      if (this.shopType === 'weapon') {
        owned = this.character.inventory.weapons.some(i => i.name === itemTemplate.name);
      } else if (this.shopType === 'armor') {
        owned = this.character.inventory.armors.some(i => i.name === itemTemplate.name);
      } else {
        owned = this.character.abilities.some(a => a.name === itemTemplate.name);
      }

      // Tlačítko nákupu nebo informace o vlastnictví
      const btnLabel = owned ? 'Owned' : 'Buy';
      const btnColor = owned ? 0x555555 : 0x00ff8a;
      const buyBtn = new Button(btnLabel, startX + shopWidth - 70, y + shopMaskY + 24, 60, 36, btnColor);

      if (!owned) {
        buyBtn.on('pointerdown', () => {
          // Pokus o koupi předmětu
          let success = false;
          if (this.shopType === 'ability') {
            success = this.character.buyAbility(itemTemplate);
          } else {
            success = this.character.buyItem(itemTemplate, this.shopType === 'weapon' ? 'weapon' : 'armor');
          }
          if (success) {
            this.initUI(); // obnovit UI (aktualizuje inventář hráče a zlato)
          }
        });
      } else {
        buyBtn.interactive = false;
        buyBtn.eventMode = 'none';
      }
      this.shopItemsContainer.addChild(buyBtn);
      y += 100; // posun pro další položku
    }
    // Posuv myšovým kolečkem v obchodě
    this.app.view.onwheel = (event) => {
      const scrollAmount = event.deltaY * 0.5;
      let newY = this.shopItemsContainer.y - scrollAmount;
      const totalItemsHeight = itemsToShow.length * 100;
      const maxScrollY = shopMaskH - totalItemsHeight;
      newY = Math.min(0, newY);
      newY = Math.max(maxScrollY, newY);
      this.shopItemsContainer.y = newY;
      event.preventDefault();
    };
    // Tlačítko zpět do hlavního menu
      const backBtn = new Button('Back', 20, this.app.screen.height - 60, 100, 40, 0x222c33);
      backBtn.on('pointerdown', () => {
        this.state = 'mainmenu';
        this.initUI();
      });
      this.stage.addChild(backBtn);
    }

  resetBattleState() {
    // Reset stavu boje (např. při opuštění obrazovky boje)
    this.playerAttacking = false;
    this.enemyAttacking = false;
    this.attackAnimProgress = 0;
    this.playerWeaponSprite = null;
    if (this.attackEffect) {
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.attackEffect);
      } else {
        this.stage.removeChild(this.attackEffect);
      }
      this.attackEffect.destroy();
      this.attackEffect = null;
    }
    this.attackEffectAnimProgress = 0;
    if (this.enemyAttackEffect) {
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.enemyAttackEffect);
      } else {
        this.stage.removeChild(this.enemyAttackEffect);
      }
      this.enemyAttackEffect.destroy();
      this.enemyAttackEffect = null;
    }
    this.enemyAttackEffectAnimProgress = 0;
    if (this.droneAttackEffect) {
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.droneAttackEffect);
      } else {
        this.stage.removeChild(this.droneAttackEffect);
      }
      this.droneAttackEffect.destroy();
      this.droneAttackEffect = null;
    }
    this.droneAttackEffectAnimProgress = 0;
    if (this.attackZone) {
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.attackZone);
      } else {
        this.stage.removeChild(this.attackZone);
      }
      this.attackZone.destroy();
      this.attackZone = null;
    }
    this.attackZoneLife = 0;
    if (this.enemyAttackZone) {
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.enemyAttackZone);
      } else {
        this.stage.removeChild(this.enemyAttackZone);
      }
      this.enemyAttackZone.destroy();
      this.enemyAttackZone = null;
    }
    this.enemyAttackZoneLife = 0;
    this.floatingTexts = [];
    if (this.bloodEffects) {
      this.bloodEffects.forEach(effect => this.stage.removeChild(effect));
      this.bloodEffects = [];
    }
    if (this.scrapEffects) {
      this.scrapEffects.forEach(effect => this.stage.removeChild(effect));
      this.scrapEffects = [];
    }
    this.screenShakeDuration = 0;
    this.screenShakeIntensity = 0;
    this.app.stage.x = 0;
    this.app.stage.y = 0;
    this.playerFlashTimer = 0;
    this.enemyFlashTimer = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.playerAttacksWithoutDamage = 0;
    this.charShape = null;
    this.enemyShape = null;
    this.battleContainer = null;
    if (this.abilityButtons) {
      this.stage.removeChild(this.abilityButtons);
      this.abilityButtons.destroy({ children: true });
      this.abilityButtons = null;
    }
    this.playerEnergy = 0;
    this.enemyEnergy = 0;
    this.droneDamage = 5;
    this.glitchPulseTurns = 0;
    this.glitchPulseDamage = 0;
    this.echoLoopActive = false;
    this.trojanSpikeMult = 0.5;
    this.statHijackTurns = 0;
    this.statHijackAmount = 0;
    if (this.playerStatsText) {
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.playerStatsText);
      } else {
        this.stage.removeChild(this.playerStatsText);
      }
      this.playerStatsText.destroy();
      this.playerStatsText = null;
    }
    if (this.enemyStatsText) {
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.enemyStatsText);
      } else {
        this.stage.removeChild(this.enemyStatsText);
      }
      this.enemyStatsText.destroy();
      this.enemyStatsText = null;
    }
    this.battleStarted = false;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.body.requestFullscreen().then(() => {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        this.initUI();
      });
    } else {
      document.exitFullscreen().then(() => {
        this.app.renderer.resize(1280, 720);
        this.initUI();
      });
    }
  }

  playBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.volume = this.musicMuted ? 0 : this.musicVolume;
      this.bgMusic.play().catch(() => {});
    }
  }

  adjustVolume(delta) {
    this.musicVolume = Math.min(1, Math.max(0, this.musicVolume + delta));
    if (this.bgMusic && !this.musicMuted) {
      this.bgMusic.volume = this.musicVolume;
    }
  }

  toggleMute() {
    this.musicMuted = !this.musicMuted;
    if (this.bgMusic) {
      this.bgMusic.muted = this.musicMuted;
    }
  }

  update(delta) {
    // Tato funkce je volána každým snímkem (frame) – herní smyčka
    // Animace zkreslení pozadí (CRT efekt)
    if (this.bgDistortFilter) {
      this.bgDistortFilter.time += 0.03 * delta;
    }
    if (this.glitchFilter) {
      if (this.glitchTimer > 0) {
        this.glitchTimer -= delta / 60;
        if (this.glitchTimer <= 0) {
          this.glitchFilter.enabled = false;
          this.nextGlitchIn = 3 + Math.random() * 5;
        }
      } else {
        this.nextGlitchIn -= delta / 60;
        if (this.nextGlitchIn <= 0) {
          // Randomize glitch seed each time the effect triggers
          this.glitchFilter.seed = Math.random();
          this.glitchFilter.refresh();
          this.glitchFilter.enabled = true;
          this.glitchTimer = 0.15;
        }
      }
    }
    // Aktualizace animace všech tlačítek (Button.updateAnimation)
    this.stage.children.forEach(child => {
      if (child instanceof Button) {
        child.updateAnimation(delta);
      }
    });
    // Efekt otřesu kamery (screen shake) pokud nastaven
    if (this.screenShakeDuration > 0) {
      this.app.stage.x = Math.random() * this.screenShakeIntensity * 2 - this.screenShakeIntensity;
      this.app.stage.y = Math.random() * this.screenShakeIntensity * 2 - this.screenShakeIntensity;
      this.screenShakeDuration -= delta / 60;
      if (this.screenShakeDuration <= 0) {
        this.app.stage.x = 0;
        this.app.stage.y = 0;
        this.screenShakeIntensity = 0;
      }
    }
    // Pokud probíhá boj, aktualizace logiky boje
    if (this.state === 'battle') {
      const char = this.character;
      const enemy = this.enemy;
      this.battleAnim += 0.08 * delta;
      // Aktualizace HP barů hráče a nepřítele
      if (this.charHpBar) this.charHpBar.updateBar(this.character.hp, this.character.maxHp);
      if (this.enemyHpBar) this.enemyHpBar.updateBar(this.enemy.hp, this.enemy.maxHp);
      if (this.playerEnergyBar) this.playerEnergyBar.updateBar(this.playerEnergy, this.energyMax);
      if (this.enemyEnergyBar) this.enemyEnergyBar.updateBar(this.enemyEnergy, this.energyMax);
      if (this.playerStatsText) {
        this.playerStatsText.text = `ATK: ${char.stats.atk} | DEF: ${char.stats.def} | SPD: ${char.stats.spd}`;
      }
      if (this.enemyStatsText) {
        this.enemyStatsText.text = `ATK: ${enemy.atk} | DEF: ${enemy.def} | SPD: ${enemy.spd}`;
      }
      // Flash efekt hráče při zásahu (blikne červeně krátce)
      if (this.playerFlashTimer > 0) {
        this.playerFlashTimer -= delta / 60;
        if (this.charShape) this.charShape.tint = 0xff0000;
        if (this.playerFlashTimer <= 0 && this.charShape) {
          this.charShape.tint = 0xffffff;
        }
      } else if (this.charShape && this.charShape.tint !== 0xffffff) {
        this.charShape.tint = 0xffffff;
      }
      // Flash efekt nepřítele při zásahu
      if (this.enemyFlashTimer > 0) {
        this.enemyFlashTimer -= delta / 60;
        if (this.enemyShape) this.enemyShape.tint = 0xff0000;
        if (this.enemyFlashTimer <= 0 && this.enemyShape) {
          this.enemyShape.tint = 0xffffff;
        }
      } else if (this.enemyShape && this.enemyShape.tint !== 0xffffff) {
        this.enemyShape.tint = 0xffffff;
      }
      // Animace částic krve (pokud existují)
      if (this.bloodEffects) {
        for (let i = this.bloodEffects.length - 1; i >= 0; i--) {
          const blood = this.bloodEffects[i];
          blood.x += blood.vx * delta;
          blood.y += blood.vy * delta;
          blood.vy += 0.3 * delta;
          blood.life += 0.03 * delta;
          blood.alpha = Math.max(0, 1 - blood.life * 1.2);
          blood.scale.set(1 + blood.life * 0.6);
          if (blood.alpha <= 0.01 || blood.life > 1.2) {
            this.stage.removeChild(blood);
            this.bloodEffects.splice(i, 1);
          }
        }
      }
      // Animace částic šrotu (např. efekty zbroje, podobné krvi)
      if (this.scrapEffects) {
        for (let i = this.scrapEffects.length - 1; i >= 0; i--) {
          const scrap = this.scrapEffects[i];
          scrap.x += scrap.vx * delta;
          scrap.y += scrap.vy * delta;
          scrap.vy += 0.3 * delta;
          scrap.rotation += 0.05 * delta;
          scrap.life += 0.03 * delta;
          scrap.alpha = Math.max(0, 1 - scrap.life * 1.2);
          scrap.scale.set(1 + scrap.life * 0.6);
          if (scrap.alpha <= 0.01 || scrap.life > 1.2) {
            this.stage.removeChild(scrap);
            this.scrapEffects.splice(i, 1);
          }
        }
      }
      // Zobrazení ikonky hráče bez animací
      if (this.charShape) {
        this.charShape.x = this.playerAvatarX;
        this.charShape.y = this.playerAvatarY;
      }
      // Odstranění sprite zbraně z předchozího kola (aby se překreslil při dalším útoku)
      if (this.playerWeaponSprite) {
        this.battleContainer.removeChild(this.playerWeaponSprite);
        this.playerWeaponSprite.destroy();
        this.playerWeaponSprite = null;
      }
      // Aktualizace efektu útoku hráče (např. letící střela nebo seknutí)
      if (this.attackEffect) {
        this.attackEffectAnimProgress += 0.05 * delta;
        if (char.cls.name === 'Street Samurai') {
          const progress = this.attackEffectAnimProgress;
          this.attackEffect.x = this.charShape.x + 30 + progress * 80;
          this.attackEffect.y = this.charShape.y - 10 - progress * 20;
          this.attackEffect.alpha = 1 - progress;
          this.attackEffect.rotation = -Math.PI / 4 + progress * Math.PI / 2;
        } else if (char.cls.name === 'Netrunner' || char.cls.name === 'Techie') {
          const progress = this.attackEffectAnimProgress;
          this.attackEffect.x = this.charShape.x + 30 + (this.enemyShape.x - this.charShape.x - 30) * progress;
          this.attackEffect.y = this.charShape.y + (this.enemyShape.y - this.charShape.y) * progress;
        }
        if (this.attackEffectAnimProgress >= 1) {
          this.battleContainer.removeChild(this.attackEffect);
          this.attackEffect.destroy();
          this.attackEffect = null;
          this.attackEffectAnimProgress = 0;
        }
      }
      if (this.enemyAttackEffect) {
        this.enemyAttackEffectAnimProgress += 0.05 * delta;
        const progress = this.enemyAttackEffectAnimProgress;
        this.enemyAttackEffect.x = this.enemyShape.x - 30 + (this.charShape.x - this.enemyShape.x + 30) * progress;
        this.enemyAttackEffect.y = this.enemyShape.y + (this.charShape.y - this.enemyShape.y) * progress;
        this.enemyAttackEffect.alpha = 1 - progress;
        if (this.enemyAttackEffectAnimProgress >= 1) {
          this.battleContainer.removeChild(this.enemyAttackEffect);
          this.enemyAttackEffect.destroy();
          this.enemyAttackEffect = null;
          this.enemyAttackEffectAnimProgress = 0;
        }
      }
      if (this.droneAttackEffect) {
        this.droneAttackEffectAnimProgress += 0.05 * delta;
        const progress = this.droneAttackEffectAnimProgress;
        this.droneAttackEffect.x = this.charShape.x + 30 + (this.enemyShape.x - this.charShape.x - 30) * progress;
        this.droneAttackEffect.y = this.charShape.y - 40 + (this.enemyShape.y - this.charShape.y + 40) * progress;
        this.droneAttackEffect.alpha = 1 - progress;
        if (this.droneAttackEffectAnimProgress >= 1) {
          this.battleContainer.removeChild(this.droneAttackEffect);
          this.droneAttackEffect.destroy();
          this.droneAttackEffect = null;
          this.droneAttackEffectAnimProgress = 0;
        }
      }
      if (this.attackZone) {
        this.attackZoneLife += delta / 60;
        this.attackZone.alpha = 1 - this.attackZoneLife * 2;
        if (this.attackZoneLife >= 0.5) {
          this.battleContainer.removeChild(this.attackZone);
          this.attackZone.destroy();
          this.attackZone = null;
          this.attackZoneLife = 0;
        }
      }
      if (this.enemyAttackZone) {
        this.enemyAttackZoneLife += delta / 60;
        this.enemyAttackZone.alpha = 1 - this.enemyAttackZoneLife * 2;
        if (this.enemyAttackZoneLife >= 0.5) {
          this.battleContainer.removeChild(this.enemyAttackZone);
          this.enemyAttackZone.destroy();
          this.enemyAttackZone = null;
          this.enemyAttackZoneLife = 0;
        }
      }
      // Zobrazení ikonky nepřítele bez animací
      if (this.enemyShape) {
        this.enemyShape.x = this.enemyAvatarX;
        this.enemyShape.y = this.enemyAvatarY;
      }
      // Animace všech poletujících textů (postupné stoupání a mizení)
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const text = this.floatingTexts[i];
        text.life += 0.02 * delta;
        text.y = text.initialY - (text.life * 30);
        text.alpha = 1 - text.life;
        text.scale.set(1 + text.life * 0.5);
        if (text.alpha <= 0) {
          this.battleContainer.removeChild(text);
          this.floatingTexts.splice(i, 1);
        }
      }
      // Časovač komba – pokud neútočíme dostatečně rychle, kombo se vynuluje
      if (this.comboCount > 0) {
        this.comboTimer += delta / 60;
        if (this.comboTimer > this.comboTimerMax) {
          this.comboCount = 0;
          this.comboTimer = 0;
        }
      }
      // Battle logic handled by BattleSystem
      if (this.battleStarted) {
        BattleSystem.update(this, delta);
      }
    }
  }
}
