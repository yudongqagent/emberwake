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
      "虎踞湾是疆域边上最不像样的一座锚地：六个泊位，一台永远在修的空气循环机，还有一间把啤酒温到人体温度再卖出去的酒馆。三千七百个人住在这里，大部分一辈子没离开过这颗小行星。",
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
      "虎鲨到底还是来了，而他的突击队铺了整整十一公里的残骸。你开着船在里面慢慢走，让打捞臂一具一具地抓。有些还热着，抓上来的时候在真空里冒出细细的白汽，几秒钟就没了。",
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
      "而整个族群仍然围着她转，四十万个甲壳单位，全部背对疆域、面朝她。你花了很久才想明白那意味着什么：它们不是在守卫她。它们是在**等她说话**。",
    ],
    en: [
      "The Queenspire grows out of an asteroid, thirty-one kilometres tall, all of one material, without a seam. It was not built. No process of building produces thirty-one seamless kilometres.",
      "The mother is midway up, wedged into the structure, the size of a station. She has been dead a long time — the shell has faded to bone white, and plates that have come loose hang swinging from the gantries below.",
      "And the brood still turns around her: four hundred thousand chitin units, every one of them facing away from the Reach and toward her. It takes a while to understand what that means. They are not guarding her. They are *waiting for her to speak*.",
    ],
  },

  originTide: {
    zh: [
      "本源精华从裂隙里渗出来的样子，不像液体，也不像光。最接近的说法是：它像一段被拉长的**当下**——你看着它，会觉得这一秒过得比别的秒长。",
      "船体开始报警，然后停了。不是警报解除，是传感器读不出该报什么。舱内的温度没有变，可你还是把外套裹紧了一点。",
      "余烬没有做解说。这一路上她对每一样新东西都有话说，唯独这一样她安静了整整四十秒。你不知道那对她算多久，但你知道那不是随便的四十秒。",
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
      "「絮语」号在这种时候会安静得很奇怪——循环风机还在转，可你能听见更下面的东西：金属自己的声音，热胀冷缩，一寸一寸地响。你在这艘船上待了这么久，第一次意识到自己一直在听它。",
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

  // --- 第二波(同日):剩下的 31 场戏。刻意比上面短——一段而不是三段。
  // 一部小说不会每一场都用三段描写开场;节奏本身也要有变化,否则「每场都有散文」
  // 会变成另一种单调。这些段落写的是**原有开场旁白周围的东西**,而不是把它重说
  // 一遍,所以都不需要 dropLeadingNarration。

  firstBlood: {
    zh: [
      "第一次开火的时候你才发现，这艘船的火控延迟有半秒。半秒在纸面上什么都不是，在真打起来的时候是整整一个身位。你后来一直记得那半秒——不是因为它差点要了你的命，是因为你在那半秒里没有害怕。",
    ],
    en: [
      "The first time you fire you learn the fire control has half a second of lag. Half a second is nothing on paper and a full ship-length in a real engagement. You remember that half second afterwards — not because it nearly killed you, but because in it you were not afraid.",
    ],
  },

  theLedger: {
    zh: [
      "登记处的等候区有二十把椅子，坐满了。所有人手里都攥着一份文件，所有人都在等同一个不抬头的人。墙上的编号牌从四百多号开始跳，一小时跳七个。",
      "你等了三个小时。三个小时里没有一个人抱怨，因为抱怨过的人都知道那会让号码往后排。",
    ],
    en: [
      "The registry waiting area has twenty chairs and all of them are taken. Everyone holds a document; everyone is waiting on the same man who does not look up. The number board starts somewhere past four hundred and advances seven an hour.",
      "You wait three hours. In three hours nobody complains, because everyone who has complained knows what it does to their number.",
    ],
  },

  staticAndSignal: {
    zh: [
      "造这套防御网的公司在三十九年前就不存在了。接手的公司也不存在了。现在没有人拥有它，也没有人有权关掉它，而它每十四秒问一次口令，已经问了四十年。",
    ],
    en: [
      "The company that built this defence net stopped existing thirty-nine years ago. So did the company that inherited it. Nobody owns it now and nobody has the authority to switch it off, and every fourteen seconds it asks for a passphrase, as it has for forty years.",
    ],
  },

  houseRules: {
    zh: [
      "安氏的会客舱比「絮语」号的整个舰桥还大，而且是空的——没有桌子，没有椅子，只有一块窗。他们让你站着，是为了让你注意到自己在站着。",
    ],
    en: [
      "The Arthaine receiving compartment is larger than Whisper's entire bridge, and it is empty — no table, no chairs, one window. They keep you standing so that you will notice you are standing.",
    ],
  },

  openLanes: {
    zh: [
      "协约的决斗有规矩：不打逃逸目标，不打失去动力的船，打完了双方都得把伤员名单交出来。铁衡输掉之后做的第一件事，是把自己那份名单递给你——上面一个名字都没有。",
    ],
    en: [
      "Concord duels have rules: no firing on a fleeing target, none on a ship that has lost power, and both sides hand over their casualty list at the end. The first thing Ferrous does after losing is give you his. There is not a single name on it.",
    ],
  },

  tradeWinds: {
    zh: [
      "子午交易所的地板是玻璃的，底下三层全是货舱。你走过去的时候能看见自己脚下有人在搬箱子。柳芸选这间办公室，就是为了让谈判对手一低头就看见成本。",
    ],
    en: [
      "The floor of the Meridian Exchange is glass, and three levels of cargo hold sit under it. Walking across, you can watch people moving crates beneath your feet. Vashti chose this office so that anyone negotiating in it looks down and sees the cost.",
    ],
  },

  ridgeAndReach: {
    zh: [
      "山脊航道其实只是一条比别处干净一点的缝——碎石少，信号稳，一天能省六个小时。为了这六个小时，过去十一年里死了三百四十个人，而两边都能背出准确的数字。",
    ],
    en: [
      "The Ridge lane is only a seam that happens to be cleaner than the rest — less debris, steadier signal, six hours saved on a run. Three hundred and forty people have died over those six hours in eleven years, and both sides can quote the figure exactly.",
    ],
  },

  reachOpens: {
    zh: [
      "守住之后的第三天，铁门星域有人在港区墙上刷了「絮语」号的轮廓。刷得很难看，比例全错。没有人擦掉它。",
    ],
    en: [
      "Three days after the Gate holds, someone paints Whisper's silhouette on a dock wall at Ferrous. It is badly done and the proportions are wrong. Nobody washes it off.",
    ],
  },

  hiveSignal: {
    zh: [
      "余烬花了六个小时才把那道信号从底噪里剥出来。剥出来之后她放给你听了三遍，每一遍都比上一遍慢。第三遍的时候你听出来了：那不是一段信息，那是一条命令，重复了很多年，从来没有收到过回应。",
    ],
    en: [
      "It takes the Cinder six hours to lift the signal clear of the noise floor. Then she plays it for you three times, each slower than the last. On the third pass you hear it: not a message. An order, repeated for years, never once answered.",
    ],
  },

  tigerSharkGambit: {
    zh: [
      "公开频道的意思是：整个帷幕里所有还活着的船都能听见。虎鲨可以私下发讯的，她有你的编码。她选了让所有人听见——那不是失误，是抵押。她把自己的脸押在了这次通话上。",
    ],
    en: [
      "An open channel means every ship still alive in the Veil can hear it. Tiger Shark has your private codes; she could have used them. She chose to be overheard, and that is not an error, it is collateral. She has put her own face up against this call.",
    ],
  },

  arthaineContract: {
    zh: [
      "信使的船比他本人贵一百倍，而且是租的。他在帷幕里飞了九天，靠一份三年前的旧海图。见到你的时候他的手在抖，但他把话背完了，一个字没错。",
    ],
    en: [
      "The courier's ship is worth a hundred times what he is, and it is a charter. He has flown nine days into the Veil on a chart three years out of date. His hands shake when he finds you, and he delivers his message word-perfect anyway.",
    ],
  },

  ghostProtocol: {
    zh: [
      "零号锚点的对接臂伸出来的时候，动作是标准的、礼貌的、教科书式的。它已经这样迎接了四百年，而这四百年里，通过它的分类的东西一共有零个。",
    ],
    en: [
      "When Anchor Zero extends its docking arm the motion is standard, courteous, textbook. It has greeted arrivals this way for four hundred years, and in four hundred years the number of things that have passed its classification is zero.",
    ],
  },

  sirArthurEndgame: {
    zh: [
      "仲裁庭的房间没有窗。他们说是为了防止外部干扰，实际上是因为有窗的房间里，人会往外看，而往外看的人比较容易改主意。",
      "安鹤龄比你先到。他坐在那儿，面前摊着一叠纸，厚得像一本书。那本书讲的全是你。",
    ],
    en: [
      "The tribunal chamber has no windows. They say it prevents outside interference. In truth a room with a window is a room where people look out, and people who look out are likelier to change their minds.",
      "Sir Arthaine arrives before you. He sits with a stack of paper in front of him, thick as a book. The book is entirely about you.",
    ],
  },

  lastShipyard: {
    zh: [
      "船坞的外壳上刻着四百年前的舷号，一行一行，从上到下排了两百多个。刻到最后二十几个的时候，笔画明显潦草了——刻字的人已经知道来不及了。",
    ],
    en: [
      "Hull numbers are cut into the yard's outer plating, line after line, more than two hundred of them from top to bottom. The last twenty-odd are visibly hurried. Whoever was cutting them had worked out there was not going to be time.",
    ],
  },

  callingTheReach: {
    zh: [
      "你写那份呼叫的时候删了七遍。第一遍写了整整两页，列了所有理由。最后发出去的版本只有三句话，因为余烬说：会来的人不需要理由，不来的人给再多也不来。",
    ],
    en: [
      "You rewrite the call seven times. The first draft runs two full pages and lists every reason. The version you actually send is three sentences, because the Cinder said: the ones who will come don't need reasons, and the ones who won't won't come for any number of them.",
    ],
  },

  echoesOfTheLosingBattle: {
    zh: [
      "回放没有顺序。你会先听见一艘船的最后一句，过一会儿再听见它出发时的报到。中间那些年被拆开了，随机地摊在这道缝里，像有人把一叠照片扔进了风里。",
    ],
    en: [
      "The replay has no order. You hear a ship's last transmission first and then, some time later, her departure check-in. The years between have been taken apart and scattered through the seam at random, like a stack of photographs thrown into wind.",
    ],
  },

  whatKadeKnows: {
    zh: [
      "来的人一个接一个，没有一个是空手来的。有人带酒，有人带零件，有个女人带了一整箱她自己做的干粮，说她男人在虎踞湾。你没有问她男人现在在哪儿。",
    ],
    en: [
      "They come one after another and none of them come empty-handed. Someone brings drink, someone brings parts; a woman brings an entire crate of food she has dried herself and says her husband was at Tiger's Reach. You do not ask where her husband is now.",
    ],
  },

  secondIgnitionEpilogue: {
    zh: [
      "十一个小时之后，你做的第一件事不是庆祝，是坐下来。真正地坐下来，靠在椅背上，让手离开操纵杆。你已经三年没有这样坐过了。",
    ],
    en: [
      "After eleven hours the first thing you do is not celebrate. You sit down. Properly, back against the seat, hands off the stick. You have not sat like that in three years.",
    ],
  },

  heroesConvergeInstitutional: {
    zh: [
      "席位在第四排，靠边，视线被一根柱子挡住一半。头衔有十一个字，其中九个是形容词。给你安排这些的人是好意的，而好意有时候比敌意更难拒绝。",
    ],
    en: [
      "The seat is in the fourth row, on the aisle, half its sightline blocked by a pillar. The title runs to eleven words, nine of them adjectives. The people who arranged this meant well, and meaning well is sometimes harder to refuse than malice.",
    ],
  },

  heroesConvergeCoalition: {
    zh: [
      "那个泊位是你自己付的钱，月租，没有牌子。第一个把它当地址用的人是个跑短途的船主，他在申报单上写了这个泊位号，理由栏填的是「有人会管」。",
    ],
    en: [
      "You pay for the berth yourself, by the month, and it has no sign. The first person to use it as an address is a short-haul operator who wrote the berth number on a filing and, in the reason field, put: someone here will deal with it.",
    ],
  },

  heroesConvergePersonal: {
    zh: [
      "四个月里你去了十一个从来没有名字的地方。没有人认出你，这正是你去那些地方的原因。第十二个地方有人认出来了，于是你回来了。",
    ],
    en: [
      "In four months you visit eleven places that have never had names. Nobody recognises you, which is why you go. In the twelfth someone does, and so you come back.",
    ],
  },

  seizingCommand: {
    zh: [
      "四个势力推出来的四个人，分别在四个不同的房间里等消息，而且每个人都以为自己在的那间是主会场。安排房间的人干得很漂亮。",
    ],
    en: [
      "The four powers put forward four candidates, and the four of them wait in four different rooms, each convinced that the room they are in is the main one. Whoever assigned the rooms did a superb job.",
    ],
  },

  boldMove: {
    zh: [
      "你说这话之前，在纸上画了一整晚。画的不是编队，是「絮语」号的剖面图——她身上四类模块，四种完全不同的做事方式，谁也不听谁的，可她还是飞了三年没散。",
    ],
    en: [
      "Before you say it you spend a night drawing. Not formations — a cross-section of Whisper. Four classes of module aboard her, four completely different ways of doing a job, none of them taking orders from the others, and she has held together for three years all the same.",
    ],
  },

  dysonSphereSystem: {
    zh: [
      "「絮语」号的探测器给出的第一个读数是错的，因为量程不够。余烬换了单位重算，第二个读数还是错的，因为量程还是不够。第三次她放弃了比例尺，直接告诉你：这东西比你飞过的所有地方加起来还大。",
    ],
    en: [
      "Whisper's first reading comes back wrong because the scale does not reach. The Cinder changes units and recomputes; the second reading is wrong because the scale still does not reach. On the third attempt she abandons scale altogether and simply tells you: this is larger than everywhere you have ever been, added together.",
    ],
  },

  gospelCivilization: {
    zh: [
      "记录是有序号的。你随手调了一条中段的出来，那是一段很长的申辩，详细、恳切、条理分明。序号显示，它是第九百四十七万三千一百零二次。",
    ],
    en: [
      "The records are numbered. You pull one at random from the middle: a long defence, detailed, earnest, well organised. The number on it says it is the nine million four hundred and seventy-three thousand, one hundred and second attempt.",
    ],
  },

  standingConcordTrust: {
    zh: [
      "协约的投票记录是公开的。你后来查过那一次：三十一票赞成，零票反对，一票弃权。弃权那一栏后面按规矩要写理由，而他写的是「本人为利害关系方」。",
    ],
    en: [
      "Concord voting records are public. You look that one up afterwards: thirty-one in favour, none against, one abstention. The rules require a stated reason in the abstention column. His reads: the member is an interested party.",
    ],
  },

  standingConcordBroken: {
    zh: [
      "炮口跟着你转的时候，你数了一下：十四门。铁衡的舰队现在只剩这么多了，而且其中六门是从你打坏的船上拆下来重装的。",
    ],
    en: [
      "You count the guns as they track you: fourteen. That is all Ferrous's command has left, and six of them were salvaged off ships you broke and refitted.",
    ],
  },

  standingCombineLedger: {
    zh: [
      "整层楼清空要花她一天的营业额，而她在这一层楼上一天能挣的钱，够买两艘「絮语」号。她没有提这件事，是你自己算出来的。",
    ],
    en: [
      "Clearing the floor costs her a day of trade, and a day of trade on this floor buys two ships the size of Whisper. She does not mention it. You work it out yourself.",
    ],
  },

  standingCombineCalled: {
    zh: [
      "联合体不会拒绝你。拒绝要留记录，而记录可以被质疑。他们只是把每一样东西的报价往上抬，抬到一个刚好合法、也刚好让你买不起的数字。",
    ],
    en: [
      "The Combine will not refuse you. A refusal creates a record, and records can be challenged. They simply raise the quoted price on everything to a number that is exactly legal and exactly beyond you.",
    ],
  },

  standingArthaineDisowned: {
    zh: [
      "那艘单船是他自己开的。安氏的人四十年没有自己开过船，这件事在公国内部比任何一份声明都难解释。",
    ],
    en: [
      "He is flying the cutter himself. No Arthaine has flown their own hull in forty years, and inside the Principality that fact is harder to explain away than any statement could be.",
    ],
  },

  standingReaverOath: {
    zh: [
      "船坞的第一排现在挂着晾晒的衣物。掠夺者不修船，但他们会晾衣服，而晾衣服意味着他们打算在这里待到衣服干。",
    ],
    en: [
      "There is washing hung out along the first row of the yard now. Reavers do not repair ships, but they do hang laundry, and hanging laundry means intending to stay at least until it dries.",
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
