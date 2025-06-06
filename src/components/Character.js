export class Character {
  constructor(cls) {
    // Inicializace základních atributů podle zvolené třídy (class)
    this.cls = cls;
    this.level = 1;
    this.exp = 0;
    this.expToNext = 50;
    this.gold = 100;
    this.statPoints = 10;
    this.skillPoints = 0;
    // Náklady na zlepšení statistik (zvyšují se postupně)
    this.statCosts = { hp: 100, atk: 100, def: 100, spd: 100 };
    // Dovednostní strom (schopnosti, které lze odemknout a vylepšovat)
    this.skillTree = {
      powerStrike: { unlocked: false, level: 0 },
      cyberShield: { unlocked: false, level: 0 },
      quickstep: { unlocked: false, level: 0 },
      hackPulse: { unlocked: false, level: 0 }
    };
    // Základní statistiky podle zvolené třídy (tyto se zvyšují s levelem)
    this.baseStats = {
      hp: cls.hp,
      atk: cls.atk,
      def: cls.def,
      spd: cls.spd
    };
    // Aktuální statistiky (včetně vybavení)
    this.stats = { ...this.baseStats };
    // Odvozené atributy
    this.maxHp = this.stats.hp * 100;
    this.hp = this.maxHp;
    // Výchozí vybavení (pěstě a hadry)
    this.weapon = { name: 'Fists', type: 'weapon', baseAtk: 1, requiredPlayerLevel: 0, texture: null };
    this.armor = { name: 'Rags', type: 'armor', baseDef: 0, requiredPlayerLevel: 0, texture: null };
    // Inventář hráče (zpočátku prázdný)
    this.inventory = {
      weapons: [],
      armors: []
    };
  }

  // Výpočet útoku zbraně pro daný level postavy
  getWeaponStat(item, playerLevel) {
    return item.baseAtk + Math.floor(playerLevel * 0.5);
  }
  // Výpočet obrany zbroje pro daný level postavy
  getArmorStat(item, playerLevel) {
    return item.baseDef + Math.floor(playerLevel * 0.5);
  }
  // Cena předmětu (základní cena, mohla by být modifikována)
  getItemCost(item) {
    return item.baseCost;
  }

  equip(item) {
    // Vybavení zbraně nebo zbroje a přepočet statistik
    if (item.type === 'weapon') {
      this.weapon = { ...item, atk: this.getWeaponStat(item, this.level) };
    }
    if (item.type === 'armor') {
      this.armor = { ...item, def: this.getArmorStat(item, this.level) };
    }
    this.updateStats();
  }

  buyItem(itemTemplate, type) {
    // Kontrola vlastnictví a požadavků před nákupem
    const isOwned = (type === 'weapon' ? this.inventory.weapons : this.inventory.armors)
      .some(i => i.name === itemTemplate.name);
    if (isOwned) return false;
    if (this.level < itemTemplate.requiredPlayerLevel) return false;
    const cost = this.getItemCost(itemTemplate);
    if (this.gold >= cost) {
      this.gold -= cost;
      const newItem = { ...itemTemplate, type: type };
      // Přidání předmětu do inventáře a případné automatické equipnutí podle síly
      if (type === 'weapon') {
        if (this.weapon && this.weapon.name !== 'Fists' &&
            this.getWeaponStat(newItem, this.level) > this.getWeaponStat(this.weapon, this.level)) {
          this.inventory.weapons = this.inventory.weapons.filter(w => w.name !== this.weapon.name);
          this.inventory.weapons.push(newItem);
          this.equip(newItem);
        } else if (!this.weapon || this.weapon.name === 'Fists') {
          this.inventory.weapons.push(newItem);
          this.equip(newItem);
        } else {
          this.inventory.weapons.push(newItem);
        }
      } else { // type === 'armor'
        if (this.armor && this.armor.name !== 'Rags' &&
            this.getArmorStat(newItem, this.level) > this.getArmorStat(this.armor, this.level)) {
          this.inventory.armors = this.inventory.armors.filter(a => a.name !== this.armor.name);
          this.inventory.armors.push(newItem);
          this.equip(newItem);
        } else if (!this.armor || this.armor.name === 'Rags') {
          this.inventory.armors.push(newItem);
          this.equip(newItem);
        } else {
          this.inventory.armors.push(newItem);
        }
      }
      this.updateStats();
      return true;
    }
    return false;
  }

  updateStats() {
    // Přepočítání aktuálních statistik (včetně bonusů z vybavení)
    this.stats = { ...this.baseStats };
    if (this.weapon && this.weapon.baseAtk !== undefined) {
      this.stats.atk += this.getWeaponStat(this.weapon, this.level);
    } else if (this.weapon && this.weapon.atk !== undefined) {
      this.stats.atk += this.weapon.atk;
    }
    if (this.armor && this.armor.baseDef !== undefined) {
      this.stats.def += this.getArmorStat(this.armor, this.level);
    } else if (this.armor && this.armor.def !== undefined) {
      this.stats.def += this.armor.def;
    }
    // U různých tříd může mít HP jiný násobitel
    let hpMultiplier = 100;
    if (this.cls.name === 'Street Samurai') {
      hpMultiplier = 120;
    }
    this.maxHp = this.stats.hp * hpMultiplier;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
  }

  gainExp(amount) {
    // Zisk zkušeností a případné zvýšení úrovně
    this.exp += amount;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.level++;
      // Při postupu na vyšší úroveň získá hráč stat a skill pointy
      this.statPoints += 3;
      this.skillPoints += 1;
      this.expToNext = Math.floor(this.expToNext * 1.4 + 10);
      // Zvýšení základních statistik s levelem
      this.baseStats.hp += 10;
      this.baseStats.atk += 2;
      this.baseStats.def += 2;
      this.baseStats.spd += 1;
      this.updateStats();
      this.hp = this.maxHp;
      // Automatická výměna vybavení za nejlepší dostupné v inventáři
      let bestWeapon = this.weapon;
      if (bestWeapon.name === 'Fists') bestWeapon = null;
      for (const w of this.inventory.weapons) {
        if (!bestWeapon || this.getWeaponStat(w, this.level) > this.getWeaponStat(bestWeapon, this.level)) {
          bestWeapon = w;
        }
      }
      if (bestWeapon) this.equip(bestWeapon);
      let bestArmor = this.armor;
      if (bestArmor.name === 'Rags') bestArmor = null;
      for (const a of this.inventory.armors) {
        if (!bestArmor || this.getArmorStat(a, this.level) > this.getArmorStat(bestArmor, this.level)) {
          bestArmor = a;
        }
      }
      if (bestArmor) this.equip(bestArmor);
    }
  }

  spendStat(stat) {
    // Utracení stat pointu za zvýšení jedné z vlastností (nebo zaplacení zlaťáky, pokud body došly)
    if (this.statPoints > 0) {
      this.baseStats[stat] += 1;
      this.statPoints--;
      this.updateStats();
      return true;
    } else if (this.gold >= this.statCosts[stat]) {
      this.baseStats[stat] += 1;
      this.gold -= this.statCosts[stat];
      this.statCosts[stat] = Math.floor(this.statCosts[stat] * 1.15);
      this.updateStats();
      return true;
    }
    return false;
  }

  unlockSkill(skill) {
    // Odemknutí nové schopnosti, pokud má hráč skill pointy
    if (this.skillPoints > 0 && this.skillTree[skill] && !this.skillTree[skill].unlocked) {
      this.skillTree[skill].unlocked = true;
      this.skillTree[skill].level = 1;
      this.skillPoints--;
    }
  }

  upgradeSkill(skill) {
    // Vylepšení již odemčené schopnosti
    if (this.skillPoints > 0 && this.skillTree[skill] && this.skillTree[skill].unlocked) {
      this.skillTree[skill].level++;
      this.skillPoints--;
    }
  }
}
