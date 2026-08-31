import type { ResourceType, ModuleType, CrewRole, FactionId, ShipRarity } from "../../data/types";
import { language } from "../../i18n/language";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

function Svg({ size = 18, children, className }: IconProps & { children: preact.ComponentChildren }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flex: "none", display: "block" }}>
      {children}
    </svg>
  );
}

// --- Resource iconography — distinct silhouettes, not interchangeable dots ---

function SalvageGlyph({ color = "currentColor" }: { color?: string }) {
  return (
    <>
      <path d="M4 14 L9 4 L15 4 L20 14 L17 20 L7 20 Z" stroke={color} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M9 4 L12 11 L15 4 M4 14 L12 11 L20 14 M12 11 L7 20 M12 11 L17 20" stroke={color} stroke-width="1" opacity="0.55" />
    </>
  );
}

function SourcePointsGlyph({ color = "currentColor" }: { color?: string }) {
  return (
    <>
      <path d="M12 2 L14.4 9.2 L22 9.2 L15.8 13.8 L18.2 21 L12 16.4 L5.8 21 L8.2 13.8 L2 9.2 L9.6 9.2 Z" fill={color} opacity="0.18" stroke={color} stroke-width="1.4" stroke-linejoin="round" />
    </>
  );
}

function AlloyGlyph({ color = "currentColor" }: { color?: string }) {
  return (
    <>
      <path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" stroke={color} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M12 2 V22 M3 7 L21 17 M21 7 L3 17" stroke={color} stroke-width="0.9" opacity="0.45" />
    </>
  );
}

function OriginEssenceGlyph({ color = "currentColor" }: { color?: string }) {
  return (
    <>
      <path d="M12 2 L19 9 L12 22 L5 9 Z" fill={color} opacity="0.2" stroke={color} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M5 9 H19 M12 2 L9 9 L12 22 M12 2 L15 9 L12 22" stroke={color} stroke-width="0.9" opacity="0.6" />
    </>
  );
}

function InsightGlyph({ color = "currentColor" }: { color?: string }) {
  return (
    <>
      <circle cx="12" cy="11" r="6.5" stroke={color} stroke-width="1.6" />
      <circle cx="12" cy="11" r="2.2" fill={color} />
      <path d="M12 20 L12 22.5 M8 20.5 L7 22.5 M16 20.5 L17 22.5" stroke={color} stroke-width="1.4" stroke-linecap="round" />
    </>
  );
}

const RESOURCE_GLYPHS: Record<ResourceType, (p: { color?: string }) => preact.JSX.Element> = {
  salvage: SalvageGlyph,
  sourcePoints: SourcePointsGlyph,
  alloy: AlloyGlyph,
  originEssence: OriginEssenceGlyph,
  insight: InsightGlyph,
};

export const RESOURCE_COLOR: Record<ResourceType, string> = {
  salvage: "#9fb8cc",
  sourcePoints: "#4be8ff",
  alloy: "#ff9f4d",
  originEssence: "#ffe25d",
  insight: "#b98cff",
};

const RESOURCE_LABEL_EN: Record<ResourceType, string> = {
  salvage: "Salvage",
  sourcePoints: "Source Points",
  alloy: "Alloy",
  originEssence: "Origin Essence",
  insight: "Insight",
};
const RESOURCE_LABEL_ZH: Record<ResourceType, string> = {
  salvage: "废料",
  sourcePoints: "源点",
  alloy: "合金",
  originEssence: "本源精华",
  insight: "洞悉",
};

/** Issue #2 (2026-08 playtest): the player couldn't tell what any resource was
 * *for* — five icons and numbers with no legible purpose. Each entry names the
 * actual, current spend point(s) in the code, not an aspirational description —
 * see ResourceBar's tap-to-reveal panel. Issue #11: functions (not plain records)
 * so they read the live language signal instead of freezing at import time. */
const RESOURCE_INFO_EN: Record<ResourceType, string> = {
  salvage: "Raw scrap from combat and mining. Repairs your hull at any station, and trades for Alloy.",
  sourcePoints: "源点 (Source Points) — the novel's own name for this. Spend it on new modules and rerolling the Fabricator's offers.",
  alloy: "Refined material. Outfits new crew recruits, or trades back to Salvage if you're short on it.",
  originEssence: "本源精华 (Origin Essence) — drawn from 文明本源 ('civilization's origin'), the source novel's term for it. Earned only from tougher fights. The only thing that lets Whisper ascend to her next hull class.",
  insight: "Earned from story and exploration. Spend it to lock in a module's trait instead of leaving it to the next roll.",
};
const RESOURCE_INFO_ZH: Record<ResourceType, string> = {
  salvage: "来自战斗与采矿的原始废料。可在任意空间站修复船体，也可兑换合金。",
  sourcePoints: "即原著中的「源点」。用于购买新模组，以及刷新制造工坊的报价。",
  alloy: "精炼材料。用于装备新招募的船员，短缺废料时也可兑换回废料。",
  originEssence: "即「本源精华」，源自原著「文明本源」一词。只能从更艰难的战斗中获得——是「絮语」号进阶为下一级舰体唯一需要的资源。",
  insight: "来自剧情与探索。花费它可以直接锁定模组特性，而不必依赖下一次随机结果。",
};

export function resourceLabel(type: ResourceType): string {
  return (language.value === "zh" ? RESOURCE_LABEL_ZH : RESOURCE_LABEL_EN)[type];
}
export function resourceInfo(type: ResourceType): string {
  return (language.value === "zh" ? RESOURCE_INFO_ZH : RESOURCE_INFO_EN)[type];
}

export function ResourceIcon({ type, size = 18 }: { type: ResourceType; size?: number }) {
  const Glyph = RESOURCE_GLYPHS[type];
  return (
    <Svg size={size}>
      <Glyph color={RESOURCE_COLOR[type]} />
    </Svg>
  );
}

// --- Module type iconography ---

function WeaponGlyph({ color }: { color: string }) {
  return (
    <>
      <path d="M12 2 V13" stroke={color} stroke-width="1.8" stroke-linecap="round" />
      <path d="M6 13 H18 L15.5 22 H8.5 Z" stroke={color} stroke-width="1.6" stroke-linejoin="round" />
      <circle cx="12" cy="13" r="2" fill={color} />
    </>
  );
}
function ArmorGlyph({ color }: { color: string }) {
  return <path d="M12 2 L20 5.5 V11 C20 16.5 16.6 20.6 12 22 C7.4 20.6 4 16.5 4 11 V5.5 Z" stroke={color} stroke-width="1.7" stroke-linejoin="round" />;
}
function EngineGlyph({ color }: { color: string }) {
  return (
    <>
      <path d="M9 3 H15 L17 9 H7 Z" stroke={color} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M7 9 H17 V17 H7 Z" stroke={color} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M9 17 L7 22 M12 17 L12 22 M15 17 L17 22" stroke={color} stroke-width="1.4" stroke-linecap="round" opacity="0.8" />
    </>
  );
}
function UtilityGlyph({ color }: { color: string }) {
  return (
    <path
      d="M20 14.5 L17.8 13.3 A6 6 0 0 0 17.8 10.7 L20 9.5 L18 6 L15.7 7.1 A6 6 0 0 0 13.5 5.8 L13 3.4 H9 L8.5 5.8 A6 6 0 0 0 6.3 7.1 L4 6 L2 9.5 L4.2 10.7 A6 6 0 0 0 4.2 13.3 L2 14.5 L4 18 L6.3 16.9 A6 6 0 0 0 8.5 18.2 L9 20.6 H13 L13.5 18.2 A6 6 0 0 0 15.7 16.9 L18 18 Z M11 15 A3 3 0 1 1 11 9 A3 3 0 0 1 11 15 Z"
      stroke={color}
      stroke-width="1.3"
      stroke-linejoin="round"
    />
  );
}

const MODULE_GLYPHS: Record<ModuleType, (p: { color: string }) => preact.JSX.Element> = {
  weapon: WeaponGlyph,
  armor: ArmorGlyph,
  engine: EngineGlyph,
  utility: UtilityGlyph,
};

export const MODULE_TYPE_COLOR: Record<ModuleType, string> = {
  weapon: "#ff5c5c",
  armor: "#5dd6ff",
  engine: "#ffb84d",
  utility: "#b98cff",
};

export function ModuleTypeIcon({ type, size = 18, color }: { type: ModuleType; size?: number; color?: string }) {
  const Glyph = MODULE_GLYPHS[type];
  return (
    <Svg size={size}>
      <Glyph color={color ?? MODULE_TYPE_COLOR[type]} />
    </Svg>
  );
}

// --- Crew role iconography ---

function HelmGlyph({ color }: { color: string }) {
  return (
    <>
      <circle cx="12" cy="12" r="8" stroke={color} stroke-width="1.6" />
      <circle cx="12" cy="12" r="2.4" fill={color} />
      <path d="M12 4 V8 M12 16 V20 M4 12 H8 M16 12 H20 M6.3 6.3 L9 9 M15 15 L17.7 17.7 M17.7 6.3 L15 9 M9 15 L6.3 17.7" stroke={color} stroke-width="1.3" stroke-linecap="round" />
    </>
  );
}
function GunnerGlyph({ color }: { color: string }) {
  return (
    <>
      <circle cx="12" cy="12" r="8.5" stroke={color} stroke-width="1.4" />
      <circle cx="12" cy="12" r="4.5" stroke={color} stroke-width="1.3" />
      <circle cx="12" cy="12" r="1.3" fill={color} />
      <path d="M12 1.5 V4.5 M12 19.5 V22.5 M1.5 12 H4.5 M19.5 12 H22.5" stroke={color} stroke-width="1.4" stroke-linecap="round" />
    </>
  );
}
function EngineerGlyph({ color }: { color: string }) {
  return (
    <path
      d="M20 14.5 L17.8 13.3 A6 6 0 0 0 17.8 10.7 L20 9.5 L18 6 L15.7 7.1 A6 6 0 0 0 13.5 5.8 L13 3.4 H9 L8.5 5.8 A6 6 0 0 0 6.3 7.1 L4 6 L2 9.5 L4.2 10.7 A6 6 0 0 0 4.2 13.3 L2 14.5 L4 18 L6.3 16.9 A6 6 0 0 0 8.5 18.2 L9 20.6 H13 L13.5 18.2 A6 6 0 0 0 15.7 16.9 L18 18 Z M11 15 A3 3 0 1 1 11 9 A3 3 0 0 1 11 15 Z"
      stroke={color}
      stroke-width="1.3"
      stroke-linejoin="round"
    />
  );
}
function TacticianGlyph({ color }: { color: string }) {
  return (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1.5" stroke={color} stroke-width="1.4" />
      <path d="M3 9 H21 M3 15 H21 M9 3 V21 M15 3 V21" stroke={color} stroke-width="0.9" opacity="0.55" />
      <circle cx="15" cy="9" r="1.6" fill={color} />
      <circle cx="9" cy="15" r="1.6" fill={color} />
    </>
  );
}

const CREW_GLYPHS: Record<CrewRole, (p: { color: string }) => preact.JSX.Element> = {
  helm: HelmGlyph,
  gunner: GunnerGlyph,
  engineer: EngineerGlyph,
  tactician: TacticianGlyph,
};

export const CREW_RARITY_COLOR: Record<string, string> = {
  recruit: "#8a97a6",
  veteran: "#5dd6ff",
  elite: "#5dffb0",
  ace: "#b98cff",
  legend: "#ffe25d",
};

export const CREW_ROLE_COLOR: Record<CrewRole, string> = {
  helm: "#5dd6ff",
  gunner: "#ff5c5c",
  engineer: "#5dffb0",
  tactician: "#ffb84d",
};

export function CrewRoleIcon({ role, size = 18, color }: { role: CrewRole; size?: number; color?: string }) {
  const Glyph = CREW_GLYPHS[role];
  return (
    <Svg size={size}>
      <Glyph color={color ?? CREW_ROLE_COLOR[role]} />
    </Svg>
  );
}

// --- Faction emblems (small badge) ---

export const FACTION_COLOR: Record<FactionId, string> = {
  bauhinia: "#b98cff",
  lionsheart: "#5dd6ff",
  swanreach: "#ffb84d",
  reavers: "#ff5c5c",
  swarm: "#8cff9e",
  constructs: "#9fb8cc",
  hollow: "#e8d9ff",
  riftEchoes: "#b478ff",
  choir: "#ffd66b",
};

export function FactionEmblem({ faction, size = 16 }: { faction: FactionId; size?: number }) {
  const color = FACTION_COLOR[faction];
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9.5" stroke={color} stroke-width="1.4" fill={`${color}22`} />
      <circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}

// --- Rarity badge: shape + color coding so tier reads without needing to parse text ---

const SHIP_RARITY_ORDER: ShipRarity[] = ["salvage", "standard", "reinforced", "advanced", "prototype", "ascendant"];

export function RarityPips({ rarity, size = 6 }: { rarity: ShipRarity; size?: number }) {
  const idx = SHIP_RARITY_ORDER.indexOf(rarity);
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {SHIP_RARITY_ORDER.map((_, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: i <= idx ? `var(--rarity-${rarity})` : "rgba(255,255,255,0.12)",
            boxShadow: i <= idx ? `0 0 5px var(--rarity-${rarity})` : "none",
          }}
        />
      ))}
    </span>
  );
}

// --- Nav / chrome icons ---

export function NavIcon({ name, size = 20, color = "currentColor" }: { name: "bridge" | "system" | "galaxy" | "ascension" | "fleet" | "modules" | "crew"; size?: number; color?: string }) {
  const paths: Record<string, preact.ComponentChildren> = {
    bridge: (
      <>
        <path d="M4 16 L6 8 H18 L20 16" stroke={color} stroke-width="1.5" stroke-linejoin="round" />
        <path d="M2 16 H22 L20 19 H4 Z" stroke={color} stroke-width="1.5" stroke-linejoin="round" />
        <circle cx="12" cy="12" r="1.4" fill={color} />
      </>
    ),
    system: (
      <>
        <circle cx="12" cy="12" r="2.4" fill={color} />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" stroke={color} stroke-width="1.3" />
        <ellipse cx="12" cy="12" rx="9" ry="3.6" stroke={color} stroke-width="1.3" transform="rotate(60 12 12)" />
      </>
    ),
    // Ascension: an upward chevron stack over a hull silhouette — the ship
    // itself rising a tier, distinct from the fleet/roster glyph.
    ascension: (
      <>
        <path d="M12 3 L17 9 H14 V13 H10 V9 H7 Z" stroke={color} stroke-width="1.4" stroke-linejoin="round" fill="none" />
        <path d="M5 17 H19 L17 21 H7 Z" stroke={color} stroke-width="1.4" stroke-linejoin="round" fill="none" />
        <path d="M9 15 H15" stroke={color} stroke-width="1.2" stroke-linecap="round" opacity="0.6" />
      </>
    ),
    galaxy: (
      <>
        <circle cx="6" cy="7" r="1.8" fill={color} />
        <circle cx="17" cy="6" r="1.3" fill={color} />
        <circle cx="18" cy="16" r="1.8" fill={color} />
        <circle cx="7" cy="17" r="1.3" fill={color} />
        <path d="M6 7 L17 6 M17 6 L18 16 M18 16 L7 17 M7 17 L6 7 M6 7 L18 16 M17 6 L7 17" stroke={color} stroke-width="0.9" opacity="0.5" />
      </>
    ),
    fleet: (
      <>
        <path d="M12 2 L19 8 V16 L12 22 L5 16 V8 Z" stroke={color} stroke-width="1.4" stroke-linejoin="round" />
        <path d="M12 2 V22 M5 8 L19 16 M19 8 L5 16" stroke={color} stroke-width="0.8" opacity="0.5" />
      </>
    ),
    modules: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1" stroke={color} stroke-width="1.4" />
        <rect x="13" y="4" width="7" height="7" rx="1" stroke={color} stroke-width="1.4" opacity="0.5" />
        <rect x="4" y="13" width="7" height="7" rx="1" stroke={color} stroke-width="1.4" opacity="0.5" />
        <rect x="13" y="13" width="7" height="7" rx="1" stroke={color} stroke-width="1.4" />
      </>
    ),
    crew: (
      <>
        <circle cx="9" cy="8" r="3.2" stroke={color} stroke-width="1.4" />
        <path d="M3 20 C3 15.5 5.5 13 9 13 C12.5 13 15 15.5 15 20" stroke={color} stroke-width="1.4" stroke-linecap="round" />
        <circle cx="17" cy="9" r="2.4" stroke={color} stroke-width="1.2" opacity="0.7" />
        <path d="M13.5 20 C13.5 17 15 15 17.5 15 C20 15 21.5 17 21.5 20" stroke={color} stroke-width="1.2" stroke-linecap="round" opacity="0.7" />
      </>
    ),
  };
  return <Svg size={size}>{paths[name]}</Svg>;
}

export function HullIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 2 L20 5.5 V11 C20 16.5 16.6 20.6 12 22 C7.4 20.6 4 16.5 4 11 V5.5 Z" stroke={color} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M12 6 V13 M8.5 9.5 H15.5" stroke={color} stroke-width="1.3" stroke-linecap="round" opacity="0.75" />
    </Svg>
  );
}

export function PowerIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M13 2 L5 13.5 H11 L10 22 L19 9.5 H13 Z" fill={color} opacity="0.2" stroke={color} stroke-width="1.4" stroke-linejoin="round" />
    </Svg>
  );
}

export function LevelIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3 L21 8 L12 13 L3 8 Z" stroke={color} stroke-width="1.4" stroke-linejoin="round" />
      <path d="M6 11.5 L3 13 L12 18 L21 13 L18 11.5 M6 15.5 L3 17 L12 22 L21 17 L18 15.5" stroke={color} stroke-width="1.2" stroke-linejoin="round" opacity="0.75" />
    </Svg>
  );
}

export function AptitudeIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 20 L9 8 L14 16 L17 10 L20 20" stroke={color} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <circle cx="9" cy="8" r="1.4" fill={color} />
      <circle cx="17" cy="10" r="1.4" fill={color} />
    </Svg>
  );
}

export function SlotsIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" stroke={color} stroke-width="1.4" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" stroke={color} stroke-width="1.4" opacity="0.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" stroke={color} stroke-width="1.4" opacity="0.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" stroke={color} stroke-width="1.4" />
    </Svg>
  );
}

export function SpeedIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3 12 H15 M10 6 L16 12 L10 18" stroke={color} stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <path d="M15 8 L19 12 L15 16" stroke={color} stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.6" />
    </Svg>
  );
}

// --- Bridge-command order iconography (section G/F of the 2026-08-24 player
// brief): the stance/boarding orders read as actions, not stats, but tenet 1
// (icon-heavy, not text-heavy) still applies — a glance at the shape should say
// "closing/holding/retreating/boarding" before the label is even read. ---

export function CloseOrderIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 6 L11 12 L5 18 M12 6 L18 12 L12 18" stroke={color} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </Svg>
  );
}

export function HoldOrderIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M9 5 V19 M15 5 V19" stroke={color} stroke-width="2" stroke-linecap="round" />
    </Svg>
  );
}

export function RetreatOrderIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M13 6 L7 12 L13 18 M20 6 L14 12 L20 18" stroke={color} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </Svg>
  );
}

export function BoardIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3 L12 15" stroke={color} stroke-width="1.8" stroke-linecap="round" />
      <path d="M6 9 L12 3 L18 9" stroke={color} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <path d="M5 15 H19 L17 21 H7 Z" stroke={color} stroke-width="1.6" stroke-linejoin="round" fill="none" opacity="0.85" />
    </Svg>
  );
}

export function EvasionIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 2 L20 5.5 V11 C20 16.5 16.6 20.6 12 22 C7.4 20.6 4 16.5 4 11 V5.5 Z" stroke={color} stroke-width="1.5" stroke-linejoin="round" opacity="0.55" />
      <path d="M8.5 11 L11 14 L16 8.5" stroke={color} stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </Svg>
  );
}

export function CritIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="7" stroke={color} stroke-width="1.4" />
      <path d="M12 3 V7 M12 17 V21 M3 12 H7 M17 12 H21" stroke={color} stroke-width="1.6" stroke-linecap="round" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </Svg>
  );
}

export function LocationIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 2 C7.5 2 4.5 5.3 4.5 9.3 C4.5 14.8 12 22 12 22 C12 22 19.5 14.8 19.5 9.3 C19.5 5.3 16.5 2 12 2 Z" stroke={color} stroke-width="1.5" stroke-linejoin="round" />
      <circle cx="12" cy="9.3" r="2.6" stroke={color} stroke-width="1.4" />
    </Svg>
  );
}

export function TradeIcon({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 8 H17 M13 4 L17 8 L13 12" stroke={color} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M20 16 H7 M11 12 L7 16 L11 20" stroke={color} stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </Svg>
  );
}

export function SoundIcon({ muted, size = 18, color = "currentColor" }: { muted: boolean; size?: number; color?: string }) {
  return (
    <Svg size={size}>
      <path d="M4 9.5 V14.5 H7.5 L12.5 18.5 V5.5 L7.5 9.5 Z" fill={color} stroke={color} stroke-width="1" stroke-linejoin="round" />
      {muted ? (
        <path d="M16 8 L21 16 M21 8 L16 16" stroke={color} stroke-width="1.6" stroke-linecap="round" />
      ) : (
        <path d="M16.5 8.5 A6 6 0 0 1 16.5 15.5 M18.8 6 A9.5 9.5 0 0 1 18.8 18" stroke={color} stroke-width="1.4" stroke-linecap="round" opacity="0.85" />
      )}
    </Svg>
  );
}
