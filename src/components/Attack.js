import { Graphics } from 'pixi.js';
export class Attack {
  constructor(color = 0xffffff, radius = 30, life = 30) {
    this.color = color;
    this.radius = radius;
    this.life = life;
  }

  play(container, x, y, ticker) {
    const gfx = new Graphics();
    gfx.beginFill(this.color);
    gfx.drawCircle(0, 0, this.radius);
    gfx.endFill();
    gfx.x = x;
    gfx.y = y;
    gfx.alpha = 0.9;
    container.addChild(gfx);
    let life = this.life;
    const update = (delta) => {
      life -= delta;
      gfx.scale.x += 0.05 * delta;
      gfx.scale.y += 0.05 * delta;
      gfx.alpha = life / this.life;
      if (life <= 0) {
        ticker.remove(update);
        if (gfx.parent) gfx.parent.removeChild(gfx);
        gfx.destroy();
      }
    };
    if (ticker && ticker.add) {
      ticker.add(update);
    } else {
      setTimeout(() => {
        if (gfx.parent) gfx.parent.removeChild(gfx);
        gfx.destroy();
      }, this.life * 16);
    }
    return gfx;
  }
}
