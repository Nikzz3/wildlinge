# Contract changes

Additive changes to `src/core/*` after the initial contracts, newest first.

## Autosave

- `Scene.canAutosave?(): boolean`: new optional method. The engine autosaves every 2 minutes of
  play time, but only when the sole scene on the stack returns true (the overworld: no script
  running, player not mid-step). Scenes without it never trigger an autosave.

## Chapter 1 QA

- `BattleEvent` `'move'`: new optional field `miss?: boolean`. The engine now emits a `move` event
  with `miss: true` before "Die Attacke verfehlt ihr Ziel!" so the battle UI can play the `miss`
  sfx and a dodge instead of the hit animation. Consumers that ignore the field keep working.
- `TrainerDef.items` (doc comment only): healing items are now used by any trainer AI, not only
  `'smart'` (all Hüter play `'smart'` and drink their healing items). No type change.
