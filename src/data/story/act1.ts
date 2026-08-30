import type { StoryScene } from "../types";

/** Bauhinia Reach — the home region (threat 1).
 *
 * Story rework (2026-08-29). Rewritten for the open world: chapter labels are
 * places rather than "Act I, Chapter 2", because a player may arrive here after
 * the Umbral Line and being told they're at the beginning would be false. No
 * scene opens with more than six lines, and none assumes the player has seen any
 * particular scene before it.
 *
 * Flag identifiers are deliberately unchanged — 41 of them are referenced by
 * galaxy POIs, crew unlocks and hull ascension gating, and they are never shown
 * to the player, so renaming them would strand progression for nothing.
 */
export const ACT1_SCENES: StoryScene[] = [
  {
    id: "coldWake",
    // The old opening ran 15 lines and ~1,600 characters before the player did
    // anything — the single biggest reason to quit in the first minute. Five
    // lines, ending on an instruction rather than exposition.
    chapter: "Amaranth Belt",
    chapterTitle: "Cold Wake",
    systemId: "amaranthBelt",
    requiredFlag: null,
    hiddenAfterFlag: "act1.coldWake.cleared",
    lines: [
      { speaker: "", text: "You die in twenty years. Hull breached, bridge dark, the flagship coming apart around you." },
      { speaker: "The Cinder", text: "That was the ending. I've put you back before it." },
      { speaker: "Kade Ren", text: "You've read twenty years I haven't lived yet. Start with what you want from me." },
      { speaker: "The Cinder", text: "Later. Right now you're aboard Whisper, she's a salvage-grade corvette, and she is the only thing standing between you and that ending happening again." },
      { speaker: "The Cinder", text: "So fly. There's wreckage in the belt ahead. Take what's in it." },
    ],
    onCompleteFlags: ["act1.coldWake.cleared"],
  },
  {
    id: "firstBlood",
    chapter: "Kestrel's Rest",
    chapterTitle: "First Blood",
    systemId: "kestrelsRest",
    requiredFlag: "act1.firstBlood.combatDone",
    hiddenAfterFlag: "act1.firstBlood.cleared",
    lines: [
      { speaker: "", text: "Two Reaver skiffs, cut open and cooling. Whisper's plating is scored down one flank." },
      { speaker: "Kade Ren", text: "She held." },
      { speaker: "The Cinder", text: "She held because you fought at the range her guns wanted. Do that every time and she'll keep holding." },
      { speaker: "The Cinder", text: "Now the useful part. Salvage the wrecks and I can fold what's in them back into her — plating, cabling, whatever the Reavers bolted on. She doesn't get replaced. She gets rebuilt." },
      { speaker: "Kade Ren", text: "How far does that go?" },
      { speaker: "The Cinder", text: "Further than anything in this belt has ever gone. Ask me again when she's outgrown her own class." },
    ],
    onCompleteFlags: ["act1.firstBlood.cleared"],
  },
  {
    id: "theLedger",
    chapter: "Bauhinia Prime",
    chapterTitle: "The Ledger",
    systemId: "bauhiniaPrime",
    requiredFlag: "act1.firstBlood.cleared",
    hiddenAfterFlag: "act1.ledger.cleared",
    lines: [
      { speaker: "", text: "Bauhinia Prime. A clerk of House Arthaine reads Whisper's registration and does not look up." },
      { speaker: "Arthaine Clerk", text: "Salvage-grade. Independent. You're carrying a weapons load two classes above your registration." },
      { speaker: "Kade Ren", text: "I'm carrying what was shooting at me last week." },
      { speaker: "Arthaine Clerk", text: "The House takes an interest in independents who grow quickly. Consider that a courtesy, captain. It won't be repeated." },
      { speaker: "The Cinder", text: "He filed a note before you finished speaking. They're watching what you do with her now." },
    ],
    onCompleteFlags: ["act1.ledger.cleared"],
  },
  {
    id: "staticAndSignal",
    chapter: "Thornwake",
    chapterTitle: "Static and Signal",
    systemId: "thornwake",
    requiredFlag: "act1.ledger.cleared",
    hiddenAfterFlag: "act1.static.cleared",
    lines: [
      { speaker: "", text: "Thornwake runs a defence grid nobody has switched off in forty years. It still answers hails. It still shoots." },
      { speaker: "The Cinder", text: "The grid isn't defending anything. Whoever set it has been dead for decades — it just never got the order to stop." },
      { speaker: "Kade Ren", text: "Then we give it one." },
      { speaker: "The Cinder", text: "It won't take the order from a corvette. Break it, and I'll take what's left of its targeting core." },
    ],
    onCompleteFlags: ["act1.static.cleared"],
    startEncounter: "thornwakeDefenseGrid",
  },
  {
    id: "tigersReach",
    chapter: "Coldreach Anchorage",
    chapterTitle: "Tiger's Reach",
    systemId: "coldreachAnchorage",
    requiredFlag: "act1.tigersReach.combatDone",
    hiddenAfterFlag: "act1.tigersReach.cleared",
    lines: [
      { speaker: "", text: "The Reaver lieutenant's cutter drifts, engines dead, her hull still intact enough to board." },
      { speaker: "Reaver Lieutenant", text: "Tiger Shark will burn this anchorage for what you just did." },
      { speaker: "Kade Ren", text: "Then he can come and do it himself." },
      { speaker: "The Cinder", text: "She's not wrong. You've stopped being a nuisance and started being a name. That has a cost — and it has a use." },
      { speaker: "The Cinder", text: "Whisper can carry more than she was built to now. Take her up a class. Let them see what's coming." },
    ],
    onCompleteFlags: ["act1.tigersReach.cleared"],
    unlockHullClass: "destroyer",
  },
  {
    id: "houseRules",
    chapter: "Bauhinia Prime",
    chapterTitle: "House Rules",
    systemId: "bauhiniaPrime",
    requiredFlag: "act1.tigersReach.cleared",
    hiddenAfterFlag: "act1.houseRules.cleared",
    lines: [
      { speaker: "", text: "Not a clerk this time. House Arthaine sends someone who owns things." },
      { speaker: "Sir Arthaine", text: "You've made the Reavers someone else's problem, which makes you useful. Useful independents get a contract. Contracted independents get a registration that isn't a joke." },
      { speaker: "Kade Ren", text: "You didn't fly out here to hand me paperwork." },
      { speaker: "Sir Arthaine", text: "First refusal. On the ship, and on whatever is making her grow like that." },
      { speaker: "Sir Arthaine", text: "I won't ask what it is. At my age one knows what to ask about and what to simply buy." },
      { speaker: "The Cinder", text: "He doesn't know what I am. He knows there's something. Choose carefully — this is the answer he'll remember you by." },
    ],
    // Labels rewritten; setFlags deliberately untouched. They have no gameplay
    // consumer today, but the rework's rule is that flag ids stay stable — a
    // later feature keying off arthaineConflictStyle would otherwise break for
    // no player-visible gain.
    choices: [
      { label: "Take the contract. A registration that isn't a joke is worth a leash.", setFlags: ["arthaineConflictStyle.political"] },
      { label: "Say nothing and let him assume. Buy time.", setFlags: ["arthaineConflictStyle.bribed"] },
      { label: "Refuse outright. Whisper isn't collateral.", setFlags: ["arthaineConflictStyle.public"] },
    ],
    onCompleteFlags: ["act1.houseRules.cleared"],
  },
  {
    id: "emberRising",
    chapter: "Kestrel's Rest",
    chapterTitle: "Ember Rising",
    systemId: "kestrelsRest",
    requiredFlag: "act1.emberRising.combatDone",
    hiddenAfterFlag: "act1.emberRising.cleared",
    lines: [
      { speaker: "", text: "Tiger Shark came for the anchorage after all. What's left of his assault is scattered across the approach." },
      { speaker: "Kade Ren", text: "That's the whole raiding party." },
      { speaker: "The Cinder", text: "That was the whole raiding party. Now it's material." },
      { speaker: "The Cinder", text: "Kade — this is what I brought you back for. Not the fight. The fact that she can eat a fleet and come out heavier than she went in." },
      { speaker: "Kade Ren", text: "Twenty years of that." },
      { speaker: "The Cinder", text: "Twenty years of that. Take her up again. The Reach is small, and you're going to outgrow it." },
    ],
    onCompleteFlags: ["act1.emberRising.cleared", "campaign.act1.complete"],
    unlockHullClass: "cruiser",
    grantRarityUpgrade: "prototype",
  },
];
