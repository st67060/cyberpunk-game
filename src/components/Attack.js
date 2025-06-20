import { Texture, Rectangle, AnimatedSprite } from 'pixi.js';

export class Attack {
  constructor(sheetUrl, frameWidth = 256, frameHeight = 256, speed = 0.4) {
    const base = Texture.from(sheetUrl).baseTexture;
    this.frames = [];
    const cols = Math.floor(base.width / frameWidth);
    const rows = Math.floor(base.height / frameHeight);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const rect = new Rectangle(x * frameWidth, y * frameHeight, frameWidth, frameHeight);
        this.frames.push(new Texture(base, rect));
      }
    }
    this.speed = speed;
  }

  play(container, x, y) {
    const sprite = new AnimatedSprite(this.frames);
    sprite.anchor.set(0.5);
    sprite.animationSpeed = this.speed;
    sprite.loop = false;
    sprite.x = x;
    sprite.y = y;
    sprite.onComplete = () => {
      if (sprite.parent) sprite.parent.removeChild(sprite);
      sprite.destroy();
    };
    container.addChild(sprite);
    sprite.play();
    return sprite;
  }
}
