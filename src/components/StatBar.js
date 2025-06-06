import * as PIXI from 'pixi.js';

export class StatBar extends PIXI.Container {
  constructor(label, value, max, x, y, w = 180, h = 16, fill = 0xffa500, bg = 0x222c33) {
    super();
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    // Pozadí pruhu
    this.bg = new PIXI.Graphics();
    this.bg.beginFill(bg);
    this.bg.drawRoundedRect(0, 0, w, h, 8);
    this.bg.endFill();
    this.addChild(this.bg);
    // Grafický objekt pro vyplnění pruhu
    this.fg = new PIXI.Graphics();
    this.addChild(this.fg);
    // Popisek (název statu)
    this.label = new PIXI.Text(label, { fontFamily: 'monospace', fontSize: 13, fill: 0xcccccc });
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
    this.value = val;
    this.max = max;
    // Aktualizace grafické výplně podle poměru value/max
    this.fg.clear();
    this.fg.beginFill(this.fill);
    this.fg.drawRoundedRect(0, 0, Math.max(0, this.w * (this.value / this.max)), this.h, 8);
    this.fg.endFill();
    // Zobrazení číselné hodnoty uprostřed pruhu
    if (!this.valueText) {
      this.valueText = new PIXI.Text('', { fontFamily: 'monospace', fontSize: 12, fill: 0xffffff });
      this.valueText.anchor.set(0.5);
      this.valueText.x = this.w / 2;
      this.valueText.y = this.h / 2;
      this.addChild(this.valueText);
    }
    this.valueText.text = `${Math.round(this.value)}/${Math.round(this.max)}`;
  }
}
