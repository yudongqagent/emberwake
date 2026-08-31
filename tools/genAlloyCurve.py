#!/usr/bin/env python3
"""把合金收入按**升级需求**重新分配,而不是按星区威胁指数堆在最后。

2026-08-31(/loop 第 48 轮)。量出来的一条:

    到达时      累计合金   七件装备升得到   该区敌人中位伤害
    威胁 1        235         2 / 7              14
    威胁 2        531         3 / 7              25
    威胁 3        653         3 / 7              51
    威胁 4        807         3 / 7             190
    威胁 5      1,329         4 / 7             179
    威胁 6      2,795         6 / 7             409
    威胁 7      5,886         7 / 7             762

**升级预算在威胁 2/3/4 连着三个区卡在 3 级不动,而敌人伤害在同一段翻了 7.6 倍。**
全战役 53% 的合金出在最后一个星区、78% 出在最后两个——等能升满的时候,游戏已经
结束了。这是"需要的时候商店是空的,不需要了才满"。

根因是奖励和敌人数值共用了同一条指数曲线(1.85^(威胁-1)),而**升级需求不是指数**:
玩家要的是"每进一个区,装备跟着升一级"。指数收入配线性需求,中段必然塌陷。

这里按需求反推目标:到达第 N 个区时,累计合金应当刚好够把七件装备升到第 N 级。
mk2 的每级单价是 18 × 1.32 × 1.55^(级-1),七件同升。

总量**精确**保持不变(5,886 → 5,886):最后一个区拿的是"原总量减去前面所有区",
这条硬约束保证这是重新分配而不是通胀。剩下的余裕正好给 mk3/mk4 更贵的升级和招募。

名字、派系、掉落种类、其它资源全部原样保留:只动 alloy 的数字。
"""
import glob, re

RARITY_MK2 = 1.32
CURVE = 1.55


def step(level: int) -> int:
    """把一件 mk2 模组从 level 升到 level+1 的合金单价。"""
    return round(18 * RARITY_MK2 * CURVE ** (level - 1))


MAX_MODULE_LEVEL = 7


def target_cumulative(level: int) -> int:
    """把七件装备一起升到 level 级要花的合金总额。level 封顶在 7——
    模组只有 7 级,把 step(7) 算进去会凭空多出 2,303 合金,那就成了通胀。"""
    level = min(level, MAX_MODULE_LEVEL)
    return sum(step(l) for l in range(1, level)) * 7


def encounter_entries(src: str):
    """把 encounters.ts 切成 {id: (起, 止)}。

    第一版用 `id: "X",[\s\S]{0,900}?rewards:` 抓,结果**跨到了相邻条目上**:
    一条遭遇战的 id 配上了下一条的 rewards,重分配之后总量从 5,886 变成 7,955。
    正则跨条目是这类数据工具最常见的翻车方式,所以这里按大括号配对切。"""
    out = {}
    for m in re.finditer(r'\n  \{\s*\n\s*id: "([^"]+)"', src):
        start = m.start() + 1
        depth = 0
        i = start
        while i < len(src):
            if src[i] == "{":
                depth += 1
            elif src[i] == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        out[m.group(1)] = (start, i + 1)
    return out


def region_alloy() -> dict:
    """每个星区现在实际产出多少合金——POI 自带的和它引用的遭遇战的加在一起。

    一条遭遇战可能被同一个区引用两次(比如掠夺者残党),那它的合金也确实进账两次,
    所以这里按**引用次数**累加,不去重。"""
    enc = open("src/data/encounters.ts").read()
    entries = encounter_entries(enc)
    rewards = {}
    for eid, (a, b) in entries.items():
        m = re.search(r"rewards: \{[^}]*?alloy: (\d+)", enc[a:b])
        if m:
            rewards[eid] = int(m.group(1))
    out = {}
    for f in glob.glob("src/data/galaxies/*.ts"):
        src = open(f).read()
        threat = int(re.search(r"threat: (\d+)", src).group(1))
        total = sum(rewards.get(eid, 0) for eid in re.findall(r'encounterId: "([^"]+)"', src))
        total += sum(int(a) for a in re.findall(r"rewards: \{[^}]*alloy: (\d+)", src))
        out[threat] = (f, total)
    return out


def main():
    regions = region_alloy()
    order = sorted(regions)
    grand_total = sum(t for _, t in regions.values())
    targets = {}
    prev = 0
    for i, threat in enumerate(order, start=1):
        if i < len(order):
            # 到达第 i 个区时,七件装备应当刚好升得起到第 i+1 级。
            cum = target_cumulative(i + 1)
            targets[threat] = max(1, cum - prev)
            prev = cum
        else:
            # 最后一个区拿"原总量减去前面所有区"——这条硬约束保证这是
            # **重新分配**而不是通胀。剩下的余裕正好留给 mk3/mk4 更贵的
            # 升级和招募船员。
            targets[threat] = max(1, grand_total - prev)
    print(f"总量:{grand_total} → {sum(targets.values())}(必须一致)")

    enc_src = open("src/data/encounters.ts").read()
    # 每条遭遇战只能被改一次。一条遭遇战只属于一个星区(genBounties 也是这么
    # 认的),但同一个区可能引用它两次——改两次就是把倍率平方。
    done = set()
    print(f"{'威胁':>4} {'现在':>8} {'目标':>8}  倍率")
    for threat in order:
        f, cur = regions[threat]
        tgt = targets[threat]
        if cur == 0:
            print(f"{threat:>4} {cur:>8} {tgt:>8}  (本区没有合金掉落,跳过)")
            continue
        k = tgt / cur
        print(f"{threat:>4} {cur:>8} {tgt:>8}  ×{k:.2f}")
        gal = open(f).read()
        for eid in dict.fromkeys(re.findall(r'encounterId: "([^"]+)"', gal)):
            if eid in done:
                continue
            done.add(eid)
            entries = encounter_entries(enc_src)
            if eid not in entries:
                continue
            a, b = entries[eid]
            body = re.sub(
                r"(rewards: \{[^}]*?alloy: )(\d+)",
                lambda m: m.group(1) + str(max(1, round(int(m.group(2)) * k))),
                enc_src[a:b],
                count=1,
            )
            enc_src = enc_src[:a] + body + enc_src[b:]
        gal = re.sub(
            r"(rewards: \{[^}]*alloy: )(\d+)",
            lambda m: m.group(1) + str(max(1, round(int(m.group(2)) * k))),
            gal,
        )
        open(f, "w").write(gal)
    open("src/data/encounters.ts", "w").write(enc_src)
    print("\n重新分配完成 —— 总量不变,只是把它挪到需要它的时候。")


if __name__ == "__main__":
    main()
