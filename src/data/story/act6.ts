import type { StoryScene } from "../types";

/** Chorus Deep (threat 7) — the epilogue region, and the last thing the Reach
 * has to be measured against.
 *
 * Story rework (2026-08-29). The three Heroes Converge variants are the one
 * legitimately exclusive branch in the game: they resolve the ending chosen in
 * What Kade Knows, share a hiddenAfterFlag, and each gates on a distinct flag.
 */
export const ACT6_SCENES: StoryScene[] = [
  {
    id: "heroesConvergeInstitutional",
    chapter: "Bauhinia Prime",
    chapterTitle: "Heroes Converge",
    systemId: "bauhiniaPrime",
    requiredFlag: "secondIgnitionEnding.institutional",
    hiddenAfterFlag: "act6.heroesConverge.cleared",
    lines: [
      { speaker: "", text: "They gave you a seat, a title, and a corridor of people who want something from you before lunch." },
      { speaker: "Kaan Ferrous", text: "You look worse than you did at the Line." },
      { speaker: "Kade Ren", text: "The Line only tried to kill me once." },
      { speaker: "The Cinder", text: "It's working, though. Three months and the Reach has patrol funding it hasn't had in a century." },
    ],
    onCompleteFlags: ["act6.heroesConverge.cleared"],
  },
  {
    id: "heroesConvergeCoalition",
    chapter: "Bauhinia Prime",
    chapterTitle: "Heroes Converge",
    systemId: "bauhiniaPrime",
    requiredFlag: "secondIgnitionEnding.coalition",
    hiddenAfterFlag: "act6.heroesConverge.cleared",
    lines: [
      { speaker: "", text: "No seat, no title. A berth at Bauhinia Prime that half the independents in the Reach now treat as an address." },
      { speaker: "Ori Vashti", text: "You refused a Principality seat and built something that outvotes it anyway. That was either very clever or very lucky." },
      { speaker: "Kade Ren", text: "Can it be both?" },
      { speaker: "The Cinder", text: "It's usually both. Don't tell them that." },
    ],
    onCompleteFlags: ["act6.heroesConverge.cleared"],
  },
  {
    id: "heroesConvergePersonal",
    chapter: "Bauhinia Prime",
    chapterTitle: "Heroes Converge",
    systemId: "bauhiniaPrime",
    requiredFlag: "secondIgnitionEnding.personal",
    hiddenAfterFlag: "act6.heroesConverge.cleared",
    lines: [
      { speaker: "", text: "You said you'd walk away when it was done. You did. It lasted four months." },
      { speaker: "Kade Ren", text: "I'm not coming back to politics." },
      { speaker: "Kaan Ferrous", text: "Nobody's asking. There's a thing past the Deep that nobody can survey, and you're the only crew that comes back from places like that." },
      { speaker: "The Cinder", text: "He's flattering you. It's also true." },
    ],
    onCompleteFlags: ["act6.heroesConverge.cleared"],
  },
  {
    id: "seizingCommand",
    chapter: "Bauhinia Prime",
    chapterTitle: "Supreme Command",
    systemId: "bauhiniaPrime",
    requiredFlag: "act6.heroesConverge.cleared",
    hiddenAfterFlag: "act6.seizingCommand.cleared",
    lines: [
      { speaker: "", text: "The task force needs one commander. Four factions each have a candidate, and none of them will accept another's." },
      { speaker: "Ori Vashti", text: "So they'll accept yours. Congratulations, captain — nobody trusts you least." },
      { speaker: "Kade Ren", text: "That's the most Combine sentence I've ever heard." },
      { speaker: "The Cinder", text: "Take it. Whatever's out past the Deep, it won't wait for a committee." },
    ],
    onCompleteFlags: ["act6.seizingCommand.cleared"],
  },
  {
    id: "boldMove",
    chapter: "Bauhinia Prime",
    chapterTitle: "Partners, Not Hierarchy",
    systemId: "bauhiniaPrime",
    requiredFlag: "act6.seizingCommand.cleared",
    hiddenAfterFlag: "act6.boldMove.cleared",
    lines: [
      { speaker: "Kade Ren", text: "I don't want a chain of command. I want four fleets that each know what they're best at." },
      { speaker: "Kaan Ferrous", text: "That isn't how a task force works." },
      { speaker: "Kade Ren", text: "It's how Whisper works. Nothing aboard her outranks anything else. It just does the part it's for." },
      { speaker: "The Cinder", text: "...He's quoting me. Badly. But he's right." },
    ],
    onCompleteFlags: ["act6.boldMove.cleared"],
  },
  {
    id: "dysonSphereSystem",
    chapter: "Choir's Threshold",
    chapterTitle: "Dyson Sphere System",
    systemId: "choirsThreshold",
    requiredFlag: "act6.dysonSphereSystem.combatDone",
    hiddenAfterFlag: "act6.dysonSphereSystem.cleared",
    lines: [
      { speaker: "", text: "A shell of interlocking structure wrapped entirely around a star. Dark on the outward face, threaded with light like sheet music." },
      { speaker: "The Cinder", text: "A full Dyson sphere. Not a fragment. Whoever built this had Origin Essence in quantities I can't put a number to." },
      { speaker: "Kade Ren", text: "The sentinels aren't attacking in a formation." },
      { speaker: "The Cinder", text: "They're attacking in a chord. I don't know yet what that means. I know it means something." },
    ],
    onCompleteFlags: ["act6.dysonSphereSystem.cleared"],
    startEncounter: "dysonSphereFirstContact",
  },
  {
    id: "gospelCivilization",
    chapter: "Dyson Choir",
    chapterTitle: "Gospel Civilization",
    systemId: "dysonChoir",
    requiredFlag: "act6.gospelCivilization.combatDone",
    hiddenAfterFlag: "act6.gospelCivilization.cleared",
    lines: [
      { speaker: "", text: "The archive is not a library. It is a recording of a civilisation being assessed, and the assessment is still running." },
      { speaker: "Kade Ren", text: "Assessed by whom?" },
      { speaker: "The Cinder", text: "By whatever the Hollow was before it stopped being anything that judges kindly. I don't think the Hollow began as a weapon, Kade. I think it began as a standard." },
      { speaker: "Kade Ren", text: "And the Choir failed it." },
      { speaker: "The Cinder", text: "The Choir is still singing its answer. Four hundred years late, to a room that stopped listening." },
    ],
    onCompleteFlags: ["act6.gospelCivilization.cleared"],
    startEncounter: "choirDefenseGrid",
  },
  {
    id: "civilizationDisqualified",
    chapter: "Dyson Choir",
    chapterTitle: "Civilization Disqualified",
    systemId: "dysonChoir",
    requiredFlag: "act6.civilizationDisqualified.combatDone",
    hiddenAfterFlag: "act6.civilizationDisqualified.cleared",
    lines: [
      { speaker: "", text: "The Conductor stops. Not destroyed — finished, the way a piece of music finishes." },
      { speaker: "The Cinder", text: "It was never fighting you. It was performing the last thing it was told to perform, at anything that came close enough to hear." },
      { speaker: "Kade Ren", text: "So we were being assessed too." },
      { speaker: "The Cinder", text: "We were. And whatever the standard is, the Reach just answered it with a salvage-grade corvette that refused to stop being rebuilt." },
      { speaker: "Kade Ren", text: "Is that a pass?" },
      { speaker: "The Cinder", text: "It's an answer. Four hundred years is long enough to wait for one. Take her up, Kade — she's earned the last frame there is." },
    ],
    onCompleteFlags: ["act6.civilizationDisqualified.cleared", "campaign.act6.complete"],
    unlockHullClass: "anthem",
    startEncounter: "civilizationDisqualifiedFinale",
  },
];
