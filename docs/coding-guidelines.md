# Emberwake — Coding Guidelines

## Stack

- **Vite + TypeScript**, strict mode on (`strict: true`, no `any` without a comment
  explaining why it's unavoidable).
- **Preact** (not React) for UI components — function components and hooks only, no
  class components. Chosen for footprint (~4kb) while keeping component ergonomics for
  a multi-screen app.
- **Preact Signals** for shared game state (fleet, resources, story flags, galaxy
  state). Avoid prop-drilling; a screen reads the signals it needs directly.
- **Canvas 2D** (no WebGL, no Three.js) for the System free-flight view and combat
  rendering. Everything else (Galaxy graph view, Trade/Crew/Fleet/Modules screens, VN
  dialogue) is DOM/CSS.
- **WebAudio API** directly for all sound — oscillators/noise nodes, synthesized only.
  No audio files, no sample libraries.
- **No CSS framework.** A single design-tokens stylesheet (CSS custom properties) plus
  component-scoped CSS files.
- **Vitest** for logic-heavy modules: combat resolution, economy math, save
  migration, map/route logic. Not chasing coverage on UI components.

Keep the dependency list short enough to read in one sitting. Before adding a new
package, ask: could this be ~100 lines of our own code instead? If yes, write the 100
lines.

## File organization (by feature, not by type)

```
src/
  data/           # declarative game content: ships, modules, crew, story, galaxies
    ships.ts
    modules.ts
    crew.ts
    galaxies/
      bauhinia-reach.ts
      ...
    story/
      act-1.ts
      ...
  engine/         # pure logic, framework-agnostic, unit-testable
    combat/
    economy/
    map/
    save/
  state/          # Preact signals, the single source of runtime truth
  ui/
    screens/      # Bridge, GalaxyMap, SystemView, Fleet, Modules, Crew, Trade, Story, Combat
    components/   # shared building blocks (panels, icons, meters, dialogs)
    tokens.css
  audio/          # synth engine + sound-event definitions
  main.tsx
```

Game *content* (ship stats, module tables, crew definitions, chapter text/beats)
lives in `data/` as plain TypeScript objects/arrays — never hardcoded inside a
component. A screen should be able to render any ship/module/crew purely from its
data shape.

## Conventions

- **Naming**: PascalCase for components and types, camelCase for functions/variables,
  kebab-case for file names except component files (`ShipCard.tsx` matches its export).
- **No premature abstraction.** Three similar screens don't need a shared
  `GenericListScreen<T>` until a fourth one actually needs the same shape — duplicate
  first, extract when the pattern is proven.
- **No feature flags or compatibility shims.** This is a single-deploy static site with
  one save-schema version in flight at a time (plus explicit migration functions, see
  below) — change code directly rather than branching around it.
- **Comments explain *why*, never *what*.** If a comment describes what the next line
  does, delete the comment or rename the thing instead.
- **Story content is data, not logic.** Chapter beats, dialogue, and choice
  consequences are declarative data structures interpreted by a small story-engine
  module — never `if` chains hardcoding narrative text.

## Save system

- Save shape is versioned: `{ schemaVersion: number, ...state }`.
- A `migrations/` module maps `schemaVersion -> schemaVersion+1` functions, applied in
  order on load. Never mutate old save shapes in place in the type definitions —
  add a migration instead.
- Autosave on: chapter/beat completion, galaxy jump, returning to a station/planet,
  ship Draw, Hull Class refit. Not on every tick.

## Testing

- Unit test `engine/` modules with Vitest: combat damage/turn resolution, economy
  (prices, yields, upgrade costs), map/route validity, save migrations.
- No snapshot-testing UI components. If a screen needs a regression check, write an
  interaction test around the underlying signal/state changes it triggers, not the
  rendered markup.
- Run `vitest run` and `tsc --noEmit` before every commit that touches `engine/` or
  `data/`.

## Commits

- One logical change per commit (see the phased build plan in the project's main
  design conversation / PR description). Each phase commit should leave the app in a
  runnable, non-broken state.
- Commit messages: imperative mood, explain why when it's not obvious from the diff
  (`Add combat range-band gating` not `Update Combat.tsx`).

## Git workflow / deploy

- `main` is always deployable. GitHub Actions builds on push and publishes to Pages.
- No secrets, no server-side code, no environment-specific config beyond the Vite
  `base` path for Pages.
