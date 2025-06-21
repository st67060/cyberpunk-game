import { Graphics, Sprite, Assets, Texture } from 'pixi.js';

export class Attack {
  constructor(options = {}) {
    if (typeof options === 'string') {
      options = { texture: options };
    }
    this.texture = options.texture || null;
    this.color = options.color || 0xffffff;
    this.radius = options.radius || 20;
    this.speed = options.speed || 10;
  }

  play(container, startX, startY, endX, endY, ticker) {
    let obj;
    if (this.texture) {
      const tex = Assets.get(this.texture) || Texture.from(this.texture);
      obj = new Sprite(tex);
      obj.anchor.set(0.5);
    } else {
      obj = new Graphics();
      obj.fill({ color: this.color });
      obj.circle(0, 0, this.radius);
    }
    obj.x = startX;
    obj.y = startY;
    obj.zIndex = 6;
    container.addChild(obj);

    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    let traveled = 0;

    const update = (delta) => {
      // PIXI's ticker may provide delta in milliseconds or frame units.
      // Normalize to frame units so projectile speed is consistent.
      const d = delta > 10 ? delta / 16.6667 : delta;
      traveled += this.speed * d;
      const t = Math.min(1, traveled / dist);
      obj.x = startX + dx * t;
      obj.y = startY + dy * t;
      if (t >= 1) {
        ticker.remove(update);
        if (obj.parent) obj.parent.removeChild(obj);
        obj.destroy();
      }
    };

    if (ticker && ticker.add) {
      ticker.add(update);
    } else {
      const interval = setInterval(() => update(1), 16);
      setTimeout(() => {
        clearInterval(interval);
        if (obj.parent) obj.parent.removeChild(obj);
        obj.destroy();
      }, (dist / this.speed) * 16 + 100);
    }
    obj._update = update;
    return obj;
  }
}
