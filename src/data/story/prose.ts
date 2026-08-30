import type { StoryScene } from "../types";

/** 场景开场的散文。
 *
 * 2026-08-30。玩家要求「剧情要像小说一样吸引人」。量了一下:
 *
 * - 整部剧情 6,389 字。一篇短篇小说约一万字,长篇约十万字。
 * - 每句平均 **27.9 字**,中位 29,最长 70。
 * - 旁白只占 19%。
 *
 * 也就是说,全篇是一句接一句的格言,从来没有一个段落停下来把一个场面**建立**起来。
 * 这就是它读着像剧本大纲而不像小说的真正原因——不是文笔差,是根本没有散文。
 * 前几次重写都在"把句子改好",而缺的东西是句子改不出来的。
 *
 * 这里补的是小说才有的三样东西:
 *
 * 1. **感官细节**。不是"帷幕很危险",是舱壁上的霜、味道、声音。
 * 2. **内心**。陆昭是视角人物,但读者从来没进过他脑子一次。
 * 3. **呼吸**。一段一百五十字的文字会让读者慢下来,而慢下来才有代入。
 *
 * 实现上刻意保守,跟 reactive.ts 同一个套路:不动任何一句已有台词,只在场景**开头**
 * 插入散文段落。已有台词是中英两套一一对应的,改动它们会让 story.test.ts 那套校验
 * 全部作废。
 *
 * 只挑十五个场景——每一幕的转折点。每场戏都配散文,会让节奏变得同样单调,只是
 * 单调在另一个方向上。 */

export interface SceneProse {
  en: string[];
  zh: string[];
  /** 这段散文替换掉场景原有的前 N 句旁白。
   *
   * 实测抓到的:散文写完之后,「第一舰队的残骸」那场戏里"几百具船体,全都朝着同一个
   * 方向"连着出现了两次——一次是我新写的段落,一次是原来那句。散文本来就是把原来
   * 那句**展开**,所以原句必须让位。下面的测试会自动抓这种重复。 */
  dropLeadingNarration?: number;
}

export const SCENE_PROSE: Record<string, SceneProse> = {
  coldWake: {
    dropLeadingNarration: 1,
    zh: [
      "你记得的最后一件事是温度。不是火——火是后来的事——是金属被烧穿之前那一瞬间的手感，隔着手套都烫。二十年后的那个你，双手按在一块正在融化的舱壁上，试图把一艘已经死了的船摁回原状。",
      "然后是苋红星带的冷。你在一具不属于你的驾驶座里睁开眼，喉咙里全是循环了太多遍的空气的味道——铁锈、机油、还有别人的汗。舷窗外，碎石带把一颗遥远的恒星切成一段一段，像有人用刀在光上划过。",
      "这艘船比你小两号，锈得比你惨，仪表盘上有一半的灯不亮。它叫「絮语」。上一个坐在这里的人已经死了，而它现在是你的了。",
    ],
    en: [
      "The last thing you remember is temperature. Not the fire — the fire came later — but the way metal felt in the instant before it gave, hot through the gloves. The you of twenty years from now, both hands flat against a melting bulkhead, trying to hold a ship that was already dead.",
      "Then the cold of the Amaranth Belt. You open your eyes in an acceleration couch that isn't yours, the air thick with the taste of too many recyclings — rust, machine oil, someone else's sweat. Beyond the viewport the debris field cuts a distant star into segments, as if someone had drawn a knife across the light.",
      "The ship is two classes smaller than you are used to, rusted worse than you are, and half the lights on her board are dead. Her name is Whisper. The last person in this seat is gone, and she belongs to you now.",
    ],
  },

  tigersReach: {
    dropLeadingNarration: 1,
    zh: [
      "虎踞湾是疆域边上最不像样的一座锚地:六个泊位，一台永远在修的空气循环机，还有一间把啤酒温到人体温度再卖出去的酒馆。三千七百个人住在这里，大部分一辈子没离开过这颗小行星。",
      "掠夺者副官的快艇就漂在港区外两公里，动力舱被你打穿了，还在慢慢放气。接舷的时候你能看见他驾驶舱里贴着的东西——一张手绘的星图，上面圈出了六个泊位的位置，标注得很仔细。",
      "他不是路过。他是来看的。",
    ],
    en: [
      "Tiger's Reach is the least respectable anchorage on the Reach's edge: six berths, an air recycler permanently under repair, and a bar that warms its beer to body temperature before selling it. Three thousand seven hundred people live here, most of whom have never left the rock.",
      "The Reaver lieutenant's skiff drifts two kilometres off the docks, her drive section holed and still venting. Coming alongside you can see what is taped up in his cockpit — a hand-drawn chart with the six berths circled, annotated carefully.",
      "He was not passing through. He came to look.",
    ],
  },

  emberRising: {
    dropLeadingNarration: 1,
    zh: [
      "虎鲨到底还是来了,而他的突击队铺了整整十一公里的残骸。你开着船在里面慢慢走，让打捞臂一具一具地抓。有些还热着，抓上来的时候在真空里冒出细细的白汽，几秒钟就没了。",
      "重铸不像升级。升级是把零件换掉。重铸是把船拆到只剩骨架，然后看着骨架自己长回去。",
      "你在船坞里待了十一个小时，看着「絮语」号的承力梁一寸一寸变厚。没有火花，没有焊接的声音——那些金属是从内部长出来的，像骨折愈合，只是快了一千倍。你伸手摸了一下，是温的。",
      "第十二个小时，你才意识到自己一直没有坐下，也没有喝水。你只是站在那儿看。你已经很久没有对任何东西这样了。",
    ],
    en: [
      "Tiger Shark came after all, and his assault group is now eleven kilometres of wreckage. You walk the ship through it slowly, letting the salvage arms take one hull at a time. Some are still warm; hauled in, they breathe a thin white vapour into vacuum that is gone in seconds.",
      "Ascension is not an upgrade. An upgrade means swapping parts. Ascension means stripping a ship to her frame and then watching the frame grow back.",
      "You spend eleven hours in the yard watching Whisper's load-bearing spars thicken, an inch at a time. No sparks, no welding — the metal comes from inside, the way a break knits, only a thousand times faster. You put a hand on it. It is warm.",
      "It is the twelfth hour before you realise you have not sat down, and have not had water. You have only been standing there, watching. It has been a long time since anything held you like that.",
    ],
  },

  bloodDebt: {
    dropLeadingNarration: 1,
    zh: [
      "灰烬谷的交易所没有门。它是一条被掏空的矿道，两侧凿出格子，每个格子里坐一个不问来路的人。空气里有股甜味，是防腐剂——他们用同一批药水保存文件和尸体。",
      "卖给你货单的人手在抖。不是害怕，是长期缺乏日照的人特有的那种抖。他把三张薄片推过来的时候，没有看你的眼睛，只说了一句：日期是对得上的。",
      "对得上的意思是：安氏的船在虎踞湾被烧掉的前三天，向掠夺者的账户付过一笔款；款项的编号，和那些烧穿港区支架的切割器编号，是同一批。",
    ],
    en: [
      "The exchange at Ashenvale has no door. It is a hollowed-out mine shaft with cells cut into either wall, one incurious person to a cell. The air is sweet with preservative — they use the same solution on documents and on bodies.",
      "The man who sells you the manifest has a tremor. Not fear; the particular tremor of someone who has not seen a sun in years. He pushes three thin sheets across without meeting your eyes and says only: the dates line up.",
      "Line up means this. Three days before Tiger's Reach burned, an Arthaine vessel paid into a Reaver account. The requisition number on that payment matches the batch number on the cutting rigs that opened the dock gantries.",
    ],
  },

  hollowFleet: {
    dropLeadingNarration: 1,
    zh: [
      "空壳舰队船坞里有四百条船，全都拆到一半。不是残骸——残骸是打完仗的样子。这些船是被**规规矩矩**拆开的：外壳整齐地码在一边，内脏摊在托盘上，工具还挂在架子上，位置和最后一次用完时一样。",
      "没有人。不是撤走了——撤走的地方会乱。这里什么都没乱，只是空了，像所有人在同一秒钟同时停下手上的活，然后就没有然后了。",
      "你的探照灯扫过第三排的时候，有一条船的推进器亮了。",
    ],
    en: [
      "There are four hundred ships in the Hollow Fleet Yard, all of them half taken apart. Not wrecks — wrecks are what a battle leaves. These were opened up *properly*: hull plate stacked to one side, insides laid out on trays, tools still racked where they were last set down.",
      "There is nobody. Not evacuated — an evacuation leaves a mess. Nothing here is disturbed. It is simply empty, as though everyone stopped work in the same second and there was no second after that.",
      "Your floodlight is sweeping the third row when a drive lights up.",
    ],
  },

  firstContact: {
    dropLeadingNarration: 1,
    zh: [
      "漂流集市的外环不再是金属了。",
      "从两百公里外看，它还是环形；靠近之后你才看出那层壳的纹理——一格一格，六边形，像被放大了一万倍的蜂巢。壳下面有东西在动，动得很慢，慢到你盯着看三分钟才确定它真的在动。",
      "扫描器给不出读数。不是没有信号，是信号太多：每一格都在发一样的东西，四十万个一模一样的声音同时说同一句话。余烬把音频降到百分之一放给你听，那声音听起来像有人在很远的地方数数，数了很久，一直没数完。",
    ],
    en: [
      "The outer ring of Driftmarket is no longer metal.",
      "From two hundred kilometres out it still reads as a ring. Closer in you start to see the texture of the shell — cells, hexagonal, a honeycomb magnified ten thousand times. Something moves beneath it, slowly, slowly enough that you watch for three minutes before you are sure it is moving at all.",
      "The scanners return nothing. Not because there is no signal, but because there is too much of it: every cell transmitting the same thing, four hundred thousand identical voices saying one identical word. The Cinder plays it back at one percent. It sounds like someone very far away counting, and having counted for a long time, and not being finished.",
    ],
  },

  intoTheVeil: {
    dropLeadingNarration: 1,
    zh: [
      "帷幕不是星云。星云是气体。帷幕是**碎片**——某个曾经完整的东西碎掉之后，四百年还没落定的那一堆。",
      "开进去的第一个小时，导航还能用。第二个小时，星图上的参照点开始互相矛盾：同一颗恒星在两个位置上都被标记，而且两个都是对的。第三个小时，你关掉了星图，改用眼睛。",
      "碎片从舷窗外过去的时候会短暂地挡住光。一块，两块，一块特别大的——大到你有半秒钟以为那是一面墙。那不是墙。那是某个东西的一部分，而你算不出完整的它有多大。",
    ],
    en: [
      "The Veil is not a nebula. A nebula is gas. The Veil is *debris* — what is left when something whole comes apart, and four hundred years is not long enough for it to settle.",
      "For the first hour inside, navigation works. In the second, the reference points on the chart begin to contradict each other: the same star marked in two positions, and both of them correct. In the third hour you shut the chart off and use your eyes.",
      "Fragments crossing the viewport occlude the light as they pass. One, another, then one that is very large — large enough that for half a second you take it for a wall. It is not a wall. It is part of something, and you cannot work out how big the whole of it was.",
    ],
  },

  queenspire: {
    dropLeadingNarration: 1,
    zh: [
      "蜂后尖塔从一颗小行星里长出来，高三十一公里，通体是同一种材料，没有接缝。它不是被建造的。没有任何建造过程能做出没有接缝的三十一公里。",
      "母体在塔的中段，卡在结构里，大得像一座空间站。她已经死了很久——外壳的颜色褪成了骨白，一部分甲片剥落下来，挂在下面的支架上晃。",
      "而整个族群仍然围着她转，四十万个甲壳单位，全部背对疆域、面朝她。你花了很久才想明白那意味着什么:它们不是在守卫她。它们是在**等她说话**。",
    ],
    en: [
      "The Queenspire grows out of an asteroid, thirty-one kilometres tall, all of one material, without a seam. It was not built. No process of building produces thirty-one seamless kilometres.",
      "The mother is midway up, wedged into the structure, the size of a station. She has been dead a long time — the shell has faded to bone white, and plates that have come loose hang swinging from the gantries below.",
      "And the brood still turns around her: four hundred thousand chitin units, every one of them facing away from the Reach and toward her. It takes a while to understand what that means. They are not guarding her. They are *waiting for her to speak*.",
    ],
  },

  originTide: {
    zh: [
      "本源精华从裂隙里渗出来的样子，不像液体，也不像光。最接近的说法是:它像一段被拉长的**当下**——你看着它，会觉得这一秒过得比别的秒长。",
      "船体开始报警,然后停了。不是警报解除,是传感器读不出该报什么。舱内的温度没有变,可你还是把外套裹紧了一点。",
      "余烬没有做解说。这一路上她对每一样新东西都有话说,唯独这一样她安静了整整四十秒。你不知道那对她算多久,但你知道那不是随便的四十秒。",
    ],
    en: [
      "Origin Essence seeping out of a rift does not behave like a liquid, or like light. The closest description is that it looks like a stretched *present tense* — you watch it, and this second seems to take longer than the ones on either side of it.",
      "The hull alarms sound and then stop. Not cleared; the sensors simply cannot decide what to report. The compartment temperature has not changed, and you pull your jacket closed anyway.",
      "The Cinder does not narrate. She has had something to say about every new thing on this voyage. About this one she is quiet for a full forty seconds. You do not know what forty seconds is to her, but you know it was not an idle forty.",
    ],
  },

  firstFleetRuins: {
    dropLeadingNarration: 1,
    zh: [
      "几百具船体，全都朝着同一个方向。",
      "你飞了四十分钟才穿过它们，四十分钟里没有一艘船的船头是转过来的。它们死的时候都在往前开。有几条的推进器还保持着最大功率的姿态，喷口烧得发白，然后就那样凝固了四百年。",
      "打过败仗的舰队会散。溃退的时候人是不管队形的，那是本能。而这一支没有散——这意味着他们知道自己赢不了，然后每个人都还是把船头对准了同一个方向。",
      "你在其中一条船的舷侧看到了手写的编号，漆已经剥落，但笔画还在。写字的人当时大概不到二十岁。",
    ],
    en: [
      "Hundreds of hulls, all of them facing the same direction.",
      "It takes forty minutes to fly through them, and in forty minutes not one bow has turned. They died going forward. On several the drives are still frozen at full burn, the nozzles scorched white and then held that way for four hundred years.",
      "A fleet that loses a battle scatters. In a rout nobody keeps formation; that is instinct. This one did not scatter — which means they knew they could not win, and every one of them still put their bow on the same bearing.",
      "On the flank of one hull you find a number painted by hand, the paint gone but the strokes still there. Whoever wrote it was probably not yet twenty.",
    ],
  },

  whatTheFireRemembers: {
    zh: [
      "她开口之前，先把船内的灯调暗了两档。你从没见她动过灯。",
      "「絮语」号在这种时候会安静得很奇怪——循环风机还在转，可你能听见更下面的东西:金属自己的声音，热胀冷缩，一寸一寸地响。你在这艘船上待了这么久，第一次意识到自己一直在听它。",
      "你把手里的活放下了。你知道接下来的话你只会听到一次。",
    ],
    en: [
      "Before she speaks she takes the cabin lights down two steps. You have never seen her touch the lights.",
      "Whisper gets strangely quiet at times like this — the recirculators still turn, but underneath them you can hear the ship itself: metal expanding and contracting, ticking an inch at a time. You have been aboard a long while, and this is the first time you notice you have been listening to it all along.",
      "You put down what is in your hands. You know you are only going to hear this once.",
    ],
  },

  deepOriginFinale: {
    dropLeadingNarration: 1,
    zh: [
      "方舟打开的时候没有声音。三百米的合缝面分开，中间没有一丝摩擦——那种精度会让任何一个见过真正的船坞的人手心出汗。",
      "里面不是武器。是一副骨架，没完成，尺寸和「絮语」号对得上，甚至连承力梁的分叉角度都一样。它在那里等着，等的时间比疆域上任何一个国家存在的时间都长。",
      "你站在它前面，忽然明白了一件之前一直没敢想的事：不是余烬把「絮语」号改造成了这个形状。是「絮语」号一直在往这个形状长，而余烬只是没有拦她。",
    ],
    en: [
      "The ark opens without a sound. Three hundred metres of mating surface part with no friction at all — a tolerance that would put sweat on the palms of anyone who has seen a real shipyard.",
      "Inside is not a weapon. It is a frame, unfinished, sized to Whisper, matching her down to the branch angle of the load spars. It has been waiting there longer than any nation in the Reach has existed.",
      "Standing in front of it you finally understand the thing you have been avoiding: the Cinder did not shape Whisper into this. Whisper has been growing toward it the whole time, and the Cinder simply never stopped her.",
    ],
  },

  umbralLineApproach: {
    dropLeadingNarration: 1,
    zh: [
      "暗影线在图上是一条线。近了才知道那是透视造成的——它其实是一个面，一个薄得没有厚度、却大到看不见边缘的面。",
      "越靠近，仪表越吵。不是坏了，是它们在互相矛盾：钟走得不一样快，两台完全相同的惯性单元给出两个不同的位置，而且两个都在自检里报告一切正常。",
    ],
    en: [
      "On a chart the Umbral Line is a line. Up close you learn that was perspective — it is a plane, one with no thickness at all and no visible edge.",
      "The nearer you get, the louder the instruments argue. Not faulty; contradictory. Clocks run at different rates. Two identical inertial units report two different positions and both pass their own self-checks.",
    ],
  },

  secondIgnition: {
    zh: [
      "第一舰队在这里失败了。他们有两百条船，最好的舰长，四百年前疆域能拿出的一切。他们把船头对准这道缝，然后全部死在了缝前面。",
      "你只有一条船。她被拆到骨架又重建过很多次，身上没有一个部件是最初那条打捞级护卫舰留下来的——除了名字。",
    ],
    en: [
      "The First Fleet failed here. Two hundred ships, the best captains alive, everything the Reach could put in the field four hundred years ago. They put their bows on this seam and every one of them died in front of it.",
      "You have one ship. She has been stripped to the frame and rebuilt so many times that not one component of the original salvage-grade corvette remains — except the name.",
    ],
  },

  civilizationDisqualified: {
    dropLeadingNarration: 1,
    zh: [
      "执礼者停下来的方式，不像一台机器停机，像一支曲子结束。最后一个音落下去之后，还有一段谁都不敢先动的安静。",
      "你在那段安静里想的不是胜利。你想的是虎踞湾那具从里面焊死的救生舱，想的是第一舰队某条船舷上那个不到二十岁的人写的编号，想的是你自己二十年后按在融化的舱壁上的那双手——那件事现在不会发生了，而你依然记得它的温度。",
    ],
    en: [
      "The Conductor stops the way a piece of music stops, not the way a machine does. After the last note there is a silence nobody is willing to be first to break.",
      "What you think about in that silence is not victory. You think about the escape pod at Tiger's Reach welded shut from the inside; about the number painted by someone not yet twenty on the flank of a First Fleet hull; about your own hands, twenty years from now, flat against a melting bulkhead — a thing that will not happen now, and whose temperature you still remember.",
    ],
  },
};

/** 把散文段落插到场景开头。
 *
 * 插在最前面而不是中间,是因为散文的作用是**先把场面立起来**,再让人物说话。
 * 插在对白中间会打断节奏,那正是小说里最容易写坏的地方。 */
export function applyProse(scene: StoryScene, lang: "en" | "zh"): StoryScene {
  const prose = SCENE_PROSE[scene.id];
  if (!prose) return scene;
  const paras = prose[lang];
  if (!paras || paras.length === 0) return scene;
  // 散文如果是把原有的开场旁白展开写的,原句就得让位,否则同一件事连说两遍。
  // 只丢**旁白**,而且只从开头连续地丢——绝不会误伤一句台词。
  let rest = scene.lines;
  let toDrop = prose.dropLeadingNarration ?? 0;
  while (toDrop > 0 && rest.length > 0 && rest[0].speaker === "") {
    rest = rest.slice(1);
    toDrop -= 1;
  }
  return { ...scene, lines: [...paras.map((text) => ({ speaker: "", text })), ...rest] };
}

/** 有散文的场景数——面板和测试都要用。 */
export function proseSceneCount(): number {
  return Object.keys(SCENE_PROSE).length;
}
