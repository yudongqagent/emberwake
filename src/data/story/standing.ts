import type { StoryScene } from "../types";

/** 因为你的立场才会发生的戏。
 *
 * 2026-08-30。docs/story-engagement-analysis.md 第三条:
 *
 * > 整整九小时的游戏里,铁衡 9 句、柳芸 6 句、安鹤龄 4 句。一个说 6 句话的人,
 * > 玩家不可能对他有感情。
 *
 * 主线上塞不下更多戏——主线的节奏已经排满了,再往里加人只会把它拖垮。所以这些戏
 * 挂在**声望**上:你把狮心处成盟友,铁衡才会来找你说那些他不对外人说的话;你把
 * 商会得罪光,柳芸才会来把账摊开。
 *
 * 这同时是"自由度"的一种:内容不是按主线进度发的,是按你**怎么玩**发的。走安氏
 * 路线的玩家和走掠夺者路线的玩家,看到的是两批不同的戏,而不是同一批戏配不同的
 * 结局文字。
 *
 * 每场都是一次性的(hiddenAfterFlag),而且都不给奖励——它们不是任务,是这些人
 * 终于有机会不用只说一句金句就退场。 */
export const STANDING_SCENES: StoryScene[] = [
  {
    id: "standingConcordTrust",
    chapter: "Ferrous Gate",
    chapterTitle: "What Ferrous Doesn't Say",
    systemId: "ferrousGate",
    requiredFlag: null,
    hiddenAfterFlag: "standing.concordTrust.seen",
    requiresStanding: { faction: "lionsheart", min: 60 },
    lines: [
      { speaker: "", text: "He doesn't hail you. He waits at the lane head until you come to him, which is its own kind of message." },
      { speaker: "Kaan Ferrous", text: "The Concord voted to fly with you. I abstained." },
      { speaker: "Kade Ren", text: "You've been flying with me for months." },
      { speaker: "Kaan Ferrous", text: "That's why I abstained. A vote makes it policy. Policy is what they hide behind when they change their minds later." },
      { speaker: "Kaan Ferrous", text: "So this is me saying it without the vote: whatever's past the Deep, I'll be at the lane. Not because the Concord decided. Because I did." },
      { speaker: "The Cinder", text: "Log that one. Not for the archive — for you. People don't say that twice." },
    ],
    onCompleteFlags: ["standing.concordTrust.seen"],
  },
  {
    id: "standingConcordBroken",
    chapter: "Ferrous Gate",
    chapterTitle: "The Lane Closes",
    systemId: "ferrousGate",
    requiredFlag: null,
    hiddenAfterFlag: "standing.concordBroken.seen",
    requiresStanding: { faction: "lionsheart", max: -50 },
    lines: [
      { speaker: "", text: "The lane head is crewed and the guns are tracking you. Ferrous comes out alone anyway." },
      { speaker: "Kaan Ferrous", text: "I duelled you for this lane once. I lost it honestly and I meant to keep losing it." },
      { speaker: "Kade Ren", text: "Say the rest." },
      { speaker: "Kaan Ferrous", text: "Three of my crews are dead by your guns. I can carry a grudge or I can carry a command. I can't carry both." },
      { speaker: "Kaan Ferrous", text: "Next time you come through here, come as a fleet. I won't come out to meet you alone twice." },
      { speaker: "The Cinder", text: "He walked out here unarmed to tell you that. Whatever else you've made of him, he's still that." },
    ],
    onCompleteFlags: ["standing.concordBroken.seen"],
  },
  {
    id: "standingCombineLedger",
    chapter: "Meridian Exchange",
    chapterTitle: "The Other Page",
    systemId: "meridianExchange",
    requiredFlag: null,
    hiddenAfterFlag: "standing.combineLedger.seen",
    requiresStanding: { faction: "swanreach", min: 60 },
    lines: [
      { speaker: "", text: "Vashti has cleared the floor. There is one file on the table and it is not yours." },
      { speaker: "Ori Vashti", text: "This is my brother's. He flew salvage out of Driftmarket. The Swarm took the ring while he was docked." },
      { speaker: "Kade Ren", text: "You've never mentioned him." },
      { speaker: "Ori Vashti", text: "Because I price things, captain, and I have never been able to price that. So I underwrote your losses instead. It was cheaper than grief and it was doing something." },
      { speaker: "Ori Vashti", text: "Keep going out there. I'll keep paying for it. That's the whole arrangement and I'd rather neither of us dressed it up." },
    ],
    onCompleteFlags: ["standing.combineLedger.seen"],
  },
  {
    id: "standingCombineCalled",
    chapter: "Meridian Exchange",
    chapterTitle: "The Note Comes Due",
    systemId: "meridianExchange",
    requiredFlag: null,
    hiddenAfterFlag: "standing.combineCalled.seen",
    requiresStanding: { faction: "swanreach", max: -50 },
    lines: [
      { speaker: "", text: "The Exchange doesn't refuse you entry. It simply prices you out of every room you try to enter." },
      { speaker: "Ori Vashti", text: "I priced you low once. I've spent fourteen months correcting it." },
      { speaker: "Kade Ren", text: "Then correct it out loud." },
      { speaker: "Ori Vashti", text: "Every hull you've taken from a Combine flag is a family that files a claim, and I sign every one. I have your signature on my ledger more times than my own." },
      { speaker: "Ori Vashti", text: "I'm not going to have you killed. I'm going to make you expensive, everywhere, forever. That's what a market is for." },
    ],
    onCompleteFlags: ["standing.combineCalled.seen"],
  },
  {
    id: "standingArthaineDisowned",
    chapter: "Bauhinia Prime",
    chapterTitle: "The Old Man's Terms",
    systemId: "bauhiniaPrime",
    requiredFlag: null,
    hiddenAfterFlag: "standing.arthaineDisowned.seen",
    requiresStanding: { faction: "bauhinia", max: -50 },
    lines: [
      { speaker: "", text: "The House does not summon you. A single unarmed cutter matches your course and holds there until you answer." },
      { speaker: "Sir Arthaine", text: "You've cost me two seats, a shipping charter and a granddaughter who no longer speaks to me." },
      { speaker: "Kade Ren", text: "You paid Reavers to burn an anchorage. I only made it public." },
      { speaker: "Sir Arthaine", text: "Yes. That is what I mean by cost, captain. I am not disputing the arithmetic — I am telling you I have run it." },
      { speaker: "Sir Arthaine", text: "The House will not forgive this. But the House is not the man in this cutter, and the man is going to tell you what the Principality knows about the Line. After that we are done." },
      { speaker: "The Cinder", text: "He came alone. In forty years of records, that man has never once come alone." },
    ],
    onCompleteFlags: ["standing.arthaineDisowned.seen"],
  },
  {
    id: "standingReaverOath",
    chapter: "the Hollow Fleet Yard",
    chapterTitle: "What the Pack Owes",
    systemId: "hollowFleetYard",
    requiredFlag: null,
    hiddenAfterFlag: "standing.reaverOath.seen",
    requiresStanding: { faction: "reavers", min: 60 },
    lines: [
      { speaker: "", text: "The yard is running again. Not repaired — inhabited, which among Reavers is the same word." },
      { speaker: "Tiger Shark", text: "My people asked me why we fly for the man whose anchorage I burned." },
      { speaker: "Kade Ren", text: "What did you tell them." },
      { speaker: "Tiger Shark", text: "That I burned it because I was starving and I'd do it again, and that you knew that when you took my hand anyway. They understood the second part. They're Reavers. Nobody's ever taken their hand." },
      { speaker: "Tiger Shark", text: "We don't swear things. But this yard stays open to you, and anything that comes for you comes through it first." },
    ],
    onCompleteFlags: ["standing.reaverOath.seen"],
  },
];
