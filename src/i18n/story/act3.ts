import type { StoryScene } from "../../data/types";

/** The Fractured Veil — Chinese overlay. */
export const ACT3_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  intoTheVeil: {
    chapter: "帷幕边缘",
    chapterTitle: "驶入帷幕",
    lines: [
      { speaker: "", text: "帷幕不是星云。它是某个曾经维系在一起的东西留下的残余。" },
      { speaker: "凯德·任", text: "海图到边缘就断了。" },
      { speaker: "余烬", text: "海图断了，是因为测绘员断在那儿了。再往里全是虫群，而虫群不留海图。" },
      { speaker: "余烬", text: "「絮语」号扛得住。这不是恭维——这是我第一次说这句话，并且当真。" },
    ],
  },
  hiveSignal: {
    chapter: "蛹化星域",
    chapterTitle: "巢穴信号",
    lines: [
      { speaker: "", text: "这里的一切之下都有一道信号——太规律，不像噪声；太缓慢，不像交谈。" },
      { speaker: "余烬", text: "那不是虫群在自言自语。那是虫群在被下令。" },
      { speaker: "凯德·任", text: "被什么下令？" },
      { speaker: "余烬", text: "被某个有耐心消耗掉整个种族的东西。顺着信号往里飞，你就会见到握着另一端的家伙。" },
    ],
  },
  tigerSharkGambit: {
    chapter: "帷幕边缘",
    chapterTitle: "虎鲨的赌注",
    lines: [
      { speaker: "", text: "虎鲨的族群也在这里，而且正在落败。她用公开频道呼叫你——这对她的代价，比那场仗还大。" },
      { speaker: "虎鲨", text: "我烧了你的锚地。你打碎了我的舰队。可对帷幕里出来的东西而言，我们俩都无关紧要。" },
      { speaker: "凯德·任", text: "你想结盟。" },
      { speaker: "虎鲨", text: "我想一年后还活着。这个星期，这两件事是一回事。" },
      { speaker: "余烬", text: "她说的是实话——而这正是你该警觉的地方。" },
    ],
    choices: [
      { label: "接受结盟。不管她是什么，至少枪口朝着同一个方向。", setFlags: ["tigerSharkAlliance"] },
      { label: "拒绝。她烧掉的锚地里，全是还不了手的人。", setFlags: ["act3.tigerSharkGambit.refused"] },
    ],
  },
  arthaineContract: {
    chapter: "蛹化星域",
    chapterTitle: "阿尔泰因契约",
    lines: [
      { speaker: "", text: "一名阿尔泰因信使在帷幕内部找到了你。这需要功夫、金钱，以及一个知道该往哪找的人。" },
      { speaker: "阿尔泰因信使", text: "亚瑟爵士提供打捞特许权。整片帷幕，独家，永久。" },
      { speaker: "凯德·任", text: "他在把一个别人到不了的战区送给我。" },
      { speaker: "余烬", text: "他在给你一份文件链，把他的名字签在你从里面捞出的一切上。凡是你不愿被他占有的东西，都别从他手上拿。" },
    ],
  },
  queenspire: {
    chapter: "蜂后尖塔",
    chapterTitle: "蜂后尖塔",
    lines: [
      { speaker: "", text: "蜂后母体有一座空间站那么大，而她已经死了很久了。" },
      { speaker: "凯德·任", text: "她不是在守卫尖塔。她是在撑着它。" },
      { speaker: "余烬", text: "她是唯一让整个族群背朝疆域的东西。她一倒，它们就会朝内环散开。" },
      { speaker: "凯德·任", text: "那我们就别杀她。" },
      { speaker: "余烬", text: "必须杀。因为信号另一端的东西已经在她体内了，而且正用她来瞄准。" },
    ],
  },
  originTide: {
    chapter: "本源潮汐裂隙",
    chapterTitle: "本源潮汐",
    lines: [
      { speaker: "", text: "蜂后母体所瞄准的那道裂隙敞开着，有什么东西正从错误的方向穿过来。" },
      { speaker: "凯德·任", text: "那是源点。原生的，未经提炼。" },
      { speaker: "余烬", text: "那是构成我的东西。而它正从某个人切开的口子里流出来。" },
      { speaker: "凯德·任", text: "某个像你一样的人。" },
      { speaker: "余烬", text: "……先把她再提升一级。然后再问我一次，我会好好回答。" },
    ],
  },
};
