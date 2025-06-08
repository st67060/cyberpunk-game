import { ENEMY_ASSETS } from '../data/enemyAssets.js';

export class Enemy {
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
      // Porovnání součtu statistik hráče a nepřítele pro škálování
      let playerStatsSource = playerRef ? playerRef : null;
      let playerTotalStats = 0;
      if (playerStatsSource) {
        playerTotalStats = playerStatsSource.stats.hp + playerStatsSource.stats.atk +
                           playerStatsSource.stats.def + playerStatsSource.stats.spd;
      } else {
        playerTotalStats = 100;
      }
      const minTarget = Math.max(1, playerTotalStats - 10);
      const maxTarget = playerTotalStats + 10;
      const targetBenchmark = minTarget + Math.random() * (maxTarget - minTarget);
      const enemyTemplateTotal = template.hp + template.atk + template.def + template.spd;
      let scalingFactor = (enemyTemplateTotal > 0) ? (targetBenchmark / enemyTemplateTotal) : 1;
      scalingFactor *= 1.44;
      // Vypočtené statistiky nepřítele, zaokrouhleno a s minimální hodnotou 1
      this.hp = Math.max(1, Math.round(template.hp * scalingFactor));
      this.atk = Math.max(1, Math.round(template.atk * scalingFactor));
      this.def = Math.max(1, Math.round(template.def * scalingFactor));
      this.spd = Math.max(1, Math.round(template.spd * scalingFactor));
      this.gold = Math.max(1, Math.round(template.gold * scalingFactor));
      this.exp = Math.max(1, Math.round(template.exp * scalingFactor));
    }
    this.maxHp = this.hp * 100;
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
