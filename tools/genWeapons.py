#!/usr/bin/env python3
"""Regenerate the 50 weapon entries in src/data/moduleDefs.ts.

Fixes the weapon-system audit (docs/weapon-system-audit.md). Ids, names and
colors are preserved exactly — MODULE_NAMES_ZH is keyed by id, so changing an id
would silently drop a translation.

The core idea: every weapon is built from a per-tier DPS BUDGET and a per-family
CADENCE. Damage and cooldown then move inversely around that budget, so a Reaver
gun and a Mayeth gun of the same tier are worth the same in sustained damage
while playing completely differently. Previously all ten weapons in a tier shared
one stat line, which is why there were 50 weapons and 5 distinct weapons.
"""
import json, re

# --- Tier budget: sustained DPS at instance-rarity == baseRarity, level 1,
# neutral quality. Strictly monotonic, ~1.5x per tier. The old table was
# 7.5 / 11.0 / 22.5 / 22.0 / 43.1 — note mk4 BELOW mk3, audit item #2.
TIER_DPS = {"mk1": 9.0, "mk2": 14.0, "mk3": 21.0, "mk4": 31.0, "mk5": 46.0}
RARITY_MULT = {"mk1": 1.0, "mk2": 1.32, "mk3": 1.74, "mk4": 2.3, "mk5": 3.04}
TURN_SECONDS = 2.4

# --- Cadence per family, in turns. This is the axis that did not exist: the old
# roster had exactly three cooldown values and they were pinned to tier, so
# "fast weak gun vs slow heavy gun" was not expressible at all.
CADENCE = {
    "reaver":     0.35,  # frenzied close-range chatter
    "swarm":      0.40,  # many small hits
    "choir":      0.62,  # builds resonance through volume
    "swanreach":  0.70,  # efficient, steady
    "bauhinia":   1.00,  # disciplined baseline
    "hollow":     1.10,  # slow corrosive drain
    "rift":       1.25,  # unstable, spaced
    "construct":  1.60,  # heavy denial platforms
    "lionsheart": 1.85,  # single decisive strikes
    "mayeth":     2.40,  # relic siege weapons
}

# Power draw scales with tier, and heavier weapons cost more to run — so a slow
# hard-hitting fit and a fast light fit differ in what they cost you, not just in
# how they feel. Power is a real budget now (see equipModule).
TIER_POWER = {"mk1": 1, "mk2": 2, "mk3": 3, "mk4": 4, "mk5": 5}

RANGE_PROFILE = {
    "reaver":     "close",
    "swarm":      "close",
    "choir":      "mid",
    "swanreach":  "mid",
    "bauhinia":   "long",
    "hollow":     "mid",
    "rift":       "flat",
    "construct":  "long",
    "lionsheart": "close",
    "mayeth":     "long",
}

# --- Five DISTINCT signatures per family, one per tier (audit #7: families used
# to repeat, so tier 1 and tier 3 were the same weapon with bigger numbers).
# Drawn to match each family's doctrine in docs/module-system.md, and spread far
# wider across the implemented effect vocabulary than the old roster managed
# (audit #8).
SIGNATURES = {
    "bauhinia":   ["crit", "sniper", "pierce", "mark", "exploit"],
    "lionsheart": ["opener", "finisher", "execute", "overload", "sunder"],
    "swanreach":  ["novaCharge", "overdriveSync", "recycler", "coolant", "yieldBonus"],
    "reaver":     ["pointBlank", "rampage", "execute", "overkill", "finisher"],
    "swarm":      ["scatter", "barrage", "chainArc", "volley", "aoe"],
    "construct":  ["disable", "shieldBreak", "slow", "pierce", "displace"],
    "hollow":     ["corrode", "burn", "sunder", "slow", "mark"],
    "rift":       ["chainArc", "surge", "scatter", "displace", "aoe"],
    "choir":      ["volley", "barrage", "novaCharge", "overload", "rampage"],
    "mayeth":     ["aoe", "overkill", "exploit", "burn", "crit"],
}

# --- Family trait pools (audit #6: 43 of 50 weapons shared ONE pool of four
# effects, and only 5 distinct traits existed across the whole roster). Each pool
# is doctrine-flavoured so a roll tells you where the gun came from.
TRAIT_POOLS = {
    "bauhinia":   ["crit", "pierce", "sniper", "mark", "opener"],
    "lionsheart": ["execute", "opener", "finisher", "crit", "sunder"],
    "swanreach":  ["coolant", "recycler", "novaCharge", "yieldBonus", "capacitor"],
    "reaver":     ["pointBlank", "rampage", "execute", "overkill", "crit"],
    "swarm":      ["scatter", "barrage", "chainArc", "volley", "surge"],
    "construct":  ["disable", "shieldBreak", "slow", "pierce", "displace"],
    "hollow":     ["corrode", "burn", "sunder", "mark", "exploit"],
    "rift":       ["surge", "chainArc", "displace", "scatter", "aoe"],
    "choir":      ["volley", "barrage", "overload", "novaCharge", "surge"],
    "mayeth":     ["aoe", "overkill", "exploit", "burn", "pierce"],
}


def build(fam: str, tier: str):
    cd_turns = CADENCE[fam]
    interval = max(0.6, cd_turns * TURN_SECONDS)
    # damage such that damage * rarityMult / interval == TIER_DPS[tier]
    dmg = TIER_DPS[tier] * interval / RARITY_MULT[tier]
    # Heavier cadence costs a little more power; lighter costs a little less.
    power = TIER_POWER[tier] * (0.8 + 0.35 * min(cd_turns, 2.4))
    return round(dmg), round(cd_turns, 2), max(1, round(power))


def main():
    blocks = json.load(open("/tmp/weapons.json"))
    src = open("src/data/moduleDefs.ts").read()
    tiers = ["mk1", "mk2", "mk3", "mk4", "mk5"]
    replaced = 0
    for id_, fam, name, rar, col in blocks:
        dmg, cd, power = build(fam, rar)
        sig = SIGNATURES[fam][tiers.index(rar)]
        pool = [t for t in TRAIT_POOLS[fam] if t != sig]
        entry = (
            f'{{\n'
            f'    id: "{id_}",\n'
            f'    type: "weapon",\n'
            f'    family: "{fam}",\n'
            f'    name: "{name}",\n'
            f'    baseRarity: "{rar}",\n'
            f'    powerDraw: {power},\n'
            f'    cooldown: {cd},\n'
            f'    baseDamage: {dmg},\n'
            f'    signature: "{sig}",\n'
            f'    traitPool: {json.dumps(pool)},\n'
            f'    rangeProfile: "{RANGE_PROFILE[fam]}",\n'
            f'    color: "{col}",\n'
            f'  }}'
        )
        pattern = re.compile(
            r'\{\s*id: "' + re.escape(id_) + r'",\s*type: "weapon",.*?color: "[^"]+",\s*\}',
            re.S,
        )
        src, n = pattern.subn(lambda _m: entry, src, count=1)
        replaced += n
    open("src/data/moduleDefs.ts", "w").write(src)
    print(f"rewrote {replaced}/50 weapon entries")


if __name__ == "__main__":
    main()
