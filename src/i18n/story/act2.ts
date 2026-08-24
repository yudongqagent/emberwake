import type { StoryScene } from "../../data/types";

/** Chinese translation of src/data/story/act2.ts. Original prose, translated not
 * sourced — see act1.ts's glossary comment for the running character/place-name list.
 * New this act: Kaan Ferrous → 凯恩·费罗斯, Priya Osei → 普里娅·奥塞伊,
 * Ferrous Gate → 铁境关, Meridian Exchange → 子午集市, Ashenvale → 灰烬谷,
 * Hollow Fleet Yard → 空巢船坞 (distinct from "The Hollow" endgame faction, which
 * gets its own distinct term when that content is translated), Driftmarket → 浮游市集,
 * Hawke (Tiger Shark's lieutenant) → 霍克. */
export const ACT2_SCENES_ZH: Record<string, Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">> = {
  openLanes: {
    chapter: "第二幕 第一章",
    chapterTitle: "开放航道",
    lines: [
      { speaker: "", text: "铁境关。「絮语」号刚清关不久，一艘狮心盟约（Lionsheart Concord）的快艇就脱离编队降落——盟约的规矩：在获得信任之前，先证明你的战舰。" },
      { speaker: "剑客凯恩·费罗斯", text: "洋紫荆的旗色，洋紫荆式的好运。让我看看这旗色下面有没有一个真正的船长。" },
      { speaker: "", text: "决斗短促而锋利，「絮语」号占尽上风，毫无悬念。" },
      { speaker: "凯恩·费罗斯", text: "……哈。这可不是运气。" },
      { speaker: "凯恩·费罗斯", text: "凯恩·费罗斯。我不轻信容易得来的东西——但信任自己的直觉是另一回事。在我想清楚这到底是哪一种之前，我跟你走。" },
    ],
  },
  tradeWinds: {
    chapter: "第二幕 第二章",
    chapterTitle: "贸易之风",
    lines: [
      { speaker: "", text: "子午集市，天鹅礁联合体（Swanreach Combine）的地盘。这里的贸易航道比疆域内任何地方都更繁忙——而洋紫荆的旗色招来的更多是猜忌，而非欢迎。" },
      { speaker: "军需官普里娅·奥塞伊", text: "疆域的关税上个季度让我们损失了三支商队。给我一个批准你靠泊的理由。" },
      { speaker: "", text: "「絮语」号的货舱里还装满了从铁境关带来的货物。凯德按联合体的价格公平交易，不讨价还价。" },
      { speaker: "普里娅·奥塞伊", text: "……这就是理由。大多数船长都是先讨价还价，事后从不道歉。我管后勤——如果你愿意，我也可以替你管。" },
    ],
  },
  bloodDebt: {
    chapter: "第二幕 第三章",
    chapterTitle: "血债",
    lines: [
      { speaker: "", text: "灰烬谷，盟约的首都。议会里已经有传言，把凯德钉成了洋紫荆的代理人，说他是在把疆域的势力延伸进这片疆域。" },
      { speaker: "", text: "花了三天暗中调查，才找到源头——一个熟悉的名字，正通过代理人操纵议会。" },
      { speaker: "凯恩·费罗斯", text: "阿尔泰因。你的宫廷游戏跟到这里来了。" },
      { speaker: "凯德·任", text: "每次都不是同一张脸。新地盘，新代理人，背后是同一只手。这就是规律——不到万不得已，他从不亲自出面。" },
      { speaker: "", text: "在议会就盟约与疆域的关系投票之前，这些证据足以为凯德正名。不那么清楚的是，该用多高调的方式使用它。" },
    ],
    choices: [
      { label: "正式呈交议会。", setFlags: ["act2.bloodDebt.formal"] },
      { label: "用它悄悄施压，逼阿尔泰因收手。", setFlags: ["act2.bloodDebt.blackmail"] },
    ],
  },
  hollowFleet: {
    chapter: "第二幕 第四章",
    chapterTitle: "空巢舰队",
    lines: [
      { speaker: "", text: "凯恩在盟约的人脉查出了一座藏在争议空域深处的隐秘掠夺者船坞——这解释了掠夺者为何总能补上凯德击沉的战力。" },
      { speaker: "", text: "船坞在他们身后燃烧。核心处，霍克——虎鲨的另一名副手——做出了最后的抵抗，却败下阵来。" },
      { speaker: "霍克", text: "告诉凯莎，这片疆域不会像她希望的那样轻易原谅。" },
      { speaker: "", text: "他说这话时不像是在威胁。更像是他已经知道掠夺者的结局会是什么。" },
    ],
  },
  ridgeAndReach: {
    chapter: "第二幕 第五章",
    chapterTitle: "山脊与疆域",
    lines: [
      { speaker: "", text: "旧有的摩擦终于爆发：狮心盟约的荣誉文化与天鹅礁的交易文化，因一场边境事件正面碰撞，双方都不肯退让。" },
      { speaker: "普里娅·奥塞伊", text: "天鹅礁不会为正当生意道歉。" },
      { speaker: "凯恩·费罗斯", text: "盟约也不会为保卫自己的地盘道歉。" },
      { speaker: "", text: "无论凯德接下来做什么，两个阵营都会在这次事件被遗忘之后，长久地记住他的选择。" },
    ],
    choices: [
      { label: "在两方之间斡旋和平。", setFlags: ["ridgeReachOutcome.peace"] },
      { label: "任由摩擦发酵——从这场动荡中获利。", setFlags: ["ridgeReachOutcome.exploited"] },
      { label: "支持狮心盟约。", setFlags: ["ridgeReachOutcome.lionsheart"] },
      { label: "支持天鹅礁联合体。", setFlags: ["ridgeReachOutcome.swanreach"] },
    ],
  },
  firstContact: {
    chapter: "第二幕 第六章",
    chapterTitle: "第一次接触",
    lines: [
      { speaker: "", text: "浮游市集的边境传感器记录到了新的东西——从未被编目的生物信号，正以一种完全不像海盗的耐心，测绘着贸易航道。" },
      { speaker: "余烬", text: "扫描捕捉到领头船体上有一处结构——排列有序，出于设计，不是装甲。更像是图腾，而不是武器。这些不只是斥候。它们是被标记过的。" },
      { speaker: "", text: "「絮语」号的炮火刚记录下第一次击杀，那些斥候就立刻脱离。它们根本不是来战斗的。" },
      { speaker: "余烬", text: "它们是来丈量你的。这可不是小事。" },
      { speaker: "凯德·任", text: "丈量我做什么？" },
      { speaker: "余烬", text: "……我还不知道。但这种感觉我曾经体会过。在某个我想不起来的地方。" },
    ],
  },
  reachOpens: {
    chapter: "第二幕 第七章",
    chapterTitle: "疆域洞开（第二幕终章）",
    lines: [
      { speaker: "", text: "斥候并非孤身而来。一场真正的甲壳虫群（Chitin Swarm）入侵，全力冲击铁境关边境——这是这片疆域有史以来见过的最大规模。" },
      { speaker: "", text: "「絮语」号坚守防线，直到防线崩溃——崩溃的是敌人的，不是她的。" },
      { speaker: "凯恩·费罗斯", text: "那不是一次突袭。那是一次试探。" },
      { speaker: "余烬", text: "这里的本源精华足够改装一艘战列舰级战舰了。而且，这片疆域比我们以为的要大得多，这一点已经确凿无疑。" },
    ],
  },
};
