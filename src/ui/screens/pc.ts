/** PC "Wildlinge-Box": deposit / withdraw between party and box. */
import { creatureSprite, icon } from '../../art';
import type { GameContext, Gfx } from '../../core/contracts';
import { type Creature, TYPE_COLORS } from '../../core/types';
import { displayName, maxHp } from '../../creature';
import { getSpecies } from '../../data';
import { PARTY_MAX } from '../../state';
import {
  choose, drawBackdrop, drawCreatureIcon, drawHeader, drawHpBar, drawRowHighlight, drawScrollbar, drawStage,
  drawStatusPill, drawTypePill, HEADER_H, labelText, ListCursor, mutedText, Screen, text, TYPE_PILL_W, withBackdrop,
} from './common';
import { isHealthy } from './logic';
import { openSummary } from './summary';

type Direction = 'deposit' | 'withdraw';

const ROWS = 5;
const ROW_H = 25;
const LIST = { x: 96, y: HEADER_H + 2, w: 142, h: ROWS * ROW_H + 13 } as const;

class PcListScreen extends Screen {
  readonly name = 'pc-list';
  private readonly cursor: ListCursor;

  constructor(
    g: GameContext,
    private readonly dir: Direction,
    private readonly close: () => void,
  ) {
    super();
    this.cursor = new ListCursor(this.list(g).length + 1, ROWS);
  }

  private list(g: GameContext): Creature[] {
    return this.dir === 'deposit' ? g.state.party : g.state.box;
  }

  protected step(g: GameContext): void {
    const list = this.list(g);
    this.cursor.setCount(list.length + 1);
    if (this.cursor.update(g)) return;
    if (g.input.pressed('a')) {
      const i = this.cursor.index;
      if (!list[i]) {
        g.audio.playSfx('cancel');
        this.close();
        return;
      }
      g.audio.playSfx('confirm');
      this.run(() => this.act(g, i));
    } else if (g.input.pressed('b')) {
      g.audio.playSfx('cancel');
      this.close();
    }
  }

  private async act(g: GameContext, i: number): Promise<void> {
    const verb = this.dir === 'deposit' ? 'ABLEGEN' : 'HOLEN';
    const r = await choose(g, [verb, 'STATUS', 'ZURÜCK'], { bottom: 158 });
    if (r === 1) this.cursor.select(await openSummary(g, this.list(g), i));
    else if (r === 0) await (this.dir === 'deposit' ? deposit(g, i) : withdraw(g, i));
    this.cursor.setCount(this.list(g).length + 1);
  }

  render(gfx: Gfx, g: GameContext): void {
    drawBackdrop(gfx, g, 'green');
    const list = this.list(g);
    drawHeader(gfx, this.dir === 'deposit' ? 'ABLEGEN' : 'HOLEN', `Team ${g.state.party.length}/${PARTY_MAX}  Box ${g.state.box.length}`);
    this.renderPreview(gfx, g, list[this.cursor.index]);
    const { x, y, w, h } = LIST;
    gfx.drawWindow(x, y, w, h);
    this.cursor.visible().forEach((i, row) => {
      const ry = y + 6 + row * ROW_H;
      const selected = i === this.cursor.index;
      if (selected) {
        drawRowHighlight(gfx, x + 3, ry, w - 6, ROW_H);
        gfx.drawBitmap(icon('cursor'), x + 5, ry + 8);
      }
      const c = list[i];
      if (!c) return text(gfx, 'ZURÜCK', x + 16, ry + 4);
      drawCreatureIcon(gfx, g, c.species, x + 14, ry, { active: selected, still: !isHealthy(c) });
      // name with the level below (like the party cards), so long nicknames have the full row width
      text(gfx, displayName(c), x + 40, ry - 2);
      labelText(gfx, `Lv${c.level}`, x + 40, ry + 9);
    });
    if (list.length === 0) mutedText(gfx, this.dir === 'deposit' ? 'Kein Wildling' : 'Die Box ist leer.', x + 16, y + 6 + ROW_H + 4);
    drawScrollbar(gfx, x + w - 7, y + 6, h - 12, this.cursor);
  }

  private renderPreview(gfx: Gfx, g: GameContext, c: Creature | undefined): void {
    const x = 2;
    const y = HEADER_H + 2;
    const w = 92;
    gfx.drawWindow(x, y, w, LIST.h);
    if (!c) {
      drawStage(gfx, x + 3, y + 3, w - 6, 60, '#a0a8b0');
      return;
    }
    const sp = getSpecies(c.species);
    drawStage(gfx, x + 3, y + 3, w - 6, 60, TYPE_COLORS[sp.types[0]]);
    const bob = isHealthy(c) ? Math.floor(g.frame / 30) % 2 : 0;
    gfx.drawBitmap(creatureSprite(c.species, 'front'), x + 22, y + 10 - bob);
    text(gfx, displayName(c), x + w / 2, y + 63, 'center');
    labelText(gfx, `Lv${c.level}`, x + 7, y + 79);
    drawStatusPill(gfx, x + w - 33, y + 82, c);
    sp.types.forEach((t, i) => drawTypePill(gfx, x + 3 + i * (TYPE_PILL_W + 1), y + 100, t));
    drawHpBar(gfx, x + 8, y + 122, w - 16, Math.max(0, c.hp), maxHp(c));
  }
}

async function deposit(g: GameContext, i: number): Promise<void> {
  const party = g.state.party;
  const c = party[i];
  if (!c) return;
  if (!party.some((other, j) => j !== i && isHealthy(other))) {
    return g.ui.message('Du brauchst mindestens einen kampffähigen Wildling im Team!');
  }
  party.splice(i, 1);
  g.state.box.push(c);
  g.audio.playSfx('confirm');
  await g.ui.message(`${displayName(c)} wurde in der Box abgelegt.`);
}

async function withdraw(g: GameContext, i: number): Promise<void> {
  const box = g.state.box;
  const c = box[i];
  if (!c) return;
  if (g.state.party.length >= PARTY_MAX) return g.ui.message('Dein Team ist schon voll!');
  box.splice(i, 1);
  g.state.party.push(c);
  g.audio.playSfx('confirm');
  await g.ui.message(`${displayName(c)} ist jetzt in deinem Team.`);
}

function drawPcTitle(gfx: Gfx, g: GameContext): void {
  gfx.drawWindow(2, 2, 124, 40);
  text(gfx, 'Wildlinge-Box', 10, 4);
  labelText(gfx, `${g.state.box.length} ${g.state.box.length === 1 ? "Wildling" : "Wildlinge"}`, 10, 20);
}

export function runPc(g: GameContext): Promise<void> {
  return withBackdrop(g, 'pc', drawPcTitle, async () => {
    g.audio.playSfx('menu_open');
    await g.ui.message('{PLAYER} schaltet den PC ein.\nDie Wildlinge-Box ist bereit.');
    let prompt = 'Was möchtest du tun?';
    for (;;) {
      const r = await g.ui.ask(prompt, ['ABLEGEN', 'HOLEN', 'ZURÜCK']);
      if (r === 0) await g.open<void>((close) => new PcListScreen(g, 'deposit', () => close()));
      else if (r === 1) {
        if (g.state.box.length === 0) await g.ui.message('Die Box ist leer.');
        else await g.open<void>((close) => new PcListScreen(g, 'withdraw', () => close()));
      } else break;
      prompt = 'Möchtest du noch etwas tun?';
    }
    g.audio.playSfx('cancel');
  });
}
