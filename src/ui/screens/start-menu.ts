/** START menu on the right side with a help line at the bottom. Remembers the cursor between openings. */
import type { GameContext, Gfx } from '../../core/contracts';
import { Menu } from '../../engine/ui';
import { runBag } from './bag';
import { promptBox, Screen, W } from './common';
import { runDex } from './dex';
import { runOptions } from './options';
import { runParty } from './party';
import { runSaveMenu } from './save';
import { runTrainerCard } from './trainer-card';

type Entry = 'dex' | 'party' | 'bag' | 'card' | 'save' | 'options' | 'close';

const HELP: Record<Entry, string> = {
  dex: 'Alles über gesehene Wildlinge.',
  party: 'Zustand deiner Wildlinge prüfen.',
  bag: 'Hier bewahrst du deine Items auf.',
  card: 'Dein Trainerpass mit Abzeichen.',
  save: 'Deinen Spielstand sichern.',
  options: 'Tempo und Lautstärke einstellen.',
  close: 'Dieses Menü schließen.',
};

const MENU_W = 92;

let remembered: Entry = 'dex';

class StartMenuScreen extends Screen {
  readonly name = 'startmenu';
  override readonly overlay = true;
  private readonly entries: Entry[];
  private readonly menu: Menu;

  constructor(
    g: GameContext,
    private readonly close: () => void,
  ) {
    super();
    const hasParty = g.state.party.length > 0;
    this.entries = (['dex', 'party', 'bag', 'card', 'save', 'options', 'close'] as const).filter(
      (e) => hasParty || (e !== 'dex' && e !== 'party'),
    );
    const labels = this.entries.map((e) => label(g, e));
    this.menu = new Menu(labels, {
      x: W - MENU_W - 2,
      y: 2,
      width: MENU_W,
      initial: Math.max(0, this.entries.indexOf(remembered)),
      cancel: -1,
    });
  }

  protected step(g: GameContext): void {
    if (g.input.pressed('start')) {
      g.audio.playSfx('cancel');
      this.close();
      return;
    }
    const r = this.menu.update(g);
    remembered = this.entries[this.menu.index] ?? 'dex';
    if (r === null) return;
    const entry = this.entries[r];
    if (!entry || entry === 'close') this.close();
    else this.run(() => this.open(g, entry));
  }

  private async open(g: GameContext, entry: Exclude<Entry, 'close'>): Promise<void> {
    switch (entry) {
      case 'dex':
        return runDex(g);
      case 'party':
        await runParty(g, { kind: 'field' });
        return;
      case 'bag':
        await runBag(g, 'field');
        return;
      case 'card':
        return runTrainerCard(g);
      case 'save':
        if (await runSaveMenu(g)) this.close();
        return;
      case 'options':
        return runOptions(g);
    }
  }

  render(gfx: Gfx): void {
    // sub-flows (save dialog, full-screen menus) draw on their own; the menu would only clutter overlays
    if (this.isBusy) return;
    this.menu.render(gfx);
    promptBox(gfx, HELP[this.entries[this.menu.index] ?? 'close'], 128, 30);
  }
}

function label(g: GameContext, e: Entry): string {
  switch (e) {
    case 'dex':
      return 'LEXIKON';
    case 'party':
      return 'TEAM';
    case 'bag':
      return 'BEUTEL';
    case 'card':
      return g.state.playerName.toUpperCase();
    case 'save':
      return 'SPEICHERN';
    case 'options':
      return 'OPTIONEN';
    case 'close':
      return 'ZURÜCK';
  }
}

/** The caller (overworld) plays the 'menu_open' sfx. */
export function runStartMenu(g: GameContext): Promise<void> {
  return g.open<void>((close) => new StartMenuScreen(g, () => close()));
}
