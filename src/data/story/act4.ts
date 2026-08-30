import type { StoryScene } from "../types";

/** Deep Origin (threat 5) — where the Cinder stops deflecting.
 *
 * Story rework (2026-08-29). This region carries the reveal, so it is the one
 * arc whose internal order still matters; the entry gates on ascensions rather
 * than on another region being finished.
 */
export const ACT4_SCENES: StoryScene[] = [
  {
    id: "firstFleetRuins",
    chapter: "First Fleet Graveyard",
    chapterTitle: "Ruins of the First Fleet",
    systemId: "firstFleetGraveyard",
    requiredFlag: null,
    // Open-world redesign: was gated on finishing the previous region. Now gates
    // on how far Whisper has been rebuilt.
    requiresAscensions: 2,
    hiddenAfterFlag: "act4.firstFleetRuins.cleared",
    lines: [
      { speaker: "", text: "Hundreds of hulls, all facing the same direction. None of them ever turned to run." },
      { speaker: "Kade Ren", text: "This is a fleet that lost at a wall." },
      { speaker: "The Cinder", text: "This is the First Fleet. They came out here to close something, and they didn't." },
      { speaker: "Kade Ren", text: "You're not reading this off the wrecks. You were here." },
      { speaker: "The Cinder", text: "I was aboard one of them." },
    ],
    onCompleteFlags: ["act4.firstFleetRuins.cleared"],
    startEncounter: "firstFleetDefenseDrones",
  },
  {
    id: "ghostProtocol",
    chapter: "Construct Anchor Zero",
    chapterTitle: "Ghost Protocol",
    systemId: "constructAnchorZero",
    requiredFlag: "act4.firstFleetRuins.cleared",
    hiddenAfterFlag: "act4.ghostProtocol.cleared",
    lines: [
      { speaker: "", text: "Anchor Zero still runs a protocol nobody wrote down. It sorts arrivals into two categories." },
      { speaker: "The Cinder", text: "Fleet, or not-fleet. Whisper is reading as fleet." },
      { speaker: "Kade Ren", text: "Because of you." },
      { speaker: "The Cinder", text: "Because of what's in her. The Constructs will let you dock. They will also never let you leave with anything they consider theirs." },
    ],
    onCompleteFlags: ["act4.ghostProtocol.cleared"],
    startEncounter: "ghostProtocolConstructFleet",
  },
  {
    id: "sirArthurEndgame",
    chapter: "Bauhinia Prime",
    chapterTitle: "The Sir Arthur Endgame",
    systemId: "bauhiniaPrime",
    requiredFlag: "act4.ghostProtocol.cleared",
    hiddenAfterFlag: "act4.sirArthurEndgame.cleared",
    lines: [
      { speaker: "", text: "Sir Arthur Arthaine has spent a year attaching his name to your salvage. The tribunal has finally noticed." },
      { speaker: "Sir Arthaine", text: "Everything you pulled out of the Veil is filed under a House concession. Fight that and you'll spend three years in a hearing room." },
      { speaker: "Kade Ren", text: "Three years in a hearing room, or I sign. Say the second half out loud." },
      { speaker: "Sir Arthaine", text: "Or we both keep what we have. You're not the first person to find something out there, captain. You're just the first to survive it this long." },
      { speaker: "The Cinder", text: "He knows more than he should. Decide how you end this — it will follow you." },
    ],
    choices: [
      { label: "Take it to the tribunal. In the open, whatever it costs.", setFlags: ["arthaineResolution.formal"] },
      { label: "Settle it privately. He walks, and so do you.", setFlags: ["arthaineResolution.private"] },
      { label: "Let him try. Everything comes out, his and yours both.", setFlags: ["arthaineResolution.exposed"] },
    ],
    onCompleteFlags: ["act4.sirArthurEndgame.cleared"],
  },
  {
    id: "whatTheFireRemembers",
    chapter: "Construct Anchor Zero",
    chapterTitle: "What the Fire Remembers",
    systemId: "constructAnchorZero",
    requiredFlag: "act4.sirArthurEndgame.cleared",
    hiddenAfterFlag: "act4.whatTheFireRemembers.cleared",
    lines: [
      { speaker: "The Cinder", text: "You asked who cut the hole. I did. Not alone, but I was there, and I argued for it." },
      { speaker: "Kade Ren", text: "The First Fleet." },
      { speaker: "The Cinder", text: "We opened a way to more Source than a civilisation could spend. Something came back through it. The fleet died closing what it could, and I went into the last thing still burning." },
      { speaker: "The Cinder", text: "Then I waited. And when I found a captain who was going to die anyway, I put him back twenty years and started again." },
      { speaker: "Kade Ren", text: "You picked me because I was already finished." },
      { speaker: "The Cinder", text: "I picked you because you were the only one who kept flying after it stopped being survivable. Say what you need to say. I'll hear it." },
    ],
    choices: [
      { label: "\"You used me before I knew you existed.\"", setFlags: ["cinderReveal.anger"] },
      { label: "\"It doesn't change what we've built.\"", setFlags: ["cinderReveal.acceptance"] },
      { label: "\"Later. What's still coming through that hole?\"", setFlags: ["cinderReveal.focus"] },
    ],
    onCompleteFlags: ["act4.whatTheFireRemembers.cleared"],
  },
  {
    id: "lastShipyard",
    chapter: "Construct Anchor Zero",
    chapterTitle: "The Last Shipyard",
    systemId: "constructAnchorZero",
    requiredFlag: "act4.whatTheFireRemembers.cleared",
    hiddenAfterFlag: "act4.lastShipyard.cleared",
    lines: [
      { speaker: "", text: "The yard that built the First Fleet is still here, still powered, and still refusing to open." },
      { speaker: "The Cinder", text: "It knows me. That's the problem — it knows what I agreed to." },
      { speaker: "Kade Ren", text: "Then it can watch what you do next." },
      { speaker: "The Cinder", text: "...It can. Take Whisper in. Everything that fleet was supposed to become is in there, and none of it was ever used." },
    ],
    onCompleteFlags: ["act4.lastShipyard.cleared"],
    startEncounter: "lastShipyardDefense",
  },
  {
    id: "deepOriginFinale",
    chapter: "Construct Anchor Zero",
    chapterTitle: "Deep Origin",
    systemId: "constructAnchorZero",
    requiredFlag: "act4.lastShipyard.cleared",
    hiddenAfterFlag: "act4.deepOrigin.cleared",
    lines: [
      { speaker: "", text: "The ark opens. What's inside is not a weapon — it's a hull, unfinished, waiting for something to finish it." },
      { speaker: "Kade Ren", text: "It's the same shape as her." },
      { speaker: "The Cinder", text: "It's the shape she's been growing toward since the belt. I didn't design that. I just knew what she'd become if she survived long enough." },
      { speaker: "Kade Ren", text: "Then she finishes it herself. She's done everything else that way." },
      { speaker: "The Cinder", text: "Now she can carry a Sovereign's frame. After that, there's only the Line — and whatever the First Fleet failed to close." },
    ],
    onCompleteFlags: ["act4.deepOrigin.cleared", "campaign.act4.complete"],
    startEncounter: "deepOriginArkDefense",
  },
];
