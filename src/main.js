import * as PIXI from 'pixi.js';
import { Game } from './components/Game.js';

(async () => {
  // Inicializace Pixi aplikace (Pixi v8 styl)
  const app = await PIXI.Application.init({
    width: 900,
    height: 600,
    background: '#181e24', // v8 používá string, ne hex
    antialias: true,
    resolution: 1
  });

  // Přidání canvas do DOMu
  document.body.appendChild(app.canvas);

  // Inicializace hry
  const game = new Game(app);

  // Game loop
  app.ticker.add((delta) => {
    game.update(delta);
  });
})();