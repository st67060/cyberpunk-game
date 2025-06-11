import { ENEMY_ASSETS } from '../data/enemyAssets.js';

export class Enemy {
  static LEVEL_MULTIPLIER = 0.8; // base multiplier for normal enemies

  constructor(template, playerLevel = 1, isBoss = false, playerRef = null) {
    this.isBoss = isBoss || template.isBoss || false;
    this.level = template.requiredPlayerLevel;
    this.name = template.name;
    this.color = template.color;
    if (this.isBoss) {
      // Boss přebírá staty přímo ze šablony
      this.hp = template.hp;
      this.atk = template.atk;
      this.def = template.def;
      this.spd = template.spd;
      this.gold = template.gold;
      this.exp = template.exp;
    } else {
      // Běžný nepřítel – náhodná úroveň v rozmezí hráčLevel ± 1
      let enemyLevel = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
      this.level = enemyLevel;
      // Cílový součet statistik vychází ze startovních statů hráče a navýšení 3 za každý level
      let playerStartTotal = 147;
      if (playerRef && playerRef.cls) {
        const c = playerRef.cls;
        playerStartTotal = c.hp + c.atk + c.def + c.spd;
      }
      const targetTotal = playerStartTotal + (this.level - 1) * 5;
      const baseTotal = template.hp + template.atk + template.def + template.spd;
      const scalingFactor = baseTotal > 0 ? (targetTotal / baseTotal) : 1;
      const variance = 0.05;
      const rand = () => 1 + ((Math.random() * 2 - 1) * variance);
      // Vypočtené statistiky nepřítele, zaokrouhleno a s minimální hodnotou 1
      this.hp = Math.max(1, Math.round(template.hp * scalingFactor * rand()));
      this.atk = Math.max(1, Math.round(template.atk * scalingFactor * rand()));
      this.def = Math.max(1, Math.round(template.def * scalingFactor * rand()));
      this.spd = Math.max(1, Math.round(template.spd * scalingFactor * rand()));
      this.gold = Math.max(1, Math.round(template.gold * scalingFactor));
      this.exp = Math.max(1, Math.round(template.exp * scalingFactor));
    }
    this.maxHp = this.hp * 50;
    // Na začátku boje má nepřítel plné HP
    this.hp = Math.max(1, this.maxHp);
    if (this.isBoss && template.texture) {
      // U bossů můžeme mít speciální texturu (obrázek)
      this.texture = template.texture;
    } else if (ENEMY_ASSETS[template.name]) {
      // Běžným nepřátelům přiřadíme texturu z mapy assetů
      this.texture = ENEMY_ASSETS[template.name];
    }
    // Avatar použije stejnou texturu
    this.avatar = this.texture || ENEMY_ASSETS['Gang Thug'];
  }
}
