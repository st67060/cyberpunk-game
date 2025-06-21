import { Container, Graphics, Text } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';

export class StatBar extends Container {
  constructor(label, value, max, x, y, w = 180, h = 16, fill = 0xffa500, bg = 0x222c33) {
    super();
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    // Pozadí pruhu s komiksovým orámováním
    this.bg = new Graphics();
    this.bg.lineStyle(2, 0x000000, 1);
    this.bg.beginFill(bg);
    this.bg.drawRoundedRect(0, 0, w, h, 8);
    this.bg.endFill();
    this.addChild(this.bg);
    // Grafický objekt pro vyplnění pruhu
    this.fg = new Graphics();
    this.fg.lineStyle(2, 0x000000, 1);
    this.fg.filters = [new GlowFilter({ distance: 4, outerStrength: 1.5, innerStrength: 0, color: fill })];
    this.addChild(this.fg);
    // Popisek (název statu)
    this.label = new Text(label, { fontFamily: 'monospace', fontSize: 13, fill: 0xcccccc });
    this.label.x = 0;
    this.label.y = -18;
    this.addChild(this.label);
    // Inicializace hodnot
    this.value = value;
    this.max = max;
    this.fill = fill;
    this.updateBar(value, max);
  }

  updateBar(val, max) {
    this.value = Number.isFinite(val) ? val : 0;
    this.max = Number.isFinite(max) && max > 0 ? max : 1;
    // Aktualizace grafické výplně podle poměru value/max
    this.fg.clear();
    this.fg.lineStyle(2, 0x000000, 1);
    this.fg.beginFill(this.fill);
    this.fg.drawRoundedRect(0, 0, Math.max(0, this.w * (this.value / this.max)), this.h, 8);
    this.fg.endFill();
    // Zobrazení číselné hodnoty uprostřed pruhu
    if (!this.valueText) {
      this.valueText = new Text('', { fontFamily: 'monospace', fontSize: 12, fill: 0xffffff });
      this.valueText.anchor.set(0.5);
      this.valueText.x = this.w / 2;
      this.valueText.y = this.h / 2;
      this.addChild(this.valueText);
    }
    this.valueText.text = `${Math.round(this.value)}/${Math.round(this.max)}`;
  }
}
