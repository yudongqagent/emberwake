import { moduleDefById } from "../../data/modules";
import { moduleEffectById } from "../../data/moduleEffects";
import { moduleMaxLevel, primaryStat } from "../../engine/modules";
import { localizedModuleName, localizedTrait } from "../../i18n/data";
import { t } from "../../i18n/strings";
import { ModuleStats } from "../components/ModuleStats";
import { wouldReplace, ownsDesign, evolutionHintFor } from "../../state/store";
import { localizedEvolutionName } from "../../i18n/data";

import { ModuleRarityTag } from "../components/RarityTag";
import { ModuleTypeIcon, HullIcon } from "../components/Icons";
import type { DraftOption } from "../../data/draft";
import type { ModuleInstance } from "../../data/types";

/** 整备抉择 — the Refit Draft screen.
 *
 * Core-loop redesign #1. This is the moment the game did not have: the whole
 * campaign offered 7 choices across 40 scenes, and loot was a silent dice roll.
 * Now every fight ends here.
 *
 * The card design follows from what makes those picks work elsewhere — the
 * player has to be able to compare the three without opening anything else, so
 * each card states its full consequence up front, including the greedy option's
 * hull price. */
export function RefitDraft({
  options,
  owned,
  onPick,
}: {
  options: DraftOption[];
  owned: ModuleInstance[];
  onPick: (opt: DraftOption) => void;
}) {
  return (
    <div
      style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.25rem",
        background: "radial-gradient(circle at 50% 35%, rgba(255,184,77,0.12), transparent 65%), var(--bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--amber)" }}>{t("draft.eyebrow")}</div>
        <div className="title" style={{ fontSize: "1.45rem", marginTop: "0.15rem" }}>{t("draft.title")}</div>
        <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", marginTop: "0.3rem" }}>{t("draft.subtitle")}</div>
      </div>

      <div
        style={{
          display: "flex", gap: "0.75rem", flexWrap: "wrap",
          justifyContent: "center", width: "100%", maxWidth: 780,
        }}
      >
        {options.map((opt, i) => (
          <DraftCard key={opt.id} opt={opt} owned={owned} index={i} onPick={() => onPick(opt)} />
        ))}
      </div>
    </div>
  );
}

function DraftCard({
  opt, owned, index, onPick,
}: {
  opt: DraftOption; owned: ModuleInstance[]; index: number; onPick: () => void;
}) {
  const accent = opt.hullCost ? "var(--red)" : opt.kind === "boon" ? "var(--violet)" : "var(--cyan)";

  let body: preact.ComponentChildren = null;
  let heading = "";

  if (opt.kind === "module" && opt.module) {
    const def = moduleDefById(opt.module.defId);
    const eff = moduleEffectById(def.signature);
    heading = localizedModuleName(def);
    body = (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
          <ModuleTypeIcon type={def.type} size={13} />
          <ModuleRarityTag rarity={opt.module.rarity} />
          {/* 一个 (族, 层) 格里正好只有 4 件(每个槽位一件),所以同族同层拿第二次
              必然是同一个设计。实测一整趟战役里**一半以上**的收获是重复设计——
              那不是 bug,是矩阵型词库的必然。但玩家有权知道自己拿的是新东西还是
              一次词条重掷:数值行已经给了差值,这里补上"为什么会有差值"。 */}
          {ownsDesign(opt.module.defId) && (
            <span className="eyebrow" style={{ color: "var(--text-dim)", border: "1px solid var(--line)", borderRadius: 4, padding: "0.1em 0.4em" }}>
              {t("draft.reroll")}
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: "0.35rem" }}>
          {/* 冷却排在数值行**前面**:数值行末尾挂着「对比同类最强」那句说明,
              把周期缀在它后面会读成那句话的一部分。 */}
          {def.cooldown ? (
            <span style={{ marginRight: "0.9rem" }}>{t("draft.cycle", { secs: (def.cooldown * 2.4).toFixed(1) })}</span>
          ) : null}
          <ModuleStats mod={opt.module} compareTo={wouldReplace(opt.module)} size="inherit" />
        </div>
        {eff && (
          <div style={{ fontSize: "0.72rem", color: accent, marginTop: "0.3rem" }}>
            <b>{localizedTrait(def, def.signature).label}</b> — {localizedTrait(def, def.signature).description}
          </div>
        )}
        {/* 武器进化的搭档提示。
        
            进化那套东西自己的设计注释写着"重要的一半是**可见性**——你能提前三场仗
            看见它,才会开始有意识地挑搭档模组"。而实测(第 38 轮):抉择卡和商店
            完全不知道进化这回事。声明的用途,恰恰是唯一没接上的地方。 */}
        {(() => {
          const hint = evolutionHintFor(opt.module!);
          if (!hint) return null;
          const name = localizedEvolutionName(hint.evo.family);
          return (
            <div style={{ fontSize: "0.7rem", color: "var(--violet)", marginTop: "0.3rem", fontWeight: 700 }}>
              {t(hint.state === "ready" ? "draft.evolveReady" : "draft.evolvePartner", { name })}
            </div>
          );
        })()}
      </>
    );
  } else if (opt.kind === "upgrade") {
    const mod = owned.find((m) => m.id === opt.targetModuleId);
    if (!mod) return null;
    const def = moduleDefById(mod.defId);
    const next = { ...mod, level: mod.level + 1 };
    // 升级预览也走 primaryStat:写死的三元判断只认伤害和格挡,于是"免费升级一台
    // 引擎"这个选项在卡面上完全看不出升了什么。
    const before = primaryStat(mod)?.value ?? null;
    const after = primaryStat(next)?.value ?? null;
    heading = localizedModuleName(def);
    body = (
      <>
        <div className="eyebrow" style={{ color: "var(--amber)", marginTop: "0.3rem" }}>{t("draft.freeUpgrade")}</div>
        <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: "0.3rem" }}>
          {t("modules.levelOf", { level: mod.level, cap: moduleMaxLevel(mod.rarity) })}
          {" → "}
          <b style={{ color: "var(--text-hi)" }}>{mod.level + 1}</b>
        </div>
        {before !== null && after !== null && (
          <div style={{ fontSize: "0.82rem", fontFamily: "var(--font-display)", fontWeight: 700, marginTop: "0.3rem" }}>
            {before} <span style={{ color: "var(--text-dim)" }}>→</span>{" "}
            <span style={{ color: "var(--green)" }}>{after}</span>
          </div>
        )}
      </>
    );
  } else if (opt.kind === "pact" && opt.pactId) {
    // 余烬契约(data/pacts.ts)。用琥珀色而不是紫色,因为它和普通增益是**不同性质**
    // 的东西:普通增益是白给的加成,契约是有代价的交换。玩家必须一眼看出区别。
    heading = t("draft.pactTitle");
    body = (
      <>
        <div className="eyebrow" style={{ color: "var(--amber)", marginTop: "0.3rem" }}>
          {t(`pact.${opt.pactId}`)}
        </div>
        <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: "0.3rem", lineHeight: 1.5 }}>
          {t(`pact.${opt.pactId}.desc`)}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>{t("draft.untilDock")}</div>
      </>
    );
  } else if (opt.kind === "boon" && opt.boonId) {
    const eff = moduleEffectById(opt.boonId);
    heading = t("draft.boonTitle");
    body = (
      <>
        <div className="eyebrow" style={{ color: "var(--violet)", marginTop: "0.3rem" }}>
          {eff ? localizedTrait({ signature: opt.boonId, traitPool: [] } as never, opt.boonId).label : opt.boonId}
        </div>
        <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: "0.3rem" }}>
          {eff ? localizedTrait({ signature: opt.boonId, traitPool: [] } as never, opt.boonId).description : ""}
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>{t("draft.untilDock")}</div>
      </>
    );
  }

  return (
    <button
      className="panel accent"
      onClick={onPick}
      style={{
        flex: "1 1 210px", maxWidth: 250, minHeight: 176,
        textAlign: "left", cursor: "pointer",
        padding: "0.85rem 0.9rem",
        ["--accent" as never]: accent,
        display: "flex", flexDirection: "column",
        animation: "rewardIn 320ms cubic-bezier(0.2,1.4,0.3,1) both",
        animationDelay: `${100 + index * 90}ms`,
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", color: "var(--text-hi)" }}>
        {heading}
      </div>
      <div style={{ flex: 1 }}>{body}</div>
      {opt.hullCost ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.5rem", color: "var(--red)", fontSize: "0.74rem", fontWeight: 700 }}>
          <HullIcon size={12} color="var(--red)" />
          {t("draft.hullCost", { amount: opt.hullCost })}
        </div>
      ) : (
        <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--text-dim)" }}>{t("draft.noCost")}</div>
      )}
    </button>
  );
}
