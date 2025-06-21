import { Container, Graphics, Text, Texture } from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';
import { DropShadowFilter } from '@pixi/filter-drop-shadow';
import { GlitchFilter } from 'pixi-filters';

function createGradientTexture(width, height, color) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const hex = color.toString(16).padStart(6, '0');
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, `#${hex}`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return Texture.from(canvas);
}

export class StatBar extends Container {
  constructor(label, value, max, x, y, w = 180, h = 16, fill = 0xffa500, bg = 0x222c33) {
    super();
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    // Pozadí pruhu s ostrými hranami a "drátky" na krajích
    this.bg = new Graphics();
    this.bg.lineStyle(2, 0x000000, 1);
    this.bg.beginFill(bg);
    this.bg.drawRect(0, 0, w, h);
    // levý a pravý "výstupek" / drátek
    this.bg.drawRect(-4, h * 0.25, 4, h * 0.5);
    this.bg.drawRect(w, h * 0.25, 4, h * 0.5);
    this.bg.endFill();
    this.addChild(this.bg);
    this.filters = [new DropShadowFilter({ distance: 3, blur: 4, color: 0x000000, alpha: 0.7 })];

    // Grafický objekt pro vyplnění pruhu s gradientem
    this.gradientTexture = createGradientTexture(w, h, fill);
    this.fg = new Graphics();
    this.fg.lineStyle(2, 0x000000, 1);
    this.fg.filters = [
      new GlowFilter({ distance: 6, outerStrength: 2, innerStrength: 0, color: fill }),
      new GlitchFilter({ slices: 4, offset: 4 })
    ];
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
    this.fg.beginTextureFill({ texture: this.gradientTexture });
    this.fg.drawRect(0, 0, Math.max(0, this.w * (this.value / this.max)), this.h);
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
