# Emberwake — World Bible

Reference doc for setting, factions, characters, and terminology. The story docs in
`docs/story/` assume this context; this file is where new names get defined first.

## Adaptation note

Emberwake is inspired by the web novel *我的战舰能升级* ("My Warship Can Level Up") by
酣歌 — specifically its central hook (a protagonist reincarnated with an asymmetric
"system" no one else has), its ship-power-as-political-power premise, and its
scan/yield/self-select trio of abilities. All character names, faction names, dialogue,
and specific plot events in this document are original — nothing here is translated or
reproduced from the source text.

## Premise

Kade Ren, a Bauhinia Principality fleet officer, dies commanding a doomed flagship in a
losing battle. He wakes up twenty years earlier, in his own body, aboard the same
salvage-grade corvette he started his career on — bonded to **the Cinder**, an AI seed
that turns out (Act IV) to be a fragment of an ancient Mayeth Construct core, fused to
him in the instant his future flagship died. No one else in this era has anything like
it. He knows what's coming. This time he intends to be ready — and the Cinder is not
merely a power-up, it's a second, alien intelligence with its own slowly-revealed
agenda.

## The Cinder's powers

- **Scan** — reveals a ship's hidden growth ceiling (its Aptitude) before you commit
  resources to it. Available from the start.
- **Yield** — extracts significantly more Source Points than anyone else from the same
  expedition or wreck. Available from the start.
- **Lock** — spends a scarce resource (Insight) to choose a module's trait outright
  instead of rolling it. Unlocked Act I, Chapter 4.

## Galaxies (playable regions, unlocked in story order)

| Galaxy | Character | Unlocked |
|---|---|---|
| **Bauhinia Reach** | Home galaxy. Core worlds, Principality control, noble houses. | Act I |
| **Lionsheart Expanse** | Militaristic frontier alliance ("the Concord"), honor culture. | Act II |
| **Swanreach Combine** | Trade and industrial cluster, price-driven, mercantile. | Act II |
| **Fractured Veil** | Chitin Swarm territory. Unstable pocket-dimension Rifts. | Act III |
| **Deep Origin** | Ancient, dormant Mayeth Construct ruins and megastructures. | Act IV |
| **Umbral Line** | Convergence zone where the true endgame threat stirs. | Act V |

Each galaxy is a graph of systems connected by jump lanes. Within a system the player
flies freely in continuous 2D space among planets, stations, asteroid/mining fields,
derelicts, and patrols — see `docs/architecture.md` for the map model.

### Named systems referenced in the story

- **Bauhinia Reach**: Bauhinia Prime (capital), Amaranth Belt (mining field), Kestrel's
  Rest (frontier outpost), Thornwake (derelict flagship wreck), Coldreach Anchorage
  (pirate lieutenant's base).
- **Lionsheart Expanse**: Ferrous Gate (border checkpoint), Ashenvale (capital, dueling
  culture), the Hollow Fleet Yard (hidden Reaver shipyard).
- **Swanreach Combine**: Meridian Exchange (trade capital), Driftmarket (open trade
  route hub).
- **Fractured Veil**: Veil's Edge (entry point), the Chrysalis Expanse (Swarm hive
  territory), Queenspire (Broodmother's seat).
- **Deep Origin**: the First Fleet Graveyard (ruins entry), Construct Anchor Zero
  (Mayeth core facility).
- **Umbral Line**: the Umbral Line itself — one vast convergence zone, finale setting.

## Factions

- **Bauhinia Principality** — Kade's home polity. Warship strength determines
  political standing (the Warship Supremacy Doctrine). Internally split between
  reform-minded patrons and entrenched old-guard houses.
  - **House Arthaine** — the antagonist noble house. Patriarch **Sir Arthur Arthaine**
    represents everything blocking Kade's rise: inherited privilege defended through
    sabotage, blackmail, and eventually treasonous deals with external threats.
  - **Dowager Marchioness Yifei Lin** — Kade's original patron and former commanding
    officer. Sponsors his early career against Arthaine's obstruction. A political
    ally, not a combatant — her safety and standing are a recurring stake.
- **Lionsheart Concord** — frontier military alliance across the Lionsheart Expanse.
  Honor-bound, duel-culture, distrustful of Bauhinia court politics.
- **Swanreach Combine** — trade and industrial power across Swanreach space.
  Transactional, pragmatic, cares about markets more than pedigree.
- **Shark Reavers** — pirate faction operating across Bauhinia and Lionsheart space.
  Leaders **Kessa "Tiger Shark" Vray** and **Hawke**. Not cartoonish raiders — driven by
  having been failed by the Principality's frontier policy, which gives their late
  redemption arc (Act III) real footing.
- **Chitin Swarm** — insectoid alien civilization, territory in the Fractured Veil.
  Led narratively by a Broodmother figure at Queenspire. Revealed (Act III) to be
  harvesting Origin Essence themselves, driven to expand by something disturbing the
  deep Rifts — a dark mirror of the player's own economy.
- **Mayeth Constructs** — an extinct-but-automated mechanical civilization in Deep
  Origin, defending dormant megastructures. Not malicious by default — their combat
  doctrine is defensive/procedural (EMP, weak-point puzzles) rather than aggressive.
- **The Hollow** — not a faction so much as a force: whatever originally shattered the
  Mayeth civilization, now stirring again in the deepest Rifts. Consumes Origin itself
  rather than fighting over it. The true endgame threat, revealed gradually across
  Acts IV–V. Deliberately kept somewhat ambiguous rather than over-explained.
- **Rift Echoes** — encountered only inside Origin Rift Pockets (the "extradimensional
  battlefield," playable from Act III on), not the normal-space map. Fractured,
  unstable fragments that flicker in and out of phase mid-fight — foreshadowing of the
  true Hollow, not the Hollow itself; the "Hollow Echo" bounty naming elsewhere is the
  same connective thread. Per
  `docs/story/research-notes-extradimensional.md`, the *premise* — a special warship
  periodically diving into alternate space to harvest Source Points and grow stronger —
  is directly sourced from the novel; the Rift Echoes themselves are original invention
  layered on that confirmed mechanic, not sourced.

## Named crew (story-unlocked)

| Name | Role | Introduced | Notes |
|---|---|---|---|
| **Ori Vashti** | Engineer | Act I, Ch.1–2 | First recruit. Salvager, practical, quietly grieving a ship of her own lost to the Reavers. |
| **Bosun "Ratchet" Koi** | Gunner | Act I, Ch.5 | Ex-Principality Navy washout. Gruff mentor archetype. |
| **Lady Seraphine Arthaine** | Tactician | Act I–II | Sir Arthur's estranged daughter. Defects to Kade — the antagonist's own blood choosing the protagonist. Major arc through Act IV. |
| **Duelist Kaan Ferrous** | Helm | Act II, Ch.1 | Lionsheart Concord. Honor-bound, initially skeptical of Kade's "cheating" luck. |
| **Quartermaster Priya Osei** | Trade/Support | Act II, Ch.2 | Swanreach Combine. Runs the economics of the crew's operation. |
| **Kessa "Tiger Shark" Vray** | Gunner/Raider | Act III, Ch.3 (recruitable) | Redemption arc. Optional recruit depending on earlier choices toward the Reavers. |
| **Unit 7-Requiem** | Engineer/Unique | Act IV, Ch.2 | Rogue Mayeth Construct AI. Legend-tier unique crew; heavy lore payload tied to the Cinder's reveal. |

## Resource glossary

- **Salvage** — basic currency, earned everywhere. Early upgrades, repairs.
- **Source Points** — earned from expeditions and Rift dives. Module leveling, crew
  recruitment.
- **Alloy** — earned from combat wreck salvage. Module leveling specifically.
- **Origin Essence** — earned only from story missions and major boss fights. The only
  currency that raises a ship's Hull Class ceiling. Deliberately story-gated.
- **Faction Favor** (per faction) — earned by aligned missions and choices. Unlocks
  faction-exclusive modules, crew, and story branches.
- **Insight** — scarce, slow-drip resource powering the Cinder's Lock ability
  (module trait reroll/choice).

## Ship Hull Classes

Corvette-class (护卫舰) → Destroyer-class (驱逐舰) → Cruiser-class (巡洋舰) →
Battleship-class (战列舰) → Dreadnought-class (歼星舰) → Sovereign-class (主宰舰). Each
class jump requires both Origin Essence and a story-flagged refit event — see
`docs/systems-design.md` for slot/stat details and `docs/story/` for exactly which
chapter unlocks which class.

Ships themselves are drawn (like crew) and every drawn ship is a unique instance with
its own rolled Rarity and hidden Aptitude — see `docs/systems-design.md` for the full
model. Kade's starting ship, *Whisper*, is the one non-drawn exception: a Corvette-
class hull at Salvage rarity.
