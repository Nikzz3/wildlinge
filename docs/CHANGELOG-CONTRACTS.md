# Contract changes

Additive changes to `src/core/*` after the initial contracts, newest first.

## Chapter 1 QA

- `BattleEvent` `'move'`: new optional field `miss?: boolean`. The engine now emits a `move` event
  with `miss: true` before "Die Attacke verfehlt ihr Ziel!" so the battle UI can play the `miss`
  sfx and a dodge instead of the hit animation. Consumers that ignore the field keep working.
- `TrainerDef.items` (doc comment only): healing items are now used by any trainer AI, not only
  `'smart'` (all Hüter play `'smart'` and drink their healing items). No type change.
