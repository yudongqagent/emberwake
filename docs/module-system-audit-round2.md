# Module System Audit — Round 2 (2026-08-25)

The first audit (`weapon-system-audit.md`) looked only at weapons, and all ten of
its findings are now fixed. This round covers the other 150 modules and the
systems around them. Same method: parse the shipped data, replicate the engine
maths, verify against live behaviour where it matters.

**Headline: the weapon findings were not a weapon problem.** Armor, engines and
utility have the same disease the weapons had, and engines have a worse one on
top of it.

---

## Measured state of the whole roster

| Type | n | with **no numeric stat** | distinct signatures | distinct trait pools | distinct traits | distinct stat-lines per tier |
|---|---|---|---|---|---|---|
| weapon | 50 | 0 | 30 | 50 | 30 | 10, 10, 10, 10, 10 |
| armor | 50 | 0 | 9 | **4** | **5** | **1, 1, 1, 1, 1** |
| engine | 50 | **50** | 11 | **5** | **5** | **1, 1, 1, 1, 1** |
| utility | 50 | 0 | 14 | **5** | **5** | **1, 1, 1, 1, 1** |

The weapon row is what the fixed state looks like. The other three rows are what
the audit found the first time.

---

## 11. Leveling an engine costs Alloy and does nothing at all

The most serious finding in this round, and a genuine resource trap.

`computeModuleDamage` reads `baseDamage`; `computeModuleBlock` reads `baseBlock`.
**All 50 engines have neither.** No other code path reads a module's `level` for
anything. So an engine's level is written to the save, displayed on the card, and
read by nothing.

The upgrade button is still offered on engines. It still charges. In
`Modules.tsx` the projected delta is computed as

```ts
const before = isWeapon ? computeModuleDamage(mod) : isArmor ? computeModuleBlock(mod) : null;
```

— `null` for an engine, so the card shows a cost and no benefit, and the player
has no way to tell that's because there *is* no benefit.

**Taking one mk5 engine from L1 to its L13 cap costs 19,034 Alloy for zero
mechanical change.** Measured total story-campaign Alloy income is ~4,535. A
player can therefore burn several campaigns' worth of the game's main upgrade
currency on literally nothing.

## 12. A higher-tier engine is now strictly *worse* than a lower-tier one

Engines have no stat, and effect magnitudes don't scale (see #13), so a mk1 and a
mk5 engine carrying the same effect are mechanically identical — except the mk5
draws more power.

Before today that was merely pointless. **The power fix in the previous commit
made it actively harmful**, because power is now a real budget: the mk5 engine
costs more and delivers the same. I introduced this regression; it is a direct
consequence of making power matter without first checking that every module type
had something to justify its draw.

## 13. Effect magnitudes never scale with tier, level, or quality

Every effect resolves as a flat constant times a stack count:

```ts
const evasionTraitCount = effectStacks("evasion");        // counts modules
const hullBonusFraction = 0.15 * effectStacks("hullBonus");
const coolantReduction  = 0.18 * effectStacks("coolant");
const deflected = ... Math.random() < Math.min(0.4, 0.14 * effectStacks("deflect"));
```

`effectStacks` counts how many equipped modules carry the effect. It never looks
at rarity, level or quality. So a mk1 Deflect plate and a mk5 Deflect plate give
exactly the same 14% chance.

This is why #11 and #12 exist. For weapons and armor the numeric stat carried the
progression and hid the problem; for engines there is no numeric stat, so nothing
was left.

It also means the roster's *quantity* is doing work its *quality* isn't: the game
rewards equipping many different effect-carrying modules over investing in any
one of them, which is the opposite of what the exponential upgrade curve is for.

## 14. Armor, engines and utility are stat-clones within a tier

Exactly the weapon finding, unfixed: **1 distinct stat-line per tier in all three
types**, all ten modules identical. Every mk3 armor is the same block value, the
same power draw, the same (null) cooldown.

## 15. Their trait pools are near-uniform

4–5 distinct pools and only 5 distinct traits across 50 modules, in each of the
three types — the same "43 of 50 share one pool" shape that weapons had. Out of 46
implemented effects, armor's rolled variance draws on 5.

## 16. Armor signature variety is the narrowest in the game

9 distinct signatures across 50 armor modules, versus 30 for the fixed weapons.
Several armor families are mechanically interchangeable.

---

## Suggested order

1. **#11 — stop charging for nothing.** Either give engines a real scaling stat,
   or hide the upgrade control for modules that have none. The first is better;
   the second is a one-line stopgap that at least stops taking the player's Alloy
   under false pretences.
2. **#13 — scale effect magnitudes with tier and level.** This is the root cause
   of #11 and #12 and the single highest-leverage change in this list: it makes
   every effect-carrying module worth investing in, and makes rarity meaningful
   for modules whose value isn't a damage number.
3. **#12** falls out of #13 automatically.
4. **#14/#15/#16 — run the weapon treatment on the other 150 modules.**
   `tools/genWeapons.py` already encodes the approach (per-tier budget, per-family
   identity, distinct signatures, family trait pools); it generalises.

Items 1–3 are correctness. Item 4 is the same design work already done once,
applied to three more types.

---

## 全部修复 —— 2026-08-30

六条全部处理完。同日复量:

| 类型 | n | 无数值 | 不同签名 | 不同词条池 | 不同词条 | 每档不同数值行 |
|---|---|---|---|---|---|---|
| weapon | 50 | 0 | 30 | 50 | 30 | 10, 10, 10, 10, 10 |
| armor | 50 | 0 | **17** | **50** | **22** | **10, 10, 10, 10, 10** |
| engine | 50 | **0** | **17** | **50** | **16** | **10, 10, 10, 10, 10** |
| utility | 50 | 0 | **27** | **50** | **29** | **10, 10, 10, 10, 10** |

- **#13(根因)** `effectPotency(mod)` 把稀有度、等级、品质算进效果强度。曲线刻意比
  伤害缓(满级 mk5 约 2.4 倍,伤害 5.5 倍)——效果里有一半是几率和减免。原来靠
  "最多也就装得下几件"隐式封顶的六处全部改成显式上限。
- **#11** 引擎有了真数值(闪避 + 推力),升级不再是白花合金;没有伤害/格挡数值的
  模组在升级卡上改显示**效果强度**的增量。
- **#12** 高稀有度效果更强,mk5 引擎不再严格劣于 mk1。
- **#14/#15/#16** `tools/genGear.py` 按"每档一个预算、每个家族一种打法"重算 150 条。
  护甲把减伤预算在格挡/闪避之间分配,再付一笔推力的账;引擎在闪避和推力之间分。

另加一个新机制:**门派套装**(`data/setBonuses.ts`)。同族两件拿入门信条,四件拿看家
本事,只发已实现的效果 id——所以它立刻是真的,不需要任何新的战斗管线。

### 过程中自己踩的两个坑(都是实测抓出来的)

1. 家族功率倍率直接乘 TIER_POWER,整体抬高了占用,测试报"corvette 装不下整套
   mk3"。旧的非武器模组平均只吃 0.72 倍——那正是武器(1.19 倍)赖以存在的余量。
2. 推力按稀有度倍率(3.04x)放大,一件 mk5 轻甲单独给出 +52%,而总上限 +60%
   ——一件就顶满。推力是门派取向,不是数值预算。
