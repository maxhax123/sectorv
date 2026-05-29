# Sector V Scratch Port

This folder contains a generated `.sb3` starter project for `Sector V: Chrono-Drift`.

- `sector-v-scratch-port.sb3` is the packaged Scratch/TurboWarp project.
- `build/port-data.json` and `build/port-summary.json` are generated from the current `index.html` data.
- `../tools/generate-scratch-port.js` rebuilds the package contents.
- `.sb3` files are ZIP-based Scratch project containers with a `project.json` file plus hashed asset files inside.

The Scratch project currently ports the game's identity, boss roster, challenge data, loadout names, upgrade names, achievements, arena backdrop, player movement, firing loop, menu selection, and a basic boss encounter shell into native Scratch blocks so it can be extended further from a reproducible base.
