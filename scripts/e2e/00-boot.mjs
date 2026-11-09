export const name = 'boot: title screen renders without errors';

export async function run(h) {
  await h.run('await g.advance(30)');
  const stack = await h.run('return g.stack()');
  if (stack[0] !== 'title') throw new Error(`expected title scene, got ${JSON.stringify(stack)}`);
  await h.shot('out/e2e/00-title.png');
}
