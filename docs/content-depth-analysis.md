# Does Emberwake Have 200 Hours? — 2026-08-29

Asked directly, so answered directly: **no. It has roughly 9, and about 4 of
those are authored.** That is ~5% of the target.

Everything below is measured from the shipped build.

## The measurement

| Content | Measured | Time |
|---|---|---|
| Story | 189 lines, 14,741 chars | 0.8 h (Chinese reading speed) |
| Authored fights | 36 encounters | 1.1 h |
| POI content | 60 POIs | 1.0 h |
| Travel, menus, refits | — | 1.1 h |
| **First playthrough** | | **~4 h** |
| Grind to the final ascension | | 1–9 h |
| **Total to see everything** | | **~9 h** |

## The four structural reasons

### 1. Progression demands ~5× more play than the game contains

The top hull needs **level 55**. Clearing every authored encounter in the game
exactly once yields **6,744 XP — level 22**. Reaching 55 needs 39,285.

**The entire authored campaign supplies 17% of the XP its own top tier
requires.** The other 83% has to come from repeating the rift, which is the one
system that scales. That isn't 200 hours of content; it's 4 hours of content with
a mandatory grind bolted to the end of it, and the grind is what the player will
remember.

### 2. The rift has a hard wall, and it's closer than it looks

Rift difficulty scales at `1.22^depth` — exponential. Player power does not.

| Depth | Enemy hull | Max-level player hull | Ratio |
|---|---|---|---|
| 10 | 2,754 | 17,556 | 0.16× |
| 20 | 20,118 | 17,556 | 1.15× |
| 30 | 146,958 | 17,556 | **8.4×** |

A fully maxed mk5 weapon deals **996** damage. A depth-30 Devourer has **198,074**
hull. Around depth 20–22 the run stops being a decision and becomes a wall, and
the only endless system in the game turns out to have an end.

### 3. Nothing rewards a second playthrough

There is no New Game+, no seeds, no difficulty tiers beyond Ember Load, no
alternate starts, no unlocks that carry across campaigns. Slay the Spire and
Balatro reach 200 hours because run *N+1* differs from run *N*. Emberwake's
second campaign is identical to its first.

The irony is that the branching already exists and is wasted: **ascension is a
real choice at every tier**, 2 options × 6 tiers = **64 distinct ship paths**,
and the pairs genuinely differ —

| Tier | Choice | Difference |
|---|---|---|
| 1 | destroyer / interceptor | 240 hull vs 190, speed 6 vs 8 |
| 3 | battleship / bulwark | 5 weapons vs 4, armour 3 vs 5 |
| 6 | anthem / sanctum | 10 weapons vs 8, armour 8 vs 11 |

Both options at each tier share an unlock flag, so all 13 hulls are reachable.
The game just never asks the player to care, and never gives them a reason to
come back and try the other half of the tree.

### 4. Content volume is an order of magnitude short

36 authored encounters and 60 POIs against **200 modules**. The itemization is
built for a game five times this size. 189 lines of dialogue is under an hour of
reading.

## What would actually close the gap

Ordered by hours-added per unit of work. The first three are the only ones that
change the answer materially.

### A. Make the rift genuinely endless — the single highest-leverage change

Cap or soften the exponential, and make depth reward *variety* rather than raw
scale: modifiers that change how a wave plays, not how big it is. An endless mode
that stays winnable is the difference between 9 hours and 50+, and the anomaly
system is already built — it just isn't the axis that scales.

**Estimated: +20–40 h. Small change, mostly tuning.**

### B. New Game+ over the branching that already exists

Carry modules and a fraction of levels forward, restart the campaign, and require
a *different* ascension path than last run. The tree is already there and already
differentiated; nothing new needs designing, only surfacing and rewarding.

**Estimated: +15–30 h per meaningfully different path.**

### C. Procedural missions attached to the 60 existing POIs

Every POI is currently one static interaction. Generated contracts — escort,
denial, timed extraction, escalating defence — reusing the encounter generator
the rift already has would turn 60 static dots into a renewable mission board.

**Estimated: +30–60 h.**

### D. Authored content, honestly priced

More story is the *least* efficient path. Reaching 200 h through writing alone
means roughly 10× the current campaign — around 2,000 dialogue lines in two
languages, plus 300+ encounters. That is a multi-month content job, and it is
the thing this project is least set up to do quickly.

**Estimated: +10 h per 400 lines written. Do this for quality, not for hours.**

## The honest recommendation

**Stop targeting 200 hours.** Target **15–20 excellent hours** via A + B, which
are cheap because the systems already exist, and let the rift carry players who
want more.

A 9-hour game that is tight beats a 200-hour game that is 4 hours of content and
196 hours of grinding — and the current design is much closer to the second than
the first. The fix for "not enough hours" is almost never "make the grind
longer", which is precisely what the level-55 gate currently does.

One caveat on all of the above: none of these hours have been *played*. The
estimates assume the moment-to-moment is fun enough to sustain repetition, and
that assumption is untested.

---

## 等级那堵墙已拆 —— 2026-08-30

原文记的是:最高舰级要 55 级 = 39,285 经验,而整个战役只有 6,782(5.8 倍)。

两个根因,都不是"数值给少了":

1. **经验是唯一没有吃余烬负荷加成的收益。** 资源全部乘 loadMult,经验拿原始值。
   于是「去更危险的地方赚得更多」给的是材料,而不是最高舰级唯一缺的那样东西。
2. **悬赏的数值是按新手村写的,从没对照过它被放在哪。** 威胁 7 的星区里一场
   40 经验的遭遇,对 40 级玩家既不是挑战也不是收益。

`tools/genBounties.py` 按投放位置重算全部 12 条(位置从 galaxies/*.ts 读出来)。

| | 之前 | 现在 |
|---|---|---|
| 跑完战役 | 22 级 | **32 级** |
| 补到第六档(40 级) | 164 场 | **3~4 场** |
| 补到最高档(55 级) | 595 场 | **10~14 场** |

`src/engine/progression.test.ts` 钉死"战役之上的每一档都得有一条 40 场以内打得完
的路",任何人重新造出这堵墙都会失败。

### 仍未解决

- **裂隙在深度 ~20 撞墙**:敌人成长快过玩家,所以最深的内容实际上到不了。
- **64 条进阶路线没有任何东西奖励重玩**(没有 New Game+)。
