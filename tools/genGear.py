#!/usr/bin/env python3
"""重新生成 src/data/moduleDefs.ts 里的 150 条护甲/引擎/工具模组。

修 docs/module-system-audit-round2.md 的 #14 / #15 / #16。id、名字、颜色原样保留
——MODULE_NAMES_ZH 是按 id 索引的,改 id 会静悄悄丢掉一整批翻译。

审计量出来的病和武器那次一模一样,而且更重:

    类型     n   无数值   不同签名   不同词条池   每档不同的数值行
    armor   50    0        9          4              1,1,1,1,1
    engine  50   50       11          5              1,1,1,1,1
    utility 50    0       14          5              1,1,1,1,1

「每档 1 种数值行」的意思是:一个档位里那十件东西,数字完全一样。所以名义上有 50
件护甲,实际上有 5 件。

这一版的做法跟 genWeapons.py 同源——**每档一个预算,每个家族一种打法**:

- 护甲把「减伤预算」在**格挡**和**闪避**之间分配,再加一项**推力**的正负修正。
  狮心的重甲格挡高、拖慢船;掠夺者的轻甲几乎不挡,但闪得快、推得动。同一档位的
  两件护甲现在总价值相当,玩法完全不同。
- 引擎从前**一个数值都没有**(所以升级纯属骗钱)。现在给两个:闪避和推力。
  推力直接进战斗里的距离拉锯,所以引擎第一次跟「接近/撤离」这套指令挂上钩。
- 工具沿用武器那套「预算 ÷ 节奏」,再按家族给不同的签名。

闪避和推力的换算系数是第一版实测之后收紧过的:最初一件掠夺者护甲就给到 15.6%
闪避、一台引擎给到 +52% 推力——推力那条会直接把刻意做长的距离拉锯(一档 14~18 秒)
压掉一半以上,而那正是「接近/保持/撤离」这套指令存在的理由。
"""
import json, re

TIERS = ["mk1", "mk2", "mk3", "mk4", "mk5"]
RARITY_MULT = {"mk1": 1.0, "mk2": 1.32, "mk3": 1.74, "mk4": 2.3, "mk5": 3.04}
TIER_POWER = {"mk1": 1, "mk2": 2, "mk3": 3, "mk4": 4, "mk5": 5}
TURN_SECONDS = 2.4

# --- 护甲:每档的「减伤预算」。一件护甲把它分给格挡和闪避,再付/收推力的账。
# 数字对齐旧的 mk1=9 / mk3=23 那条曲线,免得整体强度被悄悄抬起来。
ARMOR_BUDGET = {"mk1": 9.0, "mk2": 15.0, "mk3": 23.0, "mk4": 34.0, "mk5": 50.0}

# 家族的护甲取向。block 是预算里走格挡的比例(其余走闪避),thrust 是对航速的
# 修正(负数=拖慢)。这一列就是从前完全不存在的那个轴。
ARMOR_DOCTRINE = {
    "lionsheart": {"block": 1.00, "thrust": -0.14, "power": 1.30},  # 决斗者的重甲
    "construct":  {"block": 0.98, "thrust": -0.18, "power": 1.35},  # 拒止平台
    "mayeth":     {"block": 0.92, "thrust": -0.10, "power": 1.25},  # 遗物装甲
    "bauhinia":   {"block": 0.82, "thrust": -0.04, "power": 1.00},  # 规整的公家货
    "hollow":     {"block": 0.76, "thrust": +0.00, "power": 0.95},  # 靠腐蚀而非厚度
    "choir":      {"block": 0.70, "thrust": +0.02, "power": 1.05},  # 谐振外壳
    "swanreach":  {"block": 0.64, "thrust": +0.04, "power": 0.90},  # 便宜、够用
    "rift":       {"block": 0.52, "thrust": +0.08, "power": 1.10},  # 相位偏移
    "swarm":      {"block": 0.44, "thrust": +0.10, "power": 0.80},  # 甲壳,薄而多
    "reaver":     {"block": 0.34, "thrust": +0.16, "power": 0.70},  # 几乎不挡,靠躲
}

# --- 引擎:每档的「机动预算」,在闪避和推力之间分。
ENGINE_BUDGET = {"mk1": 6.0, "mk2": 9.0, "mk3": 13.0, "mk4": 18.0, "mk5": 25.0}
ENGINE_DOCTRINE = {
    "reaver":     {"evasion": 0.30, "power": 0.75},  # 全推力,不管命中
    "swarm":      {"evasion": 0.40, "power": 0.70},
    "rift":       {"evasion": 0.75, "power": 1.20},  # 相位闪避,费电
    "bauhinia":   {"evasion": 0.55, "power": 1.00},
    "swanreach":  {"evasion": 0.50, "power": 0.85},
    "choir":      {"evasion": 0.62, "power": 1.05},
    "hollow":     {"evasion": 0.70, "power": 0.95},
    "lionsheart": {"evasion": 0.35, "power": 1.15},  # 冲阵用
    "construct":  {"evasion": 0.45, "power": 1.30},
    "mayeth":     {"evasion": 0.58, "power": 1.25},
}

# --- 工具:跟武器同一套「预算 ÷ 节奏」。工具的伤害本来就低,预算按武器的四成给,
# 因为它们的价值主要在签名效果上。
UTILITY_DPS = {"mk1": 3.6, "mk2": 5.6, "mk3": 8.4, "mk4": 12.4, "mk5": 18.4}
UTILITY_CADENCE = {
    "swarm":      1.2,
    "reaver":     1.4,
    "swanreach":  1.6,
    "choir":      1.8,
    "bauhinia":   2.0,
    "rift":       2.2,
    "hollow":     2.4,
    "lionsheart": 2.6,
    "construct":  3.0,
    "mayeth":     3.6,
}

# --- 每个家族五个**互不相同**的签名,一档一个(审计 #16:护甲 50 件只有 9 种签名,
# 好几个家族机制上完全可以互换)。全部取自已实现的效果表。
ARMOR_SIGNATURES = {
    "bauhinia":   ["deflect", "absorb", "bulwark", "reflect", "lastStand"],
    "lionsheart": ["bulwark", "lastStand", "ablate", "reflect", "absorb"],
    "swanreach":  ["capacitor", "regen", "hullBonus", "absorb", "yieldBonus"],
    "reaver":     ["momentum", "evasion", "ablate", "rampage", "lastStand"],
    "swarm":      ["regen", "hullBonus", "ablate", "momentum", "evasion"],
    "construct":  ["hullBonus", "bulwark", "deflect", "absorb", "reflect"],
    "hollow":     ["corrode", "ablate", "regen", "sunder", "bulwark"],
    "rift":       ["deflect", "momentum", "evasion", "displace", "lastStand"],
    "choir":      ["reflect", "regen", "absorb", "hullBonus", "cleanse"],
    "mayeth":     ["lastStand", "bulwark", "deflect", "hullBonus", "reflect"],
}
ARMOR_POOLS = {
    "bauhinia":   ["deflect", "absorb", "bulwark", "reflect", "hullBonus"],
    "lionsheart": ["bulwark", "lastStand", "ablate", "hullBonus", "reflect"],
    "swanreach":  ["capacitor", "regen", "hullBonus", "yieldBonus", "coolant"],
    "reaver":     ["momentum", "evasion", "ablate", "rampage", "pointBlank"],
    "swarm":      ["regen", "hullBonus", "ablate", "evasion", "momentum"],
    "construct":  ["hullBonus", "bulwark", "deflect", "absorb", "disable"],
    "hollow":     ["corrode", "ablate", "regen", "sunder", "burn"],
    "rift":       ["deflect", "momentum", "evasion", "displace", "surge"],
    "choir":      ["reflect", "regen", "absorb", "hullBonus", "cleanse"],
    "mayeth":     ["lastStand", "bulwark", "deflect", "hullBonus", "absorb"],
}

ENGINE_SIGNATURES = {
    "bauhinia":   ["evasion", "jumpRange", "haste", "momentum", "capacitor"],
    "lionsheart": ["surge", "momentum", "haste", "pointBlank", "opener"],
    "swanreach":  ["capacitor", "coolant", "jumpRange", "recycler", "yieldBonus"],
    "reaver":     ["momentum", "surge", "pointBlank", "rampage", "haste"],
    "swarm":      ["evasion", "momentum", "regen", "jumpRange", "surge"],
    "construct":  ["capacitor", "jumpRange", "slow", "haste", "coolant"],
    "hollow":     ["evasion", "cleanse", "displace", "momentum", "regen"],
    "rift":       ["displace", "surge", "evasion", "momentum", "jumpRange"],
    "choir":      ["haste", "novaCharge", "recycler", "coolant", "capacitor"],
    "mayeth":     ["jumpRange", "capacitor", "haste", "displace", "coolant"],
}
ENGINE_POOLS = {
    "bauhinia":   ["evasion", "jumpRange", "haste", "momentum", "capacitor"],
    "lionsheart": ["surge", "momentum", "haste", "pointBlank", "coolant"],
    "swanreach":  ["capacitor", "coolant", "jumpRange", "recycler", "yieldBonus"],
    "reaver":     ["momentum", "surge", "pointBlank", "rampage", "evasion"],
    "swarm":      ["evasion", "momentum", "regen", "jumpRange", "surge"],
    "construct":  ["capacitor", "jumpRange", "slow", "haste", "coolant"],
    "hollow":     ["evasion", "cleanse", "displace", "momentum", "regen"],
    "rift":       ["displace", "surge", "evasion", "momentum", "jumpRange"],
    "choir":      ["haste", "novaCharge", "recycler", "coolant", "capacitor"],
    "mayeth":     ["jumpRange", "capacitor", "haste", "displace", "coolant"],
}

UTILITY_SIGNATURES = {
    "bauhinia":   ["mark", "disable", "shieldBreak", "exploit", "cleanse"],
    "lionsheart": ["opener", "sunder", "disable", "execute", "mark"],
    "swanreach":  ["yieldBonus", "recycler", "coolant", "capacitor", "novaCharge"],
    "reaver":     ["overkill", "rampage", "pointBlank", "sunder", "execute"],
    "swarm":      ["chainArc", "aoe", "scatter", "burn", "volley"],
    "construct":  ["disable", "slow", "shieldBreak", "displace", "mark"],
    "hollow":     ["corrode", "burn", "sunder", "cleanse", "slow"],
    "rift":       ["displace", "surge", "chainArc", "scatter", "aoe"],
    "choir":      ["novaCharge", "cleanse", "regen", "volley", "haste"],
    "mayeth":     ["aoe", "exploit", "overkill", "burn", "shieldBreak"],
}
UTILITY_POOLS = {
    "bauhinia":   ["mark", "disable", "shieldBreak", "exploit", "cleanse"],
    "lionsheart": ["opener", "sunder", "disable", "execute", "crit"],
    "swanreach":  ["yieldBonus", "recycler", "coolant", "capacitor", "novaCharge"],
    "reaver":     ["overkill", "rampage", "pointBlank", "sunder", "execute"],
    "swarm":      ["chainArc", "aoe", "scatter", "burn", "volley"],
    "construct":  ["disable", "slow", "shieldBreak", "displace", "mark"],
    "hollow":     ["corrode", "burn", "sunder", "cleanse", "mark"],
    "rift":       ["displace", "surge", "chainArc", "scatter", "aoe"],
    "choir":      ["novaCharge", "cleanse", "regen", "volley", "haste"],
    "mayeth":     ["aoe", "exploit", "overkill", "burn", "pierce"],
}


# --- 功率归一化。
#
# 第一版直接按家族倍率乘 TIER_POWER,结果整体抬高了功率占用,weapons.test.ts 立刻
# 报"corvette 装不下整套 mk3:13.4 需求 vs 11 容量"。旧的护甲/引擎/工具平均只吃
# 0.7 倍 TIER_POWER——那正是武器(平均 1.19 倍)赖以存在的余量。
#
# 所以家族倍率只负责**家族之间的相对差异**,绝对量由这里归一化回旧的均值。
# 不这么做的话,"让模组更丰富"会顺手把每一条船都变成过载状态。
NON_WEAPON_POWER_MEAN = 0.72


def _normalize(doctrine: dict, key: str = "power"):
    vals = [d[key] for d in doctrine.values()]
    mean = sum(vals) / len(vals)
    for d in doctrine.values():
        d[key] = d[key] / mean * NON_WEAPON_POWER_MEAN


_normalize(ARMOR_DOCTRINE)
_normalize(ENGINE_DOCTRINE)


def armor_entry(id_, fam, name, rar):
    d = ARMOR_DOCTRINE[fam]
    budget = ARMOR_BUDGET[rar] / RARITY_MULT[rar]
    block = round(budget * d["block"] * 1.15)
    # 预算里没走格挡的那部分变成闪避点数(1 点 ≈ 1%)。
    evasion = round(budget * (1 - d["block"]) * 0.38, 1)
    power = max(1, round(TIER_POWER[rar] * d["power"]))
    sig = ARMOR_SIGNATURES[fam][TIERS.index(rar)]
    pool = [t for t in ARMOR_POOLS[fam] if t != sig]
    fields = [f'baseBlock: {block}']
    if evasion >= 0.5:
        fields.append(f'baseEvasion: {evasion}')
    # 0.8:实测一件 mk5 掠夺者轻甲能给到 +30%,而总上限是 +60%——两件就顶满,
    # 推力这条轴等于只有两格。压到单件不超过总上限的四成。
    thrust = round(d["thrust"] * 0.8, 3)
    if abs(thrust) >= 0.01:
        fields.append(f'baseThrust: {thrust}')
    return power, None, fields, sig, pool


def engine_entry(id_, fam, name, rar):
    d = ENGINE_DOCTRINE[fam]
    budget = ENGINE_BUDGET[rar] / RARITY_MULT[rar]
    evasion = round(budget * d["evasion"] * 0.62, 1)
    # 剩下的预算变成推力百分比。
    thrust = round(budget * (1 - d["evasion"]) * 0.022 * 0.8, 3)
    power = max(1, round(TIER_POWER[rar] * d["power"]))
    sig = ENGINE_SIGNATURES[fam][TIERS.index(rar)]
    pool = [t for t in ENGINE_POOLS[fam] if t != sig]
    fields = [f'baseEvasion: {evasion}', f'baseThrust: {thrust}']
    return power, None, fields, sig, pool


def utility_entry(id_, fam, name, rar):
    cd_turns = UTILITY_CADENCE[fam]
    interval = max(0.6, cd_turns * TURN_SECONDS)
    dmg = max(1, round(UTILITY_DPS[rar] * interval / RARITY_MULT[rar]))
    cadence_mult = (0.7 + 0.25 * min(cd_turns, 3.0))
    mean_cadence = sum(0.7 + 0.25 * min(c, 3.0) for c in UTILITY_CADENCE.values()) / len(UTILITY_CADENCE)
    power = max(1, round(TIER_POWER[rar] * cadence_mult / mean_cadence * NON_WEAPON_POWER_MEAN))
    sig = UTILITY_SIGNATURES[fam][TIERS.index(rar)]
    pool = [t for t in UTILITY_POOLS[fam] if t != sig]
    return power, round(cd_turns, 2), [f'baseDamage: {dmg}'], sig, pool


BUILDERS = {"armor": armor_entry, "engine": engine_entry, "utility": utility_entry}


def main():
    gear = json.load(open("/private/tmp/claude-502/-Users-hemes-projects/e4a1471e-5be5-434c-a8c9-58dd30a6bb97/scratchpad/gear.json"))
    src = open("src/data/moduleDefs.ts").read()
    total = 0
    for typ, rows in gear.items():
        for id_, fam, name, rar, col in rows:
            power, cd, fields, sig, pool = BUILDERS[typ](id_, fam, name, rar)
            lines = [
                f'id: "{id_}"', f'type: "{typ}"', f'family: "{fam}"', f'name: "{name}"',
                f'baseRarity: "{rar}"', f'powerDraw: {power}',
                f'cooldown: {cd if cd is not None else "null"}',
                *fields,
                f'signature: "{sig}"', f'traitPool: {json.dumps(pool)}',
            ]
            if col:
                lines.append(f'color: "{col}"')
            entry = "{\n" + "".join(f"    {l},\n" for l in lines) + "  }"
            pattern = re.compile(
                r'\{\s*id: "' + re.escape(id_) + r'",\s*type: "' + typ + r'",.*?\n  \}', re.S)
            src, n = pattern.subn(lambda _m: entry, src, count=1)
            total += n
    open("src/data/moduleDefs.ts", "w").write(src)
    print(f"rewrote {total}/150 entries")


if __name__ == "__main__":
    main()
