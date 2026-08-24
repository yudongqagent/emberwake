import type { StoryScene } from "../../data/types";

/** Chinese translation of src/data/story/act3.ts. Original prose, translated not
 * sourced — see act1.ts's glossary. New this act: Veil's Edge → 帷幕之缘,
 * the Chrysalis Expanse → 蛹壳广域, Queenspire → 蜂后尖塔, Origin Tide → 本源潮汐,
 * Broodmother → 蜂后母体, Seraphine Arthaine → 塞拉芬·阿尔泰因. */
export const ACT3_SCENES_ZH: Record<string, Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">> = {
  intoTheVeil: {
    chapter: "第三幕 第一章",
    chapterTitle: "深入帷幕",
    lines: [
      { speaker: "", text: "帷幕之缘。跳出疆域的航道，把「絮语」号抛进了一片比开放空间理应有的样子还要安静的地方。" },
      { speaker: "余烬", text: "真正的甲壳虫群领地。不再是斥候了。前方的一切都听命于蜂巢。" },
      { speaker: "凯德·任", text: "你紧张起来了。你一向不会紧张。" },
      { speaker: "余烬", text: "我不喜欢这片区域。现在还说不清原因——只知道我曾经触碰过它的边缘。" },
      { speaker: "", text: "传感器标记出新的东西：一处袖珍维度绽放，一处本源裂隙，触手可及。裂隙之外，是一处深挖固守、严阵以待的虫群据点。" },
      { speaker: "余烬", text: "这才是「絮语」号生来该做的事，凯德——潜入裂隙，取走它所给予的，带着更强的力量归来。从苋红星带开始，你做的只是这件事的缩小版。这才是它真正的规模。" },
      { speaker: "余烬", text: "这里的裂隙比你开采过的任何地方都更加丰饶。而那处据点也不会自己消失。是时候看看真正的虫群战法是什么样子了。" },
    ],
  },
  hiveSignal: {
    chapter: "第三幕 第二章",
    chapterTitle: "蜂巢信号",
    lines: [
      { speaker: "", text: "蛹壳广域。一艘废弃的虫群母舰悬在中心，被掏空，甲壳装甲从内向外剥开，像是从里面裂开的。" },
      { speaker: "", text: "里面没有混乱，只有秩序。一排排被抽干的躯壳，排列得极为精确——绝不是野生虫群会费心去做的事。" },
      { speaker: "余烬", text: "他们不是在劫掠，凯德。他们在从裂隙中收割本源精华，和你做的一样——只是规模更大。榨干，承受损耗，继续前进。" },
      { speaker: "凯德·任", text: "这不是饥饿。这是一条补给线。" },
      { speaker: "余烬", text: "而且是一条走投无路的补给线。这个蜂巢扩张的速度，已经超出了它自身生物学应有的极限。有什么东西在推着他们走。某种在裂隙深处的东西，比这里更深。" },
      { speaker: "", text: "余烬又沉默了下来，就像它每次有所隐瞒时那样。" },
    ],
  },
  tigerSharkGambit: {
    chapter: "第三幕 第三章",
    chapterTitle: "虎鲨的赌注",
    lines: [
      { speaker: "", text: "一段用旧掠夺者密码发出的求救信号——凯德对这套密码太熟悉了。虎鲨剩下的战舰正在她最后一处真正据点里，被一窝虫群逼得节节败退。" },
      { speaker: "虎鲨", text: "别得意。我已经没有战舰能让你得意了，而得意也换不来你活过接下来这一切所需要的情报。" },
      { speaker: "凯德·任", text: "你是在提议停战。" },
      { speaker: "虎鲨", text: "我是在提议一笔交易。帮我守住这块地方，你就能得到我掌握的、关于整个疆域虫群动向的一切情报。拒绝的话，我横竖都是战斗到底——只是变成孤军奋战。" },
    ],
    choices: [
      { label: "接受结盟，与她并肩作战。", setFlags: ["tigerSharkAlliance"] },
      { label: "拒绝——让她自己应付，或者亲手了结她。", setFlags: ["act3.tigerSharkGambit.refused"] },
    ],
  },
  arthaineContract: {
    chapter: "第三幕 第四章",
    chapterTitle: "阿尔泰因契约",
    lines: [
      { speaker: "", text: "普里娅的贸易眼线发现了不对劲的地方：货运清单被绕道经过与虫群相关的中间商，用的是可以追溯到阿尔泰因家族的洋紫荆货币支付。" },
      { speaker: "军需官普里娅·奥塞伊", text: "阿瑟爵士在本土正在失势。看来他在向外寻求筹码——找的还是正在活生生吞噬疆域边境星系的家伙。" },
      { speaker: "", text: "一名被抓获的中间商，在被逼到墙角、被讲清楚后果之后终于开口，证实了货运确有其事。至于具体交易了什么、卖给了谁，他自称并不知情。" },
      { speaker: "塞拉芬·阿尔泰因", text: "……我父亲不会这么做的。不会和他们做交易。" },
      { speaker: "塞拉芬·阿尔泰因", text: "……他会的。天哪，他当然会。" },
      { speaker: "凯德·任", text: "这件事还没完。但已经证实了。他不再只是挡路的人了——他很危险。" },
    ],
  },
  queenspire: {
    chapter: "第三幕 第五章",
    chapterTitle: "蜂后尖塔",
    lines: [
      { speaker: "", text: "蜂后尖塔。蜂巢真正的核心，蜂后母体所在之处——这是这片疆域至今给「絮语」号出过的最难一战。" },
      { speaker: "余烬", text: "完整的战法。数量、再生，现在还多了统一调度的东西。这才是真正的虫群，凯德。" },
      { speaker: "", text: "战斗惨烈，一波又一波不断再生的敌潮，直到蜂后母体本身终于被击溃。" },
      { speaker: "", text: "在战斗过后的寂静中，某种东西在凯德与正在死去的蜂巢意志之间传递而过——不是言语，也不完全是。是一种答案，与其说是被语言翻译，不如说是被直觉领会。" },
      { speaker: "余烬", text: "他们不是在征服。他们是在逃亡。裂隙深处有更深层的东西正驱赶着他们向前——而且它没有放慢脚步。" },
    ],
  },
  originTide: {
    chapter: "第三幕 第六章",
    chapterTitle: "本源潮汐（第三幕终章）",
    lines: [
      { speaker: "", text: "一场规模远超已知海图的裂隙风暴——「絮语」号有史以来最深的一次潜入，也是第一次真正让人感到危险，而非例行公事。" },
      { speaker: "", text: "穿过风暴的咽喉，源头显现：不是虫群的活动。是某种更古老的东西，正在苏醒，其坐标一路延伸向海图上未曾标注名字的区域。" },
      { speaker: "余烬", text: "……我认得这个方位。" },
      { speaker: "凯德·任", text: "你从没这么说过任何事。一次都没有。" },
      { speaker: "余烬", text: "我还没准备好解释。我会准备好的。但不是现在。" },
      { speaker: "", text: "这是凯德见过余烬最接近失态的一刻——几乎在显露的同时，又重新收了回去。" },
      { speaker: "余烬", text: "这里囤积的本源精华足够改装一艘无畏舰级战舰了。而且，还有一个通往「深源」的方位。那就是我们接下来要去的地方。" },
    ],
  },
};
