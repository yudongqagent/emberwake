# Emberwake

A story-driven strategic RPG inspired by the web novel *我的战舰能升级* ("My Warship
Can Level Up") — a reincarnated captain, an asymmetric AI-granted "system," and
warships as the measure of political power, adapted into an original setting and cast.

Fly freely between planets and jump lanes across an open galaxy, mine and trade at
stations, and fight tactical fleet battles — all wrapped around a real campaign with
named characters, faction politics, and branching choices.

Play it live: **https://yudongqagent.github.io/emberwake/**

## Design docs

Full design principles, world bible, systems design, architecture, coding guidelines,
and the complete chapter-by-chapter story line for all five acts live in
[`docs/`](docs/README.md).

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm test         # vitest
```

Deploys automatically to GitHub Pages on push to `main` via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Stack

Vite + TypeScript + Preact + Preact Signals, hand-rolled Canvas 2D rendering for the
open-world flight and combat views, synthesized WebAudio (no audio files), and
localStorage persistence. No backend — the deployed site is fully static.
