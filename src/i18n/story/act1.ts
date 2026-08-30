import type { StoryScene } from "../../data/types";

/** 洋紫荆疆域 —— 中文文本。
 *
 * 2026-08-29 重写。玩家反馈:「中文剧本简直垃圾，什么都看不懂」。原因有二:
 *
 * 1. 人名全是音译(凯德·任、卡恩·费洛斯、奥莉·瓦什提)，读起来像劣质译制片。
 *    更糟的是同一个角色在不同文件里有两个不同音译，玩家会以为是两个人。
 *    现已统一为中文名:陆昭、铁衡、柳芸、安鹤龄、苏萤、云筝。
 * 2. 句式是英译中——长从句、破折号套破折号、抽象名词堆叠。现按中文的节奏重写:
 *    短句为主，先说具体发生了什么，再说它意味着什么，最后说该做什么。
 *
 * 行数与英文严格一致(story.test.ts 会校验)，选项的 setFlags 一律不动。
 */
export const ACT1_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  coldWake: {
    chapter: "苋红星带",
    chapterTitle: "寒醒",
    lines: [
      { speaker: "", text: "二十年后，你会死在这艘船上。船体裂开，舰桥断电，旗舰在你四周一块块散掉。" },
      { speaker: "余烬", text: "那是你的结局。我把你送回了结局之前。" },
      { speaker: "陆昭", text: "送回……你到底是什么东西？" },
      { speaker: "余烬", text: "以后再说。你现在在「絮语」号上，一艘废品级轻护卫舰。她是你和那个结局之间唯一的东西。" },
      { speaker: "余烬", text: "先干活。前面星带里有一片残骸，能拆的都拆回来。" },
    ],
  },
  firstBlood: {
    chapter: "茶隼歇息地",
    chapterTitle: "初血",
    lines: [
      { speaker: "", text: "两艘掠夺者快艇被剖开，断面还在冒热气。「絮语」号左舷被犁出一道长沟。" },
      { speaker: "陆昭", text: "她撑住了。" },
      { speaker: "余烬", text: "撑住是因为你打在她火炮擅长的距离上。每次都这么打，她就能一直撑住。" },
      { speaker: "余烬", text: "接下来是重点。把这两艘残骸拖回来，我能把上面的东西熔进她的骨架:装甲、线缆、掠夺者焊上去的破烂，都算。" },
      { speaker: "陆昭", text: "也就是说，她会越打越强。" },
      { speaker: "余烬", text: "她不会被换掉，只会被重铸。至于能铸到什么地步——等她撑破自己这个舰级的时候，你再问我。" },
    ],
  },
  theLedger: {
    chapter: "洋紫荆本星",
    chapterTitle: "账册",
    lines: [
      { speaker: "", text: "洋紫荆本星，登记处。安氏的书记员翻着「絮语」号的档案，从头到尾没抬眼。" },
      { speaker: "安氏书记员", text: "废品级，独立船籍。可你挂着的火力，超了注册等级整整两级。" },
      { speaker: "陆昭", text: "那是上周朝我开火的东西。我把它拆下来了。" },
      { speaker: "安氏书记员", text: "本家一向留意长得太快的独立船主。舰长，这句话算提醒，只说一次。" },
      { speaker: "余烬", text: "你话还没说完，他就已经把你归档了。从现在起，他们会盯着你拿这艘船做什么。" },
    ],
  },
  staticAndSignal: {
    chapter: "荆棘航迹",
    chapterTitle: "静默与信号",
    lines: [
      { speaker: "", text: "荆棘航迹有一套防御网，四十年没人关过。它照样应答呼叫，也照样开火。" },
      { speaker: "余烬", text: "它其实什么都没在守。下令的人几十年前就死了，只是没人告诉它可以停。" },
      { speaker: "陆昭", text: "那就我们来告诉它。" },
      { speaker: "余烬", text: "它不听一艘轻护卫舰的话。把它打停，剩下的瞄准核心归我。" },
    ],
  },
  tigersReach: {
    chapter: "寒域锚地",
    chapterTitle: "虎鲨之手",
    lines: [
      { speaker: "", text: "掠夺者副官的快艇失去动力，正在漂。船壳还算完整，够接舷。" },
      { speaker: "掠夺者副官", text: "就凭你今天做的事，虎鲨会把这座锚地烧成灰。" },
      { speaker: "陆昭", text: "那让他自己来烧。" },
      { speaker: "余烬", text: "她没说错。你已经不只是个麻烦了，你成了一个名字。这有代价，但也有用。" },
      { speaker: "余烬", text: "「絮语」号现在扛得住更重的东西。给她升一个舰级，让他们看看要面对的是什么。" },
    ],
  },
  houseRules: {
    chapter: "洋紫荆本星",
    chapterTitle: "本家规矩",
    lines: [
      { speaker: "", text: "这回来的不是书记员。安氏派了个真正说了算的人。" },
      { speaker: "安鹤龄", text: "你把掠夺者变成了别人的麻烦，所以你有用。有用的独立船主，本家给契约；签了契约的，本家给一份像样的注册。" },
      { speaker: "陆昭", text: "那本家要什么？" },
      { speaker: "安鹤龄", text: "优先权。这艘船的优先权，还有让她这么疯长的那个东西的优先权。" },
      { speaker: "余烬", text: "他不知道我是什么，但他知道有个什么。想好了再答——他会拿这句话记住你。" },
    ],
    choices: [
      { label: "接下契约。一份像样的注册，值这条链子。", setFlags: ["arthaineConflictStyle.political"] },
      { label: "不接也不拒，让他自己去猜。先争取时间。", setFlags: ["arthaineConflictStyle.bribed"] },
      { label: "当场回绝。「絮语」号不是抵押品。", setFlags: ["arthaineConflictStyle.public"] },
    ],
  },
  emberRising: {
    chapter: "茶隼歇息地",
    chapterTitle: "余烬升起",
    lines: [
      { speaker: "", text: "虎鲨到底还是来了。他那支突击队的残骸，铺满了整条进港航道。" },
      { speaker: "陆昭", text: "这是一整支突击队。" },
      { speaker: "余烬", text: "刚才是。现在是材料。" },
      { speaker: "余烬", text: "陆昭，我把你捞回来不是为了这一仗。是为了她能吞下一整支舰队，然后比开打前更重地飞出来。" },
      { speaker: "陆昭", text: "接下来二十年，都这么干。" },
      { speaker: "余烬", text: "都这么干。再给她升一级——这片疆域太小，你很快就装不下了。" },
    ],
  },
};
