import * as PIXI from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import { BloomFilter } from '@pixi/filter-bloom';
import { DropShadowFilter } from '@pixi/filter-drop-shadow';
import { CRTFilter } from '@pixi/filter-crt';
import { BlurFilter } from 'pixi.js';

import { Button } from './Button.js';
import { StatBar } from './StatBar.js';
import { Character } from './Character.js';
import { Enemy } from './Enemy.js';
import { BattleSystem } from './BattleSystem.js';

import { CLASSES } from '../data/classes.js';
import { DUNGEON_ENEMIES } from '../data/dungeonEnemies.js';
import { WEAPON_ITEMS } from '../data/weaponItems.js';
import { ARMOR_ITEMS } from '../data/armorItems.js';
import { ITEM_ASSETS } from '../data/itemAssets.js';
import { ENEMY_ASSETS } from '../data/enemyAssets.js';
import { BOSS_ENEMIES } from '../data/bossEnemies.js';

export class Game {
  constructor(app) {
    // Uložení reference na PIXI.Application
    this.app = app;
    // Vytvoření hlavního kontejneru hry a přidání do scény aplikace
    this.stage = new PIXI.Container();
    this.app.stage.addChild(this.stage);
    // Výchozí stav hry a základní proměnné
    this.state = 'loading';
    this.classIdx = 0;
    this.selectedClass = CLASSES[this.classIdx];
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
    this.autoBattleTimer = 0;
    this.autoBattleDelay = 0.01;
    this.playerWeaponSprite = null;
    this.attackEffect = null;
    this.attackEffectAnimProgress = 0;
    this.shopType = 'weapon';
    // Cache nabídek obchodu (předměty k prodeji podle typu)
    this.shopItemsCache = {
      weapon: WEAPON_ITEMS,
      armor: ARMOR_ITEMS
    };
    this.bossesDefeated = 0;
    this.currentBossIndex = 0;
    this.bgDistortFilter = null;
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
    // Načtení všech assetů (obrázků) a po dokončení přechod na obrazovku výběru postavy
    this.loadAssets().then(() => {
      this.state = 'charcreate';
      this.initUI();
    });
  }

  async loadAssets() {
    // Sestavení pole URL všech obrázků, které je třeba načíst
    const assets = CLASSES.map(c => c.texture);
    // Přidání pozadí dungeonu a všech item/enemy assetů
    assets.push('/assets/background.jpg');
    Object.values(ITEM_ASSETS).forEach(url => assets.push(url));
    Object.values(ENEMY_ASSETS).forEach(url => assets.push(url));
    BOSS_ENEMIES.forEach(boss => { if (boss.texture) assets.push(boss.texture); });
    // Přidání obrázků rámečků pro postavy v souboji
    assets.push('/assets/avatar background.jpg');
    assets.push('/assets/avatar background.jpg');
    // Načtení všech assetů pomocí Pixi Assets API
    await PIXI.Assets.load(assets);
    // Vytvoření sprite pro pozadí hry a aplikace CRT filtru (zkreslení obrazu)
    this.backgroundSprite = PIXI.Sprite.from('/assets/background.jpg');
    this.backgroundSprite.width = this.app.screen.width;
    this.backgroundSprite.height = this.app.screen.height;
    this.bgDistortFilter = new CRTFilter({
      curvature: 2, lineWidth: 0, lineContrast: 0,
      noise: 0.08, noiseSize: 2,
      vignetting: 0.18, vignettingAlpha: 0.38, vignettingBlur: 0.3,
      seed: Math.random()
    });
    this.bgDistortFilter.time = 0;
    this.backgroundSprite.filters = [this.bgDistortFilter];
  }

  spawnFloatingText(text, x, y, color = 0xffffff, fontSize = 24, offsetY = 0) {
    // Vytvoření poletujícího textu (např. poškození nebo zprávy) na scéně
    const floatingText = new PIXI.Text(text, {
      fontFamily: 'monospace', fontSize: fontSize, fill: color,
      fontWeight: 'bold', stroke: 0x000000, strokeThickness: 4
    });
    floatingText.anchor.set(0.5);
    floatingText.x = x;
    floatingText.y = y + offsetY;
    floatingText.initialY = y + offsetY;
    floatingText.alpha = 1;
    floatingText.life = 0;
    floatingText.scale.set(1);
    this.floatingTexts.push(floatingText);
    this.stage.addChild(floatingText);
  }

  // ... (další metody Game: initUI(), createBattleUI(), createShopUI(), aj., viz níže) ...

  initUI() {
    // Inicializace nebo obnova uživatelského rozhraní podle aktuálního stavu hry
    this.ui = {};
    this.stage.removeChildren();
    this.resetBattleState();
    // Odpojení posuvu myší (např. z obchodu)
    this.app.view.onwheel = null;
    // Přidání pozadí (pokud již bylo načteno)
    if (!this.backgroundSprite) {
      // Ještě nejsou načtena potřebná assety, UI nelze inicializovat
      return;
    }
    this.stage.addChild(this.backgroundSprite);
    if (this.state === 'charcreate') {
      // Screen for selecting a character class
      const titleText = new PIXI.Text('Choose Your Class', {
        fontFamily: 'monospace', fontSize: 28, fill: 0xffffff
      });
      titleText.anchor.set(0.5);
      titleText.x = this.app.screen.width / 2;
      titleText.y = 60;
      this.stage.addChild(titleText);

      // Render all available classes side by side
      const gap = this.app.screen.width / 4;
      CLASSES.forEach((cls, i) => {
        const avatar = PIXI.Sprite.from(cls.texture);
        avatar.anchor.set(0.5);
        avatar.width = 100;
        avatar.height = 100;
        avatar.x = gap * (i + 1);
        avatar.y = 230;
        const glow = new GlowFilter({
          distance: 15,
          outerStrength: i === this.classIdx ? 5 : 1.5,
          innerStrength: 0,
          color: cls.color
        });
        avatar.filters = [glow];
        avatar.scale.set(i === this.classIdx ? 1.2 : 1);
        avatar.interactive = true;
        avatar.buttonMode = true;
        avatar.on('pointerdown', () => {
          this.classIdx = i;
          this.selectedClass = cls;
          this.initUI();
        });

        const infoBox = new PIXI.Container();
        const infoBg = new PIXI.Graphics();
        infoBg.beginFill(0x000000, 0.8);
        infoBg.drawRoundedRect(-70, -60, 140, 70, 8);
        infoBg.endFill();
        infoBox.addChild(infoBg);
        const infoText = new PIXI.Text(`HP: ${cls.hp}\nATK: ${cls.atk}\nDEF: ${cls.def}\nSPD: ${cls.spd}`, {
          fontFamily: 'monospace', fontSize: 14, fill: 0xffffff
        });
        infoText.anchor.set(0.5);
        infoBox.addChild(infoText);
        infoBox.x = avatar.x;
        infoBox.y = avatar.y - 70;
        infoBox.visible = false;
        this.stage.addChild(infoBox);

        avatar.on('pointerover', () => { infoBox.visible = true; });
        avatar.on('pointerout', () => { infoBox.visible = false; });

        this.stage.addChild(avatar);

        const nameText = new PIXI.Text(cls.name, {
          fontFamily: 'monospace', fontSize: 20, fill: cls.color
        });
        nameText.anchor.set(0.5);
        nameText.x = avatar.x;
        nameText.y = avatar.y + 80;
        this.stage.addChild(nameText);
      });

      // Start Game button
      const startBtn = new Button('Start Game', this.app.screen.width / 2 - 85, 420, 170, 50, 0x00e0ff);
      startBtn.on('pointerdown', () => {
        // Vytvoření hráčovy postavy a přechod do hlavního menu hry
        this.character = new Character(this.selectedClass);
        this.state = 'mainmenu';
        this.initUI();
      });
      this.stage.addChild(startBtn);
    } else if (this.state === 'mainmenu') {
      // Hlavní menu se třemi tlačítky
      const dungeonBtn = new Button('Dungeon', this.app.screen.width / 2 - 85, 250, 170, 50, 0xff2e2e);
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

      const shopBtn = new Button('Shop', this.app.screen.width / 2 - 85, 390, 170, 50, 0x00e0ff);
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
      // Screen with detailed player information and stat upgrades
      const char = this.character;
      const title = new PIXI.Text('Player Profile', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
      title.anchor.set(0.5);
      title.x = this.app.screen.width / 2;
      title.y = 60;
      this.stage.addChild(title);

      const classText = new PIXI.Text(`Class: ${char.cls.name}`, { fontFamily: 'monospace', fontSize: 22, fill: 0xffffff });
      classText.anchor.set(0.5);
      classText.x = this.app.screen.width / 2;
      classText.y = 110;
      this.stage.addChild(classText);

      const levelText = new PIXI.Text(`Level: ${char.level}`, { fontFamily: 'monospace', fontSize: 22, fill: 0xffffff });
      levelText.anchor.set(0.5);
      levelText.x = this.app.screen.width / 2;
      levelText.y = 140;
      this.stage.addChild(levelText);

      const statHeader = new PIXI.Text(`Stat Points: ${char.statPoints}`, { fontFamily: 'monospace', fontSize: 20, fill: 0xffe000 });
      statHeader.anchor.set(0.5);
      statHeader.x = this.app.screen.width / 2;
      statHeader.y = 175;
      this.stage.addChild(statHeader);

      const statInfo = [
        { key: 'hp', label: `HP: ${char.hp}/${char.maxHp}` },
        { key: 'atk', label: `ATK: ${char.stats.atk}` },
        { key: 'def', label: `DEF: ${char.stats.def}` },
        { key: 'spd', label: `SPD: ${char.stats.spd}` }
      ];
      let y = 210;
      for (const s of statInfo) {
        const statLabel = new PIXI.Text(s.label, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
        statLabel.anchor.set(0, 0.5);
        statLabel.x = this.app.screen.width / 2 - 90;
        statLabel.y = y + 20;
        this.stage.addChild(statLabel);

        const cost = char.statPoints > 0 ? '1 SP' : `${char.statCosts[s.key]}G`;
        const costText = new PIXI.Text(cost, { fontFamily: 'monospace', fontSize: 14, fill: 0xcccccc });
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

      const goldText = new PIXI.Text(`Gold: ${char.gold}`, { fontFamily: 'monospace', fontSize: 20, fill: 0xffe000 });
      goldText.anchor.set(0.5);
      goldText.x = this.app.screen.width / 2;
      goldText.y = y + 10;
      this.stage.addChild(goldText);

      const weaponText = new PIXI.Text(`Weapon: ${char.weapon.name}`, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
      weaponText.anchor.set(0.5);
      weaponText.x = this.app.screen.width / 2;
      weaponText.y = y + 40;
      this.stage.addChild(weaponText);

      const armorText = new PIXI.Text(`Armor: ${char.armor.name}`, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
      armorText.anchor.set(0.5);
      armorText.x = this.app.screen.width / 2;
      armorText.y = y + 70;
      this.stage.addChild(armorText);

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
        const title = new PIXI.Text('Skill Tree', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 60;
        this.stage.addChild(title);

        const info = new PIXI.Text('Skill editor coming soon.', { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
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
      // Herní obrazovka dungeonu – zobrazení nepřítele nebo výzvy k souboji
      const dungeonText = new PIXI.Text(`Dungeon Level ${this.dungeonLevel}`, { fontFamily: 'monospace', fontSize: 28, fill: 0xffffff });
      dungeonText.anchor.set(0.5);
      dungeonText.x = this.app.screen.width / 2;
      dungeonText.y = 80;
      this.stage.addChild(dungeonText);
      if (this.message) {
        // Zobrazení případné zprávy (např. po poražení bosse)
        const messageText = new PIXI.Text(this.message, { fontFamily: 'monospace', fontSize: 20, fill: 0xffe000 });
        messageText.anchor.set(0.5);
        messageText.x = this.app.screen.width / 2;
        messageText.y = 120;
        this.stage.addChild(messageText);
        this.message = ''; // zprávu zobrazíme jen jednou
      }
      // Tlačítko "Battle Enemy" pro zahájení souboje s náhodným nepřítelem
      const battleBtn = new Button('Battle Enemy', this.app.screen.width / 2 - 105, 300, 210, 60, 0xff2e2e);
      battleBtn.on('pointerdown', () => {
        // Vybrání náhodného nepřítele ze seznamu pro daný dungeon level
        const randomEnemyTemplate = DUNGEON_ENEMIES[Math.floor(Math.random() * DUNGEON_ENEMIES.length)];
        this.enemy = new Enemy(randomEnemyTemplate, this.character.level, false, this.character);
        // Přechod do stavu boje a nastavení hráčova tahu na začátek
        this.battleTurn = 'player';
        this.resetBattleState();
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
        this.state = 'battle';
        this.initUI();
      });
      this.stage.addChild(bossBtn);
      // Tlačítko "Shop" pro otevření obchodu
      const shopBtn = new Button('Shop', this.app.screen.width / 2 - 55, 460, 110, 50, 0x00e0ff);
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
    } else if (this.state === 'battle') {
      // Stav boje – inicializace bojového UI
      this.createBattleUI();
      // Pokud je na tahu hráč a nikdo zrovna neútočí, spustí se odpočet pro automatický útok (auto-battle)
      if (this.battleTurn === 'player' && !this.playerAttacking && !this.enemyAttacking && this.character.hp > 0 && this.enemy.hp > 0) {
        this.autoBattleTimer = this.autoBattleDelay;
      }
    } else if (this.state === 'shop') {
      // Zobrazení nabídky obchodu (zbraně/zbroje)
      this.createShopUI();
    } else if (this.state === 'settings') {
      const title = new PIXI.Text('Settings', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
      title.anchor.set(0.5);
      title.x = this.app.screen.width / 2;
      title.y = 60;
      this.stage.addChild(title);

      const fsBtn = new Button('Toggle Fullscreen', this.app.screen.width / 2 - 120, 200, 240, 50, 0x00e0ff);
      fsBtn.on('pointerdown', () => { this.toggleFullscreen(); });
      this.stage.addChild(fsBtn);

      const backBtn = new Button('Back', 20, this.app.screen.height - 60, 100, 40, 0x222c33);
      backBtn.on('pointerdown', () => { this.state = 'mainmenu'; this.initUI(); });
      this.stage.addChild(backBtn);
    }
  }

  createBattleUI() {
    const enemy = this.enemy;
    const char = this.character;
    // Kontejner pro prvky boje
    this.battleContainer = new PIXI.Container();
    this.stage.addChild(this.battleContainer);
    // Pozice avatarů hráče a nepřítele
    const AVATAR_SIZE = 280;
    const AVATAR_BG_SIZE = AVATAR_SIZE + 20;
    this.playerAvatarX = this.app.screen.width / 4;
    this.playerAvatarY = this.app.screen.height / 2 - 50;
    this.enemyAvatarX = this.app.screen.width * 3 / 4;
    this.enemyAvatarY = this.app.screen.height / 2 - 50;
    // Rámečky pod avátory (s efekty)
    const playerBgSprite = PIXI.Sprite.from('/assets/avatar background.jpg');
    playerBgSprite.width = AVATAR_BG_SIZE;
    playerBgSprite.height = AVATAR_BG_SIZE;
    playerBgSprite.anchor.set(0.5);
    playerBgSprite.x = this.playerAvatarX;
    playerBgSprite.y = this.playerAvatarY;
    playerBgSprite.filters = [
      new GlowFilter({ distance: 15, outerStrength: 1, innerStrength: 0, color: 0xffa500, quality: 0.5 }),
      new DropShadowFilter({ distance: 0, blur: 8, color: 0x000000, alpha: 0.5 })
    ];
    this.battleContainer.addChild(playerBgSprite);
    const charAvatar = PIXI.Sprite.from(char.cls.texture);
    charAvatar.width = AVATAR_SIZE;
    charAvatar.height = AVATAR_SIZE;
    charAvatar.anchor.set(0.5);
    this.charShape = charAvatar;
    charAvatar.x = this.playerAvatarX;
    charAvatar.y = this.playerAvatarY;
    // Filtry pro hráčův avatar (záře, bloom, stín)
    charAvatar.filters = [
      new GlowFilter({ distance: 22, outerStrength: 3, innerStrength: 0, color: char.cls.color, quality: 0.5 }),
      new BloomFilter({ threshold: 0.18, bloomScale: 2.2, blur: 13, quality: 0.5 }),
      new DropShadowFilter({ distance: 0, blur: 12, color: 0x000000, alpha: 0.7 })
    ];
    this.battleContainer.addChild(charAvatar);
    // Popisek a úroveň hráče
    const charNameText = new PIXI.Text('ME', { fontFamily: 'monospace', fontSize: 32, fill: 0xffa500, fontWeight: 'bold' });
    charNameText.anchor.set(0.5);
    charNameText.x = this.playerAvatarX - 30;
    charNameText.y = this.playerAvatarY - AVATAR_SIZE / 2 - 30;
    this.battleContainer.addChild(charNameText);
    const playerLevelText = new PIXI.Text(`Lv. ${char.level}`, { fontFamily: 'monospace', fontSize: 24, fill: 0xffffff });
    playerLevelText.anchor.set(0.5);
    playerLevelText.x = charNameText.x + charNameText.width / 2 + 30;
    playerLevelText.y = charNameText.y;
    this.battleContainer.addChild(playerLevelText);
    // HP bar hráče
    this.charHpBar = new StatBar('HP', char.hp, char.maxHp, this.playerAvatarX - 100, this.playerAvatarY + AVATAR_SIZE / 2 + 20, 200, 24, 0xffa500);
    this.battleContainer.addChild(this.charHpBar);
    // Text s hráčovými staty (ATK, DEF, SPD)
    const playerStatsText = new PIXI.Text(`ATK: ${char.stats.atk} | DEF: ${char.stats.def} | SPD: ${char.stats.spd}`,
      { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff });
    playerStatsText.anchor.set(0.5);
    playerStatsText.x = this.playerAvatarX;
    playerStatsText.y = this.playerAvatarY + AVATAR_SIZE / 2 + 60;
    this.battleContainer.addChild(playerStatsText);
    // Rámeček pro nepřítele
    const enemyBgSprite = PIXI.Sprite.from('/assets/avatar background.jpg');
    enemyBgSprite.width = AVATAR_BG_SIZE;
    enemyBgSprite.height = AVATAR_BG_SIZE;
    enemyBgSprite.anchor.set(0.5);
    enemyBgSprite.x = this.enemyAvatarX;
    enemyBgSprite.y = this.enemyAvatarY;
    enemyBgSprite.filters = [
      new GlowFilter({ distance: 15, outerStrength: 1, innerStrength: 0, color: 0xff2e2e, quality: 0.5 }),
      new DropShadowFilter({ distance: 0, blur: 8, color: 0x000000, alpha: 0.5 })
    ];
    this.battleContainer.addChild(enemyBgSprite);
    // Sprite nepřítele (obrázek buď specifický pro bosse, nebo obecný z ENEMY_ASSETS)
    const enemyTexture = (enemy.isBoss && enemy.texture) ? enemy.texture : (ENEMY_ASSETS[enemy.name] || ENEMY_ASSETS['Gang Thug']);
    const enemySprite = PIXI.Sprite.from(enemyTexture);
    enemySprite.width = AVATAR_SIZE;
    enemySprite.height = AVATAR_SIZE;
    enemySprite.anchor.set(0.5);
    this.enemyShape = enemySprite;
    enemySprite.x = this.enemyAvatarX;
    enemySprite.y = this.enemyAvatarY;
    // Filtry pro nepřátelský avatar (záře, bloom, stín)
    enemySprite.filters = [
      new GlowFilter({ distance: 25, outerStrength: 4, innerStrength: 0, color: enemy.color, quality: 0.5 }),
      new BloomFilter({ threshold: 0.2, bloomScale: 2.5, blur: 18, quality: 0.5 }),
      new DropShadowFilter({ distance: 0, blur: 16, color: 0x000000, alpha: 0.7 })
    ];
    this.battleContainer.addChild(enemySprite);
    // Popisek nepřítele (jméno a úroveň)
    const enemyNameText = new PIXI.Text(`${enemy.name} (Lv. ${enemy.level})`, { fontFamily: 'monospace', fontSize: 32, fill: enemy.color, fontWeight: 'bold' });
    enemyNameText.anchor.set(0.5);
    enemyNameText.x = this.enemyAvatarX;
    enemyNameText.y = this.enemyAvatarY - AVATAR_SIZE / 2 - 30;
    this.battleContainer.addChild(enemyNameText);
    // HP bar nepřítele
    this.enemyHpBar = new StatBar('HP', enemy.hp, enemy.maxHp, this.enemyAvatarX - 100, this.enemyAvatarY + AVATAR_SIZE / 2 + 20, 200, 24, 0xff2e2e);
    this.battleContainer.addChild(this.enemyHpBar);
    // Text se staty nepřítele
    const enemyStatsText = new PIXI.Text(`ATK: ${enemy.atk} | DEF: ${enemy.def} | SPD: ${enemy.spd}`,
      { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff });
    enemyStatsText.anchor.set(0.5);
    enemyStatsText.x = this.enemyAvatarX;
    enemyStatsText.y = this.enemyAvatarY + AVATAR_SIZE / 2 + 60;
    this.battleContainer.addChild(enemyStatsText);
    // Přidání již vytvořených floatingTexts (např. při opakovaném vykreslení)
    this.floatingTexts.forEach(text => this.battleContainer.addChild(text));
    // Kontejner pro tlačítka ve spodní části (Continue, apod.)
    const buttonContainer = new PIXI.Container();
    buttonContainer.x = this.app.screen.width / 2;
    buttonContainer.y = this.app.screen.height - 80;
    this.battleContainer.addChild(buttonContainer);
    // Kontrola, zda je boj již rozhodnut (enemy.hp <= 0 nebo char.hp <= 0)
    if (enemy.hp <= 0) {
      // Vítězství
      const winMsg = new PIXI.Text('VICTORY!', { fontFamily: 'monospace', fontSize: 48, fill: 0x00e0ff, fontWeight: 'bold', stroke: 0x000000, strokeThickness: 6 });
      winMsg.anchor.set(0.5);
      winMsg.x = this.app.screen.width / 2;
      winMsg.y = this.app.screen.height / 2 - 50;
      winMsg.filters = [
        new GlowFilter({ distance: 15, outerStrength: 2.5, innerStrength: 0, color: 0x00e0ff, quality: 0.5 }),
        new BloomFilter({ threshold: 0.1, bloomScale: 1.8, blur: 10, quality: 0.5 }),
        new DropShadowFilter({ distance: 6, color: 0x000000, alpha: 0.7, blur: 4 })
      ];
      this.battleContainer.addChild(winMsg);
      const lootText = new PIXI.Text(`+${enemy.gold} Gold   +${enemy.exp} EXP`, { fontFamily: 'monospace', fontSize: 28, fill: 0xffe000 });
      lootText.anchor.set(0.5);
      lootText.x = this.app.screen.width / 2;
      lootText.y = this.app.screen.height / 2 + 20;
      this.battleContainer.addChild(lootText);
      const contBtn = new Button('Continue', 0, 0, 180, 52, 0x222c33);
      contBtn.on('pointerdown', () => {
        // Odměna za vítězství
        char.gold += enemy.gold;
        char.gainExp(enemy.exp);
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
    } else if (char.hp <= 0) {
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
      const loseMsg = new PIXI.Text('DEFEAT!', { fontFamily: 'monospace', fontSize: 48, fill: 0xff2e2e, fontWeight: 'bold', stroke: 0x000000, strokeThickness: 6 });
      loseMsg.anchor.set(0.5);
      loseMsg.x = this.app.screen.width / 2;
      loseMsg.y = this.app.screen.height / 2 - 50;
      loseMsg.filters = [
        new GlowFilter({ distance: 15, outerStrength: 2.5, innerStrength: 0, color: 0xff2e2e, quality: 0.5 }),
        new BloomFilter({ threshold: 0.1, bloomScale: 1.8, blur: 10, quality: 0.5 }),
        new DropShadowFilter({ distance: 6, color: 0x000000, alpha: 0.7, blur: 4 })
      ];
      this.battleContainer.addChild(loseMsg);
      const goldLossText = new PIXI.Text(defeatMsg, { fontFamily: 'monospace', fontSize: 28, fill: 0xffe000 });
      goldLossText.anchor.set(0.5);
      goldLossText.x = this.app.screen.width / 2;
      goldLossText.y = this.app.screen.height / 2 + 20;
      this.battleContainer.addChild(goldLossText);
      const continueBtn = new Button('Continue', 0, 0, 180, 52, 0x222c33);
      continueBtn.on('pointerdown', () => {
        // Návrat do dungeonu (hráč při porážce nezískává nic, jen se vynuluje HP)
        char.hp = char.maxHp;
        this.state = 'dungeon';
        this.message = '';
        this.initUI();
      });
      buttonContainer.addChild(continueBtn);
      // Vycentrování tlačítka
      buttonContainer.x = this.app.screen.width / 2 - continueBtn.w / 2;
      buttonContainer.y = this.app.screen.height - 80;
    }
  }

  createShopUI() {
    // (Základní implementace UI obchodu – zobrazení seznamu zbraní či zbrojí k prodeji)
    const shopTitle = new PIXI.Text('Shop', { fontFamily: 'monospace', fontSize: 32, fill: 0x00e0ff });
    shopTitle.x = 20;
    shopTitle.y = 20;
    this.stage.addChild(shopTitle);
    // Tlačítka pro přepínání mezi zbraněmi a zbrojemi
    const weaponsTab = new Button('Weapons', 20, 60, 120, 40, 0x00e0ff);
    const armorsTab = new Button('Armors', 150, 60, 120, 40, 0x00e0ff);
    weaponsTab.on('pointerdown', () => { this.shopType = 'weapon'; this.initUI(); });
    armorsTab.on('pointerdown', () => { this.shopType = 'armor'; this.initUI(); });
    this.stage.addChild(weaponsTab, armorsTab);
    // Vykreslení seznamu položek obchodu
    this.shopItemsContainer = new PIXI.Container();
    const shopMaskY = 120;
    const shopMaskH = 400;
    // Maska pro posuvnou oblast položek (aby seznam nepřetékal)
    this.shopScrollMask = new PIXI.Graphics();
    this.shopScrollMask.beginFill(0xff0000);
    this.shopScrollMask.drawRect(60, shopMaskY, 780, shopMaskH);
    this.shopScrollMask.endFill();
    this.shopItemsContainer.mask = this.shopScrollMask;
    this.stage.addChild(this.shopScrollMask, this.shopItemsContainer);
    // Seznam položek k zobrazení (podle zvolené záložky)
    const itemsToShow = this.shopItemsCache[this.shopType];
    let y = 0;
    for (const itemTemplate of itemsToShow) {
      // Podklad pro jednu položku
      const itemBox = new PIXI.Graphics();
      itemBox.beginFill(0x2e3c43);
      itemBox.drawRoundedRect(60, y + shopMaskY, 780, 60, 14);
      itemBox.endFill();
      this.shopItemsContainer.addChild(itemBox);
      // Obrázek položky (pokud existuje v ITEM_ASSETS)
      if (ITEM_ASSETS[itemTemplate.name]) {
        const itemSprite = PIXI.Sprite.from(ITEM_ASSETS[itemTemplate.name]);
        itemSprite.width = 54;
        itemSprite.height = 54;
        itemSprite.x = 72;
        itemSprite.y = y + shopMaskY + 3;
        // Efekt zvýraznění okraje položky
        itemSprite.filters = [new GlowFilter({ distance: 8, outerStrength: 1.5, innerStrength: 0, color: 0xffa500 })];
        this.shopItemsContainer.addChild(itemSprite);
      }
      // Název předmětu
      const itemNameText = new PIXI.Text(itemTemplate.name, { fontFamily: 'monospace', fontSize: 20, fill: 0xffffff });
      itemNameText.x = 140;
      itemNameText.y = y + shopMaskY + 10;
      this.shopItemsContainer.addChild(itemNameText);
      // Cena a požadovaný level
      const priceText = new PIXI.Text(`${itemTemplate.baseCost} G`, { fontFamily: 'monospace', fontSize: 18, fill: 0xffe000 });
      priceText.x = 700;
      priceText.y = y + shopMaskY + 15;
      this.shopItemsContainer.addChild(priceText);
      const levelReqText = new PIXI.Text(`Req Lv: ${itemTemplate.requiredPlayerLevel}`, { fontFamily: 'monospace', fontSize: 14, fill: 0xcccccc });
      levelReqText.x = 700;
      levelReqText.y = y + shopMaskY + 32;
      this.shopItemsContainer.addChild(levelReqText);
      // Tlačítko "Buy"
      const buyBtn = new Button('Buy', 800, y + shopMaskY + 10, 60, 36, 0x00ff8a);
      buyBtn.on('pointerdown', () => {
        // Pokus o koupi předmětu
        const success = this.character.buyItem(itemTemplate, this.shopType === 'weapon' ? 'weapon' : 'armor');
        if (success) {
          this.initUI(); // obnovit UI (aktualizuje inventář hráče a zlato)
        }
      });
      this.shopItemsContainer.addChild(buyBtn);
      y += 80; // posun pro další položku
    }
    // Posuv myšovým kolečkem v obchodě
    this.app.view.onwheel = (event) => {
      const scrollAmount = event.deltaY * 0.5;
      let newY = this.shopItemsContainer.y - scrollAmount;
      const totalItemsHeight = itemsToShow.length * 80;
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
      this.stage.removeChild(this.attackEffect);
      this.attackEffect.destroy();
      this.attackEffect = null;
    }
    this.attackEffectAnimProgress = 0;
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
    this.playerAttacksWithoutDamage = 0;
    this.charShape = null;
    this.enemyShape = null;
    this.battleContainer = null;
    this.autoBattleTimer = 0;
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

  update(delta) {
    // Tato funkce je volána každým snímkem (frame) – herní smyčka
    // Animace zkreslení pozadí (CRT efekt)
    if (this.bgDistortFilter) {
      this.bgDistortFilter.time += 0.03 * delta;
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
      // Flash efekt hráče při zásahu (blikne červeně krátce)
      if (this.playerFlashTimer > 0) {
        this.playerFlashTimer -= delta / 60;
        this.charShape.tint = 0xff0000;
        if (this.playerFlashTimer <= 0) {
          this.charShape.tint = 0xffffff;
        }
      }
      // Flash efekt nepřítele při zásahu
      if (this.enemyFlashTimer > 0) {
        this.enemyFlashTimer -= delta / 60;
        this.enemyShape.tint = 0xff0000;
        if (this.enemyFlashTimer <= 0) {
          this.enemyShape.tint = 0xffffff;
        }
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
      // Animace útoku hráče (posun směrem k nepříteli a zpět během útoku)
      if (this.playerAttacking && this.charShape) {
        this.attackAnimProgress += 0.05 * delta;
        const progress = Math.sin(this.attackAnimProgress * Math.PI);
        this.charShape.x = this.playerAvatarX + progress * (this.enemyAvatarX - this.playerAvatarX) * 0.5;
        this.charShape.y = this.playerAvatarY + Math.abs(Math.cos(this.battleAnim + 1)) * 10;
        if (this.attackAnimProgress >= 1) {
          this.playerAttacking = false;
          this.attackAnimProgress = 0;
        }
      } else if (this.charShape) {
        // Klidová "dýchající" animace avataru hráče
        this.charShape.x = this.playerAvatarX + Math.sin(this.battleAnim + 1) * 12;
        this.charShape.y = this.playerAvatarY + Math.abs(Math.cos(this.battleAnim + 1)) * 10;
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
      // Animace útoku nepřítele (posun avataru nepřítele při útoku)
      if (this.enemyAttacking && this.enemyShape) {
        this.attackAnimProgress += 0.05 * delta;
        const progress = Math.sin(this.attackAnimProgress * Math.PI);
        this.enemyShape.x = this.enemyAvatarX - progress * (this.enemyAvatarX - this.playerAvatarX) * 0.5;
        this.enemyShape.y = this.enemyAvatarY + Math.abs(Math.cos(this.battleAnim)) * 10;
        if (this.attackAnimProgress >= 1) {
          this.enemyAttacking = false;
          this.attackAnimProgress = 0;
        }
      } else if (this.enemyShape) {
        // Klidová animace nepřítele
        this.enemyShape.x = this.enemyAvatarX + Math.sin(this.battleAnim) * 12;
        this.enemyShape.y = this.enemyAvatarY + Math.abs(Math.cos(this.battleAnim)) * 10;
      }
      // Animace všech poletujících textů (postupné stoupání a mizení)
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const text = this.floatingTexts[i];
        text.life += 0.03 * delta;
        text.y = text.initialY - (text.life * 30);
        text.alpha = 1 - text.life;
        text.scale.set(1 + text.life * 0.5);
        if (text.alpha <= 0) {
          this.battleContainer.removeChild(text);
          this.floatingTexts.splice(i, 1);
        }
      }
      // Auto-battle logika: pokud nikdo zrovna neútočí, odpočítá čas a spustí další útok
      if (!this.playerAttacking && !this.enemyAttacking && char.hp > 0 && enemy.hp > 0) {
        this.autoBattleTimer -= delta / 60;
        if (this.autoBattleTimer <= 0) {
          if (this.battleTurn === 'player') {
            BattleSystem.doPlayerAttack(this);
          } else if (this.battleTurn === 'enemy') {
            BattleSystem.doEnemyAttack(this);
          }
        }
      }
    }
  }
}
