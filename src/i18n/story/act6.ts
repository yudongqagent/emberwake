import type { StoryScene } from "../../data/types";

/** Chorus Deep — Chinese overlay. */
export const ACT6_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  heroesConvergeInstitutional: {
    chapter: "洋紫荆本星",
    chapterTitle: "群英汇聚",
    lines: [
      { speaker: "", text: "他们给了你一个席位、一个头衔，以及一整条走廊里赶在午饭前想从你身上要点什么的人。" },
      { speaker: "卡恩·费洛斯", text: "你的气色比在暗影线的时候还差。" },
      { speaker: "凯德·任", text: "暗影线只想杀我一次。" },
      { speaker: "余烬", text: "不过有用。三个月，疆域拿到了一个世纪以来都没有过的巡防拨款。" },
    ],
  },
  heroesConvergeCoalition: {
    chapter: "洋紫荆本星",
    chapterTitle: "群英汇聚",
    lines: [
      { speaker: "", text: "没有席位，没有头衔。只有洋紫荆本星的一个泊位——如今疆域里半数独立船主都把它当成一个地址。" },
      { speaker: "奥莉·瓦什提", text: "你拒绝了公国的席位，却建起了一个票数压过它的东西。这要么非常聪明，要么非常走运。" },
      { speaker: "凯德·任", text: "不能两者都是吗？" },
      { speaker: "余烬", text: "通常都是两者。别告诉他们。" },
    ],
  },
  heroesConvergePersonal: {
    chapter: "洋紫荆本星",
    chapterTitle: "群英汇聚",
    lines: [
      { speaker: "", text: "你说过结束就走。你确实走了。维持了四个月。" },
      { speaker: "凯德·任", text: "我不会回到政治里去。" },
      { speaker: "卡恩·费洛斯", text: "没人要求你回去。深域之外有个谁都测绘不了的东西，而你是唯一能从那种地方回来的船组。" },
      { speaker: "余烬", text: "他在恭维你。不过也是实话。" },
    ],
  },
  seizingCommand: {
    chapter: "洋紫荆本星",
    chapterTitle: "最高指挥权",
    lines: [
      { speaker: "", text: "特遣舰队需要一个指挥官。四个势力各有人选，而谁都不肯接受别人的。" },
      { speaker: "奥莉·瓦什提", text: "所以他们会接受你的。恭喜，舰长——你是被最少人不信任的那个。" },
      { speaker: "凯德·任", text: "这是我听过最有联合体味道的一句话。" },
      { speaker: "余烬", text: "接下它。深域之外的东西，不会等一个委员会开完会。" },
    ],
  },
  boldMove: {
    chapter: "洋紫荆本星",
    chapterTitle: "伙伴，而非层级",
    lines: [
      { speaker: "凯德·任", text: "我不要指挥链。我要四支各自清楚自己最擅长什么的舰队。" },
      { speaker: "卡恩·费洛斯", text: "特遣舰队不是这样运作的。" },
      { speaker: "凯德·任", text: "但「絮语」号是这样运作的。她身上没有任何部件的地位高过另一个。它们只是各司其职。" },
      { speaker: "余烬", text: "……他在引用我的话。引得很糟。但他是对的。" },
    ],
  },
  dysonSphereSystem: {
    chapter: "合唱门槛",
    chapterTitle: "戴森球系统",
    lines: [
      { speaker: "", text: "一层相互咬合的结构，将一整颗恒星完全包裹。外侧漆黑，光线在其上织出如同乐谱的纹路。" },
      { speaker: "余烬", text: "一个完整的戴森球。不是碎片。造出这个的存在，拥有的本源精华数量我给不出数字。" },
      { speaker: "凯德·任", text: "那些哨兵的攻击方式不是阵型。" },
      { speaker: "余烬", text: "它们在以和弦攻击。我还不知道那意味着什么。但我知道它有意义。" },
    ],
  },
  gospelCivilization: {
    chapter: "戴森合唱",
    chapterTitle: "福音文明",
    lines: [
      { speaker: "", text: "这座档案库不是图书馆。它是一份文明受审的记录，而审查至今仍在运行。" },
      { speaker: "凯德·任", text: "被谁审查？" },
      { speaker: "余烬", text: "被「空壳」在它不再宽容判决之前的模样。凯德，我不认为「空壳」最初是一件武器。我认为它最初是一套标准。" },
      { speaker: "凯德·任", text: "而合唱没能达标。" },
      { speaker: "余烬", text: "合唱至今还在唱它的答辩。迟了四百年，唱给一个早已停止聆听的房间。" },
    ],
  },
  civilizationDisqualified: {
    chapter: "戴森合唱",
    chapterTitle: "文明失格",
    lines: [
      { speaker: "", text: "执礼者停了下来。不是被摧毁——是终结，像一段乐曲终结那样。" },
      { speaker: "余烬", text: "它从来不是在与你作战。它只是在对任何靠得足够近、能听见的东西，演奏它最后被要求演奏的曲目。" },
      { speaker: "凯德·任", text: "所以我们也在被审查。" },
      { speaker: "余烬", text: "是的。而不管那套标准是什么，疆域给出的答案，是一艘拒绝停止被重铸的废品级轻护卫舰。" },
      { speaker: "凯德·任", text: "这算通过吗？" },
      { speaker: "余烬", text: "这是一个答案。四百年，等一个答案已经够久了。把她提升上去，凯德——她配得上最后那副骨架。" },
    ],
  },
};
