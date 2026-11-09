import { installDebug } from './engine/debug';
import { createGame } from './engine/game';
import { createTitleScene } from './scenes';

const params = new URLSearchParams(location.search);
const testMode = params.has('test');
const canvas = document.getElementById('screen') as HTMLCanvasElement;

const game = createGame(canvas, {
  testMode,
  manual: params.has('manual'),
  seed: testMode ? 12345 : Date.now() % 2147483647,
});
installDebug(game);
game.applyOptions();
game.reset(createTitleScene(game));
game.start();
