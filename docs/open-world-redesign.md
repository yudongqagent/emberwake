# Open World + Story Rework — 2026-08-29

Requested: "rework the full story and it should be an open world game."

## What has to change, and why they're one job

The story and the world structure are the same problem. Today:

- **6 of 7 regions are locked** behind story flags (`unlockFlag: "campaign.act1.complete"` and so on).
- **The story is a strict chain.** 40 scenes, each gated on the previous one's
  flag. There is exactly one legal order.

You cannot make the world open while the story is a chain, because the chain is
what closes it. So this is one change, not two.

## The open-world contract

The standard the genre actually uses (Elden Ring, Breath of the Wild, and in this
game's own smaller way, the rift): **you may go anywhere immediately; danger is
the gate, not permission.**

Concretely:

1. **Every region is reachable from the first minute.** All `unlockFlag`s become
   null.
2. **Each region carries a threat rating (1–7)** instead. Threat feeds the Ember
   Load system that already exists, so a high-threat region genuinely fields
   tougher formations with more roles — no new combat code.
3. **Threat is stated plainly on the map**, with a clear warning when you're
   travelling somewhere far above your ship. Being killed by a region you were
   warned about is a fair loss; being killed by one you weren't is a bug.
4. **Reward scales with threat.** Diving into Chorus Deep at level 8 should be a
   real, tempting, probably fatal option. That temptation is the whole point of
   an open world; without it, "you may go anywhere" just means "the map is
   bigger".

## The story rework

Restructured from one 40-scene chain into a **spine plus region arcs**:

**The spine (~8 scenes).** The through-line: the captain's death, the ship that
rebuilds itself, what the Ember actually is, and the ending. These gate on
*progress* — ascension tier and total regions touched — never on which region you
happened to visit. Wherever you are when you qualify, the next spine beat finds
you.

**Region arcs (~4 each).** Each region gets a self-contained story that stands
alone: a place, a faction, a person, and a consequence. Playable in any order,
in any combination, and the game still reads correctly if you skip one entirely.

This is the structure that makes an open world narratively coherent: the spine
guarantees a story, the arcs guarantee the world isn't set dressing, and neither
depends on the player's route.

### What is kept

- **One ship that ascends.** Novel-grounded and the strongest identity here.
- **The Ember / 火种 premise and 源点 harvesting**, which are sourced.
- The existing cast where they still earn their place.

### What changes

- The act structure goes. "Act III" means nothing to a player who reached the
  Fractured Veil first.
- Scenes stop assuming what the player has already seen. Any scene may be
  someone's fourth or their thirtieth.
- Dialogue gets shorter. The opening was 15 lines before the first verb; no scene
  in the rework opens with more than 6.

## Sequencing

1. **Structure first** — ungate the regions, add threat, wire it to Ember Load,
   surface the danger, scale rewards. Mechanical and verifiable.
2. **Then content** — the spine and the arcs.

Doing it in that order means the world is explorable and correct before a single
line is rewritten, and the writing can be checked in place.
