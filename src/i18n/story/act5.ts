import type { StoryScene } from "../../data/types";

/** 暗影线 —— 中文文本。2026-08-29 按中文语感重写。 */
export const ACT5_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  callingTheReach: {
    chapter: "洋紫荆本星",
    chapterTitle: "召集疆域",
    lines: [
      { speaker: "", text: "你把每一个欠过你的势力都叫来了。来的比想象中多——所有人都意外，包括你自己。" },
      { speaker: "铁衡", text: "协约给你守一条航道。一条。别开口要第二条。" },
      { speaker: "柳芸", text: "联合体兜底赔损。这不是义气，是算账:暗影线一旦裂开，就没有市场可做了。" },
      { speaker: "陆昭", text: "比我预期的多。" },
      { speaker: "余烬", text: "这点人手，还不到第一舰队的零头。别忘了他们的下场。" },
    ],
  },
  umbralLineApproach: {
    chapter: "暗影线",
    chapterTitle: "暗影线",
    lines: [
      { speaker: "", text: "暗影线不是一条边界，是一道缝。靠近它的时候，连光都不太正常。" },
      { speaker: "陆昭", text: "仪表互相打架。" },
      { speaker: "余烬", text: "它们都没坏。离这么近，两组读数可以同时成立。这就是那道缝干的事。" },
      { speaker: "余烬", text: "照你平时的打法飞:选一个距离，守住它。任何告诉你这里安全的东西，都别信。" },
    ],
  },
  echoesOfTheLosingBattle: {
    chapter: "暗影线",
    chapterTitle: "败战回响",
    lines: [
      { speaker: "", text: "暗影线在重放那一战。第一舰队一遍遍地死，顺序随它高兴。" },
      { speaker: "陆昭", text: "这些是真的通讯记录。" },
      { speaker: "余烬", text: "是真的。两万人，还在陆续「抵达」。因为这里没有任何东西，能就那件事到底发生在什么时候达成一致。" },
      { speaker: "陆昭", text: "这些声音里有一个是你。我不问是哪一个。" },
      { speaker: "余烬", text: "有好几个。别去听。暗影线就是这么把人拖走的。" },
    ],
  },
  whatKadeKnows: {
    chapter: "洋紫荆本星",
    chapterTitle: "陆昭知道的事",
    lines: [
      { speaker: "", text: "最后一次出击前，在洋紫荆本星过夜。一整晚都有人来泊位上，问结束之后怎么办。" },
      { speaker: "陆昭", text: "他们在围着我做打算。" },
      { speaker: "余烬", text: "他们在围着唯一飞进暗影线又活着出来的舰长做打算。你想不想要，那都是个位置。" },
      { speaker: "余烬", text: "趁现在还轮得到你决定，决定吧。等打完了，就由所有人替你决定。" },
    ],
    choices: [
      { label: "接下这个位置，从公国内部把它改过来。", setFlags: ["secondIgnitionEnding.institutional"] },
      { label: "不接。在旧秩序之外，另起一摊。", setFlags: ["secondIgnitionEnding.coalition"] },
      { label: "打完就走。只留船员和这艘船，别的都不要。", setFlags: ["secondIgnitionEnding.personal"] },
    ],
  },
  secondIgnition: {
    chapter: "暗影线",
    chapterTitle: "二次点火",
    lines: [
      { speaker: "", text: "那道缝裂得比第一舰队见过的任何时候都宽。「絮语」号第一个进去，因为只有她进得去。" },
      { speaker: "余烬", text: "这就是我上次做不到的事。我有一整支舰队，却没有一艘船撑得住关上它的代价。" },
      { speaker: "陆昭", text: "现在你有了。告诉我封上它要付什么。" },
      { speaker: "余烬", text: "现在我有一艘船，被一个本来活不到今天的人重铸了十一次。全烧进去，陆昭。她有多少烧多少。" },
    ],
  },
  secondIgnitionEpilogue: {
    chapter: "暗影线",
    chapterTitle: "疆域记得什么",
    lines: [
      { speaker: "", text: "缝合上了。花了十一个小时，还有「絮语」号大半的装甲。然后，仪表终于不再互相打架。" },
      { speaker: "陆昭", text: "安静了。" },
      { speaker: "余烬", text: "这里四百年来第一次安静。" },
      { speaker: "陆昭", text: "你说过我会在二十年后死。" },
      { speaker: "余烬", text: "你确实死了——在那个没人关上它的版本里。接下来会怎样，我不知道。陆昭，这是我给过你最好的消息。" },
    ],
  },
};
