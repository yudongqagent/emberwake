# Emberwake — Architecture

## Spatial model: two tiers

The open-map requirement (free movement between planets and galaxies, activities
triggered by flying up to things rather than menu selection) drives the core
architecture. There are two nested spatial scales:

### 1. Galaxy graph (macro)

A galaxy is a graph: **nodes = systems**, **edges = jump lanes**. The Galaxy view is a
zoomed-out, pannable/zoomable DOM+SVG or Canvas view showing systems as nodes,
connected by lanes, with simple state per node (discovered / undiscovered, faction
control, any active event marker). Traveling along a lane triggers a short jump
transition (a few seconds, animated, interruption-free) and loads the destination
System view. Multiple galaxies are reachable once unlocked; a galaxy-select view sits
one level above the graph (effectively a graph of graphs, but rendered as a distinct
"which region" selector to keep it legible rather than one enormous nested map).

```ts
interface SystemNode {
  id: string;
  galaxyId: string;
  name: string;
  position: { x: number; y: number }; // graph layout position
  controllingFaction: FactionId | null;
  discovered: boolean;
  pois: PoiId[]; // populated lazily when entered
}

interface JumpLane {
  from: string; // SystemNode id
  to: string;
  locked: boolean; // e.g. gated by story flag or Hull Class requirement
}
```

### 2. System view (micro, free-flight)

Inside a system, the player's ship exists in continuous 2D space (Canvas-rendered,
top-down). Movement is click/tap-to-set-heading with simple thrust-toward-target
physics (not full Newtonian drift — responsive and readable takes priority over
simulation fidelity), or WASD/left-stick-equivalent on desktop, and a touch drag/virtual
stick on mobile. Points of interest are positioned entities in this space:

```ts
type PoiKind = "planet" | "station" | "asteroidField" | "derelict" | "patrol" | "riftGate";

interface Poi {
  id: string;
  kind: PoiKind;
  position: { x: number; y: number };
  interactionRadius: number; // how close triggers the context prompt
  state: Record<string, unknown>; // e.g. asteroidField: { remaining: number }
}
```

Flying within `interactionRadius` of a POI surfaces a lightweight context prompt
(Dock / Mine / Hail / Scan / Engage as applicable) — never a hard stop or forced modal.
A `patrol` POI has its own detection radius; entering it starts combat automatically
(with a brief warning beat, not an instant ambush) rather than requiring a manual
"Engage."

## Encounter/trigger system

A single `EncounterTrigger` engine evaluates, on every System-view tick and on system
entry, whether any of the following should fire:

- **Proximity triggers** — player position vs. POI interaction/detection radius.
- **Flag triggers** — story flags set by prior chapters that spawn a POI (e.g. Act I
  Ch.2's distress signal only exists once the Ch.1 flag is set) or open a jump lane.
- **First-entry triggers** — one-time events when a system is entered for the first
  time (used for chapter-opening beats).
- **Ambient table** — a light per-galaxy weighted random table (derelicts, minor
  patrols, distress calls) that can spawn a POI on system entry when no story trigger
  is pending, so already-unlocked galaxies stay alive to revisit.

This keeps story content, mining, trade, and combat unified under "what's in this
system right now," rather than separate subsystems that each need their own entry
point.

## State

- **Preact Signals** hold the single source of runtime truth: player fleet (ships,
  equipped modules, assigned crew), resource totals, story flags, per-galaxy discovery
  state, per-POI state (e.g. an asteroid field's remaining yield, a defeated patrol).
- Screens/components read signals directly — no prop-drilling, no separate global
  store library.
- `engine/` modules (combat resolution, economy math, map/route logic) are pure
  functions operating on plain data, independent of Preact — this is what Vitest
  targets, and it's what keeps combat/economy logic testable without mounting
  components.

## Rendering split

- **Canvas 2D**: System free-flight view, combat view. Anything with continuous motion
  and lots of moving entities.
- **DOM/CSS**: Galaxy graph view, Bridge hub, Fleet/Modules/Crew/Trade screens, VN-style
  story dialogue. Anything that's fundamentally a layout of readable panels.
- The two share the same design-token stylesheet so switching between them doesn't
  break the holographic visual language.

## Screens

| Screen | Kind | Purpose |
|---|---|---|
| Bridge | DOM | Hub — ship status, crew roster glance, jump to Galaxy view |
| Galaxy view | DOM/SVG | Jump-lane graph, galaxy-to-galaxy travel |
| System view | Canvas | Free-flight, POI interaction, combat/encounter entry point |
| Fleet | DOM | Hangar (drawn ship roster), Hull Class refit, Rarity/Aptitude (via Scan), loadout overview |
| Modules | DOM | Draw/acquisition, socketing, Power Draw budget, trait rolls, Lock (Insight spend) |
| Crew | DOM | Roster, recruitment (named unlocks + generic beacon), approval |
| Trade | DOM | Station market — opened by docking, not from a global menu |
| Story | DOM (overlay) | VN-style dialogue/choice scenes, triggered by flags/entry |
| Combat | Canvas | Turn-based battle, range bands, abilities |

## Save system

- `{ schemaVersion, fleet, resources, storyFlags, galaxies, crew }` shape,
  localStorage-backed.
- Migration functions in `engine/save/migrations/` applied in sequence on load; see
  `docs/coding-guidelines.md`.
- Autosave triggers: chapter/beat completion, galaxy jump, dock/undock, ship Draw,
  Hull Class refit.

## Audio

- One `AudioEngine` module wrapping WebAudio: a small synth layer (oscillator +
  noise-based instruments) driving both ambient system-view drones and combat/UI SFX.
  No `<audio>` tags, no sample files, ever.

## Build & deploy

- Vite build, static output. `base` path set for GitHub Pages project-site routing.
- GitHub Actions workflow builds on push to `main` and deploys via
  `actions/deploy-pages`. No server, no environment secrets required.
