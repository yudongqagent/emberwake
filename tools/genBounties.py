#!/usr/bin/env python3
"""按悬赏**实际所在的星区威胁度**重算它的敌人和报酬。

起因是量出来的一条:最高舰级要 55 级 = 39,285 经验,而整个战役的全部经验之和是
6,782。打完剧情之后只刷悬赏的话,要打 595 场。

翻数据才发现根因不是"经验给少了",是**悬赏的数值是按新手村写的,从来没对照过它
被放在哪**:

    bauhiniaReach    威胁 1   悬赏 4   最低的一条 35 血 / 12 经验
    umbralLine       威胁 6   悬赏 1   120 血 / 35 经验
    chorusDeep       威胁 7   悬赏 1   130 血 / 40 经验

威胁 7 的星区里,一场 40 经验的遭遇。对一个 40 级、开着主权级骨架的玩家来说,
那既不是挑战也不是收益,只是地图上一个没有理由去点的圆圈。

这里按星区威胁重新给预算,曲线和猎杀队同源(1.85^(威胁-1)),但压到 0.62——
悬赏是玩家主动去刷的,猎杀队是找上门的,前者该比后者轻一点。

名字、派系、声望表、掉落种类全部原样保留:改的只是数值。
"""
import json, re

# 悬赏 id -> 它所在星区的威胁度。从 galaxies/*.ts 的实际投放位置读出来,
# 不是手填的——手填的话下一次搬动 POI 就会悄悄对不上。
def bounty_placements():
    import glob, os
    out = {}
    for f in glob.glob("src/data/galaxies/*.ts"):
        src = open(f).read()
        m = re.search(r'threat: (\d+)', src)
        threat = int(m.group(1))
        for bid in re.findall(r'encounterId: "(bounty\w+)"', src):
            out[bid] = threat
    return out


BOUNTY_SHARE = 0.62  # 相对猎杀队的强度/收益比例
CURVE = 1.85


def budget(threat: int) -> float:
    return (CURVE ** (threat - 1)) * BOUNTY_SHARE


def main():
    placements = bounty_placements()
    src = open("src/data/encounters.ts").read()
    start = src.index("export const BOUNTY_ENCOUNTER_DEFS")
    end = src.index("\n];", start) + 3
    block = src[start:end]

    changed = 0
    missing = []
    for bid, threat in sorted(placements.items()):
        pat = re.compile(r'(\{\s*(?://[^\n]*\n\s*)*id: "' + re.escape(bid) + r'",(?:.|\n)*?\n  \})')
        m = pat.search(block)
        if not m:
            missing.append(bid)
            continue
        entry = m.group(1)
        b = budget(threat)
        # 敌人:按预算重算,保留每条悬赏原有的相对形状(几艘船、谁带 regen/role)。
        n_enemies = len(re.findall(r'\{ name: "', entry))
        per = b / max(1, n_enemies) ** 0.5   # 船越多,单艘越弱
        def fix_enemy(em):
            e = em.group(0)
            e = re.sub(r'hull: \d+', lambda _: f'hull: {max(20, round(48 * per))}', e)
            e = re.sub(r'damage: \d+', lambda _: f'damage: {max(4, round(7.5 * per))}', e)
            e = re.sub(r'block: \d+', lambda _: f'block: {max(0, round(3.2 * per))}', e)
            e = re.sub(r'regen: \d+', lambda _: f'regen: {max(2, round(4 * per))}', e)
            return e
        entry = re.sub(r'\{ name: "[^"]*",[^}]*\}', fix_enemy, entry)
        # 报酬和经验:同一条曲线。
        entry = re.sub(r'xp: \d+', f'xp: {round(34 * b)}', entry)
        def fix_reward(rm):
            key, val = rm.group(1), int(rm.group(2))
            base = {"salvage": 62, "sourcePoints": 30, "alloy": 24, "insight": 4}.get(key)
            if base is None:
                return rm.group(0)
            return f'{key}: {round(base * b)}'
        entry = re.sub(r'(salvage|sourcePoints|alloy|insight): (\d+)', fix_reward, entry)
        block = block[:m.start(1)] + entry + block[m.end(1):]
        changed += 1

    open("src/data/encounters.ts", "w").write(src[:start] + block + src[end:])
    print(f"rescaled {changed}/{len(placements)} bounties")
    if missing:
        print("NOT FOUND (placed in a galaxy but no def):", missing)


if __name__ == "__main__":
    main()
