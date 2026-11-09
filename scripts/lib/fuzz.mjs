/**
 * Shared body of the fuzz scenarios (scripts/e2e/60-chapter1-fuzz.mjs, 61-chapter2-fuzz.mjs): from a prepared state
 * at a start spot, random inputs (mostly directions + A, some B / START / SELECT) for `frames` frames, then a
 * recovery phase (A through messages and battles, B out of menus, START in the name entry) that must reach a free
 * overworld or the title again. Returns the result; the scenario checks it and the runtime errors.
 */

/**
 * @param {*} h harness
 * @param {{ seed: number, frames: number, map: string, x: number, y: number, setup: string }} o
 *   setup = in-page JS that prepares g.state (after g.newGame) before the warp
 */
export async function fuzzOnce(h, { seed, frames, map, x, y, setup }) {
  return h.run(`
    ${setup}
    g.warp(${JSON.stringify(map)}, ${x}, ${y}, 'up');
    await g.advance(10);

    let s = ${seed} * 2654435761 >>> 0;
    const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const DIRS = ['up', 'down', 'left', 'right'];
    const scenes = new Set();
    for (let f = 0; f < ${frames}; ) {
      const p = rnd();
      const b = p < 0.64 ? DIRS[Math.floor(rnd() * 4)] : p < 0.88 ? 'a' : p < 0.97 ? 'b' : p < 0.99 ? 'start' : 'select';
      const hold = 1 + Math.floor(rnd() * (DIRS.includes(b) ? 30 : 3));
      const gap = 1 + Math.floor(rnd() * 4);
      g.down(b); await g.advance(hold); g.up(b); await g.advance(gap);
      f += hold + gap;
      scenes.add(g.top());
    }

    // recovery: get back to a free overworld (or the title)
    const ow = () => g.game.stack.find((sc) => sc.name === 'overworld');
    const free = () => g.top() === 'title' || (g.top() === 'overworld' && !ow().busy && !ow().player.moving);
    const MENUS = ['startmenu', 'bag', 'party', 'summary', 'dex', 'options', 'shop-buy', 'pc-list', 'trainer-card', 'menu', 'quantity'];
    let k = 0;
    let lastMenu = null;
    for (; k < 8000 && !free(); k++) {
      const top = g.top();
      const t = g.game.stack[g.game.stack.length - 1];
      if (top === 'name-entry') await g.tap('start');
      else if (top === 'party' && t.mode.kind === 'battleSwitch' && t.mode.forced) {
        // forced switch after a faint: B is refused, pick a healthy creature
        const ok = (g.state.party[t.index]?.hp ?? 0) > 0 && t.index !== t.mode.activeIndex;
        await g.tap(ok ? 'a' : 'right');
      } else if (top === 'menu' && g.game.stack.at(-2)?.mode?.forced) {
        await g.tap('a'); // a fresh menu starts on EINWECHSELN (up would wrap to ZURÜCK)
      } else if (top === 'forget-move' || MENUS.includes(top)) await g.tap('b');
      else if (top === 'message' && t.menu) {
        // B declines; a menu that cannot be declined (the intro's name choice) gets A on the second try
        await g.tap(t.menu === lastMenu ? 'a' : 'b');
        lastMenu = t.menu;
      }
      else if (top === 'overworld' || top === 'battle-transition' || top === 'alpenglow') await g.advance(1);
      else if (top === 'credits') await g.tap('a');
      else if (top === 'battle' && (t.bottom.kind === 'command' || t.bottom.kind === 'moves')) {
        // fight: KAMPF, then the first damaging move with EN left (a stuck cursor on Brummbass would loop)
        let target = 0;
        if (t.bottom.kind === 'moves') {
          const i = t.bottom.moves.findIndex((m) => m.pp > 0 && g.data.getMove(m.id).power > 0);
          target = i < 0 ? 0 : i;
        }
        await g.tap(target & 1 ? 'right' : 'left'); await g.tap(target >> 1 ? 'down' : 'up'); await g.tap('a');
      } else await g.tap('a');
    }
    return { free: free(), stack: g.stack(), recoveryTaps: k, scenes: [...scenes], pos: g.state.player, party: g.state.party.map((c) => c.hp) };
  `);
}

/** Runs `seeds` fuzz rounds over `spots` ([map, x, y, setup]) and fails on a soft-lock or runtime errors. */
export async function fuzzSpots(h, spots, { seeds, frames }) {
  const results = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const [map, x, y, setup] = spots[(seed - 1) % spots.length];
    const r = await fuzzOnce(h, { seed, frames, map, x, y, setup });
    results.push({ seed, map, ...r });
    if (!r.free) throw new Error(`soft-lock after fuzz seed ${seed} from ${map}: ${JSON.stringify(r)}`);
    const errors = await h.allErrors();
    if (errors.length) throw new Error(`runtime errors after seed ${seed} from ${map}:\n${errors.join('\n')}`);
  }
  console.log(`    ${results.map((r) => `seed ${r.seed} ${r.map}: ${r.scenes.join('/')} → ${r.stack.at(-1)} (${r.recoveryTaps} recovery steps)`).join('\n    ')}`);
}
