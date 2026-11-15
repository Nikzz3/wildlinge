/** Copy the save to another machine: export it as a file, or import one (only on the title screen, before a game runs). */
import type { GameContext } from '../../core/contracts';
import { downloadSave, parseSaveFile, pickSaveFile } from '../../engine/save-file';
import { playTime } from '../../state';
import type { SaveData } from '../../core/types';

const summary = (s: SaveData) => `${s.playerName}, ${s.badges.length} Abzeichen, Zeit ${playTime(s)}`;

export async function runSaveTransfer(g: GameContext, canImport: boolean): Promise<void> {
  const choices = canImport ? ['Exportieren', 'Importieren', 'Zurück'] : ['Exportieren', 'Zurück'];
  const pick = await g.ui.ask('Spielstand als Datei auf einen anderen Computer übertragen?', choices, {
    cancel: choices.length - 1,
  });
  if (choices[pick] === 'Exportieren') await exportSave(g);
  else if (choices[pick] === 'Importieren') await importSave(g);
}

async function exportSave(g: GameContext): Promise<void> {
  const json = g.exportSave();
  const data = json ? parseSaveFile(json) : null;
  if (!json || !data) return g.ui.message('Es gibt noch keinen gespeicherten Spielstand.');
  downloadSave(json);
  await g.ui.message(
    `Gespeicherter Spielstand exportiert:\n${summary(data)}.\fAuf dem anderen Computer im Titelbild unter OPTIONEN importieren.`,
  );
}

async function importSave(g: GameContext): Promise<void> {
  const json = await pickSaveFile();
  if (json === null) return;
  const data = parseSaveFile(json);
  if (!data) return g.ui.message('Diese Datei ist kein Wildlinge-Spielstand.');
  const overwrite = g.hasSave();
  const pick = await g.ui.ask(
    `Gefunden: ${summary(data)}.\f${overwrite ? 'Der bisherige Spielstand wird überschrieben! ' : ''}Importieren?`,
    ['Ja', 'Nein'],
    { initial: overwrite ? 1 : 0, cancel: 1 },
  );
  if (pick !== 0) return;
  if (!g.importSave(data)) return g.ui.message('Importieren fehlgeschlagen.');
  g.audio.playSfx('save');
  await g.ui.message('Spielstand importiert!');
}
