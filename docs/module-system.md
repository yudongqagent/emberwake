# Module System

Design for the 200-module roster and the effect vocabulary behind it.

## Why this exists

`docs/content-depth-standards.md` was written because an earlier pass shipped "8
module archetypes that were reskins wearing different names." A 200-module roster
is exactly the shape of content that fails that way by default. The guard is that
**modules are combinations drawn from a real effect vocabulary**, not 200 hand-waved
descriptions — and that every effect in that vocabulary is actually implemented in
combat, not just written down.

Honest framing: 200 modules do **not** mean 200 unique mechanics. They mean a
vocabulary of ~45 implemented effects, combined with distinct stat profiles, tiers
and faction identities, so that any two modules differ in what they *do*, not only
in their numbers. Where a module's identity is purely statistical (a bigger gun with
no special effect) it is a deliberate baseline, not padding.

## Structure: 10 families × 4 types × 5 tiers = 200

Every module belongs to a **tech family** tied to a faction from
`docs/world-bible.md`. The family determines its effect pool, so a module's origin
is legible from how it plays — the same principle the faction combat doctrines
already follow.

| Family | Fiction | Effect identity |
|---|---|---|
| `bauhinia` | Bauhinia Principality | Precision, point-defense, disciplined fire |
| `lionsheart` | Lionsheart Concord | Duelling — counters, single-target, ripostes |
| `swanreach` | Swanreach Combine | Efficiency, economy, yield, cooldowns |
| `reaver` | Shark Reavers | Raw aggression, executes, escalating frenzy |
| `swarm` | Chitin Swarm | Multi-hit, regeneration, attrition |
| `construct` | Mayeth Constructs | EMP, shields, block, denial |
| `hollow` | The Hollow | Drain, corrosion, decay |
| `rift` | Rift Echoes | Phase, instability, high variance |
| `choir` | The Choir | Resonance, buildup, payoff-on-threshold |
| `mayeth` | Ancient Mayeth relics | Exotic hybrids, rule-benders |

Tier maps to `baseRarity` (mk1…mk5). Higher tiers get stronger stats *and* a
stronger signature effect — never merely bigger numbers, per Player-Tested
Anti-Patterns #1.

## Uniqueness

A ship may not equip two modules sharing the same `defId`. Two Pulse Cannons was
never an interesting loadout decision — it's the absence of one. With 200 distinct
modules the constraint costs the player nothing and forces every socket to be a
real choice. Enforced in `equipModule` (state/store.ts), surfaced in the picker.

## Signature effects vs. rolled traits

- **Signature** (`ModuleDef.signature`) — fixed, defines the module's identity,
  always present on every instance.
- **Rolled traits** (`traitPool`) — 1–3 rolled per instance, the itemization
  variance layer that makes two copies of the same module differ.

## Upgrade curve

Both growth and cost are exponential (player direction, 2026-08-24):

- **Stat growth**: `1.14 ^ (level - 1)`. A maxed mk5 (L13) is ~5.5x its base, versus
  ~2.4x under the old linear +12%/level.
- **Cost**: `18 · rarityMult · 1.55 ^ (level - 1)` Alloy.

Exponential-on-exponential is deliberate: each level is a bigger jump *and* a bigger
commitment, so upgrading is a decision about where to concentrate resources rather
than a checklist to complete on everything you own. Calibrated against measured
income — see the note in `engine/modules.ts`.

## Effect vocabulary

Grouped by where they resolve in combat. Every one is implemented; see
`src/data/moduleEffects.ts` for the registry and the combat call sites it names.

**Offense — damage shaping**
`crit` `pierce` `execute` `overload` `surge` `opener` `finisher` `rampage`
`pointBlank` `sniper` `exploit` `overkill`

**Offense — multi-target**
`chainArc` `aoe` `volley` `scatter` `barrage`

**Offense — status**
`disable` `shieldBreak` `corrode` `slow` `mark` `burn` `sunder`

**Defense**
`absorb` `reflect` `evasion` `momentum` `hullBonus` `regen` `ablate` `bulwark`
`lastStand` `deflect`

**Tempo / resource**
`coolant` `capacitor` `novaCharge` `haste` `recycler` `overdriveSync`

**Utility / economy**
`yieldBonus` `cleanse` `displace` `jumpRange` `prospector` `insightDraw`
