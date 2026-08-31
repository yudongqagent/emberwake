import { useState } from "preact/hooks";
import { state, flagship, ascendShipAction, reforgeShipAction, sceneTitleForFlag } from "../../state/store";
import { hullClassById, nextHullClassOptions, siblingHullOptions, ascensionRequirementsMet } from "../../data/hullClasses";
import { hullClassAbility } from "../../data/namedShips";
import { ascendShip, computeMaxHull, computePowerCapacity, computeSpeed, xpToNextLevel } from "../../engine/ships";
import type { HullClassDef, HullClassId, ShipInstance } from "../../data/types";
import { ShipRarityTag } from "../components/RarityTag";
import { Bar } from "../components/StatBlock";
import { playSfx } from "../../audio/engine";
import { HullIcon, PowerIcon, SpeedIcon, SlotsIcon, LevelIcon, ResourceIcon, NavIcon } from "../components/Icons";
import { t } from "../../i18n/strings";
import { localizedNamedShipActive, localizedHullClassDisplay } from "../../i18n/data";

/** Player report (2026-08-24): "火种战舰升级和进阶应该在一个新的系统，跟商店没关系"
 * — ship advancement is its own system, not something you shop for. Ascension used
 * to live as a tab inside the station's trade panel, which framed Whisper's growth
 * as a transaction alongside buying modules and hiring crew. It isn't one: she's
 * the one ship you ever have, and this is the only place her class ever changes.
 *
 * So this is a first-class screen on the main nav, and it's built as a forge/
 * refit console rather than a storefront — current form on the left of each
 * comparison, the form she'd become on the right, every stat delta spelled out,
 * and the requirements as a live checklist rather than a price tag. */
export function Ascension() {
  const ship = flagship.value;
  const [justAscended, setJustAscended] = useState<HullClassId | null>(null);
  if (!ship) return null;

  const currentDef = hullClassById(ship.hullClass);
  const currentAbility = hullClassAbility(ship.hullClass);
  const options = nextHullClassOptions(ship.hullClass);
  const siblings = siblingHullOptions(ship.hullClass);
  const res = state.value.resources;
  const xpFraction = Math.min(1, ship.xp / xpToNextLevel(ship.level));

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div>
        <div className="title" style={{ fontSize: "1.2rem" }}>{t("ascension.title")}</div>
        <div style={{ color: "var(--text-mid)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
          {t("ascension.subtitle")}
        </div>
      </div>

      {/* Current form — the "before" half of every comparison below. */}
      <div className="panel accent scanline" style={{ padding: "1.1rem", ["--accent" as any]: `var(--rarity-${ship.rarity})` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.7rem" }}>
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
            <div
              style={{
                width: 46, height: 46, borderRadius: 8, flex: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `radial-gradient(circle, var(--rarity-${ship.rarity})22, transparent 70%)`,
                border: `1px solid var(--rarity-${ship.rarity})`,
              }}
            >
              <NavIcon name="fleet" size={24} color={`var(--rarity-${ship.rarity})`} />
            </div>
            <div>
              <div className="eyebrow" style={{ color: "var(--text-dim)" }}>{t("ascension.currentForm")}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{ship.name}</div>
              <div style={{ color: "var(--text-mid)", fontSize: "0.8rem" }}>{localizedHullClassDisplay(currentDef)}</div>
            </div>
          </div>
          <ShipRarityTag rarity={ship.rarity} />
        </div>

        <div style={{ display: "flex", gap: "1.1rem", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--text-mid)" }}>
          <StatChip icon={<HullIcon size={13} />} value={computeMaxHull(ship)} label={t("bridge.stat.hull")} />
          <StatChip icon={<PowerIcon size={13} />} value={computePowerCapacity(ship)} label={t("bridge.stat.power")} />
          <StatChip icon={<SpeedIcon size={13} />} value={computeSpeed(ship)} label={t("bridge.stat.speed")} />
          <StatChip icon={<SlotsIcon size={13} />} value={totalSlots(currentDef)} label={t("fleet.stat.slots")} />
        </div>

        <div style={{ marginTop: "0.85rem" }}>
          <div className="eyebrow" style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <LevelIcon size={12} /> {t("ascension.level", { level: ship.level })}
            </span>
            <span style={{ color: "var(--text-dim)" }}>{ship.xp} / {xpToNextLevel(ship.level)} XP</span>
          </div>
          <Bar fraction={xpFraction} kind="progress" />
        </div>

        {currentAbility && (
          <div style={{ marginTop: "0.8rem", padding: "0.55rem 0.7rem", borderRadius: 6, border: "1px solid var(--amber)", background: "rgba(255,193,71,0.08)" }}>
            <div className="eyebrow" style={{ color: "var(--amber)", marginBottom: "0.2rem" }}>{t("fleet.namedShipAbility")}</div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-mid)" }}>{localizedNamedShipActive(currentAbility)}</div>
          </div>
        )}
      </div>

      {ship.ascendedFrom.length > 0 && (
        <div className="panel compact" style={{ padding: "0.7rem 0.9rem" }}>
          <div className="eyebrow" style={{ marginBottom: "0.45rem" }}>{t("fleet.ascensionHistory")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center", fontSize: "0.74rem", color: "var(--text-dim)" }}>
            {ship.ascendedFrom.map((id, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {hullClassById(id).nameCn}
                <span>→</span>
              </span>
            ))}
            <span style={{ color: "var(--text-hi)", fontWeight: 700 }}>{currentDef.nameCn}</span>
          </div>
        </div>
      )}

      <div className="eyebrow" style={{ marginTop: "0.2rem", color: "var(--cyan)" }}>
        {options.length > 0 ? t("ascension.chooseNext") : t("ascension.maxed")}
      </div>

      {options.map((target) => (
        <AscensionOption
          key={target.id}
          ship={ship}
          target={target}
          essence={res.originEssence}
          flags={state.value.flags}
          onAscend={() => {
            ascendShipAction(target.id);
            setJustAscended(target.id);
          }}
        />
      ))}

      {/* 改铸:横向换到同一层的另一艘。
      
          实测(第 34 轮):1–6 层每层正好两艘,而玩家只能沿 order+1 走——每层做一次
          二选一,**永久放弃另一半**,而且是在完全不知道另一条路手感如何的情况下选的。
          同一轮量出来精华一整趟战役产出 4445,唯一的用途(走完一条完整进阶路线)
          只要 1590;六次进阶做完之后它就永远没用了。两件事是同一个洞的两面。 */}
      {siblings.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: "0.4rem", color: "var(--amber)" }}>{t("ascension.reforgeHeading")}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-mid)", marginTop: "-0.4rem" }}>
            {t("ascension.reforgeHint")}
          </div>
          {siblings.map((target) => (
            <AscensionOption
              key={`reforge-${target.id}`}
              ship={ship}
              target={target}
              essence={res.originEssence}
              flags={state.value.flags}
              lateral
              onAscend={() => {
                reforgeShipAction(target.id);
                setJustAscended(target.id);
              }}
            />
          ))}
        </>
      )}

      {justAscended && (
        <AscensionReveal hullClass={justAscended} onClose={() => setJustAscended(null)} />
      )}
    </div>
  );
}

function totalSlots(def: HullClassDef): number {
  return def.slots.weapon + def.slots.armor + def.slots.engine + def.slots.utility;
}

function StatChip({ icon, value, label }: { icon: preact.ComponentChildren; value: preact.ComponentChildren; label: string }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-hi)", fontWeight: 700, fontFamily: "var(--font-display)" }}>
        {icon}{value}
      </span>
      <span className="eyebrow" style={{ color: "var(--text-dim)" }}>{label}</span>
    </span>
  );
}

/** One candidate next-tier hull, shown as a real before→after comparison.
 * Every delta is computed against the player's ACTUAL ship (rarity, rolls and
 * level included), not against the raw hull-class baselines — so the number
 * shown is the number they'd actually get. */
function AscensionOption({
  ship,
  target,
  essence,
  flags,
  lateral = false,
  onAscend,
}: {
  ship: ShipInstance;
  target: HullClassDef;
  essence: number;
  flags: Record<string, boolean>;
  /** 横向改铸(同层换船),不是升一级。按钮文案和配色要分开,否则玩家会以为自己在进阶。 */
  lateral?: boolean;
  onAscend: () => void;
}) {
  const req = ascensionRequirementsMet(target, ship.level, essence, flags);
  const ready = req.flag && req.essence && req.level;
  const ability = hullClassAbility(target.id);
  const currentDef = hullClassById(ship.hullClass);

  // Project the real post-ascension ship rather than comparing raw baselines.
  const after = ascendShip(ship, target.id);
  const deltas = [
    { icon: <HullIcon size={13} />, label: t("bridge.stat.hull"), from: computeMaxHull(ship), to: computeMaxHull(after) },
    { icon: <PowerIcon size={13} />, label: t("bridge.stat.power"), from: computePowerCapacity(ship), to: computePowerCapacity(after) },
    { icon: <SpeedIcon size={13} />, label: t("bridge.stat.speed"), from: computeSpeed(ship), to: computeSpeed(after) },
    { icon: <SlotsIcon size={13} />, label: t("fleet.stat.slots"), from: totalSlots(currentDef), to: totalSlots(target) },
  ];

  return (
    <div
      className={`panel ${ready ? "accent" : ""}`}
      style={{ padding: "1rem", ["--accent" as any]: ready ? "var(--green)" : undefined, opacity: ready ? 1 : 0.82 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.7rem" }}>
        <div style={{ fontSize: "1rem", fontWeight: 700 }}>{localizedHullClassDisplay(target)}</div>
        {ready && <span className="eyebrow" style={{ color: "var(--green)" }}>{t(lateral ? "ascension.readyReforge" : "ascension.ready")}</span>}
      </div>

      {/* Stat deltas — the whole point of the screen. Never negative by design
          (see the monotonicity test in engine/ships.test.ts), so a zero delta
          reads as "unchanged", never as a hidden downgrade. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.8rem" }}>
        {deltas.map((d, i) => {
          const diff = d.to - d.from;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-dim)", minWidth: 74 }}>
                {d.icon}{d.label}
              </span>
              <span style={{ color: "var(--text-mid)", fontVariantNumeric: "tabular-nums" }}>{d.from}</span>
              <span style={{ color: "var(--text-dim)" }}>→</span>
              <span style={{ color: "var(--text-hi)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d.to}</span>
              {diff > 0 && (
                <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "0.74rem", fontVariantNumeric: "tabular-nums" }}>
                  +{diff}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {ability && (
        <div style={{ marginBottom: "0.8rem", padding: "0.55rem 0.7rem", borderRadius: 6, border: "1px solid var(--amber)", background: "rgba(255,193,71,0.08)" }}>
          <div className="eyebrow" style={{ color: "var(--amber)", marginBottom: "0.2rem" }}>{t("ascension.unlocksAbility")}</div>
          <div style={{ fontSize: "0.76rem", color: "var(--text-mid)" }}>{localizedNamedShipActive(ability)}</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.32rem", marginBottom: "0.8rem" }}>
        <Requirement met={req.level} label={t("station.reqLevel", { level: target.minLevel })} icon={<LevelIcon size={12} />} />
        <Requirement
          met={req.essence}
          label={t("station.reqEssence", { amount: target.essenceCost })}
          icon={<ResourceIcon type="originEssence" size={12} />}
          detail={req.essence ? undefined : t("ascension.shortBy", { amount: target.essenceCost - essence })}
        />
        {target.unlockFlag !== null && (() => {
          // 说清楚是**哪一段**剧情。裸标签「剧情进度」等于把玩家挡在门外还不给
          // 门牌号——章节名就在数据里,只是原来没接起来。
          const chapter = sceneTitleForFlag(target.unlockFlag);
          return (
            <Requirement
              met={req.flag}
              label={chapter ? t("station.reqStoryNamed", { chapter }) : t("station.reqStory")}
            />
          );
        })()}
      </div>

      <button
        className="btn primary"
        disabled={!ready}
        style={{ width: "100%", ...(ready ? { boxShadow: `0 0 14px var(--${lateral ? "amber" : "green"})`, fontWeight: 800 } : {}) }}
        onClick={() => { onAscend(); playSfx("levelUp"); }}
      >
        {t(lateral ? "station.reforge" : "station.ascend")}
      </button>
    </div>
  );
}

function Requirement({ met, label, icon, detail }: { met: boolean; label: string; icon?: preact.ComponentChildren; detail?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.74rem", color: met ? "var(--green)" : "var(--text-dim)" }}>
      <span aria-hidden="true" style={{ fontWeight: 700 }}>{met ? "✓" : "○"}</span>
      {icon}
      {label}
      {detail && <span style={{ color: "var(--red)" }}>({detail})</span>}
    </div>
  );
}

/** The moment itself — an ascension is the rarest power jump in the game and
 * should land like one, not resolve into a silently-updated stat block. */
function AscensionReveal({ hullClass, onClose }: { hullClass: HullClassId; onClose: () => void }) {
  const def = hullClassById(hullClass);
  const ability = hullClassAbility(hullClass);
  const ship = flagship.value!;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(3,5,9,0.78)" }}
      onClick={onClose}
    >
      <div
        className="panel accent scanline pop-in"
        style={{ padding: "2rem", textAlign: "center", minWidth: 280, maxWidth: "min(420px, 90vw)", ["--accent" as any]: "var(--green)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="eyebrow" style={{ color: "var(--green)", marginBottom: "0.6rem" }}>{t("station.ascended")}</div>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>{ship.name}</div>
        <div style={{ color: "var(--cyan)", margin: "0.35rem 0 0.9rem", fontSize: "0.95rem" }}>{localizedHullClassDisplay(def)}</div>

        <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", fontSize: "0.85rem", color: "var(--text-mid)" }}>
          <StatChip icon={<HullIcon size={13} />} value={computeMaxHull(ship)} label={t("bridge.stat.hull")} />
          <StatChip icon={<PowerIcon size={13} />} value={computePowerCapacity(ship)} label={t("bridge.stat.power")} />
          <StatChip icon={<SpeedIcon size={13} />} value={computeSpeed(ship)} label={t("bridge.stat.speed")} />
        </div>

        {ability && (
          <div style={{ marginTop: "1rem", fontSize: "0.78rem", color: "var(--amber)" }}>
            {localizedNamedShipActive(ability)}
          </div>
        )}

        <button className="btn primary" style={{ marginTop: "1.3rem" }} onClick={onClose}>{t("station.nice")}</button>
      </div>
    </div>
  );
}
