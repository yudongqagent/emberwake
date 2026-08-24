# Research Notes — Shipyards, Capture, Resources, Bridge Command

Research pass for the player-feedback brief covering ship acquisition (narrative-
gated, single-ship bond), module economy, resource naming, ship capture, crew
stationing, and a bridge-command combat model. Same sourcing discipline as the other
`research-notes-*.md` files: web search of chapter-title indexes and synopses only
(raw chapter text was not fetchable this pass either, same limitation noted in
`research-notes-ship-ascension.md`) — confirmed vs. not-confirmed is called out
explicitly below, and the gaps are filled with original design, not invented sourcing.

## Confirmed

- **源点 (Source Points / Origin Points)** is a real, load-bearing in-novel resource
  term — appears across every synopsis of the system's core loop ("源点获取翻倍" /
  "harvest source points"). Already matches Emberwake's existing `sourcePoints`
  resource directly; no rename needed.
- **A shipyard visit is a real story beat, not a menu.** Per
  `research-notes-ship-ascension.md`'s comic-index findings: ep.37 "曙光号，沉没"
  (a ship lost in battle) → ep.39 "皇家造船厂" (Royal Shipyard) → ep.40 "幽鹏号" (a
  new/upgraded hull). Ship changes are narrated events tied to a physical shipyard
  location and a preceding combat consequence, not a standalone acquisition screen.
- **The protagonist's system lets him choose, where others must gamble.** Multiple
  synopses explicitly contrast Wang Dong ("战舰、模块可以自选" — ships and modules
  can be freely selected) against other characters, who draw a lottery (抽奖) for
  theirs. This directly supports section A's "guaranteed, not RNG" framing for the
  player's own ship-related story rewards.

## Not confirmed — flagged honestly

- **接舷战 (boarding combat) / ship capture / surrender mechanics**: no source
  material found confirming the novel has a boarding-and-capture system for enemy
  Ember Warships. 接舷战 is a common, generic Chinese term for "boarding action" in
  military/sci-fi fiction generally (used elsewhere in Emberwake's own existing
  faction flavor text), not something I can attribute to this specific novel from
  what I could access.
- **钛晶 (Titanium Crystal)** as a resource name: not found in any source I could
  reach. Treating this as unconfirmed — possibly present in later chapters (2756+
  exist; search tools surface only titles/synopses, not body text) or a
  misremembering. Not adding it as a "sourced" resource; if the player has a
  specific chapter reference for it, I'll fold it in properly, cited.
- **Bridge-command combat feel**: no source material found describing HOW combat is
  actually staged prose-wise (bridge dialogue, order-giving, crew stations). The
  premise (a *fleet commander* whose warship strength determines political/military
  standing) is consistent with a bridge-command framing in the genre sense, but I
  can't cite a specific scene establishing it. Section G's actual interaction design
  is therefore original design responding to the player's own direction (FTL /
  Star Trek Bridge Crew-style tactical command), not novel-sourced.
- **Crew stationing by role** (section E): plausible for the genre and consistent
  with Emberwake's existing crew-role system (helm/gunner/engineer/tactician), but
  not independently sourced from the novel this pass.

## What this means for implementation

Section A (ship acquisition narrative) has real sourcing to build on: the shipyard-
visit structure and the "system lets you choose, others gamble" contrast are both
confirmed and directly support the player's brief. Sections D (capture), G (bridge
command), and the specific resource list beyond Source Points are original design —
built to serve the requested player experience, not claimed as sourced. This matches
the same honesty standard already used for the Rift Echoes and Choir content.
