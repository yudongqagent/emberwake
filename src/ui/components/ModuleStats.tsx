import { moduleDefById } from "../../data/modules";
import {
  computeModuleDamage,
  computeModuleBlock,
  computeModuleEvasion,
  computeModuleThrust,
} from "../../engine/modules";
import type { ModuleInstance } from "../../data/types";
import { t } from "../../i18n/strings";

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
    </span>
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
