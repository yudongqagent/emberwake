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
 */
export function ModuleStats({
  mod,
  gap = "0.9rem",
  size = "0.76rem",
}: {
  mod: ModuleInstance;
  gap?: string;
  size?: string;
}) {
  const def = moduleDefById(mod.defId);
  const bits: { text: string; color: string }[] = [];
  if (def.baseDamage !== undefined) {
    bits.push({ text: t("modules.dmg", { value: computeModuleDamage(mod) }), color: "var(--red)" });
  }
  if (def.baseBlock !== undefined) {
    bits.push({ text: t("modules.block", { value: computeModuleBlock(mod) }), color: "var(--cyan)" });
  }
  if (def.baseEvasion) {
    bits.push({ text: t("modules.eva", { value: computeModuleEvasion(mod).toFixed(1) }), color: "var(--green)" });
  }
  if (def.baseThrust) {
    const thr = computeModuleThrust(mod);
    bits.push({
      text: t("modules.thrust", { value: `${thr >= 0 ? "+" : ""}${Math.round(thr * 100)}` }),
      color: thr >= 0 ? "var(--amber)" : "var(--red)",
    });
  }
  if (bits.length === 0) return null;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap, fontSize: size }}>
      {bits.map((b, i) => (
        <span key={i} style={{ color: b.color }}>{b.text}</span>
      ))}
    </span>
  );
}
