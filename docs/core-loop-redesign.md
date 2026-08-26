# Core Loop Redesign — 2026-08-25

> **Status: all five shipped.** Implementation notes and the two places reality
> forced a change from this plan are recorded at the end.

Requested: "参考网上最好的游戏设计，帮我重新设计核心玩法和机制."

Grounded in what the reference games actually do, and in measurements of what
Emberwake currently does. Sources are listed at the end.

---

## Part 1 — The diagnosis

### What the loop is today

```
fly to POI  →  story scene  →  combat  →  resources + XP  →  (rarely) a module drops
     ↑                                                                    │
     └──────────── spend Alloy on levels, Essence on ascension ←──────────┘
```

Everything in that diagram works. The problem is what isn't in it.

### The one structural finding

**The player almost never makes a choice.**

Measured, not estimated:

| Choice point | Count |
|---|---|
| Story scenes in the whole campaign | 40 |
| Story scenes that offer a choice | **7** |
| Loot drops the player picks from | **0** |

Loot is `Math.random() < dropChance ? drawModule(...) : null`. The game rolls, and
tells you what you got. There is no draft, no shop with a decision, no
"three cards, pick one" moment anywhere in it.

This matters because every reference game is built on exactly that moment:

- **Slay the Spire** — "a series of interesting decisions... a single card pick can
  make the difference between a winning run and a losing run."
- **Vampire Survivors** — every level-up offers three upgrades; which weapon you
  evolve *is* the game. Described as "the cleanest example of a
  player-agency-via-loadout game ever shipped."
- **Into the Breach** — "no perfect decision that won't cost you something."

Emberwake has the opposite shape: a long chain of executions with almost no
elections. That is the root cause of "战斗还是很无聊", and it is why fixing weapon
stats and adding VFX helped but did not solve it. **Auto-fire is not the problem.**
Vampire Survivors auto-attacks too, and it is one of the most compelling loops of
the last decade — because it moves the decision from *the trigger* to *the build*,
and then asks you to decide constantly. Emberwake removed the trigger without
putting anything in its place.

### Three supporting problems

**Randomness isn't legible.** The references pair RNG with clear draft or shop
rules. A module drop here is an opaque stack of rolls: rarity roll, quality roll,
then 1–3 traits pulled from a pool. The player cannot form a plan, so they cannot
have one frustrated or rewarded.

**Meta-progression is pure vertical creep.** Level and ascension only ever add
power, and nothing scales back. Hades is the counter-example: permanent
progression eventually dries up while Heat keeps climbing. Emberwake's rift has
depth scaling — the campaign has nothing.

**The 200-module roster has no destination.** After the weapon rebuild the roster
is finally varied, but a module's ceiling is "level it up". Vampire Survivors'
evolutions are the missing idea: a maxed weapon plus the right partner becomes
something *categorically* different.

---

## Part 2 — The redesign

Five mechanics. Each one exists to create a decision, and each is named against
the specific reference it comes from. They are ordered by leverage.

### 1. The Refit Draft — 整备抉择

*From: Slay the Spire card picks; Vampire Survivors level-ups.*

**After every combat, the player picks 1 of 3.** This replaces the silent random
drop entirely.

The three options are drawn from a legible pool:

- a **module** (family biased by the region you're in — Reaver space offers Reaver
  guns, so where you fight shapes what you can build)
- a **free upgrade** to a module you already own (turning "I found a thing" into "I
  invested in my thing")
- a **sortie boon** — a temporary effect lasting until you next dock

One option is always a *safe* pick and one is always *greedy* (higher tier, but
costs hull or power). Into the Breach's rule applies: no option should be free.

This single change takes the campaign from 7 choices to roughly **one every
90 seconds**, and it makes the region map matter, because where you fight
determines what you're offered.

### 2. Reactor Allocation — 功率分配

*From: FTL and Star Trek: Bridge Crew. "At its heart this is a resource management
game, and power is one of those resources."*

Power capacity is now a real budget (fixed this session). Make it a **live, in-combat
decision**: three channels the player shifts between at any time.

| Channel | Effect |
|---|---|
| **火力 Weapons** | weapon cadence up to 30% faster |
| **护盾 Shields** | incoming damage reduced, armour effectively higher |
| **引擎 Engines** | range shifts faster, evasion up |

Total allocation is capped by capacity, so boosting one starves another. Overdraw
already stretches cadence — this makes that a dial rather than a wall.

This is the fix for combat's dead air that doesn't require twitch input: a
continuous, meaningful, *non-reflex* decision, exactly the bridge-command fantasy
the game already claims. It also gives the existing stance orders a partner — you
are choosing both *where* to fight and *how the ship is tuned* to fight there.

### 3. Ember Load — 余烬负荷

*From: Hades' Heat; Curse of the Dead Gods' corruption meter.*

Ascension is the novel's core progression and must stay. But right now it only
subtracts difficulty. Give it a counterweight:

- Every ascension raises **Ember Load** by 1.
- Load adds enemy density, enemy roles (mender/anchor/artillery — already built),
  and rift anomalies (already built) to normal encounters.
- The player may **voluntarily raise Load further** for better drops and a higher
  draft tier.

This reuses two systems that already exist and turns the campaign's flat power
curve into a negotiated one. Crucially it keeps ascension as *the* fantasy — you
still get stronger, the galaxy just stops being polite about it.

### 4. Weapon Evolution — 武器进化

*From: Vampire Survivors evolutions. "Taking a weapon to max level while holding a
specific passive transforms it into something dramatically stronger, and that
promise of a payoff is what makes the draft choices feel meaningful."*

A weapon at max level, equipped alongside a specific partner module, can **evolve**:
a new name, a new signature effect, and a distinct VFX archetype.

This gives the 200-module roster the destination it lacks, and it retroactively
makes the draft matter: you start taking the partner module *because* you can see
the evolution three fights away. That anticipation is the mechanic.

Ten evolutions — one per family — is enough to start.

### 5. The Sortie — 出击

*From: FTL's jump structure; the game's own rift, which already works.*

The rift's push-your-luck shape is the best thing in Emberwake and it is walled
off in a side mode. Apply it to the main line:

- A story mission becomes a **sortie of 2–4 encounters**.
- Hull does **not** fully heal between encounters.
- A Refit Draft happens between each.
- You may withdraw after any encounter, keeping what you drafted but not
  completing the mission.

This gives the campaign a risk texture and an arc, instead of a flat sequence of
one-off fights, and it makes the repair economy matter.

---

## Part 3 — What must not change

Worth stating, because a redesign that discards these would be a different game:

- **One ship that ascends.** Novel-sourced, and the strongest identity Emberwake
  has. No ship collection, no gacha.
- **The rift as the protagonist's power**, entered at will, with a provisional
  haul. It is already correct.
- **源点获取倍率** and the other novel-confirmed system abilities.
- **Auto-fire.** The reference games show the problem was never auto-fire — it was
  the absence of anything to decide instead.

---

## Part 4 — Sequencing

Ordered by leverage per unit of risk:

| # | Change | Why first |
|---|---|---|
| 1 | **Refit Draft** | Highest leverage in the document. Touches one call site (`resolveCombatVictory`) plus one new screen. Everything else gets better once choices exist. |
| 2 | **Reactor Allocation** | Fixes combat agency directly; the power budget it needs already exists. |
| 3 | **Ember Load** | Almost pure reuse — enemy roles and rift anomalies are already built and tested. |
| 4 | **Weapon Evolution** | Needs the draft to exist first, or there is no way to pursue an evolution deliberately. |
| 5 | **Sortie structure** | Largest change to campaign flow; do it once the per-fight loop is good. |

1–3 are the ones that change how the game feels. 4–5 are what give it a long tail.

---

## Sources

- [Tough Decisions — The Roguelite Designs of Subset Games (FTL, Into the Breach)](https://www.resetera.com/threads/tough-decisions-the-ingenious-roguelite-designs-of-subset-games-ftl-and-into-the-breach-devs.405666/)
- [Slay the Spire — decision density and long-tail mastery](https://breach.gg/blog/slay-the-spire-2-weekly-2026-03-13)
- [Vampire Survivors build guide — weapon timers, evolutions, agency via loadout](https://www.gametruth.com/guides/vampire-survivors-build-guide-best-weapons-and-evolutions-2025/)
- [How auto-attack loops keep agency](https://www.summerengine.com/blog/games-like-vampire-survivors)
- [Roguelite meta-progression and difficulty curves](https://echoesofmyth-devblog.blogspot.com/2025/02/roguelite-meta-progression-and.html)
- [Stat-based meta-progression criticism / Hades' Heat balance](https://www.resetera.com/threads/im-starting-to-feel-that-stat-based-meta-progression-is-starting-to-ruin-roguelites-generally-speaking.1509337/page-2)
- [Star Trek: Bridge Crew — engineering and power allocation](https://startrekbridgecrew.fandom.com/wiki/Engineering)
- [Path of Exile 2 — itemization, meaningful upgrades over volume](https://www.mmoexp.com/News/path-of-exile-2-league-review-build-diversity-endgame-freedom-economy-problems-and-the-road-to-1-0.html)


---

## Implementation notes (added after shipping)

All five landed. Two places where building it changed the plan:

**Sorties apply to POI combat, not story missions.** The plan said "a story
mission becomes a sortie of 2–4 encounters". Story encounters grant progression
flags, and putting the quest chain behind a longer, riskier gate than it was
authored for is exactly how a player gets stranded — the failure
`questChain.test.ts` exists to catch. Story beats stay single-stage; repeatable
POI combat carries the sortie structure.

**Ember Load upgrades its support role rather than stacking roles.** The plan
implied Load would add roles cumulatively. It can't: the one-support-per-formation
rule exists because two menders healing each other is a stalemate, so a mender
added on top of an anchor silently never appeared. Load now escalates the single
support slot (anchor → mender) with artillery arriving separately, since
artillery is pressure rather than support. A test caught this.

Two things worth watching in play:

- **Boons ride on the effect registry.** A field rig is an effect id, so it works
  with all 46 implemented effects and stacks with a module carrying the same one.
  Cheap to extend, but it also means a boon is only as interesting as the effect
  behind it.
- **The draft's tier curve is tied to ship level**, not to Ember Load or region
  danger. If drafts feel behind or ahead of the curve, `draftTierFor` is the one
  knob.
