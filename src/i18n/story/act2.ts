import type { StoryScene } from "../../data/types";

/** Lionsheart Expanse — Chinese overlay. Rewritten alongside the English; line
 * counts and choice setFlags are asserted identical by story.test.ts. */
export const ACT2_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  openLanes: {
    chapter: "铁门星域",
    chapterTitle: "开放航道",
    lines: [
      { speaker: "", text: "铁门星域靠决斗来维持航道开放。卡恩·费洛斯输了，而且看起来挺高兴。" },
      { speaker: "卡恩·费洛斯", text: "干净利落。你守住了距离，而不是追着我打。大多数独立船主都会追。" },
      { speaker: "凯德·任", text: "追击是被人从背后打穿的方式。" },
      { speaker: "卡恩·费洛斯", text: "确实。协约靠决斗争夺航道权——赢得够多，航道就是你的。输一次，你就成了别人嘴里的故事。" },
      { speaker: "余烬", text: "他在招募你，还管这叫待客之道。随他去。他的航道通向我们需要的地方。" },
    ],
  },
  tradeWinds: {
    chapter: "子午交易所",
    chapterTitle: "贸易风",
    lines: [
      { speaker: "", text: "子午交易所给一切标价，包括你。你还没坐下，奥莉·瓦什提就已经翻开了你的档案。" },
      { speaker: "奥莉·瓦什提", text: "废品级船体，三个等级的改装，却没有任何船坞记录。有人在账外替你干活。" },
      { speaker: "凯德·任", text: "也可能只是我做事仔细。" },
      { speaker: "奥莉·瓦什提", text: "舰长，我靠给船估价吃饭。仔细做不到这个。不过我不需要知道——我需要的是你打捞品的优先购买权。" },
      { speaker: "余烬", text: "答应她。她会压价，也会一直问我们答不上来的问题——但这一带不向任何本家报备的船坞，只有联合体有。" },
    ],
  },
  bloodDebt: {
    chapter: "灰烬谷",
    chapterTitle: "血债",
    lines: [
      { speaker: "", text: "灰烬谷贩卖不该卖的东西。它卖给你的是一份货单——阿尔泰因的船，掠夺者的航线，对得上的日期。" },
      { speaker: "凯德·任", text: "本家一直在给劫掠者付钱。" },
      { speaker: "余烬", text: "本家付钱是为了让星带保持危险。危险的星带需要护航契约。护航契约需要一个本家。" },
      { speaker: "凯德·任", text: "那片星带里死过人。" },
      { speaker: "余烬", text: "是的。而证据就在你手上。拿证据做什么，是这里唯一重要的问题。" },
    ],
    choices: [
      { label: "交给议事会。公开地做，代价多大就多大。", setFlags: ["act2.bloodDebt.formal"] },
      { label: "留着。知道你能毁掉它的本家，会离你远一点。", setFlags: ["act2.bloodDebt.blackmail"] },
    ],
  },
  hollowFleet: {
    chapter: "空壳舰队船坞",
    chapterTitle: "空壳舰队",
    lines: [
      { speaker: "", text: "船坞里满是没有任何人在船上的战舰。它们照样还击了。" },
      { speaker: "凯德·任", text: "没有船员。没有信号。它们就这么——冲上来了。" },
      { speaker: "余烬", text: "「空壳」不给自己的船配船员。它把船掏空，让剩下的东西继续执行命令。" },
      { speaker: "余烬", text: "看那层装甲。它在生长。不是被修复——是生长，就像我把打捞品熔进「絮语」号时她生长的方式。" },
      { speaker: "凯德·任", text: "你是说，外面还有别的东西在做你做的事。" },
      { speaker: "余烬", text: "我是说，外面还有别的东西把这件事做砸了。下次你再问我这条路能走多远时，记住这一点。" },
    ],
  },
  ridgeAndReach: {
    chapter: "灰烬谷",
    chapterTitle: "山脊与疆域",
    lines: [
      { speaker: "", text: "协约想要山脊航道。联合体已经给它标了价。两边的代表团都在等你开口。" },
      { speaker: "卡恩·费洛斯", text: "两边的航道你都飞过。他们信你，胜过信彼此。" },
      { speaker: "奥莉·瓦什提", text: "这份信任值多少，取决于你开价多少。" },
      { speaker: "余烬", text: "无论你选什么，他们都会记住。所有正在观望你是哪种舰长的人，也会记住。" },
    ],
    choices: [
      { label: "促成和解。谁都别想独吞山脊。", setFlags: ["ridgeReachOutcome.peace"] },
      { label: "让他们耗下去。动荡对打捞者是好事。", setFlags: ["ridgeReachOutcome.exploited"] },
      { label: "支持协约。决斗者说话算数。", setFlags: ["ridgeReachOutcome.lionsheart"] },
      { label: "支持联合体。账本比荣誉活得久。", setFlags: ["ridgeReachOutcome.swanreach"] },
    ],
  },
  firstContact: {
    chapter: "漂流集市",
    chapterTitle: "初次接触",
    lines: [
      { speaker: "", text: "漂流集市的外环已经变成了甲壳。穿过它的东西，不是来做生意的。" },
      { speaker: "凯德·任", text: "那不是一艘船。那是长出了一艘船的东西。" },
      { speaker: "余烬", text: "甲壳虫群。它们不建造，只增殖——而它们从没深入内环这么远过。" },
      { speaker: "凯德·任", text: "为什么是现在？" },
      { speaker: "余烬", text: "因为更外面有什么东西在推它们。那才是值得害怕的部分。" },
    ],
  },
  reachOpens: {
    chapter: "铁门星域",
    chapterTitle: "疆域洞开",
    lines: [
      { speaker: "", text: "铁门守住了。「絮语」号是它守住的原因，铁门上下所有人都看见了。" },
      { speaker: "卡恩·费洛斯", text: "一年前你还是废品级。" },
      { speaker: "凯德·任", text: "一年前我还要在二十年后死掉。" },
      { speaker: "卡恩·费洛斯", text: "……我就当那是个玩笑。" },
      { speaker: "余烬", text: "从这里往外的航道通向帷幕，那边的一切都比你打过的更糟。而这正是我们要去的理由。" },
    ],
  },
};
