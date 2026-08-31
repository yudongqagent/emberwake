import { moduleDefById } from "../../data/modules";
import {
  computeModuleDamage,
  computeModuleBlock,
  computeModuleEvasion,
  computeModuleThrust,
} from "../../engine/modules";
import type { ModuleInstance } from "../../data/types";
import { t } from "../../i18n/strings";
import { localizedTrait } from "../../i18n/data";

/** 一件模组的数值行,四个界面共用。
 *
 * 2026-08-31 实测(/loop 第 11 轮):在制造工坊里,引擎显示的是
 *
 *     消隐引擎  引擎  MK1  再生 动能  20  购买
 *
 * ——**一个数字都没有**,而旁边的装甲显示「格挡 10」。我在更早的轮次里给引擎补上了
 * 闪避和推力,但只接到了模组页;制造工坊、购买后的展示、整备抉择卡各写各的
 * `def.baseDamage !== undefined ? ... : def.baseBlock !== undefined ? ...`,
 * 三处都只认伤害和格挡。
 *
 * 这和上一轮那三条"给模组"的路径是同一种病:规则对了,但没接全。所以这次不是
 * 再补两处,而是抽成一个组件——第四个需要显示模组数值的界面不会再漏一次。
 *
 * ---
 * 2026-08-31(第 19 轮)加上 `compareTo`。抉择卡上写「Dmg 28」,而在装的那把是
 * 「Dmg 489」;玩家要判断该不该换,得记住自己八件装备的数值。Diablo 4 的
 * Advanced Tooltip Compare 就是干这个的:绿色是换上去会得到的,红色是会失去的。
 *
 * 只给差值,**不给"这是升级"的结论徽章**。带词条、门派套装的那件常常数值更低
 * 却更该留着;把判断压成一个绿箭头,等于替玩家把这个游戏最有意思的决定做掉了。
 */
export function ModuleStats({
  mod,
  compareTo,
  gap = "0.9rem",
  size = "0.76rem",
}: {
  mod: ModuleInstance;
  /** 这件模组会顶掉的那件(见 engine/modules.ts 的 replacedBy)。给了就显示差值。 */
  compareTo?: ModuleInstance | null;
  gap?: string;
  size?: string;
}) {
  const def = moduleDefById(mod.defId);
  const bits: { text: string; color: string; delta?: number; decimals?: number; lowerIsBetter?: boolean }[] = [];
  const oldDef = compareTo ? moduleDefById(compareTo.defId) : null;

  if (def.baseDamage !== undefined) {
    const now = computeModuleDamage(mod);
    bits.push({
      text: t("modules.dmg", { value: now }),
      color: "var(--red)",
      delta: compareTo && oldDef?.baseDamage !== undefined ? now - computeModuleDamage(compareTo) : undefined,
    });
  }
  if (def.baseBlock !== undefined) {
    const now = computeModuleBlock(mod);
    bits.push({
      text: t("modules.block", { value: now }),
      color: "var(--cyan)",
      delta: compareTo && oldDef?.baseBlock !== undefined ? now - computeModuleBlock(compareTo) : undefined,
    });
  }
  if (def.baseEvasion) {
    const now = computeModuleEvasion(mod);
    bits.push({
      text: t("modules.eva", { value: now.toFixed(1) }),
      color: "var(--green)",
      delta: compareTo && oldDef?.baseEvasion ? now - computeModuleEvasion(compareTo) : undefined,
      decimals: 1,
    });
  }
  if (def.baseThrust) {
    const thr = computeModuleThrust(mod);
    bits.push({
      text: t("modules.thrust", { value: `${thr >= 0 ? "+" : ""}${Math.round(thr * 100)}` }),
      color: thr >= 0 ? "var(--amber)" : "var(--red)",
      delta: compareTo && oldDef?.baseThrust
        ? Math.round(thr * 100) - Math.round(computeModuleThrust(compareTo) * 100)
        : undefined,
    });
  }
  // 偏好射程。第 47 轮:rangeProfileMultiplier 给擅长的档位 ×1.25、差两档 ×0.75
  // ——1.67 倍的跨度,50 把武器里 41 把带着它,而在此之前它只被伤害计算读过,
  // 界面上一处都不显示。抽卡时看不见它,就没法为"我这套要贴脸还是要放风筝"
  // 挑武器。
  if (def.rangeProfile && def.rangeProfile !== "flat") {
    const changed = compareTo && oldDef?.rangeProfile !== def.rangeProfile;
    bits.push({
      text: t("modules.prefersRange", { band: t(`combat.rangeBand.${def.rangeProfile}`) }),
      color: changed ? "var(--amber)" : "var(--text-mid)",
    });
  }
  // 功率是真实预算(装满一套 mk5 会超出小舰体的容量),换装时它必须一起看。
  if (compareTo && def.powerDraw !== oldDef?.powerDraw) {
    bits.push({
      text: t("modules.pwr", { value: def.powerDraw }),
      color: "var(--text-mid)",
      delta: def.powerDraw - (oldDef?.powerDraw ?? 0),
      lowerIsBetter: true,
    });
  }

  if (bits.length === 0) return null;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap, fontSize: size }}>
      {bits.map((b, i) => (
        <span key={i} style={{ color: b.color }}>
          {b.text}
          {b.delta !== undefined && b.delta !== 0 && (
            <Delta value={b.delta} decimals={b.decimals ?? 0} lowerIsBetter={b.lowerIsBetter === true} />
          )}
        </span>
      ))}
      {/* 「−442」单看会被读成"装上会变弱"。写清楚参照的是身上最强的同类,它就
          变成一句陈述:我那把打 489,这个打 47。 */}
      {compareTo && bits.some((b) => b.delta) && (
        <span style={{ color: "var(--text-dim)" }}>{t("modules.vsBest")}</span>
      )}
      <TraitDiff mod={mod} compareTo={compareTo} />
    </span>
  );
}

/** 换装会得到哪些效果、会失去哪些效果。
 *
 * 2026-08-31(/loop 第 46 轮)。搜同类游戏搜到的一条是"无脑必选":一旦某个选项
 * 严格更强,构筑系统就不再是构筑。回头量 Emberwake,问题比那还早一步——
 * **玩家根本看不见自己在选什么**。
 *
 * 每件抽出来的模组都带 1-3 条随机词条(engine/modules.ts 的 drawModule),而这些
 * 词条的强度差着一个数量级:
 *
 *     barrage  三连射,每发 42%   ≈ ×2.26 伤害
 *     volley   再打一发满伤       ≈ ×2.00
 *     crit     +12% 暴击率        ≈ ×1.06
 *
 * 也就是说词条能值 2.1 倍,而整条稀有度曲线(mk1→mk5)才 3.04 倍。可抉择卡上
 * 只写签名效果和**基础伤害的差值**——而 benchmarkFor 挑参照物用的也只是基础
 * 伤害(engine/modules.ts:202)。于是每场仗都要做一次的那个决定,玩家看到的是
 * 真相里较小的那一半,而且那一半会把他往反方向带:一件带 barrage 的 mk3 显示
 * 「−120 伤害」,看起来是降级。
 *
 * 沿用这个组件原来的立场:**不给结论徽章**。只把另一半摆出来——绿色是会得到的,
 * 红色是会失去的,判断留给玩家。 */
function TraitDiff({ mod, compareTo }: { mod: ModuleInstance; compareTo?: ModuleInstance | null }) {
  const effectsOf = (m: ModuleInstance) => {
    const d = moduleDefById(m.defId);
    return [d.signature, ...m.traits];
  };
  // 只在**有参照物**时出现。没有参照物时,各个界面自己已经列了签名和词条
  // (Modules 的 TraitRow、抉择卡的签名行),这里再列一遍就是重复。
  if (!compareTo) return null;
  const mine = effectsOf(mod);
  // 参照物只在同一类型之间成立(benchmarkFor 已经保证),所以这里直接做差集。
  const theirs = effectsOf(compareTo);
  const gained = mine.filter((e) => !theirs.includes(e));
  const lost = theirs.filter((e) => !mine.includes(e));
  if (gained.length === 0 && lost.length === 0) return null;
  return (
    <>
      {gained.map((e) => (
        <span key={`+${e}`} style={{ color: "var(--green)" }}>
          +{localizedTrait(moduleDefById(mod.defId), e).label}
        </span>
      ))}
      {lost.map((e) => (
        <span key={`-${e}`} style={{ color: "var(--red)", textDecoration: "line-through" }}>
          −{localizedTrait(moduleDefById(mod.defId), e).label}
        </span>
      ))}
    </>
  );
}

/** 差值。功率是**越低越好**,所以它单独反色——否则"+3 功率"会被涂成绿的。 */
function Delta({ value, decimals, lowerIsBetter }: { value: number; decimals: number; lowerIsBetter: boolean }) {
  const good = lowerIsBetter ? value < 0 : value > 0;
  const shown = decimals ? Math.abs(value).toFixed(decimals) : Math.abs(Math.round(value));
  return (
    <span style={{ color: good ? "var(--green)" : "var(--red)", marginLeft: "0.22em", fontWeight: 700 }}>
      {value > 0 ? "+" : "−"}{shown}
    </span>
  );
}
