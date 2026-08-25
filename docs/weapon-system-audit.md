# Weapon System Audit — 2026-08-25

> **Status: all ten fixed** (commit following this document's first version).
> Findings below are preserved as written, with a `RESOLVED` note on each, so the
> before/after is legible. Re-measured figures are in the "After" section at the
> end.

Requested by the player: "武器系统有很多问题 分析然后列出来."

Every figure below was measured from the shipped data and engine code, not
estimated. Method: parse all 50 weapons out of `src/data/moduleDefs.ts`, and
replicate `computeModuleDamage` (`baseDamage × rarityMult × 1.14^(level-1) ×
qualityMult`) against the real auto-fire cadence (`max(AUTO_FIRE_MIN_INTERVAL,
cooldown × TURN_SECONDS)`).

**Headline: there are 50 weapons and 5 distinct weapons.** Everything else is a
consequence of that.

---

## 1. Every weapon in a tier is statistically identical

> **RESOLVED** — damage and cooldown now vary per family around a fixed per-tier DPS budget.

| Tier | baseDamage | cooldown | powerDraw | distinct stat-lines among its 10 weapons |
|---|---|---|---|---|
| mk1 | 12 | 0 | 1 | **1** |
| mk2 | 20 | 1 | 2 | **1** |
| mk3 | 31 | 1 | 2 | **1** |
| mk4 | 46 | 2 | 3 | **1** |
| mk5 | 68 | 2 | 3 | **1** |

Measured DPS spread within each tier: **1.00× across all five tiers.**

A Reaver "Gutter Hook" mk3 and a Bauhinia "Coronet Repeater" mk3 have the same
damage, the same cadence, and the same power cost. The only differences are the
signature effect and the VFX archetype. `docs/module-system.md` claims modules are
"combined with distinct stat profiles" — that part is not true of weapons.

This also defuses the uniqueness rule. Forbidding two modules with the same
`defId` was meant to make every socket a real choice; because same-tier weapons
are stat-clones, it currently only forces *cosmetic* variety.

## 2. A tier-4 weapon is a downgrade at equal level

> **RESOLVED** — the tier budget is strictly monotonic and tested.

Sustained DPS, neutral quality:

| Tier | at level 1 | at level 5 | at level 9 |
|---|---|---|---|
| mk3 | **22.5** | **38.0** | **64.1** |
| mk4 | 22.0 | 37.2 | 62.9 |

Cooldown doubles from mk3 to mk4 (2.4s → 4.8s) while damage only rises ×1.32. A
freshly-dropped mk4 is *worse* than the mk3 already in your hold, and only pulls
ahead once you've spent Alloy on its higher level cap. This is the same
"progression that lowers a stat" problem already fixed once for hull ascension.

## 3. Power draw is a constraint that constrains nothing

> **RESOLVED** — overdraw stretches weapon cooldowns, and capacity no longer outruns the fit.

`Modules.tsx` computes `overdrawn` and paints the bar red when a loadout exceeds
capacity. Nothing else in the codebase reads it:

- `equipModule` (`state/store.ts`) has **no** power check — you can equip
  anything, anywhere, at any total draw.
- Combat reads `computePowerCapacity` only to scale **Ember Nova** damage and one
  ability. Being over capacity has **zero** combat consequence.

So the game displays a limit, warns you in red when you cross it, and then does
nothing. Worse than a missing feature: it teaches the player to distrust the UI.

## 4. Only three cooldown values exist, and they're locked to tier

> **RESOLVED** — 10 distinct cadences; every tier offers both fast and slow.

Across all 50 weapons: cooldown 0 (×10), 1 (×20), 2 (×20) — perfectly correlated
with rarity. There is no fast-weak vs slow-heavy axis, so the "which cadence do I
want" choice that an auto-fire combat system exists to express isn't in the data
at all. Cadence is just another word for tier.

## 5. The mk1 "fast" identity is silently cancelled

> **RESOLVED** — floor lowered to 0.6s and no weapon ships below it.

All ten mk1 weapons have `cooldown: 0`, but `AUTO_FIRE_MIN_INTERVAL = 1.6` floors
them to 1.6s. The card says 0; the game fires every 1.6s. The one tier that could
have expressed "rapid, weak" has that identity erased by a constant.

## 6. The variance layer barely varies

> **RESOLVED** — 50 distinct pools, 30 distinct traits.

`traitPool` is documented as "the itemization variance layer that makes two copies
of the same module differ". Measured across all 50 weapons:

- **43 of 50** share the identical pool `["crit", "pierce", "execute", "surge"]`.
- Only **5 distinct traits** appear in any weapon pool, out of **45** implemented
  effects.
- Each instance rolls 1–3 from that pool, so two weapons from different factions
  routinely roll the same traits.

## 7. Within a family, tiers repeat each other's signature

> **RESOLVED** — five distinct signatures per family, one per tier.

Each family fields only ~3 distinct signatures across its 5 tiers:

| Family | mk1 → mk5 signatures |
|---|---|
| bauhinia | crit, sniper, **crit**, exploit, overkill |
| choir | volley, barrage, **volley**, aoe, **barrage** |
| construct | pierce, shieldBreak, **pierce**, disable, **shieldBreak** |
| lionsheart | opener, finisher, **opener**, execute, **finisher** |
| reaver | execute, rampage, **execute**, overkill, **rampage** |

Tier 1 and tier 3 of a family are the same weapon with bigger numbers; so are
tiers 2 and 5. Upgrading within a family rarely changes how you play.

## 8. Most of the effect vocabulary never reaches a weapon

> **RESOLVED** — 30 signatures in use.

22 distinct signatures appear across the 50 weapons, out of 45 registered effects.
The offense vocabulary is used; the rest is spent on other module types. Combined
with #6, the practical vocabulary a *weapon* can express is 22 signatures + 5
rolled traits.

## 9. Weapons have no range identity

> **RESOLVED** — every weapon has a rangeProfile that shifts its damage by band.

`RANGE_MODIFIERS` applies per band globally, identically to every weapon. Only the
`sniper` and `pointBlank` effects express range preference, and exactly **one** of
50 weapons carries `sniper` as its signature. A "sniper" and a "shotgun" behave
the same at every range unless they happen to have rolled the right trait.

## 10. Damage is the only weapon stat

> **RESOLVED** — cadence, power cost and range are now real axes alongside damage.

There is no accuracy, no per-weapon crit multiplier, no heat/ammo, no falloff, no
burst size in the data. `ModuleDef` offers `baseDamage`, `cooldown`, `powerDraw` —
and two of those three are pinned to tier (#1, #4). One real axis of variation is
carrying fifty items.

---

## After

Re-measured from the shipped data once every fix landed:

| Metric | Before | After |
|---|---|---|
| DPS by tier | 7.5 / 11.0 / **22.5 / 22.0** / 43.1 | 9.1 / 14.0 / **21.0 / 31.0** / 46.2 |
| mk3 → mk4 | **a downgrade** | a 1.48x upgrade |
| Distinct stat-lines per tier | 1 of 10 | 10 of 10 |
| In-tier DPS spread | 1.00x (identical) | 1.03–1.09x (same value, different shape) |
| Distinct cooldown values | 3 | 10 |
| mk3 cadence range | all 2.40s | 0.84s → 5.76s |
| Distinct signatures | 22 | 30 |
| Distinct pooled traits | 5 | 30 |
| Distinct trait pools | 2 | 50 |
| Weapons with a range identity | 1 of 50 | 50 of 50 |
| Power capacity, one battleship | 36 → 407 | 36 → 82 |
| Overdraw consequence | none | weapon cooldowns stretch, capped at 2.5x |

Verified in a live fight, not just in the data: two mk3 weapons fired at **900ms
(Bloodletter) and 5816ms (Origin Beam)** — a 6.5x cadence gap where the old
roster had them both at exactly 2.4s. An overdrawn fit stretched every weapon's
cadence by ~1.46x uniformly.

Two consequences worth stating plainly rather than burying:

- **Power capacity no longer scales with ship rarity or the power roll.** It was
  the reason the budget could never bind: one battleship ranged 36→407 capacity
  while module draw stayed flat. Capacity is now a property of the hull class
  (plus 4%/level), which makes ascension — not grind — the thing that unlocks a
  heavier fit. That suits the game's premise, but it is a real change to how a
  ship grows.
- **Ember Nova scales off capacity, so it changed too.** The coefficient moved
  1.5 → 1.33 to hold the mid-game case exactly (32 × 1.5 == 36 × 1.33). It cannot
  hold everywhere: early hulls get a modestly stronger Nova, the largest hulls a
  weaker one. Net effect is a flatter ultimate, which was scaling harder than
  intended.

## Original suggested fix order

Ordered by (player-visible impact) ÷ (risk of breaking balance):

1. **Make power a real constraint** (#3) — either enforce it in `equipModule` or
   give overdraw a combat penalty. Smallest change, removes an actively
   misleading UI, and instantly makes powerDraw a budget worth planning around.
2. **Fix the mk3→mk4 inversion** (#2) — retune so cadence and damage move together
   across tiers. A tier-up must never be a sidegrade.
3. **Give weapons real stat profiles within a tier** (#1, #4) — vary
   damage/cooldown/power around a fixed DPS budget so each family has a cadence
   identity (Reaver fast-light, Lionsheart slow-heavy) instead of all being the
   same gun.
4. **Widen the trait pools** (#6) — family-specific pools drawing on the effects
   already implemented, so rolls differ meaningfully between factions.
5. **De-duplicate signatures within a family** (#7) — five tiers, five distinct
   behaviours.
6. **Add a range profile to `ModuleDef`** (#9) — the band system already exists;
   weapons just don't use it.
7. **Reconsider `AUTO_FIRE_MIN_INTERVAL`** (#5) — or stop shipping weapons whose
   cooldown it silently overrides.

Items 1 and 2 are outright bugs. Items 3–7 are design work with balance
consequences, and should be done against measured DPS budgets rather than by eye.
