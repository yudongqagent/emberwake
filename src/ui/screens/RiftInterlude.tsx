import type { ResourceType } from "../../data/types";
import { riftWaveHaul, riftEnemyCount } from "../../data/rift";
import { riftDropRarityFloor } from "../../engine/modules";
import { MARKET_MAX_RARITY } from "../../data/modules";
import { ResourceIcon, resourceLabel } from "../components/Icons";
import { flagship } from "../../state/store";
import { effectiveMaxHull } from "../../state/store";
import { Bar, hullBarKind } from "../components/StatBlock";
import { t } from "../../i18n/strings";

/** The moment between waves in the Extradimensional Battlefield: bank what you
 * have, or push one layer deeper for a steeply larger haul. This is the whole
 * mechanism that lets the rift be enterable at will AND pay out heavily without
 * becoming an infinite farm — the brake is the player's own nerve and a hull that
 * does not heal between waves, not a cooldown. */
export function RiftInterlude({
  depth,
  haul,
  surge,
  onDiveDeeper,
  onExtract,
}: {
  depth: number;
  haul: Partial<Record<ResourceType, number>>;
  /** 源点获取倍率 from the wave just cleared (1 = didn't trigger). */
  surge: number;
  onDiveDeeper: () => void;
  onExtract: () => void;
}) {
  const ship = flagship.value;
  const hullFrac = ship ? ship.currentHp / effectiveMaxHull(ship) : 1;
  const nextDepth = depth + 1;
  const nextHaul = riftWaveHaul(nextDepth);
  const nowTier = riftDropRarityFloor(depth);
  const nextTier = riftDropRarityFloor(nextDepth);
  const entries = Object.entries(haul).filter(([, v]) => (v ?? 0) > 0) as [ResourceType, number][];

  return (
    <div
      style={{
        height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "1.25rem", gap: "0.9rem",
        background: "radial-gradient(circle at 50% 40%, rgba(185,140,255,0.16), transparent 65%), var(--bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "var(--violet)" }}>{t("rift.title")}</div>
        <div className="title" style={{ fontSize: "1.5rem", marginTop: "0.2rem" }}>
          {t("rift.depthCleared", { depth })}
        </div>
      </div>

      {/* 源点获取倍率 — one of the two system abilities the novel actually names.
          It gets the loudest treatment in the mode because it is the reason to be
          here, and because it's still provisional: a 100x you fail to extract with
          is the best story the rift can give you. */}
      {surge > 1 && (
        <div
          className="panel accent scanline"
          style={{
            padding: "0.7rem 1.4rem", textAlign: "center",
            ["--accent" as any]: surge >= 100 ? "var(--amber)" : "var(--violet)",
            animation: "popIn 420ms cubic-bezier(0.2,1.4,0.3,1) both",
          }}
        >
          <div className="eyebrow" style={{ color: surge >= 100 ? "var(--amber)" : "var(--violet)" }}>
            {t("rift.surgeLabel")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)", fontWeight: 900,
              fontSize: surge >= 100 ? "2.4rem" : "1.7rem",
              color: surge >= 100 ? "var(--amber)" : "var(--violet)",
              textShadow: `0 0 ${surge >= 100 ? 26 : 14}px currentColor`,
              lineHeight: 1.1,
            }}
          >
            {t("rift.surgeValue", { mult: surge })}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", marginTop: "0.2rem" }}>
            {t("rift.surgeNote")}
          </div>
        </div>
      )}

      {/* 这一层原来没有:整个模式真正的奖品是**打捞的档次**,而它在抉择点上一个字
          都不显示。

          2026-08-31(/loop 第 55 轮)。舰桥上写的是"收获远超常规空间的任何战斗",
          而实测每一波的资源只有常规最肥一场的:

              深度 1  8%    深度 3  14%    深度 6  34%    深度 10  114%

          也就是说玩家读到一句夸下海口的承诺,潜下来,拿到十分之一,然后再也不来了
          ——**而他从来没被告知这里真正的东西是 mk4/mk5**。商店封顶 mk3,普通战斗
          掉落也封顶 mk3,而裂隙深度 4 就给 mk4、7 给 mk5;买不到的东西一直就在
          够得到的深度上,只是 riftDropRarityFloor 在这一轮之前没有任何界面引用过。

          "再下一层吗"本来就该是一次知情的赌:摆出现在撤能拿什么、再撑一层能拿
          什么。这是这个模式存在的全部意义。 */}
      <div
        className="panel"
        style={{ padding: "0.7rem 1.15rem", minWidth: "min(340px, 92vw)", display: "flex", flexDirection: "column", gap: "0.3rem" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.8rem", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--text-mid)" }}>{t("rift.dropNow", { tier: riftDropRarityFloor(depth).toUpperCase() })}</span>
          <span style={{ color: nextTier !== nowTier ? "var(--violet)" : "var(--text-dim)", fontWeight: nextTier !== nowTier ? 700 : 400 }}>
            {t("rift.dropNext", { depth: nextDepth, tier: nextTier.toUpperCase() })}
          </span>
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
          {t("rift.dropCeiling", { tier: MARKET_MAX_RARITY.toUpperCase() })}
        </div>
      </div>

      {/* Provisional haul — labelled as at-risk, because it is. */}
      <div className="panel accent scanline" style={{ padding: "1rem 1.15rem", minWidth: "min(340px, 92vw)", ["--accent" as any]: "var(--violet)" }}>
        <div className="eyebrow" style={{ color: "var(--violet)", marginBottom: "0.5rem" }}>{t("rift.provisionalHaul")}</div>
        {entries.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>—</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {entries.map(([k, v]) => (
              <span key={k} className="resource-chip" style={{ fontSize: "0.8rem" }}>
                <ResourceIcon type={k} size={13} />+{v} {resourceLabel(k)}
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: "0.65rem", fontSize: "0.7rem", color: "var(--amber)" }}>
          {t("rift.atRisk")}
        </div>
      </div>

      {ship && (
        <div style={{ width: "min(340px, 92vw)" }}>
          <div className="eyebrow" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", color: "var(--text-dim)" }}>
            <span>{t("combat.hull")}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{ship.currentHp} / {effectiveMaxHull(ship)}</span>
          </div>
          <Bar fraction={hullFrac} kind={hullBarKind(hullFrac)} />
          <div style={{ marginTop: "0.35rem", fontSize: "0.68rem", color: "var(--text-dim)" }}>
            {t("rift.noRepair")}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "min(340px, 92vw)" }}>
        <button
          className="btn danger"
          style={{ width: "100%", padding: "0.7em", fontWeight: 800, boxShadow: "0 0 14px var(--violet)" }}
          onClick={onDiveDeeper}
        >
          {t("rift.diveDeeper", { depth: nextDepth })}
        </button>
        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", textAlign: "center" }}>
          {t("rift.nextWavePreview", {
            count: riftEnemyCount(nextDepth),
            sp: nextHaul.sourcePoints ?? 0,
          })}
        </div>
        <button className="btn primary" style={{ width: "100%", padding: "0.7em" }} onClick={onExtract}>
          {t("rift.extract")}
        </button>
      </div>
    </div>
  );
}
