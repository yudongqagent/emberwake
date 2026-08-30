import { state, flagship, currentSystem, currentGalaxy, getNextObjective, travelToSystem, effectiveMaxHull, setVoluntaryLoad, reputationOf } from "../../state/store";
import { emberLoadRewardMultiplier } from "../../data/emberLoad";
import { DIPLOMATIC_FACTIONS, repTier, repEffects } from "../../data/reputation";
import { hullClassById } from "../../data/hullClasses";
import { computePowerCapacity, computeSpeed, computeBaseEvasion, computeBaseCritChance } from "../../engine/ships";
import { ShipRarityTag } from "../components/RarityTag";
import { crewDefById } from "../../data/crew";
import { playSfx } from "../../audio/engine";
import { HullIcon, PowerIcon, AptitudeIcon, LevelIcon, LocationIcon, CrewRoleIcon, NavIcon, SpeedIcon, EvasionIcon, CritIcon } from "../components/Icons";
import { StatReadout, Bar, hullBarKind, AnimatedFraction } from "../components/StatBlock";
import { BridgeViewscreen } from "../components/BridgeViewscreen";
import { t } from "../../i18n/strings";
import { localizedCrewName, localizedHullClassDisplay, localizedSystemName, localizedGalaxyName } from "../../i18n/data";

/** The Load dial. Ascension already imposes Load automatically — this is the
 * voluntary part on top, and the reward multiplier is stated up front so the bet
 * is legible before it's taken. */
function EmberLoadPanel() {
  const ship = flagship.value;
  const fromAscension = ship?.ascendedFrom.length ?? 0;
  const voluntary = state.value.voluntaryLoad;
  const total = fromAscension + voluntary;
  const reward = Math.round((emberLoadRewardMultiplier(total) - 1) * 100);
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
            <StatReadout icon={<PowerIcon size={18} />} value={computePowerCapacity(ship)} label={t("bridge.stat.power")} color="var(--amber)" />
            <StatReadout icon={<SpeedIcon size={18} />} value={computeSpeed(ship)} label={t("bridge.stat.speed")} color="var(--cyan)" />
            <StatReadout icon={<EvasionIcon size={18} />} value={`${Math.round(computeBaseEvasion(ship) * 100)}%`} label={t("bridge.stat.evasion")} color="var(--green)" />
            <StatReadout icon={<CritIcon size={18} />} value={`${Math.round(computeBaseCritChance(ship) * 100)}%`} label={t("bridge.stat.crit")} color="var(--red)" />
            <StatReadout icon={<LevelIcon size={18} />} value={ship.level} label={t("bridge.stat.level")} color="var(--violet)" />
            <StatReadout icon={<AptitudeIcon size={18} />} value={ship.scanned ? ship.aptitude! : "??"} label={t("bridge.stat.aptitude")} color="var(--green)" />
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
