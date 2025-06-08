import * as PIXI from 'pixi.js';
import { Game } from './components/Game.js';

(async () => {
  // Inicializace Pixi aplikace (Pixi v8 styl)
  const app = new PIXI.Application();
  await app.init({
    width: 1280,
    height: 720,
    background: '#181e24', // v8 používá string, ne hex
    antialias: true,
    resolution: 1
  });

  // Přidání canvas do DOMu
  document.body.appendChild(app.canvas);
  app.canvas.style.display = 'block';
  app.canvas.style.margin = 'auto';

  const resize = () => {
    const w = document.fullscreenElement ? window.innerWidth : 1280;
    const h = document.fullscreenElement ? window.innerHeight : 720;
    app.renderer.resize(w, h);
    game.initUI();
  };


  window.addEventListener('resize', resize);

  // Inicializace hry
  const game = new Game(app);
  resize();

  // Game loop
  app.ticker.add((delta) => {
    game.update(delta);
  });
})();