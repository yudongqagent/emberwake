import { state, flagship, currentSystem, currentGalaxy, getNextObjective, travelToSystem, effectiveMaxHull, effectiveShipEvasion, effectiveShipSpeed, effectiveShipCrit, effectiveShipBlock, effectiveShipPowerDraw, setVoluntaryLoad, reputationOf, sigilRank, buySigilRank, emberLoad } from "../../state/store";
import { SIGIL_NODES, sigilUpgradeCost } from "../../data/sigils";
import { emberLoadRewardMultiplier } from "../../data/emberLoad";
import { DIPLOMATIC_FACTIONS, repTier, repEffects } from "../../data/reputation";
import { hullClassById } from "../../data/hullClasses";
import { computePowerCapacity } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { crewDefById } from "../../data/crew";
import { playSfx } from "../../audio/engine";
import { HullIcon, PowerIcon, AptitudeIcon, LevelIcon, LocationIcon, CrewRoleIcon, NavIcon, SpeedIcon, EvasionIcon, CritIcon, ModuleTypeIcon} from "../components/Icons";
import { StatReadout, Bar, hullBarKind, AnimatedFraction } from "../components/StatBlock";
import { BridgeViewscreen } from "../components/BridgeViewscreen";
import { APTITUDE_GROWTH } from "../../data/hullClasses";
import { t } from "../../i18n/strings";
import { localizedCrewName, localizedHullClassDisplay, localizedSystemName, localizedGalaxyName } from "../../i18n/data";

/** The Load dial. Ascension already imposes Load automatically — this is the
 * voluntary part on top, and the reward multiplier is stated up front so the bet
 * is legible before it's taken. */
function EmberLoadPanel() {
  const ship = flagship.value;
  const fromAscension = ship?.ascendedFrom.length ?? 0;
  const voluntary = state.value.voluntaryLoad;
  // 2026-08-31(/loop 第 57 轮):这里原来是 `fromAscension + voluntary`,**漏掉了
  // regionThreatLoad()**——而战斗用的是 store.ts 的 emberLoad(),那一项在里面。
  //
  // 差多少:第七星区、6 次进阶、25 级时,面板写 6,战斗实际用 9。奖励倍率也是按
  // 错的总数算的,于是这块面板存在的唯一理由("把这场赌注在下注之前讲清楚")
  // 正好落空。
  //
  // 第 50 轮实测其实已经撞到过:那次我的船 0 次进阶、0 主动负荷,面板会写 +0%,
  // 而实际经验被乘了 1.421——那 42% 就是被漏掉的星区威胁负荷。当时没认出来。
  //
  // 现在直接用 emberLoad() 本身,并且把星区那一份单独列出来:玩家得看得见
  // "这份压力是从哪来的",否则一个跟着自己飞到哪就变的数字只会让人更糊涂。
  const total = emberLoad();
  const fromRegion = Math.max(0, total - fromAscension - voluntary);
  const reward = Math.round((emberLoadRewardMultiplier(total) - 1) * 100);
  // 还没碰上这个系统的时候不摆出来——和同一屏上的 SigilPanel 同一条规矩
  // (它是 `if (sigils === 0 && best === 0) return null;`)。
  //
  // 2026-09-01(/loop 第 113 轮)。搜到的原则是"先限制初始的可玩面,别一上来就
  // 淹了玩家";而这个仓库自己在 combatUnlocks.ts 里量过"玩家要面对 25 个独立
  // 系统",并且**只在战斗内**做了渐进解锁。开一局新游戏实测:一级玩家的舰桥上
  // 摆着一整块负荷面板,而 0 次进阶 / 0 主动 / 0 星区,每一个数都是 0,讲的还是
  // 一个他还没做过的动作(进阶)。刻印面板在旁边就老实地不显示。
  //
  // 三个来源全为零才藏:已经在用主动负荷的人不会看着它突然消失,进阶或飞进
  // 高威胁星区的那一刻它就出现——正好是它开始有意义的那一刻。
  if (total === 0 && voluntary === 0) return null;
  return (
    <div className="panel" style={{ padding: "0.9rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.6rem" }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--amber)" }}>{t("load.title")}</div>
          <div style={{ fontSize: "0.76rem", color: "var(--text-mid)", marginTop: "0.25rem", lineHeight: 1.45 }}>
            {t("load.blurb")}
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", color: "var(--amber)", flex: "none" }}>
          {total}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
          {t("load.fromAscension", { n: fromAscension })}
        </span>
        {fromRegion > 0 && (
          <span style={{ fontSize: "0.72rem", color: "var(--amber)" }}>
            {t("load.fromRegion", { n: fromRegion })}
          </span>
        )}
        <div style={{ display: "flex", gap: "0.3rem", marginLeft: "auto" }}>
          <button
            className="btn ghost"
            style={{ padding: "0.3em 0.7em", fontSize: "0.8rem" }}
            disabled={voluntary <= 0}
            onClick={() => { setVoluntaryLoad(voluntary - 1); playSfx("click"); }}
            aria-label={t("load.decrease")}
          >−</button>
          <span style={{ minWidth: 34, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 700, alignSelf: "center" }}>
            +{voluntary}
          </span>
          <button
            className="btn ghost"
            style={{ padding: "0.3em 0.7em", fontSize: "0.8rem" }}
            disabled={voluntary >= 10}
            onClick={() => { setVoluntaryLoad(voluntary + 1); playSfx("click"); }}
            aria-label={t("load.increase")}
          >+</button>
        </div>
      </div>
      <div style={{ marginTop: "0.5rem", fontSize: "0.74rem", color: total > 0 ? "var(--green)" : "var(--text-dim)" }}>
        {t("load.reward", { pct: reward })}
      </div>
    </div>
  );
}

/** 声望面板。四个讲道理的派系,各自显示档位和它带来的实际好处/麻烦。
 *
 * 刻意把"这对你意味着什么"写出来,而不是只给一个数字。一个玩家看不懂后果的数字,
 * 和之前那 16 个死 flag 没有区别。 */
function ReputationPanel() {
  const rows = DIPLOMATIC_FACTIONS.map((f) => {
    const v = reputationOf(f);
    return { f, v, tier: repTier(v), eff: repEffects(v) };
  });
  const anyMoved = rows.some((r) => r.v !== 0);
  const TONE: Record<string, string> = {
    hostile: "var(--red)", cold: "var(--amber)", neutral: "var(--text-dim)",
    friendly: "var(--cyan)", allied: "var(--green)",
  };
  return (
    <div className="panel" style={{ padding: "0.9rem 1rem" }}>
      <div className="eyebrow" style={{ color: "var(--cyan)" }}>{t("rep.title")}</div>
      <div style={{ fontSize: "0.74rem", color: "var(--text-mid)", marginTop: "0.25rem", lineHeight: 1.45 }}>
        {anyMoved ? t("rep.blurb") : t("rep.blurbEmpty")}
      </div>
      <div style={{ marginTop: "0.7rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.map(({ f, v, tier, eff }) => {
          const tone = TONE[tier];
          const pct = (v + 100) / 200;
          return (
            <div key={f}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-hi)" }}>{t(`faction.${f}`)}</span>
                <span className="eyebrow" style={{ color: tone, fontWeight: 800 }}>{t(`rep.tier.${tier}`)}</span>
              </div>
              {/* 双向条:中点是中立,往左是敌意,往右是盟友。 */}
              <div style={{ position: "relative", height: 5, background: "var(--bg-inset)", borderRadius: 3, marginTop: "0.25rem" }}>
                <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: "var(--line)" }} />
                <div
                  style={{
                    position: "absolute", top: 0, bottom: 0, borderRadius: 3, background: tone,
                    left: v >= 0 ? "50%" : `${pct * 100}%`,
                    width: `${Math.abs(v) / 200 * 100}%`,
                    transition: "width 240ms ease, left 240ms ease",
                  }}
                />
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                {/* 三种措辞,因为一个百分比在这三种情况下含义完全不同。第一版
                    统一写成"价格为基准的 N%",敌对档就读成了"只要基准价的 25%"
                    ——意思正好反了,中立档的"基准的 0%"更等于免费。 */}
                {eff.huntsYou
                  ? t("rep.effect.hunts")
                  : eff.fightsAlongside
                    ? t("rep.effect.allied", { pct: Math.round((1 - eff.priceMultiplier) * 100) })
                    : eff.priceMultiplier > 1
                      ? t("rep.effect.markup", { pct: Math.round((eff.priceMultiplier - 1) * 100) })
                      : eff.priceMultiplier < 1
                        ? t("rep.effect.discount", { pct: Math.round((1 - eff.priceMultiplier) * 100) })
                        : t("rep.effect.neutral")}
                {/* 战利品分成——声望的第四条效果,原来一个字都没提。
                  *
                  * 2026-09-01(/loop 第 117 轮)。repEffects 有四条:价格倍率、
                  * 盟舰参战、巡逻队追杀、**战利品分成**。前三条上面这五句文案都
                  * 覆盖到了,只有分成漏了——而它是最大的一条:友善 +10%、盟友 +20%,
                  * 乘在**每一场**战斗的全部战利品上(resolveCombatVictory 里的
                  * allyShare),而不是只在这个派系的地盘上。store 里那行注释自己
                  * 都写着它是"声望的第二个摸得着的好处",可玩家在界面上看不到。
                  *
                  * 单独一句、按 eff.rewardBonus 现算,所以调数值时文案不会掉队。
                  * 措辞照着代码来:它算的是**不跟对方打的那些仗**。 */}
                {eff.rewardBonus > 0 && (
                  <> {t("rep.effect.rewardShare", { pct: Math.round(eff.rewardBonus * 100) })}</>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Bridge({ onNavigate, onEnterRift }: { onNavigate: (screen: string) => void; onEnterRift: () => void }) {
  const ship = flagship.value;
  const hullDef = ship ? hullClassById(ship.hullClass) : null;
  const crewCount = state.value.crew.length;
  const objective = getNextObjective();
  const sameSystem = objective?.systemId === currentSystem.value.id;
  const hullFraction = ship ? ship.currentHp / effectiveMaxHull(ship) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", height: "100%", overflowY: "auto", padding: "1rem" }}>
      <BridgeViewscreen systemName={localizedSystemName(currentSystem.value)} galaxyName={localizedGalaxyName(currentGalaxy.value)} />
      <div className="panel scanline" style={{ padding: "1.25rem" }}>
        <div className="title" style={{ fontSize: "1.5rem" }}>Emberwake</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-mid)", marginTop: "0.4rem" }}>
          <LocationIcon size={14} color="var(--cyan)" />
          <span>
            <strong style={{ color: "var(--text-hi)" }}>{localizedSystemName(currentSystem.value)}</strong> — {localizedGalaxyName(currentGalaxy.value)}
          </span>
        </div>
      </div>

      {objective && (
        <div className="panel accent" style={{ padding: "1.1rem", ["--accent" as any]: "var(--amber)" }}>
          <div className="eyebrow" style={{ color: "var(--amber)" }}>{t("bridge.nextObjective")}</div>
          <div style={{ marginTop: "0.4rem", fontSize: "1.05rem", fontWeight: 600 }}>{objective.label}</div>
          <div style={{ color: "var(--text-mid)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            {sameSystem ? t("bridge.hereMarker") : t("bridge.travelTo", { system: objective.systemName })}
          </div>
          <button
            className="btn primary"
            style={{ marginTop: "0.85rem" }}
            onClick={() => {
              playSfx("click");
              if (sameSystem) {
                onNavigate("system");
              } else {
                travelToSystem(objective.systemId);
                onNavigate("system");
              }
            }}
          >
            {sameSystem ? t("bridge.goToSystem") : t("bridge.jumpTo", { system: objective.systemName })}
          </button>
        </div>
      )}

      {/* 派系声望 (docs/story-engagement-analysis.md)。放在舰桥,因为它是"你在这片
          星海里是谁"的答案——由你的选择和你打过的仗共同决定。 */}
      <ReputationPanel />

      {/* 余烬负荷 — Ember Load (core-loop redesign #3). Sits on the bridge next to
          the rift because both are standing decisions about how much danger to
          invite, rather than places to go. */}
      <EmberLoadPanel />
      <SigilPanel />

      {/* 异空间战场 — the Extradimensional Battlefield.
          Corrected 2026-08-24: this is the Cinder's POWER, invoked from the
          command chair at will, not a location on the star map. It deliberately
          sits on the Bridge (the hub for what Kade/the ship can DO) rather than
          in the nav rail alongside places you travel to. */}
      <button
        className="panel accent scanline"
        onClick={() => { playSfx("jump"); onEnterRift(); }}
        style={{
          padding: "1.05rem 1.1rem", textAlign: "left", cursor: "pointer", width: "100%",
          border: "1px solid var(--violet)", background: "rgba(185,140,255,0.07)",
          ["--accent" as any]: "var(--violet)", display: "block",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ color: "var(--violet)" }}>{t("rift.power")}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.15rem", fontFamily: "var(--font-display)" }}>
              {t("rift.title")}
            </div>
            <div style={{ color: "var(--text-mid)", fontSize: "0.78rem", marginTop: "0.25rem", lineHeight: 1.45 }}>
              {t("rift.bridgeBlurb")}
            </div>
          </div>
          <div
            style={{
              width: 46, height: 46, borderRadius: "50%", flex: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--violet)",
              background: "radial-gradient(circle, rgba(185,140,255,0.35), transparent 70%)",
              color: "var(--violet)", fontSize: "1.3rem",
            }}
            aria-hidden="true"
          >
            ◈
          </div>
        </div>
      </button>

      {ship && hullDef && (
        <div className="panel" style={{ padding: "1.1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">{t("bridge.flagship")}</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.15rem" }}>{ship.name}</div>
              <div style={{ color: "var(--text-mid)", fontSize: "0.82rem" }}>
                {localizedHullClassDisplay(hullDef)}
              </div>
            </div>
            <ShipRarityTag rarity={ship.rarity} />
          </div>

          <div style={{ margin: "0.75rem 0 0.15rem" }}>
            <Bar fraction={hullFraction} kind={hullBarKind(hullFraction)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "0.75rem", marginTop: "0.9rem" }}>
            <StatReadout icon={<HullIcon size={18} />} value={<AnimatedFraction current={ship.currentHp} max={effectiveMaxHull(ship)} />} label={t("bridge.stat.hull")} />
            <StatReadout icon={<PowerIcon size={18} />}
              /* 超载时数字本身变红——StatReadout 的 color 只管图标,
                 而需要被看见的是这个数。 */
              value={<span style={{ color: effectiveShipPowerDraw(ship) > computePowerCapacity(ship) ? "var(--red)" : undefined }}>{effectiveShipPowerDraw(ship)}/{computePowerCapacity(ship)}</span>}
              label={t("bridge.stat.power")} color="var(--amber)" title={t("bridge.stat.powerTitle")} />
            <StatReadout icon={<SpeedIcon size={18} />} value={effectiveShipSpeed(ship)} label={t("bridge.stat.speed")} color="var(--cyan)" />
            <StatReadout icon={<EvasionIcon size={18} />} value={`${(effectiveShipEvasion(ship) * 100).toFixed(1)}%`} label={t("bridge.stat.evasion")} color="var(--green)" />
            <StatReadout icon={<ModuleTypeIcon type="armor" size={18} color="var(--cyan)" />} value={effectiveShipBlock(ship)} label={t("bridge.stat.block")} color="var(--cyan)" title={t("bridge.stat.blockTitle")} />
            <StatReadout icon={<CritIcon size={18} />} value={`${Math.round(effectiveShipCrit(ship) * 100)}%`} label={t("bridge.stat.crit")} color="var(--red)" title={t("bridge.stat.critTitle")} />
            <StatReadout icon={<LevelIcon size={18} />} value={ship.level} label={t("bridge.stat.level")} color="var(--violet)" />
            <StatReadout icon={<AptitudeIcon size={18} />} value={ship.scanned && ship.aptitude ? `${ship.aptitude} ×${APTITUDE_GROWTH[ship.aptitude].toFixed(2).replace(/0$/, "")}` : "??"} label={t("bridge.stat.aptitude")} color="var(--green)" title={t("bridge.stat.aptitudeTitle")} />
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: "1.1rem" }}>
        <div className="eyebrow">{t("bridge.crewCount", { count: crewCount })}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.6rem" }}>
          {state.value.crew.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>{t("bridge.noCrew")}</div>}
          {state.value.crew.map((c) => {
            const def = crewDefById(c.defId);
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)", flex: "none" }}>
                  <CrewRoleIcon role={def.role} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{localizedCrewName(def)}</div>
                </div>
                <span className="eyebrow" style={{ color: "var(--text-dim)" }}>{t(`crewRole.${def.role}`)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
        <button className="btn primary" onClick={() => onNavigate("galaxy")}>
          <NavIcon name="galaxy" size={15} /> {t("bridge.galaxyMap")}
        </button>
        <button className="btn" onClick={() => onNavigate("fleet")}>
          <NavIcon name="fleet" size={15} /> {t("bridge.fleet")}
        </button>
        <button className="btn" onClick={() => onNavigate("modules")}>
          <NavIcon name="modules" size={15} /> {t("bridge.modules")}
        </button>
        <button className="btn" onClick={() => onNavigate("crew")}>
          <NavIcon name="crew" size={15} /> {t("bridge.crew")}
        </button>
      </div>
    </div>
  );
}

/** 余烬刻印面板。
 *
 * 在此之前,裂隙深潜的深度是一次性的:你潜到多深,离开的那一刻就被忘掉了。
 * 这里把它变成一条永久的线——每一个节点抬的都是一条硬上限,所以"再深一层"
 * 买到的东西会让下一次能更深。 */
function SigilPanel() {
  const sigils = state.value.sigils;
  const best = state.value.deepestDive;
  if (sigils === 0 && best === 0) return null;
  return (
    <div className="panel" style={{ padding: "0.9rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.15rem" }}>
        <span className="eyebrow" style={{ color: "var(--amber)" }}>{t("sigil.title")}</span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{t("sigil.best", { depth: best })}</span>
      </div>
      <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: "0.6rem" }}>
        {t("sigil.hint")}
      </div>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--amber)", marginBottom: "0.6rem" }}>
        {sigils}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {SIGIL_NODES.map((node) => {
          const rank = sigilRank(node.id);
          const cost = sigilUpgradeCost(node.id, rank);
          const affordable = cost !== null && sigils >= cost;
          return (
            <div key={node.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  {t(`sigil.node.${node.id}`)}{" "}
                  <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>{rank}/{node.maxRank}</span>
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{t(`sigil.desc.${node.id}`)}</div>
              </div>
              {cost === null ? (
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{t("modules.maxed")}</span>
              ) : (
                <button
                  className="btn ghost"
                  // 价格是一两位数,按钮就只有 22px 宽 —— 而按错这个按钮是永久
                  // 花掉一笔刻印。给它一个不依赖内容长度的最小尺寸。
                  style={{ fontSize: "0.66rem", padding: "0.3em 0.6em", flex: "none", minWidth: 40 }}
                  disabled={!affordable}
                  onClick={() => buySigilRank(node.id)}
                >
                  {cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
