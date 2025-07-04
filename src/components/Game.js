import { Application, Container, Sprite, Text, Graphics, Assets, BlurFilter } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import { BloomFilter } from '@pixi/filter-bloom';
import { DropShadowFilter } from '@pixi/filter-drop-shadow';
import { CRTFilter } from '@pixi/filter-crt';

import { Button } from './Button.js';
import { StatBar } from './StatBar.js';
import { Character } from './Character.js';
import { Enemy } from './Enemy.js';
import { BattleSystem } from './battlesystem.js';
import { Attack } from './Attack.js';

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

function createText(text, style = {}) {
  const { strokeThickness, stroke, ...rest } = style;
  if (strokeThickness !== undefined) {
    rest.stroke = { color: typeof stroke === "number" ? stroke : (stroke ? stroke.color : 0x000000), width: strokeThickness };
  } else if (typeof stroke === "number") {
    rest.stroke = { color: stroke };
  }
  return new Text({ text, style: rest });
}


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
    this.enemyAttackEffect = null;
    this.droneAttackEffect = null;
    this.attackZone = null;
    this.attackZoneLife = 0;
    this.enemyAttackZone = null;
    this.enemyAttackZoneLife = 0;
    this.shopType = 'weapon';
    // Cache nabídek obchodu (předměty k prodeji podle typu)
    this.shopItemsCache = {
      weapon: WEAPON_ITEMS,
      armor: ARMOR_ITEMS
    };
    this.bossesDefeated = 0;
    this.currentBossIndex = 0;
    this.bgDistortFilter = null;
    this.logoSprite = null;
    // Background drone container removed
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboTimerMax = 2.0;
    this.lastAttackWasCombo = false;
    this.shopItemsContainer = null;
    this.shopScrollMask = null;
    this.shopScrollStartY = 0;
    this.shopScrollStartMouseY = 0;
    this.shopScrollPos = 0;
    this.isScrollingShop = false;
    this.playerAttacksWithoutDamage = 0;
    this.scrapEffects = [];
    this.bloodEffects = [];
    this.screenShakeDuration = 0;
    this.screenShakeIntensity = 0;
    this.playerFlashTimer = 0;
    this.enemyFlashTimer = 0;
    this.energyMax = 100;
    this.playerEnergy = this.energyMax;
    this.enemyEnergy = this.energyMax;
    this.energyThreshold = 50;
    this.droneDamage = 5;
    this.overclockTurns = 0;
    this.droneDisabledTurns = 0;
    this.omegaStrikeDelay = 0;
    this.droneCritChance = 0;
    this.autoMedkitActive = false;
    this.guardModeTurns = 0;
    this.holoDecoyActive = false;
    this.criticalLoopActive = false;
    this.criticalLoopUsed = false;
    this.glitchPulseTurns = 0;
    this.glitchPulseDamage = 0;
    this.echoLoopActive = false;
    this.trojanSpikeMult = 0.5;
    this.statHijackTurns = 0;
    this.statHijackAmount = 0;
    this.unrelentingAssaultActive = false;
    this.perfectFocusReady = false;
    this.perfectFocusCritBonus = 0;
    this.ghostStepActive = false;
    this.heartpiercerTurns = 0;
    this.heartpiercerDefTurns = 0;
    this.heartpiercerDefLoss = 0;
    this.lastStandTurns = 0;
    this.lastStandDefLoss = 0;
    this.enemyStunTurns = 0;
    this.playerStunTurns = 0;
    this.playerStatsText = null;
    this.enemyStatsText = null;
    this.abilityButtons = null;
    this.abilityIconContainer = null;
    this.abilityIcons = [];
    this.abilityItemsContainer = null;
    this.abilityScrollMask = null;
    this.abilityScrollPos = 0;
    this.prevState = null;
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
    // Ammo textures for attack effects
    assets.push('/assets/ammo/cyber_attack_ammo.png');
    assets.push('/assets/ammo/samurai_attack_ammo.png');
    assets.push('/assets/ammo/drone_attack_ammo.png');
    assets.push('/assets/ammo/enemy_attack_ammo.png');
    // Přidání obrázků rámečků pro postavy v souboji a ikon schopností
    assets.push('/assets/frame.png');
    assets.push('/assets/frame.png');
    assets.push('/assets/ability_frame.png');
    assets.push('/assets/Logo.png');
    // Načtení všech assetů pomocí Pixi Assets API
    await Assets.load(assets);

    // Initialize attack animations using projectile sprites
    this.attacks = {
      'Netrunner': new Attack({ texture: '/assets/ammo/cyber_attack_ammo.png', speed: 15 }),
      'Street Samurai': new Attack({ texture: '/assets/ammo/samurai_attack_ammo.png', speed: 15 }),
      'Techie': new Attack({ texture: '/assets/ammo/drone_attack_ammo.png', speed: 15 }),
      'Enemy': new Attack({ texture: '/assets/ammo/enemy_attack_ammo.png', speed: 15 })
    };
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
    this.backgroundSprite.filters = [this.bgDistortFilter];

    this.logoSprite = Sprite.from('/assets/Logo.png');
    this.logoSprite.width = 120;
    this.logoSprite.height = 120;
    // place the logo in the top right corner
    this.logoSprite.x = this.app.screen.width - this.logoSprite.width - 10;
    this.logoSprite.y = 10;
    this.logoSprite.zIndex = 10;

    // Background drones removed
  }

  async startBattle() {
    BattleSystem.init(this);
    await this.createBattleUI();
  }



  spawnFloatingText(text, x, y, color = 0xffffff, fontSize = 24, offsetY = 0) {
    // Vytvoření poletujícího textu (např. poškození nebo zprávy) na scéně
    const floatingText = createText(text, {
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
    // lower life increment to keep text on screen a bit longer
    floatingText.scale.set(1);
    floatingText.zIndex = 10;
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
    this.app.canvas.onwheel = null;
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
      const titleText = createText('Choose Your Class', {
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

        const nameText = createText(cls.name, {
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
        descFrame.stroke({ width: 4, color: 0xff00ff, alpha: 1 });
        descFrame.fill({ color: 0x000000, alpha: 0.6 });
        descFrame.roundRect(frameX, frameY, frameWidth, 90, 12);
        descFrame.fill();
        descFrame.stroke();
        descFrame.filters = [new GlowFilter({ distance: 10, outerStrength: 2, innerStrength: 0, color: 0xff00ff })];
        this.stage.addChild(descFrame);

        const descText = createText(this.selectedClass.desc, {
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
        this.shopScrollPos = 0;
        this.initUI();
      });
      this.stage.addChild(shopBtn);

      const settingsBtn = new Button('Settings', this.app.screen.width / 2 - 85, 460, 170, 50, 0x00e0ff);
      settingsBtn.on('pointerdown', () => {
        this.state = 'settings';
        this.initUI();
      });
      this.stage.addChild(settingsBtn);

      const abilitiesBtn = new Button('Abilities', this.app.screen.width / 2 - 85, 530, 170, 50, 0x00e0ff);
      abilitiesBtn.on('pointerdown', () => {
        this.prevState = this.state;
        this.state = 'abilities';
        this.abilityScrollPos = 0;
        this.initUI();
      });
      this.stage.addChild(abilitiesBtn);
      // (Případně další prvky hlavního menu by byly zde)
    } else if (this.state === 'profile') {
      // Screen with detailed player information, avatar and stat upgrades
      const char = this.character;

      // Semi-transparent panel behind profile info
      const panelWidth = this.app.screen.width - 40;
      const panelHeight = 620;
      const panelX = 20;
      const panelY = 90;
      const infoPanel = new Graphics();
      infoPanel.stroke({ width: 4, color: 0xff00ff, alpha: 0.8 });
      infoPanel.fill({ color: 0xffffff, alpha: 0.15 });
      infoPanel.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
      infoPanel.fill();
      infoPanel.stroke();
      infoPanel.filters = [
        new GlowFilter({ distance: 12, outerStrength: 2, innerStrength: 0, color: 0xff00ff }),
        new BlurFilter(8)
      ];
      this.stage.addChild(infoPanel);

      const title = createText('Player Profile', {
        fontFamily: 'Bangers, monospace',
        fontSize: 48,
        fill: 0xff00ff,
        stroke: 0x000000,
        strokeThickness: 5
      });
      title.anchor.set(0.5);
      title.x = this.app.screen.width / 2;
      title.y = 60;
      this.stage.addChild(title);

      const centerX = this.app.screen.width / 2;
      const avatar = Sprite.from(char.avatar);
      avatar.anchor.set(0.5, 0);
      avatar.width = 220;
      avatar.height = 220;
      avatar.x = centerX;
      avatar.y = panelY + 30;
      avatar.filters = [
        char.glowFilter,
        new GlowFilter({ distance: 6, outerStrength: 3, innerStrength: 0, color: 0xffffff })
      ];
      this.stage.addChild(avatar);

      const classText = createText(char.cls.name, {
        fontFamily: 'Bangers, monospace',
        fontSize: 32,
        fill: char.cls.color,
        stroke: 0x000000,
        strokeThickness: 5
      });
      classText.anchor.set(0.5);
      classText.x = centerX;
      classText.y = avatar.y - 20;
      this.stage.addChild(classText);

      const infoX = centerX - 120;
      let infoY = avatar.y + avatar.height + 10;

      const levelText = createText(`Level: ${char.level}`, {
        fontFamily: 'Bangers, monospace',
        fontSize: 28,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 4
      });
      levelText.anchor.set(0.5);
      levelText.x = centerX;
      levelText.y = infoY;
      this.stage.addChild(levelText);
      infoY += 30;

      const levelBar = new StatBar('EXP', char.exp, char.expToNext, centerX - 150, levelText.y + 10, 300, 18, 0x00e0ff);
      this.stage.addChild(levelBar);

      const goldText = createText(`Gold: ${char.gold}`, {
        fontFamily: 'Bangers, monospace',
        fontSize: 26,
        fill: 0xffe000,
        stroke: 0x000000,
        strokeThickness: 4
      });
      goldText.anchor.set(1, 0);
      goldText.x = panelX + panelWidth - 20;
      goldText.y = panelY + 20;
      this.stage.addChild(goldText);

      infoY = levelBar.y + 40;

      const statsWidth = 240;
      const statsBg = new Graphics();
      statsBg.fill({ color: 0x2e3c43, alpha: 0.4 });
      statsBg.roundRect(infoX - 10, infoY - 20, statsWidth, 200, 8);
      statsBg.fill();
      statsBg.filters = [new GlowFilter({ distance: 6, outerStrength: 1, innerStrength: 0, color: 0x00e0ff })];
      this.stage.addChild(statsBg);

      const statHeader = createText(`Stat Points: ${char.statPoints}`, {
        fontFamily: 'Bangers, monospace',
        fontSize: 26,
        fill: 0xffe000,
        stroke: 0x000000,
        strokeThickness: 4
      });
      statHeader.anchor.set(0, 0.5);
      statHeader.x = infoX;
      statHeader.y = infoY;
      this.stage.addChild(statHeader);
      infoY += 30;

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
          label: `DEF: ${char.stats.def} \u223c blocks ${char.stats.def * 5} dmg`
        },
        {
          key: 'spd',
          label: `SPD: ${char.stats.spd} \u223c x${(1 + char.stats.spd * 0.01).toFixed(2)} rewards`
        }
      ];
      let y = statHeader.y + 10;
      const rowSpacing = 50;
      for (const s of statInfo) {
        const statLabel = createText(s.label, {
          fontFamily: 'Bangers, monospace',
          fontSize: 24,
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 4
        });
        statLabel.anchor.set(0, 0.5);
        statLabel.x = infoX;
        statLabel.y = y + 20;
        this.stage.addChild(statLabel);

        const cost = char.statPoints > 0 ? '1 SP' : `${char.statCosts[s.key]}G`;
        const costText = createText(cost, {
          fontFamily: 'Bangers, monospace',
          fontSize: 18,
          fill: 0xcccccc,
          stroke: 0x000000,
          strokeThickness: 3
        });
        costText.anchor.set(1, 0.5);
        costText.x = infoX + 180;
        costText.y = y + 20;
        this.stage.addChild(costText);

        const upBtn = new Button('+', infoX + 190, y, 34, 34, 0x00ff8a);
        upBtn.on('pointerdown', () => {
          char.spendStat(s.key);
          this.initUI();
        });
        this.stage.addChild(upBtn);
        y += rowSpacing;
      }


      const rightX = panelX + panelWidth - 220;
      let rightY = levelBar.y + 20;

      const weaponText = createText(`Weapon: ${char.weapon.name}`, {
        fontFamily: 'Bangers, monospace',
        fontSize: 24,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 4
      });
      weaponText.anchor.set(0, 0.5);
      weaponText.x = rightX;
      weaponText.y = rightY;
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

      rightY += 40;

      const armorText = createText(`Armor: ${char.armor.name}`, {
        fontFamily: 'Bangers, monospace',
        fontSize: 24,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 4
      });
      armorText.anchor.set(0, 0.5);
      armorText.x = rightX;
      armorText.y = rightY;
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

      rightY += 50;
      const skillsBtn = new Button('Skill Tree', rightX, rightY, 170, 50, 0x00e0ff);
      skillsBtn.on('pointerdown', () => {
        this.state = 'skilltree';
        this.initUI();
      });
      this.stage.addChild(skillsBtn);

      rightY += 60;
      const abilitiesBtn = new Button('Abilities', rightX, rightY, 170, 50, 0x00e0ff);
      abilitiesBtn.on('pointerdown', () => {
        this.prevState = this.state;
        this.state = 'abilities';
        this.abilityScrollPos = 0;
        this.initUI();
      });
      this.stage.addChild(abilitiesBtn);

      const backBtn = new Button('Back', 20, this.app.screen.height - 60, 100, 40, 0x222c33);
      backBtn.on('pointerdown', () => {
        this.state = 'mainmenu';
        this.shopScrollPos = 0;
        this.initUI();
      });
        this.stage.addChild(backBtn);
      } else if (this.state === 'skilltree') {
        const title = createText('Skill Tree', {
          fontFamily: 'Bangers, monospace',
          fontSize: 40,
          fill: 0xff00ff,
          stroke: 0x000000,
          strokeThickness: 5
        });
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 60;
        this.stage.addChild(title);

        const info = createText('Skill editor coming soon.', {
          fontFamily: 'Bangers, monospace',
          fontSize: 24,
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 4
        });
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
      } else if (this.state === 'abilities') {
        const title = createText('Abilities', {
          fontFamily: 'Bangers, monospace',
          fontSize: 40,
          fill: 0xff00ff,
          stroke: 0x000000,
          strokeThickness: 5
        });
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 60;
        this.stage.addChild(title);

        const info = createText('Select up to 6 abilities. Basic ability is always active.', {
          fontFamily: 'Bangers, monospace',
          fontSize: 20,
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 4
        });
        info.anchor.set(0.5);
        info.x = this.app.screen.width / 2;
        info.y = 100;
        this.stage.addChild(info);

        const listY = 140;
        const listH = 420;
        const marginX = 60;
        const columnSpacing = 20;
        const columnWidth = (this.app.screen.width - marginX * 2 - columnSpacing) / 2;
        const boxH = 100;
        this.abilityItemsContainer = new Container();
        this.abilityScrollMask = new Graphics();
        this.abilityScrollMask.fill({ color: 0xff0000 });
        this.abilityScrollMask.rect(marginX, listY, this.app.screen.width - marginX * 2, listH);
        this.abilityScrollMask.fill();
        this.abilityItemsContainer.mask = this.abilityScrollMask;
        this.stage.addChild(this.abilityScrollMask, this.abilityItemsContainer);

        const allAbilities = ABILITIES[this.character.cls.name] || [];
        allAbilities.forEach((ab, idx) => {
          const row = Math.floor(idx / 2);
          const col = idx % 2;
          const x = marginX + col * (columnWidth + columnSpacing);
          const y = listY + row * (boxH + 10);

          const owned = this.character.abilities.some(a => a.name === ab.name);
          const abilityObj = this.character.abilities.find(a => a.name === ab.name);
          const inLoadout = abilityObj && this.character.loadout.includes(abilityObj);
          const isBasic = idx === 0;

          const box = new Graphics();
          box.fill({ color: 0x2e3c43 });
          box.roundRect(x, y, columnWidth, boxH, 12);
          box.fill();
          this.abilityItemsContainer.addChild(box);

          if (ABILITY_ASSETS[ab.name]) {
            const icon = Sprite.from(ABILITY_ASSETS[ab.name]);
            icon.width = 64;
            icon.height = 64;
            icon.x = x + 8;
            icon.y = y + 8;
            icon.filters = [new GlowFilter({ distance: 6, outerStrength: 1.5, innerStrength: 0, color: 0xffa500 })];
            this.abilityItemsContainer.addChild(icon);
          }

          const nameText = createText(isBasic ? `${ab.name} (Basic)` : ab.name, { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff });
          nameText.x = x + 80;
          nameText.y = y + 8;
          this.abilityItemsContainer.addChild(nameText);

          const desc = createText(ab.description, { fontFamily: 'monospace', fontSize: 14, fill: 0x00ff8a, wordWrap: true, wordWrapWidth: columnWidth - 90 });
          desc.x = x + 80;
          desc.y = y + 32;
          this.abilityItemsContainer.addChild(desc);

          if (ab.cooldown !== undefined && ab.cooldown > 0) {
            const cdText = createText(`CD: ${ab.cooldown}`, { fontFamily: 'monospace', fontSize: 14, fill: 0xffe000 });
            cdText.x = x + columnWidth - 50;
            cdText.y = y + 8;
            this.abilityItemsContainer.addChild(cdText);
          }

          if (!owned) {
            const priceText = createText(`${ab.price || 0} G`, { fontFamily: 'monospace', fontSize: 14, fill: 0xffe000 });
            priceText.x = x + columnWidth - 120;
            priceText.y = y + boxH - 28;
            this.abilityItemsContainer.addChild(priceText);
          }

          const btnLabel = !owned ? 'Buy' : (isBasic ? 'Basic' : (inLoadout ? 'Remove' : 'Equip'));
          const btnColor = !owned ? 0x00ff8a : (inLoadout ? 0xff2e2e : 0x00ff8a);
          const actionBtn = new Button(btnLabel, x + columnWidth - 70, y + boxH - 34, 60, 28, btnColor);

          if (!owned) {
            actionBtn.on('pointerdown', () => {
              const success = this.character.buyAbility(ab);
              if (success) {
                this.abilityScrollPos = this.abilityItemsContainer.y;
                this.initUI();
              }
            });
          } else if (!isBasic) {
            actionBtn.on('pointerdown', () => {
              if (!abilityObj) return;
              const idxLoad = this.character.loadout.indexOf(abilityObj);
              if (idxLoad >= 0) {
                this.character.loadout.splice(idxLoad, 1);
              } else {
                if (this.character.loadout.length >= 6) return;
                this.character.loadout.push(abilityObj);
              }
              this.abilityScrollPos = this.abilityItemsContainer.y;
              this.initUI();
            });
          } else {
            actionBtn.interactive = false;
            actionBtn.eventMode = 'none';
          }
          this.abilityItemsContainer.addChild(actionBtn);
        });

        {
          const rows = Math.ceil(allAbilities.length / 2);
          const totalItemsHeight = rows * (boxH + 10);
          const maxScrollY = listH - totalItemsHeight;
          this.abilityItemsContainer.y = Math.max(
            maxScrollY,
            Math.min(0, this.abilityScrollPos)
          );
        }

        this.app.canvas.onwheel = (event) => {
          const scrollAmount = event.deltaY * 0.5;
          let newY = this.abilityItemsContainer.y - scrollAmount;
          const rows = Math.ceil(allAbilities.length / 2);
          const totalItemsHeight = rows * (boxH + 10);
          const maxScrollY = listH - totalItemsHeight;
          newY = Math.min(0, newY);
          newY = Math.max(maxScrollY, newY);
          this.abilityItemsContainer.y = newY;
          this.abilityScrollPos = newY;
          event.preventDefault();
        };

        const backBtn = new Button('Back', 20, this.app.screen.height - 60, 100, 40, 0x222c33);
        backBtn.on('pointerdown', () => {
          this.state = this.prevState || 'profile';
          this.prevState = null;
          this.abilityScrollPos = 0;
          this.initUI();
        });
        this.stage.addChild(backBtn);
      } else if (this.state === 'dungeon') {
      // Herní obrazovka Vault 404 – zobrazení nepřítele nebo výzvy k souboji
      const dungeonText = createText(`Vault 404 - Level ${this.dungeonLevel}`, { fontFamily: 'monospace', fontSize: 28, fill: 0xffffff });
      dungeonText.anchor.set(0.5);
      dungeonText.x = this.app.screen.width / 2;
      dungeonText.y = 80;
      this.stage.addChild(dungeonText);
      if (this.message) {
        // Zobrazení případné zprávy (např. po poražení bosse)
        const messageText = createText(this.message, { fontFamily: 'monospace', fontSize: 20, fill: 0xffe000 });
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
        this.shopScrollPos = 0;
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
      const title = createText('Settings', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
      title.anchor.set(0.5);
      title.x = this.app.screen.width / 2;
      title.y = 60;
      this.stage.addChild(title);

      const volumeText = createText(`Volume: ${Math.round(this.musicVolume * 100)}%`, { fontFamily: 'monospace', fontSize: 24, fill: 0xffffff });
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
    const charNameText = createText('ME', { fontFamily: 'monospace', fontSize: 32, fill: 0xffa500, fontWeight: 'bold' });
    charNameText.anchor.set(0.5);
    charNameText.x = this.playerAvatarX - 30;
    charNameText.y = this.playerAvatarY - AVATAR_SIZE / 2 - 30;
    this.battleContainer.addChild(charNameText);
    const playerLevelText = createText(`Lv. ${char.level}`, { fontFamily: 'monospace', fontSize: 24, fill: 0xffffff });
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
    const playerStatsText = createText(`ATK: ${char.stats.atk} | DEF: ${char.stats.def} | SPD: ${char.stats.spd}`,
      { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff });
    playerStatsText.anchor.set(0.5);
    playerStatsText.x = this.playerAvatarX;
    playerStatsText.y = this.playerAvatarY + AVATAR_SIZE / 2 + 75;
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
    const enemyNameText = createText(`${enemy.name} (Lv. ${enemy.level})`, { fontFamily: 'monospace', fontSize: 32, fill: enemy.color, fontWeight: 'bold' });
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
    const enemyStatsText = createText(`ATK: ${enemy.atk} | DEF: ${enemy.def} | SPD: ${enemy.spd}`,
      { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff });
    enemyStatsText.anchor.set(0.5);
    enemyStatsText.x = this.enemyAvatarX;
    enemyStatsText.y = this.enemyAvatarY + AVATAR_SIZE / 2 + 75;
    this.battleContainer.addChild(enemyStatsText);
    this.enemyStatsText = enemyStatsText;
    // Přidání již vytvořených floatingTexts (např. při opakovaném vykreslení)
    this.floatingTexts.forEach(text => this.battleContainer.addChild(text));
    this.renderAbilityIcons();
    // Kontejner pro tlačítka ve spodní části (Continue, apod.)
    const buttonContainer = new Container();
    buttonContainer.x = this.app.screen.width / 2;
    buttonContainer.y = this.app.screen.height - 80;
    buttonContainer.zIndex = 2;
    this.battleContainer.addChild(buttonContainer);
    // Kontrola, zda je boj již rozhodnut
    if (this.battleResult === 'win') {
      // Vítězství
      const winMsg = createText('VICTORY!', { fontFamily: 'monospace', fontSize: 48, fill: 0x00e0ff, fontWeight: 'bold', stroke: 0x000000, strokeThickness: 6 });
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
      const lootText = createText(`+${goldGain} Gold   +${expGain} EXP`, { fontFamily: 'monospace', fontSize: 28, fill: 0xffe000 });
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
      const loseMsg = createText('DEFEAT!', { fontFamily: 'monospace', fontSize: 48, fill: 0xff2e2e, fontWeight: 'bold', stroke: 0x000000, strokeThickness: 6 });
      loseMsg.anchor.set(0.5);
      loseMsg.x = this.app.screen.width / 2;
      loseMsg.y = this.app.screen.height / 2 - 50;
      loseMsg.filters = [
        new GlowFilter({ distance: 15, outerStrength: 2.5, innerStrength: 0, color: 0xff2e2e, quality: 0.5 }),
        new BloomFilter({ threshold: 0.1, bloomScale: 1.8, blur: 10, quality: 0.5 }),
        new DropShadowFilter({ distance: 6, color: 0x000000, alpha: 0.7, blur: 4 })
      ];
      this.battleContainer.addChild(loseMsg);
      const goldLossText = createText(defeatMsg, { fontFamily: 'monospace', fontSize: 28, fill: 0xffe000 });
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
    bg.fill({ color: 0x000000, alpha: 0.6 });
    bg.rect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.fill();
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

      const desc = createText(ab.description, {
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
        const cdText = createText(`CD: ${ab.cooldown}`, {
          fontFamily: 'monospace', fontSize: 14, fill: 0xffe000
        });
        cdText.anchor.set(0.5, 0);
        cdText.x = card.w / 2;
        cdText.y = card.h - 42;
        card.addChild(cdText);
      }

      if (ab.cost !== undefined) {
        const costText = createText(`Cost: ${ab.cost}`, {
          fontFamily: 'monospace', fontSize: 14, fill: 0xffe000
        });
        costText.anchor.set(0.5, 0);
        costText.x = card.w / 2;
        costText.y = card.h - 60;
        card.addChild(costText);
      }

      if (typeof ab.getDamage === 'function') {
        const approx = ab.getDamage(this);
        const dmgText = createText(`DMG: ~${approx}`, {
          fontFamily: 'monospace', fontSize: 14, fill: 0xffe000
        });
        dmgText.anchor.set(0.5, 0);
        dmgText.x = card.w / 2;
        dmgText.y = card.h - 24;
        card.addChild(dmgText);
      } else if (ab.damage) {
        const dmgText = createText(`DMG: ${ab.damage}`, {
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

      const notEnough = (ab.cost || 0) > this.playerEnergy;
      if (notEnough) {
        card.g.tint = 0x777777;
        card.interactive = false;
        card.eventMode = 'none';
      }
      overlay.addChild(card);
    });
    this.battleContainer.addChild(overlay);
    this.abilityButtons = overlay;
  }

  renderAbilityIcons() {
    if (!this.battleContainer) return;
    if (this.abilityIconContainer) {
      this.battleContainer.removeChild(this.abilityIconContainer);
      this.abilityIconContainer.destroy({ children: true });
      this.abilityIconContainer = null;
      this.abilityIcons = [];
    }
    const container = new Container();
    container.x = 20;
    container.y = 20;
    container.zIndex = 2;
    const size = 112; // frame size
    const spacing = 2; // reduced distance between frames
    const maxRows = 6; // keep at most six per column
    (this.character.loadout || []).forEach((ab, idx) => {
      const abContainer = new Container();
      const column = Math.floor(idx / maxRows);
      const row = idx % maxRows;
      abContainer.x = column * (size + spacing);
      abContainer.y = row * (size + spacing);
      const frame = Sprite.from('/assets/ability_frame.png');
      frame.width = size;
      frame.height = size;
      frame.anchor.set(0.5);
      frame.x = size / 2;
      frame.y = size / 2;
      abContainer.addChild(frame);
      if (ABILITY_ASSETS[ab.name]) {
        const icon = Sprite.from(ABILITY_ASSETS[ab.name]);
        // icon is 20% smaller than its frame
        icon.width = size * 0.8;
        icon.height = size * 0.8;
        icon.anchor.set(0.5);
        icon.x = size / 2;
        icon.y = size / 2;
        abContainer.addChild(icon);
        this.abilityIcons.push({ ability: ab, icon });
      } else {
        this.abilityIcons.push({ ability: ab, icon: null });
      }
      const cdLabel = createText('CD', { fontFamily: 'monospace', fontSize: 14, fill: 0xffffff });
      cdLabel.anchor.set(0.5);
      cdLabel.x = size * 0.75; // moved further right
      cdLabel.y = size * 0.65;
      abContainer.addChild(cdLabel);

      const cdValue = createText(String(ab.cooldownRemaining || 0), {
        fontFamily: 'monospace', fontSize: 14, fill: 0xffffff
      });
      cdValue.anchor.set(0.5);
      cdValue.x = size * 0.75;
      cdValue.y = size * 0.85;
      abContainer.addChild(cdValue);

      this.abilityIcons[this.abilityIcons.length - 1].cd = cdLabel;
      this.abilityIcons[this.abilityIcons.length - 1].cdValue = cdValue;
      container.addChild(abContainer);
    });
    this.abilityIconContainer = container;
    this.battleContainer.addChild(container);
    this.updateAbilityIcons();
  }

  updateAbilityIcons() {
    if (!this.abilityIcons) return;
    this.abilityIcons.forEach(({ ability, icon, cd, cdValue }) => {
      const onCd = ability.cooldownRemaining && ability.cooldownRemaining > 0;
      if (icon) icon.tint = onCd ? 0x777777 : 0xffffff;
      if (cd) cd.visible = onCd;
      if (cdValue) {
        cdValue.visible = onCd;
        cdValue.text = String(ability.cooldownRemaining || 0);
      }
    });
  }

  createShopUI() {
    // (Základní implementace UI obchodu – zobrazení seznamu zbraní či zbrojí k prodeji)
    const shopTitle = createText('Market', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
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
    weaponsTab.on('pointerdown', () => {
      this.shopType = 'weapon';
      this.shopScrollPos = 0;
      this.initUI();
    });
    armorsTab.on('pointerdown', () => {
      this.shopType = 'armor';
      this.shopScrollPos = 0;
      this.initUI();
    });
    this.stage.addChild(weaponsTab, armorsTab);
    // Vykreslení seznamu položek obchodu
    this.shopItemsContainer = new Container();
    const shopMaskY = 120;
    const shopMaskH = 400;
    // Maska pro posuvnou oblast položek (aby seznam nepřetékal)
    this.shopScrollMask = new Graphics();
    this.shopScrollMask.fill({ color: 0xff0000 });
    this.shopScrollMask.rect(startX, shopMaskY, shopWidth, shopMaskH);
    this.shopScrollMask.fill();
    this.shopItemsContainer.mask = this.shopScrollMask;
    this.stage.addChild(this.shopScrollMask, this.shopItemsContainer);
    // Seznam položek k zobrazení (podle zvolené záložky)
    const itemsToShow = this.shopItemsCache[this.shopType];
    let y = 0;
    for (const itemTemplate of itemsToShow) {
      // Podklad pro jednu položku
      const itemBox = new Graphics();
      itemBox.fill({ color: 0x2e3c43 });
      itemBox.roundRect(startX, y + shopMaskY, shopWidth, 80, 14);
      itemBox.fill();
      this.shopItemsContainer.addChild(itemBox);
      // Obrázek položky (pokud existuje v assetech)
      if (ITEM_ASSETS[itemTemplate.name]) {
        const itemSprite = Sprite.from(ITEM_ASSETS[itemTemplate.name]);
        itemSprite.width = 72;
        itemSprite.height = 72;
        itemSprite.x = startX + 12;
        itemSprite.y = y + shopMaskY + 4;
        itemSprite.filters = [new GlowFilter({ distance: 8, outerStrength: 1.5, innerStrength: 0, color: 0xffa500 })];
        this.shopItemsContainer.addChild(itemSprite);
      }
      // Název položky
      const itemNameText = createText(itemTemplate.name, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
      itemNameText.x = startX + 80;
      itemNameText.y = y + shopMaskY + 10;
      this.shopItemsContainer.addChild(itemNameText);
      {
        const statValue = this.shopType === 'weapon'
          ? this.character.getWeaponStat(itemTemplate, this.character.level)
          : this.character.getArmorStat(itemTemplate, this.character.level);
        const statLabel = this.shopType === 'weapon' ? 'ATK' : 'HP';
        const statText = createText(`${statLabel}: ${statValue}`, { fontFamily: 'monospace', fontSize: 18, fill: 0x00ff8a });
        statText.x = startX + 80;
        statText.y = y + shopMaskY + 40;
        this.shopItemsContainer.addChild(statText);
      }
      // Cena
      const priceVal = itemTemplate.baseCost;
      const priceText = createText(`${priceVal} G`, { fontFamily: 'monospace', fontSize: 18, fill: 0xffe000 });
      priceText.x = startX + shopWidth - 140;
      priceText.y = y + shopMaskY + 20;
      this.shopItemsContainer.addChild(priceText);
      // Kontrola, zda již hráč položku vlastní
      let owned = false;
      if (this.shopType === 'weapon') {
        owned = this.character.inventory.weapons.some(i => i.name === itemTemplate.name);
      } else if (this.shopType === 'armor') {
        owned = this.character.inventory.armors.some(i => i.name === itemTemplate.name);
      }

      // Tlačítko nákupu nebo informace o vlastnictví
      const btnLabel = owned ? 'Owned' : 'Buy';
      const btnColor = owned ? 0x555555 : 0x00ff8a;
      const buyBtn = new Button(btnLabel, startX + shopWidth - 70, y + shopMaskY + 24, 60, 36, btnColor);

      if (!owned) {
        buyBtn.on('pointerdown', () => {
          // Pokus o koupi předmětu
          const success = this.character.buyItem(itemTemplate, this.shopType === 'weapon' ? 'weapon' : 'armor');
          if (success) {
            this.shopScrollPos = this.shopItemsContainer.y;
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
    const totalItemsHeight = itemsToShow.length * 100;
    const maxScrollY = shopMaskH - totalItemsHeight;
    this.shopItemsContainer.y = Math.max(maxScrollY, Math.min(0, this.shopScrollPos));
    // Posuv myšovým kolečkem v obchodě
    this.app.canvas.onwheel = (event) => {
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
        this.shopScrollPos = 0;
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
      if (this.attackEffect._update) {
        this.app.ticker.remove(this.attackEffect._update);
      }
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.attackEffect);
      } else {
        this.stage.removeChild(this.attackEffect);
      }
      this.attackEffect.destroy();
      this.attackEffect = null;
    }
    if (this.enemyAttackEffect) {
      if (this.enemyAttackEffect._update) {
        this.app.ticker.remove(this.enemyAttackEffect._update);
      }
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.enemyAttackEffect);
      } else {
        this.stage.removeChild(this.enemyAttackEffect);
      }
      this.enemyAttackEffect.destroy();
      this.enemyAttackEffect = null;
    }
    if (this.droneAttackEffect) {
      if (this.droneAttackEffect._update) {
        this.app.ticker.remove(this.droneAttackEffect._update);
      }
      if (this.battleContainer) {
        this.battleContainer.removeChild(this.droneAttackEffect);
      } else {
        this.stage.removeChild(this.droneAttackEffect);
      }
      this.droneAttackEffect.destroy();
      this.droneAttackEffect = null;
    }
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
    if (this.abilityIconContainer) {
      this.stage.removeChild(this.abilityIconContainer);
      this.abilityIconContainer.destroy({ children: true });
      this.abilityIconContainer = null;
      this.abilityIcons = [];
    }
    if (this.abilityItemsContainer) {
      this.stage.removeChild(this.abilityItemsContainer);
      this.abilityItemsContainer.destroy({ children: true });
      this.abilityItemsContainer = null;
    }
    if (this.abilityScrollMask) {
      this.stage.removeChild(this.abilityScrollMask);
      this.abilityScrollMask.destroy();
      this.abilityScrollMask = null;
    }
    this.playerEnergy = 0;
    this.enemyEnergy = 0;
    this.droneDamage = 5;
    this.overclockTurns = 0;
    this.droneDisabledTurns = 0;
    this.omegaStrikeDelay = 0;
    this.autoMedkitActive = false;
    this.guardModeTurns = 0;
    this.holoDecoyActive = false;
    this.criticalLoopActive = false;
    this.criticalLoopUsed = false;
    this.glitchPulseTurns = 0;
    this.glitchPulseDamage = 0;
    this.echoLoopActive = false;
    this.trojanSpikeMult = 0.5;
    this.statHijackTurns = 0;
    this.statHijackAmount = 0;
    this.unrelentingAssaultActive = false;
    this.perfectFocusReady = false;
    this.perfectFocusCritBonus = 0;
    this.ghostStepActive = false;
    this.heartpiercerTurns = 0;
    this.heartpiercerDefTurns = 0;
    this.heartpiercerDefLoss = 0;
    this.lastStandTurns = 0;
    this.lastStandDefLoss = 0;
    this.enemyStunTurns = 0;
    this.playerStunTurns = 0;
    if (this.character) {
      this.character.updateStats();
    }
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
    // No glitch animation or background drones
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
      this.updateAbilityIcons();
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
      // Attack effects are updated by the PIXI ticker and removed automatically
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
        // Slow down fade so damage numbers remain visible longer
        text.life += 0.01 * delta;
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
