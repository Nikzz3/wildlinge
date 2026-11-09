/** Party screen: 2×3 creature cards; field (summary / reorder), battle switch, item target and pick modes. */
import type { GameContext, Gfx } from '../../core/contracts';
import type { Creature, ItemDef } from '../../core/types';
import { displayName, maxHp } from '../../creature';
import { getItem } from '../../data';
import {
  choose, colorText, drawBackdrop, drawCreatureIcon, drawHpBar, drawStatusPill, labelText, mutedText, PAL, promptBox,
  Screen, shade, text,
} from './common';
import { isHealthy, type ItemPreview, itemPreview } from './logic';
import { openSummary } from './summary';

export type PartyMode =
  /** Field: view summary, reorder, use field items. */
  | { kind: 'field' }
  /** Battle: pick a creature to switch in (forced = cannot cancel). Disallows fainted / active. */
  | { kind: 'battleSwitch'; activeIndex: number; forced: boolean }
  /** Pick a target for an item (shows whether it would have an effect). */
  | { kind: 'itemTarget'; itemId: string }
  /** Generic pick (e.g. scripts). */
  | { kind: 'pick'; title: string };

/**
 * Called when a creature is chosen in itemTarget mode while the party screen stays visible.
 * Return true to close the screen with that index, false to keep choosing.
 */
export type PartyPickHandler = (index: number) => Promise<boolean>;

const CARD_W = 117;
const CARD_H = 41;
const SLOTS = 6;
/** Status pill position inside a card (right end of the level line). */
const PILL_X = CARD_W - 30;

function cardPos(i: number): { x: number; y: number } {
  return { x: 2 + (i % 2) * (CARD_W + 2), y: 2 + Math.floor(i / 2) * (CARD_H + 1) };
}

type CardLook = 'normal' | 'selected' | 'fainted' | 'swap';

const CARD_COLORS: Record<CardLook, { frame: string; inner: string; fill: string }> = {
  normal: { frame: PAL.frame, inner: PAL.inner, fill: PAL.fill },
  selected: { frame: '#b84020', inner: '#f0a070', fill: '#fff2dc' },
  fainted: { frame: '#585858', inner: '#a8a8a0', fill: '#d4d4cc' },
  swap: { frame: '#2858a8', inner: '#88a8e0', fill: '#e6eeff' },
};

function drawCard(gfx: Gfx, x: number, y: number, look: CardLook): void {
  const c = CARD_COLORS[look];
  gfx.fillRect(x + 1, y, CARD_W - 2, CARD_H, c.frame);
  gfx.fillRect(x, y + 1, CARD_W, CARD_H - 2, c.frame);
  gfx.fillRect(x + 2, y + 2, CARD_W - 4, CARD_H - 4, c.inner);
  gfx.fillRect(x + 3, y + 3, CARD_W - 6, CARD_H - 6, c.fill);
  // soft colored strip behind the icon
  gfx.fillRect(x + 3, y + 3, 26, CARD_H - 6, shade(c.inner, 1.45));
}

class PartyScreen extends Screen {
  readonly name = 'party';
  private index = 0;
  private swapFrom: number | null = null;
  private promptOverride: string | null = null;
  private readonly item: ItemDef | null;
  /** itemTarget previews per creature uid, recomputed only when the creature changed. */
  private readonly previews = new Map<number, { key: string; preview: ItemPreview }>();

  constructor(
    g: GameContext,
    private readonly mode: PartyMode,
    private readonly close: (r: number | null) => void,
    private readonly onPick?: PartyPickHandler,
  ) {
    super();
    this.item = mode.kind === 'itemTarget' ? getItem(mode.itemId) : null;
    if (mode.kind === 'battleSwitch') {
      const first = g.state.party.findIndex((c, i) => i !== mode.activeIndex && isHealthy(c));
      this.index = Math.max(0, first);
    }
  }

  private get cancelable(): boolean {
    return !(this.mode.kind === 'battleSwitch' && this.mode.forced);
  }

  protected step(g: GameContext): void {
    const n = g.state.party.length;
    if (n === 0) {
      if (g.input.pressed('a') || g.input.pressed('b')) {
        g.audio.playSfx('cancel');
        this.close(null);
      }
      return;
    }
    this.index = Math.min(this.index, n - 1);
    if (this.navigate(g, n)) return;
    if (g.input.pressed('a')) {
      g.audio.playSfx('confirm');
      const i = this.index;
      this.run(() => this.choose(g, i));
    } else if (g.input.pressed('b')) {
      if (this.swapFrom !== null) {
        g.audio.playSfx('cancel');
        this.swapFrom = null;
      } else if (this.cancelable) {
        g.audio.playSfx('cancel');
        this.close(null);
      } else g.audio.playSfx('bump');
    }
  }

  /** 2-column grid navigation. Returns true if a direction was handled. */
  private navigate(g: GameContext, n: number): boolean {
    const i = this.index;
    let next = i;
    if (g.input.repeat('left') || g.input.repeat('right')) next = (i ^ 1) < n ? i ^ 1 : i;
    else if (g.input.repeat('up')) {
      next = i - 2;
      if (next < 0) {
        next = i % 2;
        while (next + 2 < n) next += 2;
      }
    } else if (g.input.repeat('down')) next = i + 2 < n ? i + 2 : i % 2;
    else return false;
    if (next !== i) {
      this.index = next;
      g.audio.playSfx('cursor');
    }
    return true;
  }

  private async choose(g: GameContext, i: number): Promise<void> {
    const party = g.state.party;
    const c = party[i];
    if (!c) return;
    const mode = this.mode;
    switch (mode.kind) {
      case 'field':
        if (this.swapFrom !== null) return this.finishSwap(g, i);
        return this.fieldMenu(g, i, c);
      case 'battleSwitch':
        return this.switchMenu(g, i, c, mode.activeIndex);
      case 'itemTarget':
        if (!this.onPick || (await this.onPick(i))) this.close(i);
        return;
      case 'pick':
        this.close(i);
        return;
    }
  }

  private async withPrompt<T>(prompt: string, fn: () => Promise<T>): Promise<T> {
    this.promptOverride = prompt;
    try {
      return await fn();
    } finally {
      this.promptOverride = null;
    }
  }

  private async fieldMenu(g: GameContext, i: number, c: Creature): Promise<void> {
    const options = g.state.party.length > 1 ? ['STATUS', 'TAUSCHEN', 'ZURÜCK'] : ['STATUS', 'ZURÜCK'];
    const r = await this.withPrompt(`Was tun mit ${displayName(c)}?`, () => choose(g, options, { bottom: 128 }));
    const picked = options[r];
    if (picked === 'STATUS') this.index = await openSummary(g, g.state.party, i);
    else if (picked === 'TAUSCHEN') this.swapFrom = i;
  }

  private finishSwap(g: GameContext, i: number): void {
    const from = this.swapFrom;
    this.swapFrom = null;
    if (from === null || from === i) return;
    const party = g.state.party;
    const a = party[from];
    const b = party[i];
    if (!a || !b) return;
    party[from] = b;
    party[i] = a;
  }

  private async switchMenu(g: GameContext, i: number, c: Creature, active: number): Promise<void> {
    const options = ['EINWECHSELN', 'STATUS', 'ZURÜCK'];
    const r = await this.withPrompt(`Was tun mit ${displayName(c)}?`, () => choose(g, options, { bottom: 128 }));
    if (r === 1) this.index = await openSummary(g, g.state.party, i);
    if (r !== 0) return;
    if (!isHealthy(c)) await g.ui.message(`${displayName(c)} ist kampfunfähig!`);
    else if (i === active) await g.ui.message(`${displayName(c)} kämpft bereits!`);
    else this.close(i);
  }

  private prompt(): string {
    if (this.promptOverride) return this.promptOverride;
    if (this.swapFrom !== null) return 'Mit wem tauschen?';
    switch (this.mode.kind) {
      case 'field':
        return 'Wähle einen Wildling.';
      case 'battleSwitch':
        return this.mode.forced ? 'Wen schickst du in den Kampf?' : 'Wen einwechseln?';
      case 'itemTarget':
        return `${this.item?.name ?? 'Item'}: Für wen?`;
      case 'pick':
        return this.mode.title;
    }
  }

  render(gfx: Gfx, g: GameContext): void {
    drawBackdrop(gfx, g, 'teal');
    const party = g.state.party;
    for (let i = 0; i < SLOTS; i++) {
      const { x, y } = cardPos(i);
      const c = party[i];
      if (!c) {
        gfx.fillRect(x + 1, y + 1, CARD_W - 2, CARD_H - 2, '#28586040');
        gfx.strokeRect(x + 1, y + 1, CARD_W - 2, CARD_H - 2, '#f8f8f060');
        continue;
      }
      this.renderCard(gfx, g, c, i, x, y);
    }
    if (party.length === 0) promptBox(gfx, 'Du hast noch keine Wildlinge.', 128, 32, 'B Zurück');
    else promptBox(gfx, this.prompt(), 128, 32, this.cancelable && !this.isBusy ? 'B Zurück' : undefined);
  }

  private renderCard(gfx: Gfx, g: GameContext, c: Creature, i: number, x: number, y: number): void {
    const selected = i === this.index;
    const fainted = !isHealthy(c);
    const look: CardLook = i === this.swapFrom ? 'swap' : selected ? 'selected' : fainted ? 'fainted' : 'normal';
    drawCard(gfx, x, y, look);
    drawCreatureIcon(gfx, g, c.species, x + 4, y + 3, { active: selected, still: fainted, alpha: fainted ? 0.55 : 1 });
    const nameColor = fainted ? '#686868' : PAL.ink;
    colorText(gfx, displayName(c), x + 32, y + 0, nameColor);
    const lv = `Lv${c.level}`;
    labelText(gfx, lv, x + 32, y + 13);
    if (this.item) {
      const p = this.preview(c, this.item);
      if (p.ok) colorText(gfx, p.label, x + CARD_W - 6, y + 13, PAL.good, 'right');
      else mutedText(gfx, p.label, x + CARD_W - 6, y + 13, 'right');
    } else drawStatusPill(gfx, x + PILL_X, y + 16, c);
    if (this.mode.kind === 'battleSwitch' && i === this.mode.activeIndex) {
      // right after the level; skipped only if a 3-digit level and a status pill leave no room
      const ax = x + 32 + gfx.measureText(lv) + 3;
      const hasPill = fainted || c.status !== null;
      if (!hasPill || ax + gfx.measureText('AKTIV') + 2 <= x + PILL_X) colorText(gfx, 'AKTIV', ax, y + 13, PAL.accent);
    }
    const max = maxHp(c);
    labelText(gfx, 'LP', x + 6, y + 25);
    drawHpBar(gfx, x + 20, y + 32, 46, Math.max(0, c.hp), max);
    text(gfx, `${Math.max(0, c.hp)}/${max}`, x + CARD_W - 6, y + 25, 'right');
  }

  /** Cached itemPreview: it clones the creature, so it only runs again when HP / status / level / EN changed. */
  private preview(c: Creature, item: ItemDef): ItemPreview {
    const key = `${c.hp}|${c.status}|${c.level}|${c.moves.map((m) => m.pp).join(',')}`;
    const hit = this.previews.get(c.uid);
    if (hit?.key === key) return hit.preview;
    const preview = itemPreview(c, item);
    this.previews.set(c.uid, { key, preview });
    return preview;
  }
}

/** Party screen; onPick keeps the screen open while the caller applies an item (itemTarget mode). */
export function runParty(g: GameContext, mode: PartyMode, onPick?: PartyPickHandler): Promise<number | null> {
  return g.open<number | null>((close) => new PartyScreen(g, mode, close, onPick));
}
