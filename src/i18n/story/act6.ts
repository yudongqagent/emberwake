import type { StoryScene } from "../../data/types";

/** 合唱深域 —— 中文文本。2026-08-29 按中文语感重写。 */
export const ACT6_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  heroesConvergeInstitutional: {
    chapter: "洋紫荆本星",
    chapterTitle: "群英汇聚",
    lines: [
      { speaker: "", text: "他们给了你一个席位、一个头衔，外加一条走廊的人——每个都想在午饭前从你这儿拿走点什么。" },
      { speaker: "铁衡", text: "你气色比在暗影线的时候还差。" },
      { speaker: "陆昭", text: "暗影线只想杀我一次。" },
      { speaker: "余烬", text: "不过管用。三个月，疆域拿到了一百年都没拿到过的巡防拨款。" },
    ],
  },
  heroesConvergeCoalition: {
    chapter: "洋紫荆本星",
    chapterTitle: "群英汇聚",
    lines: [
      { speaker: "", text: "没席位，没头衔。只有洋紫荆本星的一个泊位。如今疆域里半数独立船主，把它当成一个地址。" },
      { speaker: "柳芸", text: "你推掉了公国的席位，却搭起了一个票数压过它的东西。这要么是很聪明，要么是很走运。" },
      { speaker: "陆昭", text: "不能两样都占？" },
      { speaker: "余烬", text: "通常都是两样都占。别告诉他们。" },
    ],
  },
  heroesConvergePersonal: {
    chapter: "洋紫荆本星",
    chapterTitle: "群英汇聚",
    lines: [
      { speaker: "", text: "你说过打完就走。你确实走了，走了四个月。" },
      { speaker: "陆昭", text: "我不会再碰政治。" },
      { speaker: "铁衡", text: "没人要你碰。深域外面有个谁都测不出来的东西，而能从那种地方回来的，只有你这一船人。" },
      { speaker: "余烬", text: "他在捧你。不过也是实话。" },
    ],
  },
  seizingCommand: {
    chapter: "洋紫荆本星",
    chapterTitle: "最高指挥权",
    lines: [
      { speaker: "", text: "特遣舰队得有一个指挥官。四个势力各推一个，谁也不肯认别人的。" },
      { speaker: "柳芸", text: "所以他们只能认你。恭喜，舰长——你是被最少人讨厌的那个。" },
      { speaker: "陆昭", text: "这话听着真有联合体的味道。" },
      { speaker: "余烬", text: "接下来。深域外面的东西，不会等一个委员会开完会。" },
    ],
  },
  boldMove: {
    chapter: "洋紫荆本星",
    chapterTitle: "并肩，而非上下",
    lines: [
      { speaker: "陆昭", text: "我不要指挥链。我要四支舰队，各自清楚自己最擅长什么。" },
      { speaker: "铁衡", text: "特遣舰队不是这么带的。" },
      { speaker: "陆昭", text: "可「絮语」号就是这么造的。她身上没有哪个部件比另一个高一等，各干各的那一份。" },
      { speaker: "余烬", text: "……他在引用我的话。引得很烂。但他说得对。" },
    ],
  },
  dysonSphereSystem: {
    chapter: "合唱门槛",
    chapterTitle: "戴森球",
    lines: [
      { speaker: "", text: "一层咬合的结构，把一整颗恒星整个裹住。外侧漆黑，光在上面走出像乐谱一样的纹路。" },
      { speaker: "余烬", text: "完整的戴森球，不是碎片。造得出这个的存在，手里的本源精华多到我算不出数。" },
      { speaker: "陆昭", text: "那些哨兵冲上来的方式，不是阵型。" },
      { speaker: "余烬", text: "是和弦。它们在用和弦进攻。我还不知道这意味着什么，但它一定有意义。" },
    ],
  },
  gospelCivilization: {
    chapter: "戴森合唱",
    chapterTitle: "福音文明",
    lines: [
      { speaker: "", text: "这不是一座图书馆。这是一份「某个文明受审」的记录，而审判至今还没停。" },
      { speaker: "陆昭", text: "谁在审？" },
      { speaker: "余烬", text: "「空壳」。是它还愿意讲道理的时候的样子。陆昭，我现在觉得「空壳」最初不是武器，是一套标准。" },
      { speaker: "陆昭", text: "而合唱没达标。" },
      { speaker: "余烬", text: "合唱到现在还在唱它的申辩。迟了四百年，唱给一个早就不听了的房间。" },
    ],
  },
  civilizationDisqualified: {
    chapter: "戴森合唱",
    chapterTitle: "文明失格",
    lines: [
      { speaker: "", text: "执礼者停了。不是被打碎——是收尾，像一支曲子收尾那样。" },
      { speaker: "余烬", text: "它从头到尾都不是在跟你打。它只是把最后接到的那支曲子，演给任何靠得够近、听得见的东西。" },
      { speaker: "陆昭", text: "所以我们也一直在被审。" },
      { speaker: "余烬", text: "一直在。不管那套标准是什么，疆域交上去的答卷，是一艘死活不肯停止重铸的废品级轻护卫舰。" },
      { speaker: "陆昭", text: "这算过了吗？" },
      { speaker: "余烬", text: "这算一个回答。四百年，等一个回答也够久了。把她升上去吧，陆昭——最后那副骨架，她配得上。" },
    ],
  },
};
