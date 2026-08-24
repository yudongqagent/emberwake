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
| **Chorus Deep** | A fully intact Dyson-sphere-scale megastructure, the Choir's last works. | Act VI |

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
- **Chorus Deep**: Choir's Threshold (sentinel line, entry point), the Dyson Choir
  (the megastructure's interior — the Conductor's seat).

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
- **The Choir** — an extinct civilization that built Chorus Deep's Dyson sphere to be
  heard and judged worthy by something. Failed that judgment; its last intelligence
  (**the Conductor**) still runs the failed verdict on a loop. The Hollow's victim,
  not its cousin — the Cinder's working theory (Act VI) is that the Hollow began as a
  standard the Choir was measured against, not a weapon. Per
  `docs/story/research-notes-act6.md`, the ch.380-382 title sequence ("Dyson Sphere
  System!" / "Gospel Civilization!" / "Civilization Disqualified!") is confirmed; the
  Choir itself, the Conductor, and the causal link to the Hollow are original
  invention layered on that confirmed sequence, not sourced.

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
| **Vela, Last Cantor of the Choir** | Tactician/Unique | Act VI, Ch.5 (recruitable) | Choir survivor/defector. Legend-tier; her active is the only ability in the game that reaches into another faction's own mechanic (Choral Resonance) directly. |

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

## Ship Hull Classes — Ascension, not Acquisition

Per `docs/story/research-notes-ship-ascension.md`: *Whisper* is not one ship among
many the player collects — she is the only ship there is, and she grows by
**ascending** into a new hull class in place, the same way the source novel's
protagonist keeps flying the same 火种战舰 (Fire Seed Warship) through several
evolution events rather than trading up to a new hull each time. Kade commits to
Whisper at the very start (Corvette-class, Salvage rarity — her rarity never
changes again) and every further power jump is an ascension, not a purchase.

Corvette-class (护卫舰) → {Destroyer-class (驱逐舰) or Interceptor-class (拦截舰)}
→ {Cruiser-class (巡洋舰) or Vanguard-class (先锋舰)} → {Battleship-class (战列舰)
or Bulwark-class (壁垒舰)} → {Dreadnought-class (歼星舰) or Corsair-class (掠夺舰)}
→ {Sovereign-class (主宰舰) or Aegis-class (神盾舰)} → {Anthem-class (颂歌舰) or
Sanctum-class (圣所舰)}. At each tier the player freely picks one of the two lateral
options — a real strategic choice, not a locked branch — and ascending requires
level, Origin Essence, and a story flag all at once (see `docs/systems-design.md`
for the exact gates and `docs/story/` for which chapter unlocks which tier). Every
hull class past the starting Corvette grants Whisper a distinct combat ability the
instant she ascends into it (see `data/namedShips.ts`'s `HULL_CLASS_ABILITIES`) —
not just bigger numbers. Anthem-class and Sanctum-class (order 6, Act VI) are
reverse-engineered Choir hull tech, not a Mayeth/Principality design — see
`docs/story/act-6-chorus-deep.md`.
