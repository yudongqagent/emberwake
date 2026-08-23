# Act II — Court & Coast (The Ridges)

Galaxy opens to two regions at once, playable in either order: **Lionsheart Expanse**
and **Swanreach Combine**. Establishes the wider political landscape, deepens Trade,
and ends with first contact against the Chitin Swarm.

Systems used: Ferrous Gate, Ashenvale, the Hollow Fleet Yard (Lionsheart); Meridian
Exchange, Driftmarket (Swanreach).

**Novel grounding:** see `docs/story/research-notes-act2.md`. Best-sourced of the
acts researched this pass: a strong match for the recurring-antagonist-through-
proxies pattern (Ch.3), a partial match for an insectoid enemy race (Ch.6/7), and no
confirmed source for the Lionsheart/Swanreach culture clash or the shipyard raid
(Ch.1/2/4/5) — each annotated per chapter below.

---

## Chapter 1 — Open Lanes

**System:** Ferrous Gate (Lionsheart Expanse)

**Beats:**
- First galaxy-to-galaxy jump — a distinct, longer transition sequence marking this as
  a bigger step than an in-galaxy lane jump.
- Arrival at Ferrous Gate, a Lionsheart Concord border checkpoint. Culture clash:
  Lionsheart's honor-duel customs read as alien/suspicious of Kade's Principality
  credentials and, more pointedly, his uncanny luck (Yield/Scan results that look like
  cheating to an outsider).
- A checkpoint dispute escalates into a formal duel challenge from **Duelist Kaan
  Ferrous**, resolved as a scripted 1v1 ship duel (a stripped-down combat encounter,
  distinct presentation from a normal fight to sell the ritual framing). Winning
  earns his respect and he joins the crew; the duel cannot be lost permanently (a loss
  triggers a "yield the duel, win his respect anyway through conduct" fallback branch)
  so the recruit is guaranteed either way, but the flavor text differs.

**Characters:** Kade, Kaan Ferrous (recruited).

**Choices & Consequences:** Duel outcome affects flavor/relationship texture only.

**Systems/Unlocks:** Third named crew recruit, Lionsheart Expanse fully open.

**Novel grounding:** no confirmed source for a duel-culture faction. The only
duel-adjacent material anywhere in the novel is a single scene (ep. 32, 宴会上的挑战/
Challenge at the Banquet), not an ongoing culture. Kept as original invention.

---

## Chapter 2 — Trade Winds

**System:** Meridian Exchange (Swanreach Combine)

**Beats:**
- Detour to Swanreach space. Meridian Exchange is the trade capital — the Trade system
  deepens here: visible per-system commodity price swings, the idea of running goods
  between systems for profit introduced as a legitimate side activity, not just
  sell-your-salvage.
- Meet **Quartermaster Priya Osei**, a Combine logistics officer skeptical of anyone
  showing up with Bauhinia colors given the Principality's trade tariffs. Kade wins her
  over by fixing a supply shortfall (a short mining/delivery objective: mine a
  specific quantity of Alloy and deliver it to Driftmarket under time pressure).
  She joins the crew.

**Characters:** Kade, Priya Osei (recruited).

**Choices & Consequences:** None major.

**Systems/Unlocks:** Fourth named crew recruit, deepened Trade (price fluctuation,
delivery objectives), Swanreach Combine fully open.

**Novel grounding:** no confirmed source for an ongoing trade-culture faction. The
novel's only trade-caravan material is a one-off defeat (used for Act I's Ch.5) that
never recurs. Kept as original invention.

---

## Chapter 3 — Blood Debt

**System:** Ashenvale (Lionsheart Expanse)

**Beats:**
- Sir Arthur resurfaces, working Lionsheart court channels this time — feeding
  Ashenvale's council a version of events that paints Kade as a Bauhinia agent
  currying favor to extend Principality influence into the Expanse.
- Espionage-flavored chapter: Kade must gather evidence of Arthur's meddling (a light
  investigation loop — visit three POIs around Ashenvale, each a short dialogue/
  scan/eavesdrop beat) to clear his name with the council before a vote on Concord-
  Principality relations.
- **Choice point:** how to use the evidence once gathered — (a) present it to the
  council formally (protects Kade's standing cleanly, costs Arthur nothing beyond
  embarrassment), or (b) use it to quietly blackmail Arthur into backing off for a
  while (keeps him off-balance longer, but is exactly the kind of move that will let
  him call Kade a hypocrite later, in Act IV). Sets flag `blackmailedArthur: bool`.

**Characters:** Kade, Sir Arthur Arthaine (remote presence via council proxies), Kaan
Ferrous.

**Choices & Consequences:** Branch as above, referenced in Act IV Ch.3.

**Systems/Unlocks:** None mechanical.

**Novel grounding:** strong match — Baron Blackstone's antagonist pattern really does
work this way in the novel: the same antagonist family resurfaces through a
different named agent in each new territory (Blackstone's Tiger, ep. 80; Blackstone's
Fox, ep. 128), with an explicit "War of Revenge" beat (ep. 74) confirming it's
deliberate pursuit, not coincidence. Kade's new line naming this as a recognized
pattern is grounded in that; the formal-exposure/blackmail choice itself is original.

---

## Chapter 4 — The Hollow Fleet

**System:** the Hollow Fleet Yard (Lionsheart Expanse)

**Beats:**
- Intelligence (from Kaan's Concord contacts) locates a hidden Shark Reaver shipyard
  deep in contested Lionsheart territory — explains how the Reavers keep replacing
  losses.
- Large raid mission: infiltrate/assault the shipyard, multi-wave combat culminating
  in a boss fight against **Hawke**, Tiger Shark's other lieutenant, defending the
  yard.
- Victory cripples Reaver shipbuilding capacity for the rest of the campaign (referenced
  in later Reaver encounters as noticeably smaller/older ships) and yields significant
  Origin Essence and Alloy.

**Characters:** Kade, Kaan, Ratchet, Hawke (defeated).

**Choices & Consequences:** None major.

**Systems/Unlocks:** Meaningful Origin Essence toward a Battleship-class refit.

**Novel grounding:** no confirmed source for a hidden pirate shipyard raid. Pirates
recur throughout the novel as an enemy type (White Fang, Giant Lizard, Straw Hat
bands), and a Royal Shipyard exists (ep. 39) — but it's allied, not pirate, and never
raided. Kept as original invention.

---

## Chapter 5 — Ridge and Reach

**System:** Ashenvale / Meridian Exchange (both referenced)

**Beats:**
- Long-simmering Lionsheart–Swanreach trade tension (military honor-culture vs.
  transactional trade-culture, a real philosophical friction, not a contrivance) boils
  over into a border incident that could tip into open conflict between the two
  factions.
- **Major choice point:** Kade can (a) broker peace — a multi-step diplomacy sequence
  using accumulated Favor with both factions to get their representatives to the same
  table, rewarding balanced Favor investment, (b) quietly exploit the rift — feed both
  sides information that benefits Kade's own standing and Salvage/Source Point income
  from the resulting instability, gaining short-term resources but capping max Favor
  achievable with both factions afterward, or (c) back one faction decisively over the
  other, maximizing Favor with the chosen faction while effectively locking out top-
  tier Favor rewards from the other for the rest of the game.
- This is the single highest-impact choice in Act II: it determines which faction-
  specific crew/module rewards remain available later and colors which allies show up
  in the Act V endgame fleet-rally chapter.

**Characters:** Kade, Kaan, Priya, Lionsheart/Swanreach representatives.

**Choices & Consequences:** Three-way branch, sets `ridgeReachOutcome: peace |
exploited | lionsheartAligned | swanreachAligned`, read by Act V Ch.1.

**Systems/Unlocks:** None mechanical directly, but strongly shapes later Favor
economy.

**Novel grounding:** no confirmed source — this chapter's culture clash inherits the
same "not found" result as Ch.1/2. Kept as original invention.

---

## Chapter 6 — First Contact

**System:** the edge of Lionsheart Expanse, bordering the Fractured Veil

**Beats:**
- Lionsheart border patrols report unfamiliar bio-signatures. Investigating leads to
  the first encounter with **Chitin Swarm** scout ships — a distinct new combat
  doctrine (numbers, regen) shown for the first time at small scale.
- The Cinder reacts to Swarm biosignature data with more of the same unexplained
  recognition seen at Thornwake in Act I — another thread pulling toward its true
  nature, still not resolved.
- Ends on an ominous note: the scouts weren't raiding, they were mapping. Something is
  coming.

**Characters:** Kade, the Cinder, whichever crew are assigned.

**Choices & Consequences:** None major.

**Systems/Unlocks:** Chitin Swarm established as upcoming threat; Fractured Veil
becomes visible (not yet enterable) on the Galaxy view.

**Novel grounding:** partial match — a recurring insectoid enemy race is genuinely in
the novel (虫图腾/"Insect Totem," ep. 81, recurring at ep. 129-130), which is why the
scan result now flags a "totem" structure rather than generic biosignatures. What's
not sourced: the scouts-probing-before-a-full-incursion narrative shape, and framing
it as a coming war — original elaboration on a real recurring-enemy element.

---

## Chapter 7 — The Reach Opens (Act II finale)

**System:** Ferrous Gate / Meridian Exchange (joint operation, location depends on
`ridgeReachOutcome`)

**Beats:**
- A real Chitin Swarm incursion hits the border in force. Whether it's repelled by a
  unified Lionsheart-Swanreach fleet, a single-faction fleet, or largely by Kade's own
  crew depends on the Ch.5 outcome — the same beat, three different flavors of allied
  support in the battle.
- Large-scale defense battle, hardest fight of the act. Victory banks enough Origin
  Essence for a Battleship-class refit.
- Aftermath: with the Swarm confirmed as a real, organized threat and not a border
  incident, the Origin Rift technology needed to safely enter the Fractured Veil is
  authorized/acquired (framed differently depending on which faction ends up credited
  with the win).

**Characters:** Kade, full current crew roster, allied faction fleet (variable).

**Choices & Consequences:** Battle flavor varies by `ridgeReachOutcome`; no new branch
introduced here.

**Systems/Unlocks:** Battleship-class refit (10 slots), Fractured Veil galaxy unlocked
— **Act II complete.**

**Novel grounding:** same partial match as Ch.6 — the insect race is real, the
full-incursion-as-a-real-organized-threat framing here is original elaboration.
