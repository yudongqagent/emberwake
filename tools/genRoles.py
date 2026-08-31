#!/usr/bin/env python3
"""给编队分配敌人角色,并按预算守恒补偿。

起因见 docs/fun-audit-2026-08-30.md 的第一条:六场战斗里五场零输入获胜(含三个
BOSS)。翻数据发现 **37 场遭遇里 24 场一个角色都没有**,其中 16 场有两艘以上敌人
——本来可以有"先打谁"这个决策,却没有。角色只在余烬负荷 1/3/4 之后才由系统补发,
而新玩家整个第一幕负荷都是 0。

上一轮的教训是硬教训:我直接给两个 BOSS 加了角色,结果第一个 BOSS 变成**先打谁
都赢不了**(两种目标顺序各三次,六次全败)。原因是它在加角色之前就已经踩在难度
上限上,而修复舰拉长了战斗时间 = 多挨更多伤害。

所以这一版的规则是**预算守恒**:

    给一艘船加角色的同时,削减它自己的数值。

修复舰和锚定舰都提高编队的实际耐久(一个回血,一个给别人加格挡),所以它们自己
要变脆——而且这正好是设计上想要的:它们应该是软目标,先杀它们才成立。炮击舰不
补偿,因为它蓄力那 5.5 秒什么都不做,而单发已经按船体比例封顶,总输出基本持平。

结果是仗变得**更有意思**,而不是更难。
"""
import re

# 一场只给一个角色。两个角色叠在一起,玩家读不出是哪个在杀他——
# 这是第一幕那次翻车教会我的。
FACTION_ROLE = {
    "swarm": "mender",        # 本来就自带 regen,治疗是它的语言
    "choir": "mender",        # 谐振支援
    "swanreach": "mender",    # 商会做的是兜底
    "constructs": "anchor",   # 拒止平台
    "hollow": "anchor",       # 把别人掏空、自己撑着
    "bauhinia": "artillery",  # 规整的远程齐射
    "lionsheart": "artillery",# 一击决胜
    "mayeth": "artillery",    # 遗物攻城武器
    "rift": "artillery",
    "riftEchoes": "artillery",
    "reavers": "artillery",   # 劫掠者的大口径
}

# 支援角色让编队更耐打,所以承载它的那艘要变脆多少。
SUPPORT_HULL_KEEP = 0.62
SUPPORT_DAMAGE_KEEP = 0.75

# 明确排除:这些场次要么只有一个敌人(没有"先打谁"),要么是我量不到正确强度、
# 不该乱动的。第一幕那门教学炮台已经手工调好并验证过。
SKIP = {
    "kestrelsRestRaid",       # 全游戏第一场,必须保持干净:它教的是"枪会自己开"
    "thornwakeDefenseGrid",   # 已手工调好并实测过
    "coldreachAnchorage",     # 实测:加角色后六次全败,它本来就踩在上限上
    "riftDiveShallow",        # 裂隙波次是运行时生成的,这里改不到
    "riftDiveDeep",
}


def pick_target(enemies_src: str) -> int:
    """挑哪一艘带角色:血量最高的那艘。
    一艘瞬间就死的支援船等于没有支援(这条规则和 emberLoad.ts 里的一致)。"""
    hulls = [int(h) for h in re.findall(r'hull: (\d+)', enemies_src)]
    return hulls.index(max(hulls))


def main():
    path = "src/data/encounters.ts"
    src = open(path).read()
    changed = []
    for m in list(re.finditer(r'\n    id: "(\w+)",\n    name: "[^"]*",\n    faction: "(\w+)",\n    isBoss: (\w+),(?:.|\n)*?enemies: \[([\s\S]*?)\],\n    rewards', src)):
        eid, faction, enemies = m.group(1), m.group(2), m.group(4)
        is_boss = m.group(3) == "true"
        if eid in SKIP:
            continue
        if 'role: "' in enemies:
            continue
        entries = re.findall(r'\{ name: "[^"]*"[^}]*\}', enemies)
        if len(entries) < 2:
            continue
        role = FACTION_ROLE.get(faction)
        if not role:
            continue
        # 剧情 BOSS 不自动分配炮击。
        #
        # 修复舰和锚定舰做了预算补偿(承载它的那艘变脆),所以编队总强度不变;
        # 炮击不补偿——它把持续输出换成一次封顶爆发,而 BOSS 战够长,足够打出
        # 两三发。上一轮我就是这样把第一个 BOSS 变成必败的。
        #
        # 我又没法在正确强度下验证剧情 BOSS(玩家到那一场时的等级、装备、船体
        # 都不是我能可靠构造的)。验证不了的东西就不发布。
        if is_boss and role == "artillery":
            continue
        idx = pick_target(enemies)
        target = entries[idx]
        new = target
        if role in ("mender", "anchor"):
            def cut(mm, keep):
                return f"{mm.group(1)}: {max(1, round(int(mm.group(2)) * keep))}"
            new = re.sub(r'(hull): (\d+)', lambda mm: cut(mm, SUPPORT_HULL_KEEP), new)
            new = re.sub(r'(damage): (\d+)', lambda mm: cut(mm, SUPPORT_DAMAGE_KEEP), new)
        new = new[:-2] + f', role: "{role}" }}' if new.endswith(" }") else new[:-1] + f', role: "{role}" }}'
        src = src.replace(target, new, 1)
        changed.append((eid, faction, role, idx))

    open(path, "w").write(src)
    print(f"assigned roles to {len(changed)} encounters")
    for eid, fac, role, idx in changed:
        print(f"  {eid:30} {fac:12} -> {role} (第 {idx+1} 艘)")


if __name__ == "__main__":
    main()
