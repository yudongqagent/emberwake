# Research Notes — Ship Ascension

Required by `docs/content-depth-standards.md` §2: research pass before revising a core
system, findings captured here so sourcing is auditable. This corrects a prior design
mistake: Emberwake's ship progression was built as a gacha/showcase (draw and swap
between many candidate ships), which is **not** how the source novel's title mechanic
actually works.

**Source:** 我的战舰能升级 (*My Warship Can Level Up*), by 酣歌 (Han Ge). Researched
2026-08-24 via web search of chapter-title indexes (mkzhan.com's comic index) and
several novel-synopsis sources, cross-checked against the earlier Act I research pass
(`research-notes-act1.md`). I could not get read access to raw chapter body text
despite repeated fetch attempts (search tools consistently returned chapter-title
indexes and synopsis summaries, not prose) — everything below is sourced at that
granularity, and I've flagged where I'm extrapolating past it.

## Confirmed

- **火种战舰** ("Fire Seed / Spark-type Warship") is a *class designation* for the
  protagonist's kind of ship, not one specific ship's name — already noted in
  `research-notes-act1.md`, and the likely origin of this project's own name
  ("Emberwake") and AI companion ("the Cinder").
- The protagonist's starting ship is **战斧号** ("Tomahawk", comic ep.2, "火种战舰——
  战斧号！").
- Comic episodes 37/39/40 ("曙光号，沉没" / "皇家造船厂" / "幽鹏号" — "Dawnship,
  Sunk!" / "Royal Shipyard" / "Youpeng") show an early ship transition: a ship is
  lost in battle, the protagonist visits a shipyard, and comes away with a new hull,
  **幽鹏号** ("Dark/Mysterious Roc"). This reads as a narrative event, not a
  showcase-purchase screen.
- **Comic episode 78 is titled "幽鹏号，进化"** — "Youpeng [the same ship from ep.40],
  Evolves." This is the single strongest piece of evidence available: the long-run
  growth loop is the *same ship instance* evolving in place, not swapping to a newly
  drawn one. No other episode title in the visible index (through ep.90) references a
  further ship swap.
- Multiple novel synopses describe the assistant system's function as "scan a
  warship's growth potential + select the [right] flagship" plus "amplified
  source-point/origin-point gain" — this already matches Emberwake's existing Scan
  (reveals hidden Aptitude) and Yield (Origin Essence multiplier) systems, independently
  built before this research pass (per `research-notes-act1.md`'s own finding).
- One synopsis explicitly contrasts the protagonist with **other characters in the
  setting, who must draw a lottery (抽奖) for ships and modules** — his system-granted
  edge is bypassing that randomness for his own ship's growth, not doing a better
  version of the same random draw. This is direct support for removing the gacha from
  the *player's own* ship progression specifically (crew/module gacha, which the
  novel doesn't contradict this way, are unaffected — see `docs/systems-design.md`).

## Not confirmed — flagged honestly

- The exact **trigger conditions** for an evolution/ascension event (a combat
  milestone? a resource threshold? a specific trial?) are not sourced at the
  granularity I could reach.
- The exact **number of tiers/forms** a ship passes through is not sourced.
- Whether **appearance** changes per tier is plausible for the genre but unsourced
  from this pass.
- **"属性飞跃"** (the phrase used in the player-feedback prompt that triggered this
  redesign) did not turn up as a verbatim in-novel term in anything I could fetch —
  I'm treating it as a paraphrase of the concept ("a real leap in stats, not creep"),
  not a sourced quote, and not using it as a citation.

## What this means for Emberwake's design

The trigger conditions, tier count, and per-tier abilities in the actual redesign
(see `docs/systems-design.md` and the implementation) are **original design**, built
by combining systems Emberwake already had for other reasons (story-flag gates,
Origin Essence, ship level) rather than sourced from the novel — the same honesty
standard already applied to the Rift Echoes (`research-notes-extradimensional.md`)
and the Choir (`research-notes-act6.md`): a confirmed premise, original mechanics
layered on top, and no claim that the specific numbers or ability list are sourced.
