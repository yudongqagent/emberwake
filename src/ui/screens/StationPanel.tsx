import { useState, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { state, flagship, spend, grant, canAfford, addModule, recruitGenericCrew, crewPassiveScale, crewCount, effectiveMaxHull, repairFlagship, stationPrice, stationOwner } from "../../state/store";
import { CREW_DEFS, genericRecruitCost } from "../../data/crew";
import { moduleDefById, fabricatorCost, MARKET_MAX_RARITY } from "../../data/modules";
import { drawModule, primaryStat } from "../../engine/modules";
import { ModuleRarityTag } from "../components/RarityTag";
import { ModuleStats } from "../components/ModuleStats";
import { wouldReplace, evolutionHintFor } from "../../state/store";
import { ResourceIcon, TradeIcon, NavIcon, CrewRoleIcon, CREW_ROLE_COLOR, ModuleTypeIcon, HullIcon } from "../components/Icons";
import { RollQualityBadge } from "../components/StatBlock";
import type { ModuleInstance } from "../../data/types";
import { t } from "../../i18n/strings";
import { localizedModuleName, localizedTrait, localizedCrewName, localizedCrewPassive, localizedEvolutionName } from "../../i18n/data";
type Tab = "trade" | "fabricator" | "recruit";

const TAB_META: { id: Tab; labelKey: string; icon: preact.ComponentChildren }[] = [
  { id: "trade", labelKey: "station.tab.trade", icon: <TradeIcon size={16} /> },
  { id: "fabricator", labelKey: "station.tab.fabricator", icon: <NavIcon name="modules" size={16} /> },
  { id: "recruit", labelKey: "station.tab.recruit", icon: <NavIcon name="crew" size={16} /> },
];

export function StationPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("trade");
  const [drawnModule, setDrawnModule] = useState<ModuleInstance | null>(null);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3,5,9,0.85)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
        padding: "1rem",
      }}
    >
      <div className="panel pop-in" style={{ width: "min(560px, 100%)", maxWidth: "100%", boxSizing: "border-box", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1rem 0" }}>
          <div className="title">{t("station.title")}</div>
          <button className="btn ghost" onClick={onClose}>{t("common.close")}</button>
        </div>
        <StandingPriceNote />
        <div style={{ display: "flex", gap: "0.3rem", padding: "0.75rem 1rem" }}>
          {TAB_META.map(({ id, labelKey, icon }) => (
            <button
              key={id}
              className={`btn ${tab === id ? "primary" : "ghost"}`}
              onClick={() => setTab(id)}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                overflow: "hidden",
                padding: "0.55em 0.2em",
                fontSize: "0.66rem",
                flexDirection: "column",
                gap: "0.3em",
              }}
            >
              {icon}
              {t(labelKey)}
            </button>
          ))}
        </div>
        <div style={{ padding: "0 1rem 1rem", overflowY: "auto" }}>
          {tab === "trade" && <TradeTab />}
          {tab === "fabricator" && <FabricatorTab onBuy={setDrawnModule} />}
          {tab === "recruit" && <RecruitTab />}
        </div>
      </div>
      {drawnModule && (() => {
        const def = moduleDefById(drawnModule.defId);
        const cur = flagship.value;
        const equippedSameType = cur
          ? cur.equipped
              .map((id) => state.value.modules.find((m) => m.id === id))
              .find((m): m is NonNullable<typeof m> => !!m && moduleDefById(m.defId).type === def.type)
          : null;
        // 主数值走 engine/modules 的 primaryStat:它认得引擎的闪避,而原来这里
        // 写死的三元判断只认伤害和格挡——买一台引擎时整段对比是空的。
        const primary = primaryStat(drawnModule);
        const statLabel = primary ? t(`station.stat.${primary.key}`) : null;
        const newStat = primary ? primary.value : null;
        const curStat = equippedSameType ? (primaryStat(equippedSameType)?.value ?? null) : null;
        return (
          <DrawReveal title={t("station.moduleAcquired")} accent="var(--cyan)" onClose={() => setDrawnModule(null)}>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{localizedModuleName(def)}</div>
            <div style={{ color: "var(--text-mid)", margin: "0.4rem 0", textTransform: "capitalize" }}>{t(`moduleType.${def.type}`)}</div>
            <ModuleRarityTag rarity={drawnModule.rarity} />
            <div style={{ marginTop: "0.5rem" }}>
              <RollQualityBadge roll={drawnModule.quality} />
            </div>
            <div style={{ marginTop: "0.6rem" }}><ModuleStats mod={drawnModule} compareTo={wouldReplace(drawnModule)} /></div>
            {drawnModule.traits.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", justifyContent: "center", marginTop: "0.6rem" }}>
                {drawnModule.traits.map((traitId, i) => (
                  <span key={i} style={{ fontSize: "0.68rem", padding: "0.15em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
                    {localizedTrait(def, traitId).label}
                  </span>
                ))}
              </div>
            )}
            {statLabel && newStat !== null && (
              <div style={{ marginTop: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, color: curStat === null || newStat >= curStat ? "var(--green)" : "var(--red)" }}>
                {curStat === null
                  ? t("station.newStatNoSlot", { value: newStat, stat: statLabel })
                  : t("station.statVsEquipped", { sign: newStat >= curStat ? "+" : "", value: newStat - curStat, stat: statLabel })}
              </div>
            )}
          </DrawReveal>
        );
      })()}
    </div>
  );
}

function DrawReveal({ title, children, accent, onClose }: { title: string; children: ComponentChildren; accent: string; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(3,5,9,0.7)" }}
      onClick={onClose}
    >
      <div className="panel accent scanline pop-in" style={{ padding: "2rem", textAlign: "center", minWidth: 260, ["--accent" as any]: accent }} onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>{title}</div>
        {children}
        <div style={{ marginTop: "1.25rem" }}>
          <button className="btn primary" onClick={onClose}>{t("station.nice")}</button>
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: ComponentChildren }) {
  return (
    <div className="panel compact" style={{ padding: "0.7rem 0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
      {children}
    </div>
  );
}

function TradeTab() {
  const res = state.value.resources;
  const ship = flagship.value;
  // Priya Osei: "+10% Salvage and Alloy from Trade exchanges" — fleet-wide once recruited.
  const tradeBonus = 1 + 0.1 * crewPassiveScale("priyaOsei");
  const alloyOut = Math.round(10 * tradeBonus);
  const salvageOut = Math.round(20 * tradeBonus);
  const missingHp = ship ? effectiveMaxHull(ship) - ship.currentHp : 0;
  // 修船也按立场收费。原来只有招募和制造工坊吃声望,交易页不吃——同一个柜台
  // 一半的价签会看你脸色、另一半不会,那比完全不做还难懂。
  const repairCost = stationPrice(Math.round(missingHp * 0.5));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {ship && (
        <Row>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
            <HullIcon size={16} />
            {missingHp > 0 ? (
              <>{t("station.repairHull", { amount: missingHp })} <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type="salvage" size={16} /> {repairCost}</>
            ) : (
              t("station.hullFull")
            )}
          </div>
          <button
            className="btn"
            disabled={missingHp <= 0 || res.salvage < repairCost}
            // 价格在**点击那一刻**按当前船体重算(见第 66 轮招募那一处的说明)。
            // 修完之后 missingHp 归零,连点的第二下必须什么都不做,而不是再收一次钱。
            onClick={() => {
              const sh = flagship.value;
              if (!sh) return;
              const missing = effectiveMaxHull(sh) - sh.currentHp;
              if (missing <= 0) return;
              const now = stationPrice(Math.round(missing * 0.5));
              if (!canAfford({ salvage: now })) return;
              spend({ salvage: now });
              repairFlagship();
            }}
          >
            {t("common.repair")}
          </button>
        </Row>
      )}
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        {t("station.tradeHint")}
      </div>
      {/* 一次换一手,而"一手"跟着你手里有多少走。

          2026-08-31(/loop 第 65 轮)。原来这两行是写死的"30 废料 → 10 合金",一次
          一点击。而第 48 轮量过的账是:全战役废料收入 14,005(修船只吃掉约 4,000),
          合金收入 5,886、而升满七件模组要 5,131——**废料换合金是全游戏最有用的一笔
          交易**,偏偏被钉死在每次 30。把富余的废料换完要点 **467 次**。

          搜到的原话:"设计者必须判断一个固定加值会不会被百分比成长淹没"。这就是
          被淹没的那种。

          汇率一点没动(那是设计),动的是批量:每次换手里的一成,不足一手就换一手。
          按钮上直接写清这一下会花多少、拿到多少——早期就是 30 换 10,后期自己长大。 */}
      {([
        ["salvage", "alloy", 30, alloyOut, res.salvage] as const,
        ["alloy", "salvage", 10, salvageOut, res.alloy] as const,
        // 源点也得有个出口。
        //
        // 2026-09-01(/loop 第 114 轮)。源点全代码库**只有两个消耗口**,而且都在
        // 制造工坊里(刷新 + 购买),偏偏工坊被 MARKET_MAX_RARITY 钉死在 mk3。
        // 而 mk4/mk5 只在裂隙里出——那正是裂隙存在的理由,也是它按钮上写的卖点。
        // 于是任何一个下过裂隙的玩家,工坊从此只卖比他手里更差的东西,源点就变成
        // 一堆只进不出的数字。实测我自己的存档:手上 23 件 mk5,货架上四件全是
        // 负增益,而源点存了 2340。
        //
        // 搜到的说法就是这个:"没有花掉的理由,玩家就会囤,然后失去兴趣"。
        // 这个仓库自己也踩过同一类——招募页那条注释还记着"合金除了倒卖之外
        // 没有任何消耗口"(2026-08 playtest 的 Issue #2)。
        //
        // 汇率按裂隙掉落的比例定:深度 1 一波给 90 源点、45 合金,正好 2:1。
        // 只做单向:囤积的是源点,给它一个出口就够了,再开一条进来的路只是噪音。
        ["sourcePoints", "alloy", 20, alloyOut, res.sourcePoints] as const,
      ]).map(([from, to, unitCost, unitGain, held]) => {
        const units = Math.max(1, Math.floor((held * 0.1) / unitCost));
        const cost = unitCost * units;
        const gain = unitGain * units;
        return (
          <Row key={from}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem" }}>
              <ResourceIcon type={from} size={16} /> {cost} <TradeIcon size={14} color="var(--text-dim)" /> <ResourceIcon type={to} size={16} /> {gain}
            </div>
            <button
              className="btn"
              disabled={held < cost}
              // 一手的大小跟着手里有多少走,所以换完一次下一手就该变小——
              // 用渲染闭包里那个 cost 连点,就是拿旧的大手反复换。
              onClick={() => {
                const heldNow = state.value.resources[from];
                const unitsNow = Math.max(1, Math.floor((heldNow * 0.1) / unitCost));
                const costNow = unitCost * unitsNow;
                if (heldNow < costNow) return;
                spend({ [from]: costNow });
                grant({ [to]: unitGain * unitsNow });
              }}
            >
              {t("station.exchange")}
            </button>
          </Row>
        );
      })}
    </div>
  );
}

const OFFER_COUNT = 4;

/** Issue #9 (2026-08 playtest, docs/design-principles.md Player-Tested
 * Anti-Patterns #4): a free, unlimited Refresh let a player just reroll until they
 * got something great — this still applies to the Fabricator's module showcase
 * below. It no longer applies to ships at all: the station doesn't touch ship
 * advancement any more (player report 2026-08-24 — "跟商店没关系"), which now
 * lives in its own screen, ui/screens/Ascension.tsx, with no RNG to reroll.
 * Cost escalates per refresh within one visit (resets when the tab remounts) so a
 * first look is still cheap but fishing for a perfect roll isn't free. */
/** 导出给守卫用:递增的价格正是连点漏洞最好下手的地方。 */
export const refreshCostForTest = (count: number) => refreshCost(count);

function refreshCost(count: number): number {
  return 10 + count * 15;
}

/** Section B: the market never stocks mk4/mk5 at any price — those come out of
 * the Extradimensional Battlefield only (see engine/modules.ts). */
function generateModuleOffers(): ModuleInstance[] {
  return Array.from({ length: OFFER_COUNT }, () => drawModule(undefined, { maxRarity: MARKET_MAX_RARITY }));
}

/** Same curated-showcase pattern as ShipwrightTab — see the comment there. */
function FabricatorTab({ onBuy }: { onBuy: (m: ModuleInstance) => void }) {
  const [offers, setOffers] = useState<ModuleInstance[]>(() => generateModuleOffers());
  const [refreshCount, setRefreshCount] = useState(0);
  // 刷新价是**递增**的(10 + 15n),所以它正是第 66 轮那个连点漏洞最好下手的地方。
  // 实测(2026-09-01):同一个 tick 里连点三次,三次都读到渲染闭包里那个 10,
  // 三次刷新只花了 30——真价是 10 + 25 + 40 = 75。ref 才是点击那一刻的真值。
  const refreshCountRef = useRef(refreshCount);
  refreshCountRef.current = refreshCount;
  const cost = stationPrice(refreshCost(refreshCount));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
          {t("station.fabricatorHint")}
        </div>
        <button
          className="btn ghost"
          style={{ fontSize: "0.7rem", padding: "0.4em 0.7em", flex: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}
          disabled={!canAfford({ sourcePoints: cost })}
          onClick={() => {
            const now = stationPrice(refreshCost(refreshCountRef.current));
            if (!canAfford({ sourcePoints: now })) return;
            spend({ sourcePoints: now });
            refreshCountRef.current += 1;
            setRefreshCount(refreshCountRef.current);
            setOffers(generateModuleOffers());
          }}
        >
          {t("common.refresh")} <ResourceIcon type="sourcePoints" size={11} /> {cost}
        </button>
      </div>
      {offers.map((candidate, i) => {
        const def = moduleDefById(candidate.defId);
        const cost = stationPrice(fabricatorCost(candidate.rarity));
        return (
          <div key={i} className="panel compact" style={{ padding: "0.75rem 0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ModuleTypeIcon type={def.type} size={16} />
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{localizedModuleName(def)}</div>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.72rem", textTransform: "capitalize" }}>{t(`moduleType.${def.type}`)}</div>
                </div>
              </div>
              <ModuleRarityTag rarity={candidate.rarity} />
            </div>
            <div style={{ display: "flex", gap: "0.7rem", fontSize: "0.76rem", color: "var(--text-mid)", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <ModuleStats mod={candidate} compareTo={wouldReplace(candidate)} />
              {(() => {
                const hint = evolutionHintFor(candidate);
                if (!hint) return null;
                return (
                  <div style={{ fontSize: "0.68rem", color: "var(--violet)", marginTop: "0.25rem", fontWeight: 700 }}>
                    {t(hint.state === "ready" ? "draft.evolveReady" : "draft.evolvePartner", { name: localizedEvolutionName(hint.evo.family) })}
                  </div>
                );
              })()}
              {candidate.traits.map((traitId, ti) => (
                <span key={ti} style={{ fontSize: "0.68rem", padding: "0.1em 0.5em", borderRadius: 999, border: "1px solid var(--violet)", color: "var(--violet)" }}>
                  {localizedTrait(def, traitId).label}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--text-mid)" }}>
                <ResourceIcon type="sourcePoints" size={13} /> {cost}
              </span>
              <button
                className="btn primary"
                disabled={!canAfford({ sourcePoints: cost })}
                onClick={() => {
                  // 买的价钱也是从刷新次数推出来的,同样按点击那一刻算;
                  // 而且连点必须逐次检查买不买得起,否则会把源点刷成负数。
                  const now = stationPrice(refreshCost(refreshCountRef.current));
                  if (!canAfford({ sourcePoints: now })) return;
                  spend({ sourcePoints: now });
                  addModule(candidate);
                  onBuy(candidate);
                  setOffers((prev) => prev.map((o, idx) => (idx === i ? drawModule() : o)));
                }}
              >
                {t("station.buy")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecruitTab() {
  const genericDefs = CREW_DEFS.filter((c) => !c.named);
  // Issue #2 (2026-08 playtest): Alloy had no spend sink at all besides trading it
  // back to Salvage at a loss — a resource with no real purpose is exactly the
  // legibility problem reported. Crew outfitting is a natural fit and gives every
  // resource a distinct, memorable job: Source Points for hulls/modules, Alloy for
  // crew, Origin Essence gates hull tiers, Insight rerolls traits, Salvage repairs
  // and is the base trade currency.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <div style={{ color: "var(--text-mid)", fontSize: "0.85rem" }}>
        {t("station.recruitHint")}
      </div>
      {genericDefs.map((c) => {
        // 价格随手里已有的**同类**人数递增(见 data/crew.ts 的 genericRecruitCost)。
        const cost = stationPrice(genericRecruitCost(crewCount(c.id)));
        return (
        <Row key={c.id}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${CREW_ROLE_COLOR[c.role]}18`, border: `1px solid ${CREW_ROLE_COLOR[c.role]}`, flex: "none" }}>
              <CrewRoleIcon role={c.role} size={15} />
            </div>
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                {localizedCrewName(c)} <span style={{ textTransform: "capitalize", color: "var(--text-dim)", fontWeight: 400 }}>· {t(`crewRole.${c.role}`)}</span>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>{localizedCrewPassive(c)}</div>
            </div>
          </div>
          <button
            className="btn primary"
            disabled={!canAfford({ alloy: cost })}
            onClick={() => {
              // 价格在**点击那一刻**按当前人数重算,不用渲染闭包里那个 cost。
              //
              // 2026-08-31(第 66 轮)实测撞出来的:在同一个 tick 里连点三次,三次都
              // 读到同一个旧价格,三个人只花了 20×3 而不是 20+32+51。真人正常点击
              // 之间会重渲染,撞不上;但快速连点可以,而这一行就把它彻底关掉了。
              const now = stationPrice(genericRecruitCost(crewCount(c.id)));
              if (!canAfford({ alloy: now })) return;
              spend({ alloy: now });
              recruitGenericCrew(c.id);
            }}
          >
            {t("station.recruit")} <ResourceIcon type="alloy" size={12} /> {cost}
          </button>
        </Row>
        );
      })}
    </div>
  );
}

/** 站点上方的一条横幅:这里为什么比别处贵/便宜。
 *
 * 没有这一条,涨价就只是"数字看着不太对",玩家不会把它和三小时前那个选择联系
 * 起来。声望要有用,首先得让人看见因果。 */
function StandingPriceNote() {
  const owner = stationOwner();
  if (!owner) return null;
  const mult = stationPrice(1000) / 1000;
  if (mult === 1) return null;
  const up = mult > 1;
  const pct = Math.round(Math.abs(mult - 1) * 100);
  const color = up ? "var(--red)" : "var(--green)";
  return (
    <div
      style={{
        margin: "0.5rem 1rem 0",
        padding: "0.4rem 0.6rem",
        borderRadius: 6,
        border: `1px solid ${color}`,
        background: "rgba(5,8,16,0.6)",
        color,
        fontSize: "0.7rem",
        fontWeight: 600,
        // 这条横幅在两种语言下都会被容器切掉(英文缺 42px、中文缺 21px)。
        // 派系名长度差很多(「洋紫荆公国」/「Bauhinia Principality」),而它是
        // 一行不换行的文字。允许换行 + 放宽行距,比给它挑一个"刚好够"的宽度可靠。
        lineHeight: 1.5,
        overflowWrap: "anywhere",
      }}
    >
      {t(up ? "rep.priceNote" : "rep.priceNoteDiscount", { faction: t(`faction.${owner}`), pct })}
    </div>
  );
}
