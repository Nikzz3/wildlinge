import { HELPERS } from './10-overworld-walk.mjs';

export const name = 'overworld: buffered START/A, closed heal counter, silent script music, banner clock, ledge trainer';

export async function run(h) {
  await h.run(HELPERS);
  const run = (code) => h.run(`const { ow, pos, settle, step, walk, mash } = window.owt; ${code}`);
  await run(`g.newGame({ starter: 'sproessli', level: 40 }); await g.advance(5);`);

  // START pressed at any point during a step opens the menu once the step completes
  const opened = await run(`
    const hits = [];
    for (const offset of [2, 6, 10, 14]) {
      g.warp('dev_town', 12, 6, 'down'); await settle();
      g.down('down');
      for (let k = 0; k < 16 + offset && !ow().player.moving; k++) await g.advance(1);
      await g.advance(offset);
      await g.tap('start');
      let top = 'overworld';
      for (let k = 0; k < 40 && top === 'overworld'; k++) { await g.advance(1); top = g.top(); }
      g.up('down');
      hits.push(top);
      await mash('b', 50);
    }
    return hits;
  `);
  if (opened.some((t) => t === 'overworld')) throw new Error(`START during a step was lost: ${JSON.stringify(opened)}`);

  // the heal center counter row is closed: U,U,R,R,R from (1,3) stays in front of it
  const center = await run(`
    g.warp('dev_center', 1, 3, 'up'); await settle();
    for (const c of 'UURRR') await step({ U: 'up', R: 'right' }[c]);
    return pos();
  `);
  if (center.y !== 3) throw new Error(`walked behind the heal counter: ${JSON.stringify(center)}`);

  // ctx.playMusic(null) stays silent while the script runs, map music returns afterwards
  const music = await run(`
    g.warp('dev_town', 12, 8, 'down'); await settle();
    let during = 'unset';
    ow().enqueue(async () => { ow().ctx.playMusic(null); await ow().ctx.say('Psst …'); during = g.game.audio.currentMusic(); });
    await mash();
    return { during, after: g.game.audio.currentMusic() };
  `);
  if (music.during !== null || music.after !== 'town') throw new Error(`music override: ${JSON.stringify(music)}`);

  // the area banner keeps running while a dialog covers the overworld
  const banner = await run(`
    g.warp('dev_town', 12, 8, 'down'); await g.advance(2);
    const shown = ow().banner !== null;
    ow().enqueue(() => ow().ctx.say('Hallo!'));
    await g.advance(150);
    const top = g.top();
    await mash();
    return { shown, top, after: ow().banner };
  `);
  if (!banner.shown || banner.top !== 'message' || banner.after !== null) throw new Error(`banner: ${JSON.stringify(banner)}`);

  // a trainer above a ledge sees the player below it and hops down
  const ranger = await run(`
    g.warp('dev_route', 11, 7, 'up');
    for (let k = 0; k < 300 && g.top() === 'overworld'; k++) await g.advance(1);
    const n = ow().findNpc('ranger');
    return { top: g.top(), npc: n && { x: n.x, y: n.y }, player: pos() };
  `);
  if (ranger.top === 'overworld') throw new Error('ledge trainer did not react');
  if (ranger.npc?.x !== 11 || ranger.npc?.y !== 6) throw new Error(`ledge trainer: ${JSON.stringify(ranger)}`);
  await h.shot('out/e2e/10-ledge-trainer.png');
  await run(`await mash();`);
  if (!(await run(`return g.state.flags['trainer:dev_ranger'] === true`))) throw new Error('ledge trainer flag not set');
}
