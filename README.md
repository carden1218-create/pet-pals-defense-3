# 萌宠防线 3 · Pet Pals Defense 3 (gen-3 prototype)

Real-3D prototype of Pet Pals Defense. The battle rules are the gen-1 tower-defense loop (v2.9.12 numbers), and the controllable protagonist from the gen-2 test build (v20 numbers) fights alongside the pets.

- Play: https://carden1218-create.github.io/pet-pals-defense-3/
- Tech: three.js 0.170 (vendored in `vendor/`, MIT), plain ES modules, no build step.
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
- `js/models.js`: toon models (merged primitives + outline hull).
- `js/fx3d.js`, `js/render.js`: the 3D scene, FX, and the 2D overlay.
- `js/ui.js`, `js/main.js`, `css/style.css`: the UI and the main loop.
