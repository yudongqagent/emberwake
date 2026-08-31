#!/usr/bin/env python3
"""按遭遇**实际所在的星区威胁度**重算敌人的船体和伤害。

起因是这一条实测(2026-08-31,/loop 第 22 轮):

    全游戏敌人的最重一击,占玩家该阶段血量的比例
        威胁1   18 /   158  = 11.4%
        威胁2   20 /   393  =  5.1%
        威胁3   16 /   999  =  1.6%
        威胁4   29 /  2368  =  1.2%
        威胁5   54 /  5214  =  1.0%
        威胁6  101 / 10061  =  1.0%
        威胁7  132 / 18258  =  0.7%

玩家耐久从 107 涨到 18258(约 190 倍),敌人伤害从 18 涨到 132(7.3 倍)。差了
二十多倍,于是终局最重的一击只值 0.7% 血量——这游戏走到后面就没有输的可能了。
上一轮修掉了"格挡直接减法导致无敌",但那只是把 1 点伤害变成 25%;分母还在涨。

还有一条更难看的:**威胁 3 的星区全线弱于新手村**(伤害中位 6 对 14,上限 16 对
18,血上限 102 对 260),而地图上它挂着三格危险条,还会弹"高于你当前实力"的警告。
数值是按新手村写的,从来没对照过它被放在哪——和当初悬赏那条一模一样的病。

## 目标曲线

不做"跟着玩家等级涨"的全量缩放。搜到的共识是玩家升级本来就是为了变强,全量
缩放会把这份回报抹掉;该做的是**限定缩放**——数值跟着**星区**走,不跟着玩家走。
于是一个越级玩家回头碾压老星区依然成立(那是他应得的),而前沿星区始终有牙。

一击应占玩家血量的比例,从 11% 缓降到 5.5%:玩家仍然明显变强(绝对血量、格挡、
闪避、技能全都涨了),但一发打上来还是要疼。

名字、派系、角色、掉落、经验全部原样保留:改的只是 hull 和 damage。
"""
import glob, re, math

# ── 玩家在各阶梯的预期血量(从 hullClasses.ts 读,不手填)────────────────────
def expected_hull_by_tier():
    src = open("src/data/hullClasses.ts").read()
    # 每个舰级:order / baseHull / minLevel
    entries = []
    for block in re.findall(r'\{[^{}]*?id: "\w+",[\s\S]*?baseHull: \d+[\s\S]*?\}', src):
        o = re.search(r'order: (\d+)', block)
        b = re.search(r'baseHull: (\d+)', block)
        l = re.search(r'minLevel: (\d+)', block)
        if o and b and l:
            entries.append((int(o.group(1)), int(b.group(1)), int(l.group(1))))
    tiers = {}
    for order, base_hull, min_level in entries:
        level = max(1, min_level)
        # computeMaxHull 的公式:baseHull × 稀有度 × (1 + (等级-1)×0.08) × roll
        # 这里取 standard(1.0)和中性 roll(1.0),只要各阶梯用同一套就够了。
        hp = round(base_hull * (1 + (level - 1) * 0.08))
        tiers.setdefault(order, []).append(hp)
    # 同阶梯有多个舰级时取平均——玩家只会开其中一艘
    return {k: sum(v) / len(v) for k, v in sorted(tiers.items())}


# ── 遭遇 → 它所在星区的威胁度 ───────────────────────────────────────────────
def encounter_threat():
    """POI 上挂的 encounterId,加上剧情场景的 startEncounter(按场景的 systemId 归区)。"""
    sys_threat, out = {}, {}
    for f in glob.glob("src/data/galaxies/*.ts"):
        src = open(f).read()
        threat = int(re.search(r'threat: (\d+)', src).group(1))
        for sid in re.findall(r'id: "(\w+)",\s*\n\s*galaxyId:', src):
            sys_threat[sid] = threat
        for eid in re.findall(r'encounterId: "(\w+)"', src):
            out[eid] = threat
    for f in glob.glob("src/data/story/*.ts"):
        src = open(f).read()
        # 场景块里 systemId 和 startEncounter 成对出现
        for block in re.findall(r'\{[\s\S]{0,2000}?startEncounter: "\w+"[\s\S]{0,400}?\}', src):
            s = re.search(r'systemId: "(\w+)"', block)
            e = re.search(r'startEncounter: "(\w+)"', block)
            if s and e and s.group(1) in sys_threat:
                out.setdefault(e.group(1), sys_threat[s.group(1)])
    return out


# 一击该占玩家血量的比例:从新手村的 11% 缓降到终局的 5.5%。
# 降而不平,是因为"变强"必须能被感觉到;不降到 0,是因为游戏必须还能输。
def target_fraction(threat):
    return 0.11 - (0.11 - 0.055) * ((threat - 1) / 6)


# ── 玩家在各阶梯的**每轮齐射伤害**(从 moduleDefs.ts + hullClasses.ts 读)──────
# 各阶梯能拿到的模组稀有度。玩家不会填满武器槽,按一半算。
TIER_RARITY = ["mk1", "mk2", "mk2", "mk3", "mk4", "mk4", "mk5"]
# 模型算出来比实测高:阶梯0 模型 88 / 实测 20,阶梯3 模型 796 / 实测 227。
# 形状对得上(比值 9.0 对 11.4),所以只除一个常数校准。
OFFENSE_CALIBRATION = 3.7
RARITY_MULT = {"mk1": 1.0, "mk2": 1.35, "mk3": 1.8, "mk4": 2.4, "mk5": 3.2}


def expected_offense_by_tier():
    hulls = open("src/data/hullClasses.ts").read()
    mods = open("src/data/moduleDefs.ts").read()
    base_dmg = [int(x) for x in re.findall(r'baseDamage: (\d+)', mods)]
    best = max(base_dmg)
    out = {}
    for block in re.findall(r'\{[^{}]*?id: "\w+",[\s\S]*?baseHull: \d+[\s\S]*?\}', hulls):
        o = re.search(r'order: (\d+)', block)
        w = re.search(r'weapon: (\d+)', block)
        l = re.search(r'minLevel: (\d+)', block)
        if not (o and w and l):
            continue
        tier = int(o.group(1))
        rarity = TIER_RARITY[min(tier, len(TIER_RARITY) - 1)]
        level = max(1, round(int(l.group(1)) / 3))
        fitted = max(1, round(int(w.group(1)) / 2))
        per = best * RARITY_MULT[rarity] * (1 + (level - 1) * 0.12) * fitted
        out[tier] = max(out.get(tier, 0.0), per / OFFENSE_CALIBRATION)
    return out


# 敌人的**血量**按"打死一个要几轮齐射"对齐。
#
# 我在这上面连错三版,记全:
#
#   第一版 血量和伤害共用"玩家血量增长"的倍率 → 威胁7 血量 ×8.3
#   第二版 血量改跟"玩家单发伤害增长(35 倍)"  → 威胁7 血量 ×4.8
#          实测 55 级打威胁 7 耗时 114.9 秒(改前 25.6 秒),于是我判定"血量一直是
#          对的",退回只补地板。
#   第三版 那个判定是错的。那个 55 级存档**只装了 1 把武器**(第 18 轮一键装配时
#          其余全是重复设计装不上),我拿一艘火力只有正常五分之一的船,推翻了整条
#          血量曲线。
#
# 按数据重量一遍,"打死一个典型敌人要几轮齐射":
#
#     威胁1 1.9 轮   威胁2 1.8   威胁3 1.6
#     威胁4 0.5 轮   威胁5 0.6   威胁6 0.2   威胁7 0.1
#
# 从威胁 4 起敌人在出手之前就死了——实测威胁 4 的悬赏对 22 级玩家是
# 「2.7 秒胜,承受伤害 0」。作者写的前三档(1.6–1.9 轮)就是目标。
TARGET_VOLLEYS = 1.8


def _unused(threat):
    return threat
#
# 我在这上面连错两版:
#
#   第一版 血量和伤害共用"玩家血量增长"的倍率 → 威胁7 血量 1900→15842
#   第二版 血量改跟"玩家单发伤害增长(35 倍)"  → 威胁7 血量 1900→9100
#
# 第二版实测:55 级满血打威胁 7,胜利,承受 34842/63441(掉一半血,对了),但
# **耗时 114.9 秒**——改前是 25.6 秒。掉血修好了,时长翻了四倍半,那不是难是熬。
#
# 回头核对才发现锚选错了:我拿"各星区最厚的那只"当基准(260 → 1900,7.3 倍),
# 而那两只都是 BOSS。看**典型敌人**的话是 45 → 1215,27 倍——和玩家单发伤害的
# 35 倍本来就是对得上的。换句话说血量的曲线一直是对的,战斗时长(10 秒 → 25 秒)
# 也一直是对的。坏的只有伤害。
#
# 所以血量只做一件事:把**低于前一档**的星区抬上来。威胁 3 的血上限 102,比新手村
# 的 260 还低,那是笔误级别的数据,不是设计。 */
# 单个敌人的伤害最多是本星区中位的几倍。
#
# 按中位对齐之后中位那条线平滑了(每档 ×1.6–2.6),但**上限**炸了:威胁6 的最重
# 一击涨到 3018,占预期血量 25.2%——一发抽掉四分之一血。原因是有的星区里中位和
# 上限本来就差 5 倍以上(威胁6 是 19 对 101,那是一门攻城炮),按中位放大就把这份
# 差距一起放大了。
#
# 封顶保留作者写的差距(健康的星区差 1.3–2 倍,压根碰不到),只削掉离群的那几个。
MAX_SPREAD = 3.0


def hull_targets(cur_hull_median, offense):
    """让"几轮打死一个"在整局里保持稳定;再压成随威胁单调不减。"""
    raw = {t: TARGET_VOLLEYS * offense[min(max(t - 1, 0), max(offense))] for t in sorted(cur_hull_median)}
    # 威胁 1 是基准,原样不动
    base = min(raw)
    raw[base] = float(cur_hull_median[base])
    out, running = {}, 0.0
    for t in sorted(raw):
        running = max(running, raw[t])
        out[t] = running
    return out


def main():
    tiers = expected_hull_by_tier()
    threat_of = encounter_threat()
    src = open("src/data/encounters.ts").read()

    # 每个星区当前的**中位**伤害 / 最厚血,用来算需要的倍率。
    #
    # 第一版按"最重一击"对齐,结果威胁3→威胁4 的中位伤害跳了 ×3.59,而其他每一档
    # 都只有 1.2–1.9×——图上拱起一段再回到趋势线,正是难度尖刺的形状。原因是各
    # 星区里"中位和最重"的差距是作者写出来的、宽窄不一(威胁3 是 6/16,威胁4 是
    # 15/29),按最重对齐就等于把这份差距放大成台阶。
    #
    # 按中位对齐,作者写的那份差距原样保留,玩家大部分时间挨到的那个数才连续。
    cur_dmg, cur_hull = {}, {}
    for block in re.finditer(r'id: "(\w+)",[\s\S]*?enemies: \[([\s\S]*?)\],\s*\n\s*rewards:', src):
        eid, body = block.group(1), block.group(2)
        t = threat_of.get(eid)
        if not t:
            continue
        cur_dmg.setdefault(t, []).extend(int(d) for d in re.findall(r'damage: (\d+)', body))
        cur_hull.setdefault(t, []).extend(int(h) for h in re.findall(r'hull: (\d+)', body))

    # 单调的必须是**结果的绝对值**,不是倍率。
    #
    # 第一版对倍率取了 running max,而威胁 3 的原始血量异常低(102),它需要的大倍率
    # 把后面每一档全顶了上去——威胁 7 因此拿到 ×8.34,血量涨到 15842(相对新手村
    # 61 倍),一场架又变成了熬时间。
    #
    # 现在先算出每一档**应该是多少**(目标曲线本身就是单调的),再反推倍率。
    # 倍率本身可以忽高忽低——威胁 3 需要 ×8.7 只是因为它原本写得太弱。
    def multipliers(current, target):
        return {t: target[t] / current[t] for t in sorted(current)}

    def median(xs):
        ys = sorted(xs)
        return ys[len(ys) // 2]

    cur_dmg = {t: median(v) for t, v in cur_dmg.items()}
    cur_hull = {t: median(v) for t, v in cur_hull.items()}
    offense = expected_offense_by_tier()
    base_t = min(cur_dmg)
    dmg_target = {
        t: cur_dmg[base_t]
           * (target_fraction(t) * tiers[min(max(t - 1, 0), max(tiers))])
           / (target_fraction(base_t) * tiers[min(max(base_t - 1, 0), max(tiers))])
        for t in sorted(cur_dmg)
    }
    hull_target = hull_targets(cur_hull, offense)
    dmg_scale = multipliers(cur_dmg, dmg_target)
    hull_scale = multipliers(cur_hull, hull_target)

    print("每个星区的倍率(相对新手村):")
    for t in sorted(dmg_scale):
        nd = round(cur_dmg[t] * dmg_scale[t])
        nh = round(cur_hull[t] * hull_scale[t])
        hp = round(tiers[min(max(t - 1, 0), max(tiers))])
        print(f"  威胁{t}  伤害 {cur_dmg[t]:>4} ×{dmg_scale[t]:.2f} → {nd:>5} (占预期血 {hp:>6} 的 {nd/hp*100:.1f}%)"
              f"   |  血量中位 {cur_hull[t]:>4} ×{hull_scale[t]:.2f} → {nh:>6}"
              f" (每轮齐射约 {round(offense[min(max(t-1,0),max(offense))]):>5} → {nh/offense[min(max(t-1,0),max(offense))]:.1f} 轮)")

    # ── 改写 ───────────────────────────────────────────────────────────────
    changed = [0]

    def rewrite(m):
        eid, body = m.group(1), m.group(2)
        t = threat_of.get(eid)
        if not t:
            return m.group(0)
        kd, kh = dmg_scale.get(t, 1.0), hull_scale.get(t, 1.0)
        if abs(kd - 1.0) < 1e-9 and abs(kh - 1.0) < 1e-9:
            return m.group(0)
        cap = MAX_SPREAD * cur_dmg[t] * kd
        def bump(mm):
            key, val = mm.group(1), int(mm.group(2))
            changed[0] += 1
            if key == "hull":
                return f"hull: {max(1, round(val * kh))}"
            return f"damage: {max(1, round(min(val * kd, cap)))}"
        return m.group(0).replace(body, re.sub(r'(hull|damage): (\d+)', bump, body))

    out = re.sub(r'id: "(\w+)",[\s\S]*?enemies: \[([\s\S]*?)\],\s*\n\s*rewards:', rewrite, src)
    open("src/data/encounters.ts", "w").write(out)
    print(f"\n改写了 {changed[0]} 个数值。")


if __name__ == "__main__":
    main()
