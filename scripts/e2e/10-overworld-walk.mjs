export const name = 'overworld: walk, turn, doors, heal, scripts, items, trainer, ledge, encounter, connection, blackout';

/** In-page helpers (window.owt) driving the overworld tile by tile. Also used by 10-overworld-input.mjs. */
export const HELPERS = `
  const ow = () => g.game.stack.find((s) => s.name === 'overworld');
  const pos = () => { const s = g.state.player; return { map: s.mapId, x: s.x, y: s.y, facing: s.facing }; };
  /** Runs queued transitions/scripts that need no input. */
  const settle = async (max = 600) => {
    for (let k = 0; k < max && g.top() === 'overworld' && (ow().busy || ow().player.moving); k++) await g.advance(1);
    await g.advance(2);
  };
  /** One tile in dir (turning first if needed). Returns true if the player moved or changed map. */
  const step = async (dir) => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const p = ow().player; const bx = p.x, by = p.y, bm = ow().map.id;
      g.down(dir);
      let moved = false;
      for (let k = 0; k < 30; k++) {
        await g.advance(1);
        const q = ow().player;
        if (q.x !== bx || q.y !== by || ow().map.id !== bm || ow().busy) { moved = true; break; }
      }
      g.up(dir);
      await settle();
      if (moved) return true;
      await g.advance(40); // something (a wandering NPC) was in the way
    }
    return false;
  };
  const walk = async (path) => { for (const c of path) { if (!(await step({ U: 'up', D: 'down', L: 'left', R: 'right' }[c]))) throw new Error('blocked at ' + JSON.stringify(pos()) + ' going ' + c); } };
  /** Presses A/B until the overworld is the top scene again (messages, menus, battles). */
  const mash = async (button = 'a', max = 2000) => {
    for (let k = 0; k < max && (g.top() !== 'overworld' || ow().busy); k++) {
      if (g.top() !== 'overworld') await g.tap(button);
      else await g.advance(1);
    }
    await settle();
    if (g.top() !== 'overworld' || ow().busy) throw new Error('stuck in ' + g.stack().join(' > '));
  };
  window.owt = { ow, pos, settle, step, walk, mash };
`;

const expectPos = (actual, want, what) => {
  for (const [k, v] of Object.entries(want))
    if (actual[k] !== v) throw new Error(`${what}: expected ${JSON.stringify(want)}, got ${JSON.stringify(actual)}`);
};

export async function run(h) {
  await h.run(HELPERS);
  const run = (code) => h.run(`const { ow, pos, settle, step, walk, mash } = window.owt; ${code}`);

  // start + turn in place
  await run(`g.newGame({ starter: 'sproessli', level: 40 }); g.warp('dev_town', 12, 6, 'down'); await g.advance(5);`);
  expectPos(await run('return pos()'), { map: 'dev_town', x: 12, y: 6, facing: 'down' }, 'start');
  await run(`await g.tap('left'); await g.advance(10);`);
  expectPos(await run('return pos()'), { x: 12, y: 6, facing: 'left' }, 'turn in place');

  // walk to the Heilstation and enter it
  await run(`await walk('ULLLLLLLLL'); await walk('U');`);
  expectPos(await run('return pos()'), { map: 'dev_center', x: 5, y: 7, facing: 'up' }, 'heal center door');
  await h.shot('out/e2e/10-center.png');

  // heal at the nurse (talk across the counter) → lastHeal
  await run(`g.state.party[0].hp = 1; await walk('UUUU'); await g.tap('a'); await mash();`);
  const healed = await run('return { hp: g.state.party[0].hp, lastHeal: g.state.lastHeal }');
  if (healed.hp <= 1) throw new Error('nurse did not heal the party');
  expectPos(healed.lastHeal, { mapId: 'dev_center', x: 5, y: 3 }, 'lastHeal');

  // leave via the mat
  await run(`await walk('DDDDD');`);
  expectPos(await run('return pos()'), { map: 'dev_town', x: 3, y: 5, facing: 'down' }, 'exit mat');

  // start menu opens and closes
  await run(`await g.tap('start'); await g.advance(5);`);
  if ((await run('return g.top()')) === 'overworld') throw new Error('START did not open a menu');
  await run(`await mash('b', 20);`);

  // scripted NPC (emotes + giveItem), talked to from above
  await run(`await walk('RRRRRRRRRRRRRR'); await g.tap('down'); await g.advance(3); await g.tap('a'); await mash();`);
  expectPos(await run('return pos()'), { x: 17, y: 5, facing: 'down' }, 'talk to boy');
  if ((await run(`return g.state.bag.potion ?? 0`)) !== 2) throw new Error('boy script did not give 2 potions');

  // trainer on the east path sees the player at distance 4
  await run(`await walk('RRRR'); await walk('DD'); await step('down');`);
  const seen = await run(`
    for (let k = 0; k < 200 && g.top() === 'overworld'; k++) await g.advance(1);
    const n = ow().findNpc('hiker');
    return { top: g.top(), npc: n && { x: n.x, y: n.y } };
  `);
  if (seen.top === 'overworld') throw new Error('trainer did not react');
  expectPos(seen.npc, { x: 21, y: 9 }, 'trainer walked up to the player');
  await h.shot('out/e2e/10-trainer.png');
  await run(`await mash();`);
  if (!(await run(`return g.state.flags['trainer:dev_hiker'] === true`))) throw new Error('trainer flag not set after the battle');

  // sign, ground item and hidden item
  await run(`g.warp('dev_town', 4, 5, 'down'); await settle(); await g.tap('a');`);
  if ((await run('return g.top()')) !== 'message') throw new Error('sign did not show a message');
  await run(`await mash();`);
  const found = await run(`
    g.warp('dev_town', 10, 14, 'down'); await settle();
    await g.tap('a'); await mash();
    await g.tap('left'); await g.advance(3); await g.tap('a'); await mash();
    return { crystal: g.state.bag.crystal ?? 0, potion: g.state.bag.potion ?? 0, ball: ow().itemAt(10, 15) };
  `);
  if (found.crystal !== 3 || found.potion !== 3 || found.ball !== null) throw new Error(`pickups failed: ${JSON.stringify(found)}`);

  // repel runs out with a message
  await run(`g.warp('dev_town', 12, 8, 'down'); await settle(); g.state.repelSteps = 1; await step('down');`);
  if ((await run('return g.top()')) !== 'message') throw new Error('no message when the repel ran out');
  await run(`await mash();`);

  // ledge hop (2 tiles down)
  await run(`g.warp('dev_town', 2, 8, 'down'); await settle(); await step('down');`);
  expectPos(await run('return pos()'), { map: 'dev_town', x: 2, y: 10 }, 'ledge hop');

  // tall grass encounter
  const enc = await run(`
    g.warp('dev_town', 16, 10, 'right'); await settle();
    for (let i = 0; i < 80; i++) {
      await step(i % 2 ? 'left' : 'right');
      if (g.top() !== 'overworld') return { steps: i + 1, stack: g.stack() };
    }
    return null;
  `);
  if (!enc) throw new Error('no wild encounter in 80 grass steps');
  await run(`await mash();`);

  // connection north to dev_route
  await run(`g.warp('dev_town', 12, 1, 'up'); await settle(); await walk('UU');`);
  expectPos(await run('return pos()'), { map: 'dev_route', x: 6, y: 15, facing: 'up' }, 'north connection');
  await run(`await g.advance(20);`);
  await h.shot('out/e2e/10-route.png');
  await run(`await walk('D');`);
  expectPos(await run('return pos()'), { map: 'dev_town', x: 12, y: 0 }, 'south connection back');

  // losing a battle blacks out: back at lastHeal (Heilstation), party healed, half the money gone
  const lost = await run(`
    g.state.party = []; g.give('sproessli', 2); g.state.party[0].hp = 1;
    const money = g.state.money;
    ow().enqueue(() => ow().ctx.wildBattle('munggli', 12));
    await mash();
    const c = g.state.party[0];
    return { money, after: g.state.money, pos: pos(), hp: c.hp };
  `);
  expectPos(lost.pos, { map: 'dev_center', x: 5, y: 3, facing: 'up' }, 'blackout respawn');
  if (lost.after !== lost.money - Math.floor(lost.money / 2) || lost.hp <= 1) throw new Error(`blackout: ${JSON.stringify(lost)}`);
}
