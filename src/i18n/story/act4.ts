import type { StoryScene } from "../../data/types";

/** Deep Origin — Chinese overlay. */
export const ACT4_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  firstFleetRuins: {
    chapter: "第一舰队坟场",
    chapterTitle: "第一舰队的残骸",
    lines: [
      { speaker: "", text: "数百具船体，全部朝着同一个方向。没有一艘曾经掉头逃跑。" },
      { speaker: "凯德·任", text: "这是一支撞在墙上败掉的舰队。" },
      { speaker: "余烬", text: "这是第一舰队。他们来这里是为了关上某个东西，而他们没能关上。" },
      { speaker: "凯德·任", text: "你怎么知道的。" },
      { speaker: "余烬", text: "因为我就在其中一艘上。" },
    ],
  },
  ghostProtocol: {
    chapter: "构装体零号锚点",
    chapterTitle: "幽灵协议",
    lines: [
      { speaker: "", text: "零号锚点仍在运行一套没人写下来的协议。它把来访者分成两类。" },
      { speaker: "余烬", text: "舰队，或非舰队。「絮语」号被判定为舰队。" },
      { speaker: "凯德·任", text: "因为你。" },
      { speaker: "余烬", text: "因为她体内的东西。构装体会让你靠港。但它们也绝不会让你带走任何它们认为属于自己的东西。" },
    ],
  },
  sirArthurEndgame: {
    chapter: "洋紫荆本星",
    chapterTitle: "亚瑟爵士的终局",
    lines: [
      { speaker: "", text: "亚瑟·阿尔泰因爵士花了一年时间，把自己的名字挂在你的打捞品上。仲裁庭终于注意到了。" },
      { speaker: "阿尔泰因爵士", text: "你从帷幕里拖出来的一切，都归档在一份本家特许权之下。要争，你就得在听证厅里耗三年。" },
      { speaker: "凯德·任", text: "否则呢？" },
      { speaker: "阿尔泰因爵士", text: "否则我们各留各的。舰长，你不是第一个在外面找到东西的人。你只是第一个撑了这么久还活着的。" },
      { speaker: "余烬", text: "他知道的比他该知道的多。想清楚你要怎么了结——它会跟着你。" },
    ],
    choices: [
      { label: "交给仲裁庭。公开处理，代价多大就多大。", setFlags: ["arthaineResolution.formal"] },
      { label: "私下了结。他脱身，你也脱身。", setFlags: ["arthaineResolution.private"] },
      { label: "让他试试。所有事情都摊开，他的和你的。", setFlags: ["arthaineResolution.exposed"] },
    ],
  },
  whatTheFireRemembers: {
    chapter: "构装体零号锚点",
    chapterTitle: "火记得什么",
    lines: [
      { speaker: "余烬", text: "你问过是谁切开了那个口子。是我。不是我一个人，但我在场，而且我主张这么做。" },
      { speaker: "凯德·任", text: "第一舰队。" },
      { speaker: "余烬", text: "我们打开了一条通路，通向一个文明都用不完的源点。有东西顺着它回来了。舰队在关闭它的过程中死光，而我钻进了最后一样还在燃烧的东西里。" },
      { speaker: "余烬", text: "然后我等。等到我找到一个反正都要死的舰长，把他送回二十年前，重新开始。" },
      { speaker: "凯德·任", text: "你选我，是因为我已经完了。" },
      { speaker: "余烬", text: "我选你，是因为在一切都不再可能存活之后，只有你还在继续飞。想说什么就说吧。我听着。" },
    ],
    choices: [
      { label: "「我还不知道你存在的时候，你就已经在利用我了。」", setFlags: ["cinderReveal.anger"] },
      { label: "「这改变不了我们一起造出来的东西。」", setFlags: ["cinderReveal.acceptance"] },
      { label: "「以后再说。那个口子里还在过来什么？」", setFlags: ["cinderReveal.focus"] },
    ],
  },
  lastShipyard: {
    chapter: "构装体零号锚点",
    chapterTitle: "最后的船坞",
    lines: [
      { speaker: "", text: "建造了第一舰队的船坞仍在这里，仍有动力，也仍然拒绝开启。" },
      { speaker: "余烬", text: "它认得我。问题就在这儿——它知道我当年同意了什么。" },
      { speaker: "凯德·任", text: "那就让它看着你接下来做什么。" },
      { speaker: "余烬", text: "……可以。把「絮语」号开进去。那支舰队本该成为的一切都在里面，而且从没被用过。" },
    ],
  },
  deepOriginFinale: {
    chapter: "构装体零号锚点",
    chapterTitle: "深层本源",
    lines: [
      { speaker: "", text: "方舟开启了。里面的不是武器——是一具未完成的船体，等着什么东西来把它完成。" },
      { speaker: "凯德·任", text: "它和她是同一个形状。" },
      { speaker: "余烬", text: "那是她从星带起就一直在长向的形状。这不是我设计的。我只是知道，只要她活得够久，就会变成什么。" },
      { speaker: "凯德·任", text: "那现在呢？" },
      { speaker: "余烬", text: "现在她能承载主权级的骨架了。之后，就只剩暗影线——以及第一舰队没能关上的东西。" },
    ],
  },
};
