# Emberwake — Content Depth Standards

Companion to `docs/design-principles.md`. That file settles *what kind* of game this
is; this file exists because good tenets still produced thin content when the actual
asks stayed vague ("make it exciting," "reinvent the systems"). Every rule below is
written so it can be checked with a grep or a number, not a judgment call.

**Origin:** this document was written in response to a direct audit finding thin
content behind working code — 8 total module archetypes, enemy encounters with no
mechanical variation beyond a regen flag and a boss flag, crew "passive" abilities
that were pure flavor text never read by any game logic, and a 32-scene story that
turned out to be 100% original filler wearing the source novel's premise as a hook.
None of that showed up in a "does it work" check. It only showed up when someone
counted.

## 1. Minimums, not adjectives

A content system is not "done" until it clears its numeric floor. If a PR/commit
claims a content system is complete and it's under the floor, it isn't — finish it or
say explicitly that it's a stub.

| System | Floor | What counts | What doesn't count |
|---|---|---|---|
| Enemy types | 8–10 **mechanically distinct** behaviors | A unique combination of: attack pattern, defensive gimmick, a status effect it applies or resists, a phase change, or a turn-order quirk — verifiable by `grep` for encounter-specific or faction-specific branches in the combat code | A reskinned stat block (same math path, different damage/block/evasion numbers). A palette swap in `shipArt.ts` alone. `regen: true/false` and `isBoss: true/false` count as **one axis each**, not one enemy type each — don't double-count a doctrine as multiple "types" |
| Module archetypes | 12+ across weapon/armor/engine/utility, each with a mechanically distinct effect (not just a bigger number) | A new `baseDamage`/`baseBlock` profile *plus* a distinct trait/behavior no other module has | A copy of an existing module with different `powerDraw` or `cooldown` |
| Crew abilities | 100% of defined crew have an ability with unique combat logic, and 100% of defined passives are read by game code somewhere outside a render function | `grep`able: every `abilityId` has its own branch in the ability-dispatch function; every `.passive` string has a matching numeric effect applied in `store.ts` or combat resolution | A passive that's only ever interpolated into JSX text |
| Story arc | First arc is 3–5 chapters with beats traceable to specific novel plot points, named in commit messages or doc comments | A beat that maps to an event, decision, or character turn from the source novel, adapted into original prose (never translated/reproduced verbatim — see §2) | A chapter whose plot could be swapped into any generic space-opera with a find-and-replace on names |
| Hull/ship tiers | At least 2 hulls per power tier with a real lateral tradeoff (speed vs. slots, hull vs. evasion ceiling, etc.) | Two hulls where neither strictly dominates the other | A single linear tier ladder where the next hull is just "more of everything" |

Run the audit in §4 before claiming any of these are met.

## 2. Depth comes from specificity, grounded in the source material

The novel (我的战舰能升级 / *My Warship Can Level Up*) is the well this project draws
from. "Inspired by" cannot mean "borrowed the premise, invented everything else" —
that produces exactly the generic-filler result this doc exists to prevent.

- Before writing story content for an arc, do the research pass first: characters,
  factions, specific plot beats, turning points. Capture findings in
  `docs/story/research-notes-actN.md` before writing scenes, so the sourcing is
  auditable later — if the notes file doesn't exist, the content wasn't researched.
- Adapt beats into original prose and mechanics; never translate or reproduce the
  source text directly (this was already the house rule in `docs/world-bible.md` and
  stays true — adaptation, not reproduction).
- If a beat, character, or mechanic in the game can't be traced to something in the
  research notes, it needs a specific in-world reason for existing (a consequence of a
  player choice, a mechanical need) — "felt like it fit the setting" is not a reason.
- The same rule applies one level down: an enemy faction's *doctrine* (how it fights)
  should come from something specific about who they are, not from a generic "roster
  needs variety" instinct. If two factions have different flavor text but the same
  combat math, that's a content-depth violation under §1, not a visual one.

## 3. Build in phases, with checkpoints — never a one-shot mega-pass

- Design the slice → build it → self-playtest it (§5) → refine → extend. Each of
  those is a distinct step with a visible stopping point, not silent phases inside one
  giant commit.
- A "phase" is scoped to one system reaching its floor (§1), not to an arbitrary time
  box. Shipping half of two systems is worse than shipping one system completely (see
  tenet 9 in `docs/design-principles.md`).
- Commit at the end of every phase, and the commit message states which floor(s) from
  §1 the phase closes, plus the real before/after numbers (e.g. "enemy types 3 → 9").
  A commit message that says "improve enemies" without numbers is exactly the vague
  self-report this doc exists to prevent.
- When a task is large enough to span multiple sessions, report a checkpoint rather
  than silently continuing — state what's closed, what's open, and the honest
  self-playtest read (§5) so far.

## 4. The audit (run this before claiming a system is done)

For each row in the §1 table, produce the actual count via a repeatable check —
grep, a script, or a manual read-through — not a recollection. Specifically:

```
# Enemy mechanical distinctness
grep -n "faction ===\|encounter.id ===\|enemy.name ===" src/ui/screens/Combat.tsx
grep -c "regen:\s*[0-9]" src/data/encounters.ts
grep -c "isBoss: true" src/data/encounters.ts

# Module archetype count
grep -c 'id: "' src/data/modules.ts

# Crew passive wiring
grep -rn "\.passive\b" src --include="*.tsx" --include="*.ts" | grep -v "data/crew.ts"
# ^ if every hit is inside a render/JSX file, no passive is wired to gameplay

# Story sourcing
ls docs/story/research-notes-*.md 2>/dev/null
grep -i "original\|not.*translated\|not.*reproduced" docs/world-bible.md
```

Report the raw numbers. If a system is below floor, say so explicitly in the same
report — don't fold it into a feature list where it can hide.

## 5. Self-playtest before reporting "done"

Actually play the build, not just confirm it builds and renders. Walk through, in
order, and write down the honest read for each:

1. **Early game** — first 10 minutes. Is the first combat, the first draw, the first
   choice interesting on its own, or only interesting because it's new?
2. **Mid game** — after 2–3 progression milestones. Has anything changed about how you
   play, or are you doing the exact same actions with bigger numbers?
3. **A rarity-draw event** — pull several times in a row. Does variance feel exciting
   (a real "did I get a good one" moment) or does it stop mattering after the first few
   pulls because the pool is too small?
4. **A story beat** — read it cold, without the context of having built it. Would this
   beat be recognizable as *this* story, or could it be reskinned into any other
   space-opera with a find-and-replace?

For each, write the honest answer — "generic," "repetitive," "feels like scaffolding,"
or "actually interesting, here's why" — not a pass/fail. "It works" is not the same
claim as "it's interesting," and only the second one means a system is actually done.
This read is a required part of any checkpoint report, not an optional appendix.
