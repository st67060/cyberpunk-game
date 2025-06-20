import { Graphics, Sprite } from 'pixi.js';

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
      obj = Sprite.from(this.texture);
      obj.anchor.set(0.5);
    } else {
      obj = new Graphics();
      obj.beginFill(this.color);
      obj.drawCircle(0, 0, this.radius);
      obj.endFill();
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
      traveled += this.speed * delta;
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
    return obj;
  }
}
