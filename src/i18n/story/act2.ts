import type { StoryScene } from "../../data/types";

/** 狮心疆域 —— 中文文本。2026-08-29 按中文语感重写，人名统一(铁衡、柳芸、安氏)。 */
export const ACT2_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  openLanes: {
    chapter: "铁门星域",
    chapterTitle: "开放航道",
    lines: [
      { speaker: "", text: "铁门星域的航道归属，是靠决斗定的。铁衡输了这一场，看上去反倒挺高兴。" },
      { speaker: "铁衡", text: "打得干净。你守住了距离，没有追着我打。大多数独立船主都会追。" },
      { speaker: "陆昭", text: "追出去，就等着被人从背后打穿。" },
      { speaker: "铁衡", text: "对。协约的规矩就是这样:赢得够多，航道归你；输一场，你就成了别人酒桌上的故事。" },
      { speaker: "余烬", text: "他在招募你，还说得像待客之道。随他去——他那些航道通向我们要去的地方。" },
    ],
  },
  tradeWinds: {
    chapter: "子午交易所",
    chapterTitle: "贸易风",
    lines: [
      { speaker: "", text: "子午交易所什么都标价，包括你。你还没落座，柳芸已经把你的档案翻开了。" },
      { speaker: "柳芸", text: "废品级船体，改装跨了三个等级，却查不到任何船坞记录。有人在账外替你干活。" },
      { speaker: "陆昭", text: "也可能只是我手脚勤快。" },
      { speaker: "柳芸", text: "舰长，我靠给船估价吃饭。勤快做不出这种东西。不过我不打算追问——我只要你打捞品的优先购买权。" },
      { speaker: "余烬", text: "答应她。她会压价，也会一直问我们答不上来的问题。但这一带不向本家报备的船坞，只有联合体有。" },
    ],
  },
  bloodDebt: {
    chapter: "灰烬谷",
    chapterTitle: "血债",
    lines: [
      { speaker: "", text: "灰烬谷卖的都是不该卖的东西。这次卖给你的是一份货单:安氏的船、掠夺者的航线，还有对得上的日期。" },
      { speaker: "陆昭", text: "本家一直在给劫掠者付钱。" },
      { speaker: "余烬", text: "本家付钱，是为了让星带一直危险下去。星带危险，商队就得买护航；要买护航，就得找一个本家。" },
      { speaker: "陆昭", text: "那片星带里死过人。" },
      { speaker: "余烬", text: "死过。而证据现在在你手上。这里唯一要紧的问题是:你拿它做什么。" },
    ],
    choices: [
      { label: "递交议事会。摆到台面上，该付什么代价就付。", setFlags: ["act2.bloodDebt.formal"] },
      { label: "自己留着。知道你能毁掉它的本家，会离你远一点。", setFlags: ["act2.bloodDebt.blackmail"] },
    ],
  },
  hollowFleet: {
    chapter: "空壳舰队船坞",
    chapterTitle: "空壳舰队",
    lines: [
      { speaker: "", text: "整座船坞的战舰上，一个人都没有。它们照样开火了。" },
      { speaker: "陆昭", text: "没有船员，没有通讯。它们就这么冲上来了。" },
      { speaker: "余烬", text: "「空壳」不给船配人。它把船掏空，让剩下的部分继续执行最后一条命令。" },
      { speaker: "余烬", text: "你看那层装甲——它在长。不是被修好的，是长出来的。和我把打捞品熔进「絮语」号时一模一样。" },
      { speaker: "陆昭", text: "你是说，外面还有别的东西，在做你做的事。" },
      { speaker: "余烬", text: "我是说，外面还有别的东西，把这件事做砸了。以后你再问我这条路能走多远，记着这一句。" },
    ],
  },
  ridgeAndReach: {
    chapter: "灰烬谷",
    chapterTitle: "山脊之争",
    lines: [
      { speaker: "", text: "协约要山脊航道，联合体已经给它标好了价。两边的人都坐在那儿，等你先开口。" },
      { speaker: "铁衡", text: "两边的航道你都飞过。他们信你，多过信彼此。" },
      { speaker: "柳芸", text: "这份信任值多少，就看你开价多少。" },
      { speaker: "余烬", text: "你怎么选，他们都会记住。旁边那些正在打量你是哪种舰长的人，也会记住。" },
    ],
    choices: [
      { label: "从中调停。谁都别想独吞山脊。", setFlags: ["ridgeReachOutcome.peace"] },
      { label: "让他们耗着。局势越乱，打捞的越好过。", setFlags: ["ridgeReachOutcome.exploited"] },
      { label: "站协约这边。决斗者说话算数。", setFlags: ["ridgeReachOutcome.lionsheart"] },
      { label: "站联合体这边。账本比荣誉活得久。", setFlags: ["ridgeReachOutcome.swanreach"] },
    ],
  },
  firstContact: {
    chapter: "漂流集市",
    chapterTitle: "初次接触",
    lines: [
      { speaker: "", text: "漂流集市的外环整个变成了甲壳。穿过来的那个东西，显然不是来做生意的。" },
      { speaker: "陆昭", text: "那不是一艘船。那是长出了一艘船的东西。" },
      { speaker: "余烬", text: "甲壳虫群。它们不造东西，只增殖。以前从没深入到这么靠内的地方。" },
      { speaker: "陆昭", text: "为什么偏偏是现在？" },
      { speaker: "余烬", text: "因为更外面有东西在推它们。真正该怕的是那个。" },
    ],
  },
  reachOpens: {
    chapter: "铁门星域",
    chapterTitle: "疆域洞开",
    lines: [
      { speaker: "", text: "铁门守住了。守住的理由是「絮语」号，整个铁门都看见了。" },
      { speaker: "铁衡", text: "一年前你还是废品级。" },
      { speaker: "陆昭", text: "一年前，我还该在二十年后死掉。" },
      { speaker: "铁衡", text: "……我就当你在开玩笑。" },
      { speaker: "余烬", text: "从这里往外通向帷幕。那边的一切都比你打过的更难缠。我们正是要去那儿。" },
    ],
  },
};
