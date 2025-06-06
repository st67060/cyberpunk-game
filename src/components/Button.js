import * as PIXI from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';

export class Button extends PIXI.Container {
  constructor(label, x, y, w = 170, h = 48, color = 0x2e3c43) {
    super();
    this.interactive = true;
    this.eventMode = 'static';
    // Vykreslení obdélníkového podkladu tlačítka
    const g = new PIXI.Graphics();
    g.beginFill(color);
    g.drawRoundedRect(0, 0, w, h, 12);
    g.endFill();
    // Aplikace Glow filtru pro efekt záře
    g.filters = [new GlowFilter({ distance: 10, outerStrength: 2, innerStrength: 0, color: 0x00ffe0 })];
    this.addChild(g);
    // Text popisku tlačítka
    const t = new PIXI.Text(label, { fontFamily: 'monospace', fontSize: 22, fill: 0xffffff });
    t.anchor.set(0.5);
    t.x = w / 2;
    t.y = h / 2;
    this.addChild(t);
    // Nastavení pozice a vlastností tlačítka
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.g = g;
    this.t = t;
    this.originalScale = 1;
    this.originalColor = color;
    // Animace kliknutí
    this._isAnimating = false;
    this._animationProgress = 0;
    this._animationDuration = 10;
    this._initialScale = 1;
    this._targetScale = 1;
    this._initialColor = color;
    this._targetColor = color;
    // Zvýraznění tlačítka při najetí myši
    this.on('pointerover', () => g.tint = 0x00ffe0);
    this.on('pointerout', () => {
      if (!this._isAnimating) {
        g.tint = this.originalColor;
      }
    });
  }

  animateClick(targetScale, targetColor) {
    // Inicializace animace kliknutí (cílové měřítko a barva podkladu)
    this._isAnimating = true;
    this._animationProgress = 0;
    this._initialScale = this.scale.x;
    this._targetScale = targetScale;
    this._initialColor = this.g.tint;
    this._targetColor = targetColor;
  }

  updateAnimation(delta) {
    if (!this._isAnimating) return;
    this._animationProgress += delta;
    const progress = Math.min(1, this._animationProgress / this._animationDuration);
    const easeProgress = Math.sin(progress * Math.PI);
    // Plynulý přechod měřítka tlačítka
    this.scale.set(this._initialScale + (this._targetScale - this._initialScale) * easeProgress);
    // Plynulý přechod barvy podkladu (tint)
    const r1 = (this._initialColor >> 16) & 0xFF, g1 = (this._initialColor >> 8) & 0xFF, b1 = this._initialColor & 0xFF;
    const r2 = (this._targetColor >> 16) & 0xFF, g2 = (this._targetColor >> 8) & 0xFF, b2 = this._targetColor & 0xFF;
    const r = Math.round(r1 + (r2 - r1) * easeProgress);
    const g = Math.round(g1 + (g2 - g1) * easeProgress);
    const b = Math.round(b1 + (b2 - b1) * easeProgress);
    this.g.tint = (r << 16) + (g << 8) + b;
    // Konec animace – návrat k výchozímu stavu
    if (progress >= 1) {
      this._isAnimating = false;
      this.scale.set(this.originalScale);
      this.g.tint = this.originalColor;
    }
  }
}
