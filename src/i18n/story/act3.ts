import type { StoryScene } from "../../data/types";

/** 破碎帷幕 —— 中文文本。2026-08-29 按中文语感重写。 */
export const ACT3_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  intoTheVeil: {
    chapter: "帷幕边缘",
    chapterTitle: "驶入帷幕",
    lines: [
      { speaker: "", text: "帷幕不是星云。它是某个曾经完整的东西碎掉之后，剩下的那一堆。" },
      { speaker: "陆昭", text: "海图到边缘就没了。" },
      { speaker: "余烬", text: "海图没了，是因为测绘的人也没了。再往里全是虫群，而虫群不画图。" },
      { speaker: "余烬", text: "「絮语」号扛得住。这不是安慰你——这是我第一次说这话，并且是认真的。" },
    ],
  },
  hiveSignal: {
    chapter: "蛹化星域",
    chapterTitle: "巢穴信号",
    lines: [
      { speaker: "", text: "这一带的底噪里埋着一道信号。太规整，不像杂音；太慢，不像交谈。" },
      { speaker: "余烬", text: "那不是虫群在互相说话。那是有人在给虫群下令。" },
      { speaker: "陆昭", text: "谁？" },
      { speaker: "余烬", text: "一个耐心到可以拿整个种族当消耗品的东西。顺着信号往里飞，你就能见到握着另一头的它。" },
    ],
  },
  tigerSharkGambit: {
    chapter: "帷幕边缘",
    chapterTitle: "虎鲨的赌注",
    lines: [
      { speaker: "", text: "虎鲨的族群也在帷幕里，而且正在被吃掉。她用公开频道呼叫你——这比那场败仗更伤她的脸面。" },
      { speaker: "虎鲨", text: "我烧过你的锚地，你打碎过我的舰队。可对帷幕里爬出来的那些东西来说，我们俩都不算什么。" },
      { speaker: "陆昭", text: "你想结盟。" },
      { speaker: "虎鲨", text: "我想一年后还活着。这个星期，这两件事是同一件事。" },
      { speaker: "余烬", text: "她说的是实话。你该警觉的正是这一点。" },
    ],
    choices: [
      { label: "接受结盟。不管她是什么货色，至少炮口朝着同一边。", setFlags: ["tigerSharkAlliance"] },
      { label: "拒绝。她烧掉的那座锚地里，全是还不了手的人。", setFlags: ["act3.tigerSharkGambit.refused"] },
    ],
  },
  arthaineContract: {
    chapter: "蛹化星域",
    chapterTitle: "安氏契约",
    lines: [
      { speaker: "", text: "一名安氏信使一路找进了帷幕。这要花力气、花钱，还得有人知道该往哪儿找。" },
      { speaker: "安氏信使", text: "安鹤龄先生提供打捞特许权。整片帷幕，独家，永久有效。" },
      { speaker: "陆昭", text: "他把一个别人根本进不来的战区，送给我。" },
      { speaker: "余烬", text: "他是在给你一条文件链，好把他的名字签在你从这里捞出的每一样东西上。凡是你不愿意让他占的，就别从他手里拿。" },
    ],
  },
  queenspire: {
    chapter: "蜂后尖塔",
    chapterTitle: "蜂后尖塔",
    lines: [
      { speaker: "", text: "蜂后母体有一座空间站那么大。她已经这样死了很久了。" },
      { speaker: "陆昭", text: "她不是在守这座塔。她是在撑着它。" },
      { speaker: "余烬", text: "她也是唯一让整个族群背对疆域的东西。她一倒，它们就会朝内环散开。" },
      { speaker: "陆昭", text: "那就别杀她。" },
      { speaker: "余烬", text: "必须杀。信号另一头的东西已经钻进她体内了，正拿她当准星用。" },
    ],
  },
  originTide: {
    chapter: "本源潮汐裂隙",
    chapterTitle: "本源潮汐",
    lines: [
      { speaker: "", text: "蜂后母体瞄着的那道裂隙裂开了。有东西正从反方向涌进来。" },
      { speaker: "陆昭", text: "那是源点。没提炼过的，原生的。" },
      { speaker: "余烬", text: "那是构成我的东西。它正从一个被人切开的口子里往外流。" },
      { speaker: "陆昭", text: "被谁切的？被你这种东西？" },
      { speaker: "余烬", text: "……先把她再升一级。然后你再问我一次，我会好好回答。" },
    ],
  },
};
