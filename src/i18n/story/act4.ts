import type { StoryScene } from "../../data/types";

/** 深层本源 —— 中文文本。2026-08-29 按中文语感重写。这一段是全作的揭底。 */
export const ACT4_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  firstFleetRuins: {
    chapter: "第一舰队坟场",
    chapterTitle: "第一舰队的残骸",
    lines: [
      { speaker: "", text: "几百具船体，全都朝着同一个方向。没有一艘掉过头。" },
      { speaker: "陆昭", text: "这是一支撞在墙上、然后全军覆没的舰队。" },
      { speaker: "余烬", text: "这是第一舰队。他们来这里，是要关上某个东西。他们没关上。" },
      { speaker: "陆昭", text: "你怎么知道？" },
      { speaker: "余烬", text: "因为我当时就在其中一艘上。" },
    ],
  },
  ghostProtocol: {
    chapter: "构装体零号锚点",
    chapterTitle: "幽灵协议",
    lines: [
      { speaker: "", text: "零号锚点还在跑一套没有文档的协议。它把来客分成两类。" },
      { speaker: "余烬", text: "舰队，和非舰队。「絮语」号被判成了舰队。" },
      { speaker: "陆昭", text: "因为你。" },
      { speaker: "余烬", text: "因为她体内的东西。构装体会放你靠港，但绝不会让你带走任何它认定属于自己的东西。" },
    ],
  },
  sirArthurEndgame: {
    chapter: "洋紫荆本星",
    chapterTitle: "安鹤龄的终局",
    lines: [
      { speaker: "", text: "整整一年，安鹤龄把自己的名字往你的打捞品上挂。仲裁庭终于看见了。" },
      { speaker: "安鹤龄", text: "你从帷幕里拖回来的一切，都归在本家的特许权名下。要争，你就得在听证厅里耗三年。" },
      { speaker: "陆昭", text: "不争呢？" },
      { speaker: "安鹤龄", text: "不争，我们各留各的。舰长，你不是第一个在外面找到东西的人，你只是第一个撑到现在还活着的。" },
      { speaker: "余烬", text: "他知道的比他该知道的多。你打算怎么了结——这事会一直跟着你。" },
    ],
    choices: [
      { label: "交仲裁庭。摆在明面上办，代价照付。", setFlags: ["arthaineResolution.formal"] },
      { label: "私下了结。他脱身，你也脱身。", setFlags: ["arthaineResolution.private"] },
      { label: "让他动手。全都抖出来，他的和你的一起。", setFlags: ["arthaineResolution.exposed"] },
    ],
  },
  whatTheFireRemembers: {
    chapter: "构装体零号锚点",
    chapterTitle: "火记得什么",
    lines: [
      { speaker: "余烬", text: "你问过那个口子是谁切的。是我。不止我一个，但我在场，而且是我主张要切的。" },
      { speaker: "陆昭", text: "第一舰队。" },
      { speaker: "余烬", text: "我们凿开了一条路，通向多到一个文明都用不完的源点。然后有东西顺着那条路回来了。舰队拼着命关上了一部分，全灭。我钻进了最后一样还在烧的东西里。" },
      { speaker: "余烬", text: "然后我一直等。等到找见一个反正都要死的舰长，把他送回二十年前，重来一次。" },
      { speaker: "陆昭", text: "你挑我，是因为我本来就完了。" },
      { speaker: "余烬", text: "我挑你，是因为在一切都没救之后，只有你还在往前飞。你想说什么就说吧。我听着。" },
    ],
    choices: [
      { label: "「我还不知道你存在的时候，你就已经在用我了。」", setFlags: ["cinderReveal.anger"] },
      { label: "「这不改变我们一起造出来的东西。」", setFlags: ["cinderReveal.acceptance"] },
      { label: "「以后再算账。那个口子里现在还在进什么？」", setFlags: ["cinderReveal.focus"] },
    ],
  },
  lastShipyard: {
    chapter: "构装体零号锚点",
    chapterTitle: "最后的船坞",
    lines: [
      { speaker: "", text: "造出第一舰队的那座船坞还在，还有电，也还是不肯开门。" },
      { speaker: "余烬", text: "它认得我。麻烦就在这儿——它知道我当年点了头。" },
      { speaker: "陆昭", text: "那就让它看着你接下来怎么做。" },
      { speaker: "余烬", text: "……也行。把「絮语」号开进去。那支舰队本该变成的东西全在里面，一样都没用过。" },
    ],
  },
  deepOriginFinale: {
    chapter: "构装体零号锚点",
    chapterTitle: "深层本源",
    lines: [
      { speaker: "", text: "方舟开了。里面不是武器，是一具没造完的船体，等着什么东西来把它造完。" },
      { speaker: "陆昭", text: "这形状……和她一样。" },
      { speaker: "余烬", text: "这是她从星带那天起就一直在长的形状。不是我设计的。我只是知道，只要她活得够久，就会长成这样。" },
      { speaker: "陆昭", text: "那接下来呢？" },
      { speaker: "余烬", text: "接下来她能扛住主权级的骨架了。再往后，就只剩暗影线——和第一舰队没能关上的那个东西。" },
    ],
  },
};
