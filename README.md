# Wildlinge – Alpenglühen

Ein eigenständiges Monster-Sammel-Rollenspiel im Stil der Handheld-Klassiker der 2000er:
240 × 160 Pixel, Chiptune-Musik, rundenbasierte Kämpfe – angesiedelt in **Alvenland**, einer
Alpenregion voller Täler, Seen und Gletscher. Du suchst dir einen jungen Wildling aus, fängst
weitere im hohen Gras, holst dir in vier Hallen die Abzeichen und stellst dich auf dem Gipfelhorn
dem Frostmantel, der die Alpenglut löschen will.

Wildlinge ist ein **Originalspiel**. Figuren, Wildlinge, Orte, Texte, Pixelgrafik und Musik sind
in diesem Repository von Grund auf neu entstanden. Das Spiel steht in keiner Verbindung zu
bestehenden Spielereihen oder Marken und wird von deren Rechteinhabern weder unterstützt noch
geprüft.

## Umfang: das komplette Spiel

Vier Kapitel, vier Hallen und das Finale auf dem Gipfel (etwa 2 Stunden):

1. **Moosbach → Pfad 1 → Kieselstadt** – Professorin Arvens Labor, die Wahl deines Partners
   (Sprössli, Zündli oder Biberli), der erste Kampf gegen deinen Rivalen; **Halle 1** (Erde, Hüter Jost).
2. **Pfad 2 → Flüsterwald → Seewil** – der Rivale am Waldrand, der **Frostmantel** testet im Wald etwas
   sehr Kaltes, Forscher Matti hat den dritten Partner für dich; **Halle 2** (Wasser, Hüterin Undine).
3. **Pfad 3 → Glimmerhöhle → Funkenstadt** – das Seeufer, eine Kristallhöhle voller Bergleute, eine
   Stadt unter Strom; Kommandantin Bise hält das **Funkenwerk** besetzt; **Halle 3** (Blitz, Hüterin Zita).
4. **Pfad 4 → Frostalp → Gipfelpfad → Gipfelhorn** – hinauf in den Schnee, der Rivale am Dorfeingang,
   **Halle 4** (Frost, Hüterin Firna), der Bergretter mit Tee, Bise am Pass – und oben an der **Alpenglut**
   Anführer Eisner, der letzte Kampf gegen deinen Rivalen und **Lindglut**, der Wächter der Flamme.

Nach dem Abspann geht es mit „Weiter“ im Gasthaus in Frostalp weiter – endlich mit heißer Schokolade.

Kleiner Tipp: Jeder Partner spielt sich anders. Fang unterwegs neue Wildlinge – gegen Bise, Eisner und
die Hüterinnen hilft ein Team, das mehr als einen Typ abdeckt. Und kauf vor dem Gipfel gut ein!

## Steuerung

| Taste | Funktion |
|---|---|
| Pfeiltasten oder W A S D | Bewegen, Cursor |
| Z, Y, Leertaste oder J | **A** – bestätigen, sprechen, untersuchen |
| X, Rücktaste, K oder Esc | **B** – abbrechen; gedrückt halten zum Rennen |
| Enter | **START** – Menü (Lexikon, Team, Beutel, Trainerpass, Speichern, Optionen) |
| Umschalt oder Tab | **SELECT** |

Im Optionsmenü lassen sich Textgeschwindigkeit, Lautstärke und Kampfanimationen einstellen.
Vollbild: Menü *Ansicht → Vollbild*.

## Starten

Voraussetzung: ein aktuelles [Node.js](https://nodejs.org/) (entwickelt mit Node 24).

```sh
npm install      # Abhängigkeiten installieren
npm start        # bauen und als Desktop-App (Electron) starten
```

Das gebaute Spiel (`dist/index.html`) läuft auch in einem normalen Browser; der Spielstand
liegt dann im `localStorage`.

### Desktop-App erstellen

```sh
npm run package  # erstellt release/Wildlinge-<plattform>-<arch>/ (Standard: aktuelles System)
npm run package -- win32 x64  # Windows-Version (geht auch vom Mac aus)
npx tsx scripts/make-icon.ts   # App-Icons neu erzeugen (build/icon.png, .icns, .ico; braucht macOS)
```

## Spielstand

Gespeichert wird über *START → SPEICHERN*; nach dem Finale speichert das Spiel automatisch.
Die Desktop-App legt den Spielstand als `save.json` im Benutzerdatenordner ab:

- macOS: `~/Library/Application Support/wildlinge/save.json`
- Windows: `%APPDATA%\wildlinge\save.json`
- Linux: `~/.config/wildlinge/save.json`

## Entwicklung und Tests

```sh
npm run typecheck              # TypeScript (strict)
npm test                       # Vitest: Spiellogik, Daten, Karten, die Welt in Story-Reihenfolge
npm run e2e                    # bauen + Playwright-Szenarien in Chromium (scripts/e2e/*.mjs)
node scripts/e2e.mjs 50        # nur das komplette Kapitel 1 (CH1_STARTER=zuendli, CH1_SHOTS=1 für Screenshots)
node scripts/e2e.mjs 51        # nur das komplette Kapitel 2 (CH2_STARTER=…, CH2_SHOTS=1)
node scripts/e2e.mjs 52        # nur das komplette Kapitel 3 (CH3_STARTER=…, CH3_SHOTS=1 → out/shots/ch34/)
node scripts/e2e.mjs 53        # Kapitel 4, Finale, Abspann, „Weiter“ (CH4_STARTER=…, CH4_SHOTS=1 → out/shots/ch34/)
node scripts/e2e.mjs fuzz      # Zufallseingaben an Orten aus allen Kapiteln (FUZZ_SEEDS, FUZZ_FRAMES)
npx tsx scripts/balance-ch1.ts # Balance-Simulation von Kapitel 1 für alle drei Partner
npx tsx scripts/balance-ch4.ts # … bis Kapitel 4 (balance-ch2.ts, balance-ch3.ts entsprechend)
npx tsx scripts/balance-at.ts boss_eisner 37   # ein einzelner Kampf auf festem Level
npx tsx scripts/render-map.ts pfad_3 gipfelhorn   # Karten als PNG nach out/maps/
node scripts/electron-smoke.mjs [pfad/zur/app]   # Electron-Rauchtest
```

Code-Bezeichner und Kommentare sind englisch, alle Spieltexte deutsch. Aufbau, Stil und
Konventionen: `docs/DESIGN.md`; Welt und Geschichte: `docs/WORLD.md`.
