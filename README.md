# 萌宠防线 3 · Pet Pals Defense 3 (gen-3 prototype)

2.5D crayon-diorama prototype of Pet Pals Defense (gen-2 cardboard-standee art style). The battle rules are the gen-1 tower-defense loop (v2.9.12 numbers), and the controllable protagonist from the gen-2 test build (v20 numbers) fights alongside the pets.

- Play: https://carden1218-create.github.io/pet-pals-defense-3/
- Tech: Canvas 2D, plain ES modules, no build step. Art: the gen-1 crayon sprites glued onto gen-2 paper-craft cardboard standees (`js/paper-craft.js`).
- Save data: `localStorage["ppd3-save-v1"]` only. It never reads or writes gen-1 saves.

## Controls
- Desktop: WASD / arrow keys move the hero · Q / E / R cast hero skills · P pauses.
- Phone: joystick bottom-left, skill buttons bottom-right.
- Before wave 1: tap a pet card, then a field slot. Tap a pet on the field to bench it. Then tap **开战 / Fight**.
- In battle:
  - tap a pet to level it up or revive it;
  - the white ⚡ button → tap a pet → confirm → hit the green zone (gen-1 v2.4 ultimate);
  - tap dropped items to pick them up, then drag or tap them onto a pet.

## Files
- `js/data.js`: gen-1 pets, slimes, maps, wave specs, v2.4 tables, and the gen-2 hero data.
- `js/sim.js`: the battle simulation in gen-1 field pixels (540×724). The protagonist section mirrors gen-2.
- `js/paper-craft.js`: gen-2 crayon / cardboard standee pipeline.
- `js/render.js`: the 2.5D diorama board (orchard / beach / volcano), standees, per-hero skill FX, and the 2D overlay.
- `js/ui.js`, `js/main.js`, `css/style.css`: the UI and the main loop.
