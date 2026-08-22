# Emberwake — Systems Design

How ship, module, crew, resource, and combat systems work individually, and how they
interlock over the campaign. Character/faction names are defined in
`docs/world-bible.md`; this doc is mechanics-only.

## Ship progression

### Hull Class — the story-gated axis

Every ship belongs to a **Hull Class**, named after the real naval escalation the
novel's "warship strength = political power" premise draws on: **Corvette-class
(护卫舰) → Destroyer-class (驱逐舰) → Cruiser-class (巡洋舰) → Battleship-class (战列舰)
→ Dreadnought-class (歼星舰) → Sovereign-class (主宰舰)**. Raising Hull Class requires
**both** enough Origin Essence **and** reaching the story beat that grants that refit —
see the unlock table below. This is the primary pacing lever: you cannot grind your way
to a higher class, only story unlocks it.

Every Hull Class has **all four slot types present from Corvette-class onward** — a
starting corvette is a real, balanced warship, not a weapon-only stub. What scales per
class is slot **count**:

| Hull Class | Unlocked at | Total slots | Power Core capacity |
|---|---|---|---|
| Corvette-class (护卫舰) | Game start | 4 (1W/1A/1E/1U) | Low |
| Destroyer-class (驱逐舰) | Act I, Ch.5 (Tiger's Reach) | 6 (2W/1A/1E/2U) | +tier |
| Cruiser-class (巡洋舰) | Act I, Ch.7 (Ember Rising, finale) | 8 (2W/2A/2E/2U) | +tier |
| Battleship-class (战列舰) | Act II, Ch.7 (The Reach Opens, finale) | 10 (3W/2A/2E/3U) | +tier |
| Dreadnought-class (歼星舰) | Act III, Ch.6 (Origin Tide, finale) | 12 (3W/3A/3E/3U) | +tier |
| Sovereign-class (主宰舰) | Act IV, Ch.6 (Deep Origin, finale) | 16 (4W/4A/4E/4U) | Max |

### Ships are drawn, and every ship is a unique instance

Ships are acquired the same way crew are: a **Draw** action at a station's Shipwright's
Dock costs Source Points and pulls one new ship. Draw pools are restricted to Hull
Classes at or below whatever the player has story-unlocked — you can't draw a
Dreadnought before Act III grants one, but Corvette/Destroyer/Cruiser stay drawable
after being outgrown, useful for Support-slot variety and scrap material.

Kade's starting ship, *Whisper*, is the one guaranteed non-drawn exception — a
Corvette-class hull at Salvage rarity, fitting its backstory. Every ship acquired after
it comes from a Draw.

Every draw produces a **unique ship instance** — not a copy of a shared template —
with two independently rolled properties on top of its Hull Class:

- **Rarity**: `Salvage → Standard → Reinforced → Advanced → Prototype → Ascendant`.
  Determines base stat quality within the class's range. Rolled and revealed to the
  player immediately on draw, same as a crew pull.
- **Aptitude**: `S / A / B / C / D`, hidden until **Scan** (the Cinder power) is used
  on that specific instance. Shapes how much the ship's stats grow per level. This is
  the direct homage to the novel's core hook — a low-Rarity hull can still be a hidden
  gem if its Aptitude is high, exactly the kind of find Kade's Scan exists to catch
  that nobody else can see.

The player's **Hangar** is the growing roster of drawn ship instances. One is assigned
active Flagship; others crew Support slots (unlocked via story) or sit in reserve.
Duplicate draws of a Hull Class the player already has plenty of can be broken down
for Alloy/Salvage rather than left idle.

- **Level** (within a Hull Class) increases with XP from combat, expeditions, and
  story missions, at a rate shaped by that instance's Aptitude. Leveling is soft-capped
  per class so a low-class ship can't out-scale a high-class one just by grinding XP.

## Modules

Each module is its own acquired item — never bundled with a ship — with a full stat
block:

- **Type**: Weapon, Armor/Shield, Engine, or Utility.
- **Rarity**: Mk I–V, independent of the ship it's socketed into.
- **Power Draw**: the energy cost charged against the ship's Power Core capacity. A
  ship's equipped modules' total Power Draw can never exceed its Power Core capacity —
  the core socketing tension: a Sovereign-class hull with 16 slots still can't run 16
  top-end modules at once, so loadout is a real budget decision, not just "fill every
  slot."
- **Cooldown**: turns before the module's active effect can trigger again. Passive-only
  modules (plain armor plating, for instance) show Cooldown: — (not applicable).
  Weapon modules with a special alpha effect and Utility modules with an activated
  ability both carry a real cooldown, managed independently from crew ability
  cooldowns.
- **Level**: upgraded with Alloy, independent of Rarity.
- **Traits**: 1–3 rolled traits; **Lock** (Insight) rerolls/fixes one — intentionally
  slow-drip, capped per week/story-beat, not spammable.
- **Acquisition**: modules are acquired separately from leveling them, via a Module
  Fabricator (station feature, Source Points per draw), combat wreck salvage, or
  expedition/Rift-dive rewards. Leveling an owned module is always Alloy; getting a
  *new* module is always a separate acquisition action.

## Crew

- Rarity ladder: **Recruit → Veteran → Elite → Ace → Legend.**
- **Named crew** (7 total, see world-bible) unlock through story beats and are always
  guaranteed — never randomized — because they're characters, not stat-sticks.
- A smaller pool of **generic reinforcements** (unnamed, flavor-only) is recruitable
  with Source Points at a Recruitment Beacon (a station feature, not a screen you open
  from the main menu) for players who want roster depth beyond the named cast.
- Each crew member has one passive (ship-wide bonus while assigned) and one active
  ability usable in combat on a cooldown. Role determines which: Helm (evasion/
  positioning), Gunner (weapon effects), Engineer (repair/module effects), Tactician
  (crew-wide buffs/debuffs on enemies).
- **Approval** is a light per-crew track nudged by story choices. It unlocks short
  optional vignettes and a small stat bonus at high approval — texture, not a second
  full relationship system.

## Resources

Five distinct types, each earned a different way, so no single activity trivializes
the whole economy:

| Resource | Earned from | Spent on |
|---|---|---|
| Salvage | Any combat, mining, or trade activity | Repairs, early/basic upgrades |
| Source Points | Expeditions, Rift dives | **Acquiring new things**: crew recruitment, ship Draws, module Draws |
| Alloy | Combat wreck salvage specifically | **Leveling things you own**: ship leveling, module leveling |
| Origin Essence | Story missions and boss fights *only* | Hull Class refits (the ceiling) |
| Faction Favor (per faction) | Faction-aligned missions/choices | Faction-exclusive modules, crew, story branches |
| Insight | Slow drip from story + rare finds | The Cinder's Lock ability |

The Source Points / Alloy split is deliberate: Source Points always answers "get
something new," Alloy always answers "make something you already have better." Keeping
those separate stops one grind loop from trivializing both acquisition and leveling at
once.

## Combat

- Tactical, turn-based. Player fleet (flagship + up to 2 support ships, support slots
  unlock via story) vs. an enemy fleet.
- **Range bands** — Close / Mid / Long — gate which weapon modules can fire; engines
  and helm crew abilities can shift your band. This is the core positioning decision
  each turn, not just "attack."
- **Enemy doctrines are distinct per faction**, not palette-swapped stat blocks:
  - Shark Reavers: fast, evasive, boarding actions that can disable a module for a
    turn.
  - Bauhinia/Arthaine Royal Navy: shielded, disciplined volley fire, punishes staying
    in one range band too long.
  - Chitin Swarm: high unit count, regenerates, weak individually but overwhelming in
    mass.
  - Mayeth Constructs: heavy armor, EMP effects, has an actual weak point that must be
    exposed (e.g. by breaking a shield generator subsystem) before big damage lands.
- Juice: canvas-rendered ships, projectile/impact particles, screen shake scaled to
  hit size, synthesized WebAudio hit/explosion/alarm stingers.

## How combat is *entered*

Combat is not chosen from a menu — it's triggered by flying into a hostile patrol's
detection radius in the System free-flight view, by docking at/approaching a
story-flagged location, or by choosing to engage a POI you've flown up to (e.g. a
distress signal). See `docs/architecture.md` for the encounter-trigger model.

## Mining and trade (as map activities, not screens)

- **Mining fields** are POIs in System view with a finite (regenerating slowly)
  resource pool. Flying into one and holding position starts a short interaction
  (a light timing/rhythm tick, not a separate minigame screen) yielding Salvage/Alloy
  over time; can be interrupted by a patrol wandering in.
- **Trade** happens by docking at a station/planet, which opens a station panel
  (market prices fluctuate per system based on supply/demand flavdavor tied to that
  system's dominant faction and recent events) — this is the one place a traditional
  UI panel is appropriate, since you've already "arrived" there physically.
- **Events** trigger on entering a system for the first time, on specific story flags,
  or occasionally at random from a light per-galaxy event table (derelicts, distress
  calls, faction patrols) — surfaced as a POI appearing in System view, not a popup
  interrupting flight.

## The pacing model (why this all holds together)

Story progress gates your power **ceiling**: only story beats grant Origin Essence in
meaningful amounts, and only Origin Essence + the matching story flag raises your Hull
Class. Everything else — Salvage, Source Points, Alloy, Faction Favor, generic crew,
ship/module Draws and their traits — is **width**: it lets you get more out of your
*current* ceiling, via mining, trading, side expeditions, and optional combat. A player
can't out-grind the campaign to become overpowered early, but grinding is never
wasted, because a well-optimized Cruiser-class fleet meaningfully outperforms a bare
one when a Cruiser-class story boss shows up. This keeps the story mandatory-feeling
without making side activity feel pointless.

Combat difficulty scales per galaxy/Act to match the Hull Class players are expected to
have by that point (see the unlock table above); optional side expeditions within an
already-unlocked galaxy offer higher-risk/higher-reward content for players who want to
push ahead of that curve before a hard story boss.
