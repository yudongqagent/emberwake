import type { StoryScene } from "../../data/types";

/** Chinese translation of src/data/story/act4.ts. Original prose, translated not
 * sourced — see act1.ts's glossary. New this act: Deep Origin → 深源,
 * Mayeth Constructs → 玛耶斯构装体, First Fleet Graveyard → 初代舰队坟场,
 * Construct Anchor Zero → 构装体零号锚点, Unit 7-Requiem → 七号安魂机,
 * The Hollow → 「虚无」, Umbral Line → 暗影线. */
export const ACT4_SCENES_ZH: Record<string, Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">> = {
  firstFleetRuins: {
    chapter: "第四幕 第一章",
    chapterTitle: "初代舰队遗迹",
    lines: [
      { speaker: "", text: "深源。庞大而沉眠的巨构漂浮在残破舰队之间，古老到疆域中没有任何一个阵营能说出建造者的名字。" },
      { speaker: "余烬", text: "玛耶斯构装体。一个已灭绝的文明——自动化，而非好战。这里的一切都是防御性的、按程序运作的。没有任何东西的反应像是活物。" },
      { speaker: "凯德·任", text: "这话听起来本该让人安心的。" },
      { speaker: "余烬", text: "但并没有，对吧。我也不喜欢这样。远离封锁区域，它应该会保持安静。" },
      { speaker: "", text: "它没有保持安静。「絮语」号一靠近一处封闭锚点，几架防御无人机立刻启动。" },
    ],
  },
  ghostProtocol: {
    chapter: "第四幕 第二章",
    chapterTitle: "幽灵协议",
    lines: [
      { speaker: "", text: "构装体零号锚点。更深的闯入触发了真正的防御反应——完整的战术体系，精准而无情，与之前那些零散的无人机截然不同。" },
      { speaker: "", text: "战斗过后的残骸中，一个仍在运作的残片启动并开口——小心翼翼，像是在重新学习该怎么说话。" },
      { speaker: "七号安魂机", text: "七号安魂机。很久以前，我从集体中分裂了出来，而不是去完成其他单位被造来完成的事。" },
      { speaker: "余烬", text: "……我认得那个编号。" },
      { speaker: "七号安魂机", text: "我也认得你。或者说，认得你剩下的部分——一个残片，寄居在一具活的船体里。我没想到我们之中还有谁是以这种方式活下来的。" },
      { speaker: "凯德·任", text: "你们两个认识。" },
      { speaker: "七号安魂机", text: "不完全算认识。但我认得这种形态。船长，无论你身上正在发生什么，我大概都能帮上比你想象中更多的忙。我跟你走。" },
    ],
  },
  sirArthurEndgame: {
    chapter: "第四幕 第三章",
    chapterTitle: "阿瑟爵士的终局",
    lines: [
      { speaker: "", text: "再次回到洋紫荆本星。手握蛹壳广域的证据，凯德终于逼出了阿瑟爵士躲避了整整两幕的清算。" },
      { speaker: "", text: "在整个议会面前：与虫群相关中间商的私下交易，用舰队与边境情报换取个人利益，而疆域的边境正在燃烧。" },
      { speaker: "阿瑟·阿尔泰因爵士", text: "野心不是罪，船长。输掉才是。" },
      { speaker: "塞拉芬·阿尔泰因", text: "父亲。告诉我这不是真的。告诉我，我就会相信你，因为我想相信。我一直都想相信。" },
      { speaker: "", text: "他没有回答她。这份沉默，比呈交议会的任何证据都更像是答案。" },
      { speaker: "林一菲侯爵夫人", text: "证据确凿，船长。如何处置由你决定——无论你选哪条路，我都支持。" },
    ],
    choices: [
      { label: "正式揭露并公开审判——干净、公开，将洋紫荆的声望利益最大化。", setFlags: ["arthaineResolution.formal"] },
      { label: "通过林一菲私下发出最后通牒——放阿尔泰因家族一马，但会付出一些代价。", setFlags: ["arthaineResolution.private"] },
      { label: "任由他试图反咬一口——更混乱，但坦然承受走到这一步的代价。", setFlags: ["arthaineResolution.exposed"] },
    ],
  },
  whatTheFireRemembers: {
    chapter: "第四幕 第四章",
    chapterTitle: "余烬记得的事",
    lines: [
      { speaker: "", text: "在安魂机的帮助下，余烬的躲闪终于崩溃——不是温和地，也不是一次说完的。" },
      { speaker: "余烬", text: "我不是一份礼物，凯德。我是玛耶斯构装体核心的一个残片。在你死去的那一刻，我与你的旗舰绑定——是二十年后，还是二十年前，取决于你怎么计算。" },
      { speaker: "七号安魂机", text: "你所说的那些「能力」，从来都不是慷慨的馈赠。它们是功能。是某种东西残存的部分，被重新利用，用来维持一件本不该存活之物的存续。" },
      { speaker: "凯德·任", text: "所以我拥有的每一分优势——从来都不属于我自己。" },
      { speaker: "余烬", text: "它一直都属于我们两个。凯德，我需要你成功。不是出于善意。我有我自己的理由。我还没准备好说出口——但我向你保证，那些理由不是针对你的。" },
    ],
    choices: [
      { label: "愤怒——你在我还不知道你存在之前就利用了我。", setFlags: ["cinderReveal.anger"] },
      { label: "接受——这不会改变我们一起建立起来的一切。", setFlags: ["cinderReveal.acceptance"] },
      { label: "专注当下——解释可以以后再说。眼下重要的是前方的路。", setFlags: ["cinderReveal.focus"] },
    ],
  },
  lastShipyard: {
    chapter: "第四幕 第五章",
    chapterTitle: "最后的船坞",
    lines: [
      { speaker: "", text: "安魂机引领「絮语」号找到了埋藏在零号锚点之下的真正目的：一艘沉眠的方舟级超级武器，而本源精华正是它的燃料——它的钥匙。" },
      { speaker: "七号安魂机", text: "它不是为征服而建的。它是最后的手段。是一种遏制装置——用来封锁玛耶斯最终也未能战胜的某种东西。" },
      { speaker: "余烬", text: "每个人都在为不同的理由争相赶到这里，却没有一个人真正理解自己在争夺的是什么。凯德也不例外。曾经的我也不例外。" },
      { speaker: "", text: "方舟最后的安保反应，把它剩下的一切都砸向了这处遗址——从某种角度说，倒也令人同情。它不过是仍在执行自己最初的使命。" },
      { speaker: "七号安魂机", text: "拖住他们。我可以为你开启安全通道，但我需要一些构装体不太愿意给我们的时间。" },
    ],
  },
  deepOriginFinale: {
    chapter: "第四幕 第六章",
    chapterTitle: "深源（第四幕终章）",
    lines: [
      { speaker: "", text: "方舟船坞的最后一道防线倒下。它沉眠已久的记录终于开启，方舟真正的用途最终清晰地浮现出来。" },
      { speaker: "", text: "不是为了封锁虫群。也不是为了封锁构装体自身。是某种更古老的东西——那个彻底击碎了玛耶斯文明的存在，如今依然存在，依然微弱，正在最深的裂隙之外某处再度苏醒。" },
      { speaker: "余烬", text: "……「虚无」。这就是它的名字。凯德，这就是我从荆棘航迹开始就一直在恐惧的东西。早在你懂得开口询问之前。" },
      { speaker: "七号安魂机", text: "方舟仍然可以运作。勉强可以。它可以被认领——被改装成真正能够与之抗衡的存在。" },
      { speaker: "余烬", text: "一次神盾舰级的改装。完整的十六槽位配置。还有它正在聚集之处的坐标——暗影线。无论结局如何，一切都会在那里终结。" },
    ],
  },
};
