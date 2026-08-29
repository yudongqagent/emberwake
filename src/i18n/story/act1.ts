import type { StoryScene } from "../../data/types";

/** Bauhinia Reach — Chinese overlay.
 *
 * Story rework (2026-08-29). Rewritten alongside the English so the two stay in
 * step; story.test.ts asserts identical line counts and identical choice
 * setFlags, which is what caught the drift when only the English side had been
 * rewritten.
 */
export const ACT1_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  coldWake: {
    chapter: "苋红星带",
    chapterTitle: "寒醒",
    lines: [
      { speaker: "", text: "二十年后你会死在这里。船体破裂，舰桥陷入黑暗，旗舰在你周围散架。" },
      { speaker: "余烬", text: "那是结局。我把你送回了它之前。" },
      { speaker: "凯德·任", text: "送回——你是谁？" },
      { speaker: "余烬", text: "以后再说。此刻你在「絮语」号上，一艘废品级轻护卫舰，也是唯一挡在你和那个结局之间的东西。" },
      { speaker: "余烬", text: "所以，起航。前方星带里有残骸。把里面的东西拿走。" },
    ],
  },
  firstBlood: {
    chapter: "茶隼歇息地",
    chapterTitle: "初血",
    lines: [
      { speaker: "", text: "两艘掠夺者快艇被剖开，正在冷却。「絮语」号一侧的装甲被划出长长的沟痕。" },
      { speaker: "凯德·任", text: "她撑住了。" },
      { speaker: "余烬", text: "她撑住，是因为你在她的火炮想要的距离上作战。每次都这样做，她就会一直撑下去。" },
      { speaker: "余烬", text: "现在说有用的部分。把残骸打捞上来，我能把里面的东西重新熔进她体内——装甲、线路、掠夺者焊上去的任何玩意。她不会被替换，她会被重铸。" },
      { speaker: "凯德·任", text: "这能走到多远？" },
      { speaker: "余烬", text: "比这条星带里任何东西走过的都远。等她超出自己的舰级时，再问我一次。" },
    ],
  },
  theLedger: {
    chapter: "洋紫荆本星",
    chapterTitle: "账册",
    lines: [
      { speaker: "", text: "洋紫荆本星。一名阿尔泰因家的书记员读着「絮语」号的注册档案，头也不抬。" },
      { speaker: "阿尔泰因书记员", text: "废品级。独立船籍。你携带的武器载荷超出注册等级两个级别。" },
      { speaker: "凯德·任", text: "我带的是上周朝我开火的东西。" },
      { speaker: "阿尔泰因书记员", text: "本家对成长过快的独立船主一向有兴趣。舰长，这算是一次善意提醒。不会有第二次。" },
      { speaker: "余烬", text: "你话还没说完，他就已经归档了一条记录。他们开始盯着你拿她做什么了。" },
    ],
  },
  staticAndSignal: {
    chapter: "荆棘航迹",
    chapterTitle: "静默与信号",
    lines: [
      { speaker: "", text: "荆棘航迹运转着一套四十年没人关掉的防御网。它仍会应答呼叫。它也仍会开火。" },
      { speaker: "余烬", text: "那套网什么都没在守护。设置它的人已经死了几十年——只是没人给过它停止的命令。" },
      { speaker: "凯德·任", text: "那就由我们来给。" },
      { speaker: "余烬", text: "它不会接受一艘轻护卫舰的命令。打碎它，剩下的瞄准核心我来接手。" },
    ],
  },
  tigersReach: {
    chapter: "寒域锚地",
    chapterTitle: "虎鲨之手",
    lines: [
      { speaker: "", text: "掠夺者副官的快艇失去动力漂流着，船体还完整到足以接舷。" },
      { speaker: "掠夺者副官", text: "就凭你刚才做的，虎鲨会烧了这座锚地。" },
      { speaker: "凯德·任", text: "那就让他自己来烧。" },
      { speaker: "余烬", text: "她没说错。你已经从一个麻烦，变成了一个名字。这有代价——也有用处。" },
      { speaker: "余烬", text: "「絮语」号现在能承载超出她原本设计的东西了。把她提升一个舰级。让他们看看要来的是什么。" },
    ],
  },
  houseRules: {
    chapter: "洋紫荆本星",
    chapterTitle: "本家规矩",
    lines: [
      { speaker: "", text: "这次不是书记员。阿尔泰因家派来的是一个真正拥有东西的人。" },
      { speaker: "阿尔泰因爵士", text: "你把掠夺者变成了别人的麻烦，这让你有了用处。有用的独立船主能拿到契约。签了契约的独立船主，能拿到一份不算笑话的注册。" },
      { speaker: "凯德·任", text: "那本家得到什么？" },
      { speaker: "阿尔泰因爵士", text: "优先权。对这艘船，也对让她这样疯长的东西。" },
      { speaker: "余烬", text: "他不知道我是什么。但他知道有什么。谨慎选择——他会用这个回答记住你。" },
    ],
    choices: [
      { label: "接受契约。一份不算笑话的注册，值得戴上这条链子。", setFlags: ["arthaineConflictStyle.political"] },
      { label: "什么都不说，任他去猜。争取时间。", setFlags: ["arthaineConflictStyle.bribed"] },
      { label: "当场拒绝。「絮语」号不是抵押品。", setFlags: ["arthaineConflictStyle.public"] },
    ],
  },
  emberRising: {
    chapter: "茶隼歇息地",
    chapterTitle: "余烬升起",
    lines: [
      { speaker: "", text: "虎鲨终究还是来了锚地。他那支突击队剩下的残骸，散落在整条进港航道上。" },
      { speaker: "凯德·任", text: "那是整支突击队。" },
      { speaker: "余烬", text: "那曾经是整支突击队。现在它是材料。" },
      { speaker: "余烬", text: "凯德——这才是我把你带回来的原因。不是这场胜仗。而是她能吞下一整支舰队，然后比进去时更重地走出来。" },
      { speaker: "凯德·任", text: "二十年都这样。" },
      { speaker: "余烬", text: "二十年都这样。再提升她一次。这片疆域太小了，你迟早会超出它。" },
    ],
  },
};
