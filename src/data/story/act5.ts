import type { StoryScene } from "../types";

/** The Umbral Line (threat 6) — the thing the First Fleet failed to close, and
 * the choice about what Kade becomes afterward.
 *
 * Story rework (2026-08-29).
 */
export const ACT5_SCENES: StoryScene[] = [
  {
    id: "callingTheReach",
    chapter: "Bauhinia Prime",
    chapterTitle: "Calling the Reach",
    systemId: "bauhiniaPrime",
    requiredFlag: null,
    // Open-world redesign: was gated on finishing the previous region. Now gates
    // on how far Whisper has been rebuilt.
    requiresAscensions: 3,
    hiddenAfterFlag: "act5.callingTheReach.cleared",
    lines: [
      { speaker: "", text: "You call every faction that owes you anything. Most of them come, which surprises everyone including you." },
      { speaker: "Kaan Ferrous", text: "The Concord will hold a lane. One lane. Don't ask for two." },
      { speaker: "Ori Vashti", text: "The Combine will underwrite the losses. That is not generosity, it is arithmetic — if the Line opens, there is no market left to trade in." },
      { speaker: "Kade Ren", text: "That's more than I expected." },
      { speaker: "The Cinder", text: "It's a fraction of what the First Fleet had. Remember how that went." },
    ],
    onCompleteFlags: ["act5.callingTheReach.cleared"],
  },
  {
    id: "umbralLineApproach",
    chapter: "The Umbral Line",
    chapterTitle: "The Umbral Line",
    systemId: "umbralLine",
    requiredFlag: "act5.callingTheReach.cleared",
    hiddenAfterFlag: "act5.umbralLineApproach.cleared",
    lines: [
      { speaker: "", text: "The Line isn't a border. It's a seam, and light behaves badly near it." },
      { speaker: "Kade Ren", text: "The instruments disagree with each other." },
      { speaker: "The Cinder", text: "They're not wrong. Both readings are true this close in. That's what the seam does." },
      { speaker: "The Cinder", text: "Fly it the way you fly everything. Pick a range, hold it, and don't believe anything that tells you it's safe." },
    ],
    onCompleteFlags: ["act5.umbralLineApproach.cleared"],
    startEncounter: "umbralLineFirstContact",
  },
  {
    id: "echoesOfTheLosingBattle",
    chapter: "The Umbral Line",
    chapterTitle: "Echoes of the Losing Battle",
    systemId: "umbralLine",
    requiredFlag: "act5.umbralLineApproach.cleared",
    hiddenAfterFlag: "act5.echoes.cleared",
    lines: [
      { speaker: "", text: "The Line replays it. The First Fleet, dying, over and over, in whatever order it feels like." },
      { speaker: "Kade Ren", text: "Those are real transmissions." },
      { speaker: "The Cinder", text: "They're real. Twenty thousand people, still arriving, because nothing here has agreed on when it happened." },
      { speaker: "Kade Ren", text: "One of those voices is yours. I'm not going to ask which." },
      { speaker: "The Cinder", text: "Several. Don't go looking. That's how the Line takes people." },
    ],
    onCompleteFlags: ["act5.echoes.cleared"],
    startEncounter: "echoesLosingBattle",
  },
  {
    id: "whatKadeKnows",
    chapter: "Bauhinia Prime",
    chapterTitle: "What Kade Knows",
    systemId: "bauhiniaPrime",
    requiredFlag: "act5.echoes.cleared",
    hiddenAfterFlag: "act5.whatKadeKnows.cleared",
    lines: [
      { speaker: "", text: "One night at Bauhinia Prime before the last run. People keep coming to the berth to ask what happens afterward." },
      { speaker: "Kade Ren", text: "They're planning around me." },
      { speaker: "The Cinder", text: "They're planning around the only captain who's flown the Line and come back. That's a position, whether you want it or not." },
      { speaker: "The Cinder", text: "Decide now, while it's still yours to decide. Afterward everyone will decide it for you." },
    ],
    choices: [
      { label: "Take the seat. Reform the Principality from inside it.", setFlags: ["secondIgnitionEnding.institutional"] },
      { label: "Refuse the seat. Build something outside the old order.", setFlags: ["secondIgnitionEnding.coalition"] },
      { label: "Walk away when it's done. The crew, the ship, nothing else.", setFlags: ["secondIgnitionEnding.personal"] },
    ],
    onCompleteFlags: ["act5.whatKadeKnows.cleared"],
  },
  {
    id: "secondIgnition",
    chapter: "The Umbral Line",
    chapterTitle: "Second Ignition",
    systemId: "umbralLine",
    requiredFlag: "act5.whatKadeKnows.cleared",
    hiddenAfterFlag: "act5.secondIgnition.cleared",
    lines: [
      { speaker: "", text: "The seam is open wider than the First Fleet ever saw it. Whisper goes in first, because she is the only thing that can." },
      { speaker: "The Cinder", text: "This is the part I couldn't do last time. I had a fleet and no ship that could hold what closing it costs." },
      { speaker: "Kade Ren", text: "Then she finishes it herself. She's done everything else that way." },
      { speaker: "The Cinder", text: "Everything she has. And she was rebuilt eleven times by a man who wasn't supposed to live this long. Burn it all, Kade." },
    ],
    onCompleteFlags: ["act5.secondIgnition.cleared"],
  },
  {
    id: "secondIgnitionEpilogue",
    chapter: "The Umbral Line",
    chapterTitle: "What the Reach Remembers",
    systemId: "umbralLine",
    requiredFlag: "act5.secondIgnitionEpilogue.combatDone",
    hiddenAfterFlag: "act5.secondIgnitionEpilogue.cleared",
    lines: [
      { speaker: "", text: "The seam closes. It takes eleven hours and most of Whisper's plating, and then the instruments agree with each other again." },
      { speaker: "Kade Ren", text: "It's quiet." },
      { speaker: "The Cinder", text: "It's the first time it's been quiet here in four hundred years." },
      { speaker: "Kade Ren", text: "You said I die in twenty years." },
      { speaker: "The Cinder", text: "You did. In the version where nobody closed it. I don't know what happens now — and Kade, that's the best news I've ever given you." },
    ],
    onCompleteFlags: ["act5.secondIgnitionEpilogue.cleared", "campaign.act5.complete"],
  },
];
