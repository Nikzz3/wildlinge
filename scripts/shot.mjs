/**
 * One-off screenshot: node scripts/shot.mjs <out.png> "<async JS body using g = window.__game>" [query]
 * Example: node scripts/shot.mjs out/shots/start.png "g.newGame({starter:'flaemmli'}); await g.advance(30); return g.stack()"
 * Prints {result, stack, errors}. Requires a prior `npm run build`.
 */
import { launch } from './lib/harness.mjs';

const [out = 'out/shots/shot.png', code = 'await g.advance(10)', query] = process.argv.slice(2);
const h = await launch(query ? { query } : {});
let result;
try {
  result = await h.run(code);
} catch (e) {
  result = `ERROR: ${e.message}`;
}
await h.shot(out);
const stack = await h.run('return g.stack()');
console.log(JSON.stringify({ out, result, stack, errors: await h.allErrors() }, null, 2));
await h.close();
