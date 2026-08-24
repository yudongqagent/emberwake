# Emberwake — Design Principles

These are the tenets that should settle any ambiguous design or implementation
decision. When two things are in tension, higher items on this list win.

1. **Story is load-bearing, not garnish.** Every meaningful power increase (a new Ship
   Hull Class, a new galaxy, a top-tier crew slot) is gated by story progress, not just
   grinding. If a system lets a player bypass the story entirely, it's designed wrong.
   See the pacing model in `docs/systems-design.md`.

2. **The galaxy is a place, not a menu.** No mission-select list as the primary
   interface. The player flies through continuous space, sees points of interest
   before interacting with them, and chooses to engage — battle, mine, trade, dock,
   investigate — because they flew up to something, not because they picked an item
   from a screen. Menus exist for management (fleet, crew, modules), not for "what do
   I do next."

3. **Power fantasy with texture.** Kade's advantage over everyone else (Scan/Yield/
   Lock) is asymmetric and strong by design — that's the genre's appeal — but it's
   narratively justified (alien tech, not a game-y freebie) and mechanically bounded
   (Lock costs a scarce resource; Yield doesn't remove the need to go find things worth
   yielding from). Numbers going up should always trace back to a reason a player can
   name.

4. **Legible sci-fi, not just decorative sci-fi.** The holographic/neon panel language
   has to remain readable at a glance — rarity, resource type, and threat level should
   be identifiable by shape/color coding alone, not just by reading text. Style serves
   clarity; it never replaces it.

5. **No monetization patterns, even though the shape rhymes with gacha.** The rarity
   ladders on crew, ships, and modules exist for progression pacing and collection
   satisfaction, not to simulate a paid gacha loop. Every acquisition — including ship
   Draws at the Shipwright's Dock — is earned through play (Source Points, Faction
   Favor, story unlocks), never real currency. Never design a mechanic that would only
   make sense if real money were involved.

6. **Dependency-light and statically deployable.** The whole game must build to static
   files and run with zero backend. Reach for a dependency only when hand-rolling it
   would meaningfully hurt velocity (see `docs/architecture.md` for the actual list —
   it's short on purpose).

7. **Juice is part of the design, not a polish pass tacked on at the end.** Combat
   impacts, mining ticks, jump transitions, and UI state changes should have
   proportionate audio (WebAudio-synthesized) and visual feedback from the first
   playable version of each system, even if it's rough — juice is much easier to tune
   than to retrofit.

8. **Touch and mouse are first-class equally.** Every interaction — flying the ship,
   managing loadouts, dialogue choices — needs a touch-equivalent from the start. Don't
   design a desktop-only interaction and adapt it later.

9. **Write the vertical slice, not the shallow horizontal.** When scope is tight,
   prefer fewer chapters/systems working completely over more chapters/systems working
   partially. A player should never hit a wall where a system is visibly half-built.

10. **The antagonist's logic must survive contact with the player.** Sir Arthur, the
    Shark Reavers, even the Swarm should each have a self-consistent reason for what
    they do that isn't "because villain." If a plot beat only works because a
    character acts stupidly, rewrite the beat.

## Player-Tested Anti-Patterns (self-audit before shipping a progression or combat system)

**Origin:** a real player playtest (2026-08-23) found working code that still wasn't
fun — ships with different numbers that didn't *read* as different, rewards so
predictable they felt flat, and a combat loop with no real decision space. Every one
of the nine issues that playtest surfaced was the same root failure showing up in a
different system: something that *looks* complete — numbers exist, tiers exist, code
compiles, tests pass — but has no actual experiential payoff. This is the same class
of problem `content-depth-standards.md` was written for (that doc's own origin story
is "8 module archetypes that were reskins wearing different names"); this section is
the combat/progression-side counterpart. Run it before calling any such system "done,"
the same way that doc's §4 requires an actual audit before claiming a content floor.

1. **Differentiation must be qualitative, not just numeric.** Any two entities in the
   same category — ships, enemies, crew, modules — especially across a rarity or tier
   boundary, need a distinguishing mechanical hook (a named skill, a unique behavior,
   a trait nothing else has), not just a bigger stat block. A rare ship that's a
   common ship with higher numbers has failed this check even if the numbers are
   correct. *How to check:* for any two tiers/rarities in the same category, can you
   name the mechanical hook (not the number) that makes the higher one feel different
   to play? If the answer is "it hits harder," it fails.

2. **Reward schedules need variable/surprise elements layered on deterministic
   rewards.** A fully predictable reward (fixed mission payout, guaranteed drop) is
   necessary for pacing but never sufficient for excitement — the "did I get a good
   one" feeling that makes progression addictive in good games comes from a random
   layer on top, not from the guaranteed floor. *How to check:* after a rewarding
   moment (combat victory, milestone), is there anything the player couldn't have
   predicted the exact contents of in advance?

3. **Rarity/tier must be visually unmistakable everywhere the item appears** — color,
   icon, and label together, not implied by a number the player has to interpret.
   This is tenet 4 (legible sci-fi) applied specifically to rarity: if a player has to
   read a stat and do mental math to figure out if something's rare, the UI failed,
   not the player. *How to check:* screenshot any screen that lists a ship or module
   and confirm rarity is identifiable in under a second, without reading a stat.

4. **Randomized acquisition should preserve player agency where possible.** A curated
   random showcase the player chooses from (see several specific candidates, pick the
   one you want) beats a fully blind pull every time — it keeps the "random reward"
   feeling without removing the choice that makes spending a resource feel earned
   rather than gambled. If a blind pull is kept anywhere, it needs to be a deliberate,
   well-telegraphed exception with a specific reason, not the default acquisition
   shape. This isn't in tension with tenet 5 (no monetization patterns) — it's the
   same tenet applied one layer deeper: a blind pull is the part of gacha design that
   feels bad without a payment prompt attached to make it feel urgent instead.

5. **Quality-of-life tooling must scale with content volume.** Every time a system
   grows — more rarities, more items, more crew — it needs matching QoL (auto-sell,
   filters, sort, bulk actions) shipped in the *same* pass, or the richness the system
   just gained becomes friction instead of depth. A content system and its QoL are one
   deliverable, not two, the same way tenet 9 treats a vertical slice as one unit.

6. **Tier gaps must be verified, not assumed.** Don't trust that "bigger rarity
   number = better" was implemented correctly — actually compute it. Specifically:
   with per-instance stat variance (quality rolls) in play, check whether a
   *worst-roll* instance of tier N+1 still beats a *best-roll* instance of tier N. If
   it doesn't, the tiers overlap in practice regardless of what the base multiplier
   table implies, and a player will eventually notice their "rare" drop is worse than
   someone's "common" one.

7. **The core combat resolution mechanic needs real decision space.** Positioning,
   targeting choice, ability timing, movement — an auto-resolving "stand and shoot"
   loop reads as unfinished no matter how well-tuned the numbers underneath are.
   Balance work has to be paired with interaction depth; it can't substitute for it.
   *How to check:* self-playtest a fight and ask honestly whether skipping every
   optional input (never repositioning, never choosing a target, just mashing the
   first available action) would have gone meaningfully worse. If not, the depth
   isn't real yet, just available.

## Premium Gacha-RPG Grounding (UI/UX and core-loop design)

**Origin:** player feedback (2026-08-23) that the interface and gameplay still read
as rough, backed by targeted research into what makes premium gacha-RPGs (Genshin
Impact, Honkai: Star Rail, Arknights, Knights Chronicle) feel considered rather than
assembled. This section is additional grounding for the same standing work — the
Player-Tested Anti-Patterns above stay in force; these are new, checkable additions
alongside them, not a replacement.

### UI/UX

1. **Icon-heavy, not text-heavy.** Every resource, rarity, stat, and status should
   have a distinct icon a player learns to recognize at a glance, with text as
   backup, not the primary channel — fast recognition beats reading. *How to check:*
   for any given resource/rarity/stat/status shown in the UI, is it communicated by a
   text label alone anywhere it could instead be (or be paired with) an icon?

2. **Progressive disclosure.** New systems (crew recruitment, modules, ship
   upgrades, rift diving, etc.) should reveal themselves one at a time as the player
   actually reaches them, not all appear on a brand-new save's first screen. This
   matters for new-player retention and for the interface reading as considered
   rather than cluttered. *How to check:* on a fresh save with no story flags set,
   does every system's UI/nav entry show immediately, or only the ones the player has
   actually unlocked?

3. **Visual polish must never cost usability.** Striking sci-fi visuals matter, but
   navigation, hit targets, and information hierarchy win every time they conflict
   with a visual flourish. *How to check:* for any new visual treatment, would a
   player still find the interactive element and understand its state (enabled,
   disabled, selected) with the animation/glow/scanline effect turned off?

### Gameplay loop

4. **Core loop and meta loop are separate design problems, and both need dedicated
   attention.** Core loop = what's fun in the next 5 minutes (combat, moment-to-
   moment play). Meta loop = what brings the player back in 5 months (progression,
   resource management, collection). A strong meta loop cannot compensate for a weak
   core loop, or vice versa — don't let effort on one substitute for the other.
   *How to check:* name the specific thing making combat itself fun right now,
   independent of any reward it grants. If the honest answer is "the rewards
   afterward," the core loop needs its own work, not more meta-progression on top.

5. **Reward cadence: something every 30-90 seconds of active play, a bigger milestone
   every 10-15 minutes.** This is measurable, not a vibe. *How to check:* self-
   playtest a real combat session and log the wall-clock gap between feedback/reward
   events (a hit landing, a status proc, a resource tick, a level-up). Any gap over
   90 seconds with zero meaningful event is a concrete pacing gap to close.

6. **Progression needs both vertical and horizontal growth.** Vertical = bigger
   numbers (more damage, more hull). Horizontal = new things to actually do
   differently (a new ability, a new tactical option, a new mode) — AoE skills, a
   signature ultimate, and real-time positioning are horizontal progression, and they
   matter as much as raw stat growth. *How to check:* across a full act of play, list
   what got numerically bigger vs. what became a genuinely new option the player
   didn't have before. If the list is vertical-only, horizontal growth is missing.
