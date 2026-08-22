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
