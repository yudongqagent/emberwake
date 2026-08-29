import type { StoryScene } from "../../data/types";

/** The Umbral Line — Chinese overlay. */
export const ACT5_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  callingTheReach: {
    chapter: "洋紫荆本星",
    chapterTitle: "召集疆域",
    lines: [
      { speaker: "", text: "你呼叫了每一个欠你东西的势力。大多数都来了——这让所有人都意外，包括你自己。" },
      { speaker: "卡恩·费洛斯", text: "协约会守住一条航道。一条。别开口要第二条。" },
      { speaker: "奥莉·瓦什提", text: "联合体承担损失。这不是慷慨，是算术——暗影线一旦洞开，就没有市场可做生意了。" },
      { speaker: "凯德·任", text: "比我预期的多。" },
      { speaker: "余烬", text: "这只是第一舰队拥有过的一小部分。记住他们的下场。" },
    ],
  },
  umbralLineApproach: {
    chapter: "暗影线",
    chapterTitle: "暗影线",
    lines: [
      { speaker: "", text: "暗影线不是边界。它是一道接缝，而光在它附近举止失常。" },
      { speaker: "凯德·任", text: "仪器彼此矛盾。" },
      { speaker: "余烬", text: "它们没错。这么近的距离上，两组读数都是真的。这就是接缝干的事。" },
      { speaker: "余烬", text: "用你飞其他一切的方式飞它。选一个距离，守住它，别相信任何告诉你这里安全的东西。" },
    ],
  },
  echoesOfTheLosingBattle: {
    chapter: "暗影线",
    chapterTitle: "败战回响",
    lines: [
      { speaker: "", text: "暗影线在重播它。第一舰队，一遍又一遍地死去，顺序全凭它高兴。" },
      { speaker: "凯德·任", text: "那些是真实的通讯。" },
      { speaker: "余烬", text: "是真的。两万人，仍在陆续抵达，因为这里没有任何东西就「它何时发生」达成一致。" },
      { speaker: "凯德·任", text: "其中有你吗？" },
      { speaker: "余烬", text: "好几个。别去听。暗影线就是这样把人带走的。" },
    ],
  },
  whatKadeKnows: {
    chapter: "洋紫荆本星",
    chapterTitle: "凯德知道的事",
    lines: [
      { speaker: "", text: "最后一次出击前，在洋紫荆本星的一夜。人们不断来到泊位，问结束之后会怎样。" },
      { speaker: "凯德·任", text: "他们在围着我做规划。" },
      { speaker: "余烬", text: "他们在围着唯一飞过暗影线又活着回来的舰长做规划。不管你想不想要，那都是一个位置。" },
      { speaker: "余烬", text: "趁现在还由你决定，决定吧。之后，所有人都会替你决定。" },
    ],
    choices: [
      { label: "接下那个位置。从公国内部改造它。", setFlags: ["secondIgnitionEnding.institutional"] },
      { label: "拒绝那个位置。在旧秩序之外另建一个。", setFlags: ["secondIgnitionEnding.coalition"] },
      { label: "结束后就离开。只要船员，只要这艘船，别无其他。", setFlags: ["secondIgnitionEnding.personal"] },
    ],
  },
  secondIgnition: {
    chapter: "暗影线",
    chapterTitle: "二次点火",
    lines: [
      { speaker: "", text: "接缝敞开得比第一舰队见过的任何时候都宽。「絮语」号第一个进去，因为只有她能。" },
      { speaker: "余烬", text: "这就是我上一次做不到的部分。我有一支舰队，却没有一艘船撑得住关闭它的代价。" },
      { speaker: "凯德·任", text: "那现在呢？" },
      { speaker: "余烬", text: "现在我有一艘船，被一个本不该活这么久的人重铸了十一次。全烧掉，凯德。她拥有的一切。" },
    ],
  },
  secondIgnitionEpilogue: {
    chapter: "暗影线",
    chapterTitle: "疆域记得什么",
    lines: [
      { speaker: "", text: "接缝闭合了。用了十一个小时，和「絮语」号大部分的装甲。然后，仪器重新彼此一致。" },
      { speaker: "凯德·任", text: "很安静。" },
      { speaker: "余烬", text: "这是四百年来，这里第一次安静。" },
      { speaker: "凯德·任", text: "你说过我会在二十年后死。" },
      { speaker: "余烬", text: "你确实死了。在那个没人关上它的版本里。我不知道现在会发生什么——而凯德，这是我给过你最好的消息。" },
    ],
  },
};
