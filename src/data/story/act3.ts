import type { StoryScene } from "../types";

/** The Fractured Veil (threat 4) — the Swarm, and the first hint of what's
 * behind them.
 *
 * Story rework (2026-08-29). Opens on progress rather than on finishing another
 * region, so a player who wanders here early starts the arc on arrival.
 */
export const ACT3_SCENES: StoryScene[] = [
  {
    id: "intoTheVeil",
    chapter: "Veil's Edge",
    chapterTitle: "Into the Veil",
    systemId: "veilsEdge",
    requiredFlag: null,
    // Open-world redesign: was gated on finishing the previous region. Now gates
    // on how far Whisper has been rebuilt, so this arc opens wherever the player
    // is when they qualify.
    requiresAscensions: 1,
    hiddenAfterFlag: "act3.intoTheVeil.cleared",
    lines: [
      { speaker: "", text: "The Veil isn't a nebula. It's what's left of something that used to hold together." },
      { speaker: "Kade Ren", text: "The charts stop at the edge." },
      { speaker: "The Cinder", text: "The charts stop because the surveyors did. Everything past here is Swarm, and the Swarm doesn't leave charts." },
      { speaker: "The Cinder", text: "Whisper can take it. That's not confidence — it's the first time I've said that and meant it." },
    ],
    onCompleteFlags: ["act3.intoTheVeil.cleared"],
    startEncounter: "veilsEdgeSwarmIncursion",
  },
  {
    id: "hiveSignal",
    chapter: "Chrysalis Expanse",
    chapterTitle: "Hive Signal",
    systemId: "chrysalisExpanse",
    requiredFlag: "act3.intoTheVeil.cleared",
    hiddenAfterFlag: "act3.hiveSignal.cleared",
    lines: [
      { speaker: "", text: "A signal runs under everything here — too regular to be noise, too slow to be speech." },
      { speaker: "The Cinder", text: "That's not the Swarm talking to itself. That's the Swarm being told." },
      { speaker: "Kade Ren", text: "Then I want to meet whatever is doing the telling." },
      { speaker: "The Cinder", text: "Something with the patience to spend a species. Follow the signal inward and you'll meet whatever is holding the other end of it." },
    ],
    onCompleteFlags: ["act3.hiveSignal.cleared"],
  },
  {
    id: "tigerSharkGambit",
    chapter: "Veil's Edge",
    chapterTitle: "Tiger Shark's Gambit",
    systemId: "veilsEdge",
    requiredFlag: "act3.hiveSignal.cleared",
    hiddenAfterFlag: "act3.tigerSharkGambit.cleared",
    lines: [
      { speaker: "", text: "Tiger Shark's brood is out here too, and losing. She hails you on an open channel, which costs her more than the fight did." },
      { speaker: "Tiger Shark", text: "I burned your anchorage. You broke my fleet. Neither of us matters to what's coming out of that Veil." },
      { speaker: "Kade Ren", text: "You want an alliance." },
      { speaker: "Tiger Shark", text: "I want to still be alive in a year. Same thing, this week." },
      { speaker: "The Cinder", text: "She's telling the truth, which is the part you should find alarming." },
    ],
    choices: [
      { label: "Take the alliance. Whatever she is, she's pointed the same way.", setFlags: ["tigerSharkAlliance"] },
      { label: "Refuse. She burned an anchorage full of people who couldn't fight back.", setFlags: ["act3.tigerSharkGambit.refused"] },
    ],
    onCompleteFlags: ["act3.tigerSharkGambit.cleared"],
    startEncounter: "tigerSharkBroodSkirmish",
  },
  {
    id: "arthaineContract",
    chapter: "Chrysalis Expanse",
    chapterTitle: "The Arthaine Contract",
    systemId: "chrysalisExpanse",
    requiredFlag: "act3.tigerSharkGambit.cleared",
    hiddenAfterFlag: "act3.arthaineContract.cleared",
    lines: [
      { speaker: "", text: "An Arthaine courier finds you inside the Veil. That took effort, and money, and someone who knew where to look." },
      { speaker: "Arthaine Courier", text: "Sir Arthur offers a salvage concession. The entire Veil, exclusive, in perpetuity." },
      { speaker: "Kade Ren", text: "He's offering me a warzone nobody else can reach." },
      { speaker: "The Cinder", text: "He's offering you a paper trail that puts his name on whatever you pull out of it. Take nothing from him you'd mind him owning." },
    ],
    onCompleteFlags: ["act3.arthaineContract.cleared"],
  },
  {
    id: "queenspire",
    chapter: "Queenspire",
    chapterTitle: "Queenspire",
    systemId: "queenspire",
    requiredFlag: "act3.arthaineContract.cleared",
    hiddenAfterFlag: "act3.queenspire.cleared",
    lines: [
      { speaker: "", text: "The broodmother is the size of a station and she has been dying for a long time." },
      { speaker: "Kade Ren", text: "She's not defending the spire. She's holding it up." },
      { speaker: "The Cinder", text: "She's the last thing keeping the brood pointed away from the Reach. When she goes, they scatter coreward." },
      { speaker: "Kade Ren", text: "Then we don't kill her." },
      { speaker: "The Cinder", text: "We do. Because whatever is on the far end of that signal is already inside her, and it's using her to aim." },
    ],
    onCompleteFlags: ["act3.queenspire.cleared"],
    startEncounter: "queenspireBroodmother",
  },
  {
    id: "originTide",
    chapter: "Origin Tide Rift",
    chapterTitle: "Origin Tide",
    systemId: "originTideRift",
    requiredFlag: "act3.queenspire.cleared",
    hiddenAfterFlag: "act3.originTide.cleared",
    lines: [
      { speaker: "", text: "The rift the broodmother was aimed at is open, and something is coming through it the wrong way." },
      { speaker: "Kade Ren", text: "That's Source. Raw, not refined." },
      { speaker: "The Cinder", text: "That's what I'm made of. And it is bleeding out of a hole that somebody cut." },
      { speaker: "Kade Ren", text: "Somebody like you." },
      { speaker: "The Cinder", text: "...Take her up a class first. Then ask me again, and I'll answer properly." },
    ],
    onCompleteFlags: ["act3.originTide.cleared"],
    startEncounter: "originTideRiftStorm",
    unlockHullClass: "dreadnought",
  },
];
