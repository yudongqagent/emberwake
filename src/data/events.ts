import type { FactionId, ResourceType } from "./types";

/** 星图事件 —— 靠近一个点,它问你一个问题。
 *
 * 2026-08-30,/loop 第 4 轮。量出来的问题:
 *
 *   星图上 61 个交互点,**0 个**会给玩家一个选择。
 *     巡逻 24 个 → 靠近 = 自动开打(连确认都没有)
 *     矿点 18 个 → 靠近 = 自动采集
 *     残骸  9 个 → 靠近 = 自动打捞
 *     空间站 7 个 → 弹出商店
 *     废弃船 3 个 → **只画了美术,没有任何交互代码**
 *
 *   所以"探索"实际上是位移:所有点都画在图上,图标已经告诉你是什么,飞过去只是
 *   4~5 秒的空白。而剧情那边 46 场戏只有 7 个选择点,戏进行当中玩家零输入。
 *
 * 这两条是同一个洞:**世界不问问题**。FTL 的做法搜出来是三句话:
 * 「分支少、文字短、风险与回报对半」——正好一次填两个坑,而且写起来便宜。
 *
 * 每个事件:两三句散文 + 二到三个选项,每个选项都有真实后果。后果全部复用已有
 * 系统(资源、船体、声望、遭遇、模组),所以不需要任何新的管线——而新管线正是
 * "列了却没接"这类假内容的温床。
 *
 * 挂在「废弃船」这种 POI 上,因为它本来就有美术、有投放位置,而且**恰好是那三个
 * 纯装饰的点**。让已经在那儿的东西开口说话,比新造一类点更省。
 */

export type EventOutcomeKind =
  | "resources"    // 给/扣资源
  | "hull"         // 修/伤船体(负数=受伤)
  | "reputation"   // 改声望
  | "combat"       // 开一场仗
  | "module"       // 给一件模组
  | "nothing";     // 什么都没发生 —— 这也是一种诚实的结果

export interface EventOutcome {
  kind: EventOutcomeKind;
  resources?: Partial<Record<ResourceType, number>>;
  hull?: number;
  reputation?: Partial<Record<FactionId, number>>;
  encounterId?: string;
  /** 结果文本,中英各一。 */
  en: string;
  zh: string;
}

export interface EventOption {
  en: string;
  zh: string;
  /** 单一结果;或者一组带权重的结果(赌博)。权重和不必为 1,会归一化。 */
  outcome?: EventOutcome;
  outcomes?: { weight: number; outcome: EventOutcome }[];
}

export interface GameEvent {
  id: string;
  /** 只在这个星区出现;null = 任何地方。 */
  galaxyId: string | null;
  en: string[];
  zh: string[];
  options: EventOption[];
}

/** 十个事件。刻意不多——一个写得含糊的事件比没有事件更糟,因为它教会玩家
 * "这些框可以直接点掉"。 */
export const GAME_EVENTS: GameEvent[] = [
  {
    id: "driftingLifepod",
    galaxyId: null,
    zh: [
      "一具救生舱在碎石里慢慢转，信标每十一秒闪一次——那是手动模式，有人还在里面按。",
      "舱体外壳上有三道切割痕，从内侧往外划的。",
    ],
    en: [
      "A lifepod turns slowly in the debris, its beacon flashing every eleven seconds — manual mode. Someone in there is still pressing it.",
      "There are three cut marks on the shell, scored from the inside out.",
    ],
    options: [
      {
        zh: "接舷，把人弄出来。", en: "Come alongside and cut them out.",
        outcomes: [
          { weight: 6, outcome: { kind: "resources", resources: { salvage: 60, insight: 3 },
            zh: "里面是个打捞工，饿了六天。他把自己那条航线的坐标给了你，说那是他唯一还剩的东西。",
            en: "A salvager, six days without food. He gives you the coordinates of his own route — he says it's the only thing he has left." } },
          { weight: 4, outcome: { kind: "hull", hull: -18,
            zh: "舱门一开，里面的东西不是人。你把它扔回真空，代价是左舷一道口子。",
            en: "The hatch opens on something that is not a person. You put it back into vacuum, and pay for it with a tear along the port flank." } },
        ],
      },
      {
        zh: "记下坐标，继续赶路。", en: "Log the coordinates and move on.",
        outcome: { kind: "nothing",
          zh: "信标在你身后又闪了几次，然后被碎石挡住了。",
          en: "The beacon flashes a few more times behind you, and then the debris takes it." },
      },
    ],
  },
  {
    id: "arthaineToll",
    galaxyId: "bauhiniaReach",
    zh: [
      "一艘安氏巡查艇拦在航道上，没有开火，只是打开了一份收费单。",
      "单子上写着「航道维护协力金」，金额是你上一票打捞的三成。",
    ],
    en: [
      "An Arthaine inspection cutter sits across the lane. It does not open fire. It opens an invoice.",
      "The line item reads 'lane maintenance contribution'. The amount is a third of your last haul.",
    ],
    options: [
      {
        zh: "付钱。多一事不如少一事。", en: "Pay. Not every fight is worth having.",
        outcome: { kind: "resources", resources: { salvage: -80 }, reputation: { bauhinia: 4 },
          zh: "他连收据都开好了。他们干这个不是第一天。",
          en: "He has the receipt ready. They have been doing this a long time." },
      },
      {
        zh: "要他出示授权文件。", en: "Ask to see his authorisation.",
        outcomes: [
          { weight: 5, outcome: { kind: "resources", resources: { insight: 6 }, reputation: { bauhinia: -6 },
            zh: "他没有。他讪讪地让开了，而你记下了这套话术——以后有人再这么拦你，你认得出来。",
            en: "He does not have any. He moves aside, embarrassed, and you file the routine away — you will recognise it next time." } },
          { weight: 5, outcome: { kind: "combat", encounterId: "bountyArthaineSmugglers",
            zh: "他有。而且他叫了朋友。",
            en: "He does. And he has called friends." } },
        ],
      },
    ],
  },
  {
    id: "coldForge",
    galaxyId: null,
    zh: [
      "一座漂流的锻造平台，炉子还是热的。没有人，但工具都摆在该在的位置。",
      "余烬说这里的合金牌号她认得——是第一舰队用的那一批。",
    ],
    en: [
      "A drifting forge platform, its furnace still warm. Nobody aboard, but every tool is where it should be.",
      "The Cinder says she recognises the alloy stamp. It is First Fleet issue.",
    ],
    options: [
      {
        zh: "把炉子里的东西全部带走。", en: "Take everything in the furnace.",
        outcome: { kind: "resources", resources: { alloy: 120, originEssence: 4 }, hull: -20,
          zh: "值钱。拆炉膛的时候崩了一块，砸在左舷上。你走的时候，炉门是你自己关上的。",
          en: "It is worth a great deal. A piece of the furnace lining lets go while you cut, and takes a bite out of the port flank. You are the one who closes the door on the way out." },
      },
      {
        zh: "只拿够用的，把平台留着。", en: "Take what you need and leave the platform running.",
        outcome: { kind: "resources", resources: { alloy: 45, insight: 5 },
          zh: "余烬没有评价。但接下来的一整个小时，她比平时话多。",
          en: "The Cinder does not comment. For the next hour, though, she talks more than usual." },
      },
      {
        zh: "修一修，让它继续烧。", en: "Repair it and let it keep burning.",
        outcome: { kind: "hull", hull: 40,
          zh: "你把自己的备件搭了进去。走的时候，炉子把「絮语」号的伤口也补上了一块。",
          en: "You feed it your own spares. On the way out, the forge closes one of Whisper's wounds as well." },
      },
    ],
  },
  {
    id: "reaverParley",
    galaxyId: null,
    zh: [
      "三艘掠夺者快艇把你围住，然后——没有开火。",
      "带头的那艘打开了通讯：他们缺水，缺了很久。",
    ],
    en: [
      "Three Reaver skiffs box you in, and then — do not fire.",
      "The lead skiff opens a channel. They are short of water, and have been for a while.",
    ],
    options: [
      {
        zh: "给他们补给。", en: "Give them supplies.",
        outcome: { kind: "resources", resources: { salvage: -50 }, reputation: { reavers: 12 },
          zh: "他们没有道谢。但带头的那个把自己的呼号给了你——在掠夺者那里，那就是道谢。",
          en: "They do not thank you. The lead pilot gives you his callsign instead — among Reavers, that is the thanks." },
      },
      {
        zh: "先开火。围住你就是理由。", en: "Fire first. Being boxed in is reason enough.",
        outcome: { kind: "combat", encounterId: "bountyReaverScavengers",
          zh: "也许他们真的只是渴了。你不会知道了。",
          en: "Maybe they really were only thirsty. You will not find out." },
      },
      {
        zh: "什么都不做，等他们先动。", en: "Do nothing. Let them move first.",
        outcome: { kind: "nothing",
          zh: "他们等了四十秒，然后散开了。谁都没有先动。",
          en: "They wait forty seconds, then break formation. Nobody moved first." },
      },
    ],
  },
  {
    id: "swarmHusk",
    galaxyId: "fracturedVeil",
    zh: [
      "一只虫群单位的空壳挂在碎石上，比你见过的任何一只都大。",
      "壳是空的——不是被打穿的，是从内侧脱下来的。它蜕壳了，然后走了。",
    ],
    en: [
      "The husk of a Swarm unit hangs in the debris, larger than any you have seen.",
      "It is empty — not breached, but shed. It moulted, and then it left.",
    ],
    options: [
      {
        zh: "把壳带走研究。", en: "Take the husk for study.",
        outcome: { kind: "resources", resources: { insight: 10, sourcePoints: 60 },
          zh: "余烬花了两个小时才把结构读完。她读完之后说的第一句话是：它还会更大。",
          en: "It takes the Cinder two hours to finish reading the structure. The first thing she says afterwards is: it is still growing." },
      },
      {
        zh: "烧掉它，并把坐标广播出去。", en: "Burn it, and broadcast the coordinates.",
        outcomes: [
          { weight: 6, outcome: { kind: "reputation", reputation: { lionsheart: 5, swanreach: 5 },
            zh: "你把坐标和影像一起发给了疆域里每一个还在听的人。有人回了消息，只有两个字：收到。",
            en: "You send the coordinates and the imagery to everyone in the Reach still listening. One reply comes back, two words: received." } },
          { weight: 4, outcome: { kind: "combat", encounterId: "bountySwarmStragglers",
            zh: "广播开出去四十秒，蜕壳那位的同类顺着信号找了过来。",
            en: "Forty seconds after the broadcast, whatever shed that husk sends its kin along the signal." } },
        ],
      },
    ],
  },
  {
    id: "silentRelay",
    galaxyId: null,
    zh: [
      "一座中继站还在工作，转发着一段四十年前的商队调度。",
      "调度里点名的那些船，一艘都不在了。",
    ],
    en: [
      "A relay is still working, forwarding a convoy schedule from forty years ago.",
      "Not one of the ships it names still exists.",
    ],
    options: [
      {
        zh: "接进去，把频道占为己用。", en: "Splice in and take the channel for yourself.",
        outcome: { kind: "resources", resources: { sourcePoints: 90, insight: 4 }, reputation: { swanreach: -7 },
          zh: "四十年的商队频率，现在归你了。这在正经商会那里值不少钱——也正因如此，商会不会喜欢你干这件事。",
          en: "Forty years of convoy frequencies, yours now. The legitimate combines will pay for that — which is exactly why they will not thank you for taking it." },
      },
      {
        zh: "把调度表补完，让它继续播。", en: "Finish the schedule and let it keep broadcasting.",
        outcome: { kind: "reputation", reputation: { swanreach: 8, lionsheart: 4 },
          zh: "你在名单末尾加了一行「絮语」号。没有理由，就是加了。",
          en: "You add one line at the end of the list: Whisper. No reason. You just add it." },
      },
      {
        zh: "关掉它。", en: "Switch it off.",
        outcome: { kind: "resources", resources: { alloy: 30 },
          zh: "拆下来的零件还能用。四十年的循环终于停了。",
          en: "The parts are still good. A forty-year loop finally stops." },
      },
    ],
  },
  {
    id: "hollowedYard",
    galaxyId: "umbralLine",
    zh: [
      "一座小船坞，外壳完好，里面所有的船都被掏空了——不是拆，是掏。",
      "余烬安静了一会儿，然后说：这是「空壳」干的，而且很近。",
    ],
    en: [
      "A small yard, hull intact, every ship inside hollowed out — not dismantled. Hollowed.",
      "The Cinder is quiet for a moment, then says: the Hollow did this, and recently.",
    ],
    options: [
      {
        zh: "快进快出，能拿多少拿多少。", en: "In and out. Take what you can carry.",
        outcomes: [
          { weight: 6, outcome: { kind: "resources", resources: { alloy: 150, originEssence: 6 },
            zh: "十九分钟，装满。走的时候没有任何东西追出来。",
            en: "Nineteen minutes, holds full. Nothing follows you out." } },
          { weight: 4, outcome: { kind: "combat", encounterId: "bountyHollowEchoes",
            zh: "有东西追出来了。",
            en: "Something follows you out." } },
        ],
      },
      {
        zh: "记下坐标，报给疆域。", en: "Log it and warn the Reach.",
        outcome: { kind: "reputation", reputation: { bauhinia: 6, lionsheart: 6, swanreach: 6 },
          zh: "三家都回了。这是你第一次同时收到三份回执。",
          en: "All three answer. It is the first time you have had three acknowledgements at once." },
      },
    ],
  },
  {
    id: "duelistChallenge",
    galaxyId: "lionsheartExpanse",
    zh: [
      "一艘协约的单船横在航道上，开着识别灯，没有锁定你。",
      "通讯里只有一句：一场，按规矩来。",
    ],
    en: [
      "A single Concord hull sits across the lane, running its identification lights, weapons unlocked.",
      "The channel carries one line: one pass, by the rules.",
    ],
    options: [
      {
        zh: "接。", en: "Accept.",
        outcome: { kind: "combat", encounterId: "bountyConcordSparringPartner",
          zh: "他先鞠躬，然后才开火。这两件事对他来说是一件事。",
          en: "He bows first, then fires. To him those are the same act." },
      },
      {
        zh: "拒绝，绕开。", en: "Decline and go around.",
        outcome: { kind: "reputation", reputation: { lionsheart: -5 },
          zh: "他让开了，一句话都没说。协约的规矩里，拒绝也是一种回答。",
          en: "He moves aside without a word. In the Concord's rules, declining is also an answer." },
      },
    ],
  },
  {
    id: "essenceSeep",
    galaxyId: null,
    zh: [
      "一道细缝在渗东西。不是液体，也不是光——是那种让你觉得这一秒过得比别的秒长的东西。",
      "余烬说：别靠太近。然后又说：不过它确实值钱。",
    ],
    en: [
      "A hairline seam is weeping. Not liquid, not light — the kind of thing that makes this second feel longer than the ones around it.",
      "The Cinder says: don't get close. Then she says: it is worth a great deal, though.",
    ],
    options: [
      {
        zh: "贴上去，尽量多收。", en: "Get in close and take as much as you can.",
        outcomes: [
          { weight: 5, outcome: { kind: "resources", resources: { originEssence: 18 },
            zh: "收得比预想的多。回程上，仪表有三个小时读数不对。",
            en: "More than you expected. For three hours on the way back, the instruments do not read true." } },
          { weight: 5, outcome: { kind: "hull", hull: -35,
            zh: "有一段舱壁不在了。不是被打穿——是不在了。",
            en: "A section of bulkhead is gone. Not breached. Gone." } },
        ],
      },
      {
        zh: "远距离取样就走。", en: "Sample from a distance and leave.",
        outcome: { kind: "resources", resources: { originEssence: 5, insight: 4 },
          zh: "够她研究一阵子了。她没说谢谢，但把船内的灯调亮了一档。",
          en: "Enough for her to work with. She does not say thank you; she does turn the cabin lights up a step." },
      },
    ],
  },
  {
    id: "ghostConvoy",
    galaxyId: null,
    zh: [
      "六艘货船排成标准编队，航向、间距都规规矩矩。没有一艘有动力。",
      "它们保持这个队形，已经不知道多少年了。",
    ],
    en: [
      "Six freighters in a textbook formation, heading and spacing exact. Not one of them under power.",
      "They have held that formation for years nobody has counted.",
    ],
    options: [
      {
        zh: "拆。它们不需要了。", en: "Strip them. They have no use for it.",
        outcomes: [
          { weight: 7, outcome: { kind: "resources", resources: { salvage: 180, alloy: 70 },
            zh: "六艘船够你装满两趟。队形散了。",
            en: "Six hulls fill your holds twice over. The formation is gone." } },
          { weight: 3, outcome: { kind: "resources", resources: { salvage: 180, alloy: 70 }, reputation: { swanreach: -8, lionsheart: -8 },
            zh: "六艘船够你装满两趟。第三艘的舱里有一份完整的船员名册，而那些姓氏在疆域里还有人在用。",
            en: "Six hulls fill your holds twice over. In the third one there is a complete crew manifest, and those surnames are still in use across the Reach." } },
        ],
      },
      {
        zh: "只拆一艘，留下队形。", en: "Strip one. Leave the formation.",
        outcome: { kind: "resources", resources: { salvage: 60, insight: 6 },
          zh: "你把那艘的位置补上了一块自己的板子。远看还是六艘。",
          en: "You weld one of your own plates into the gap. From a distance it is still six." },
      },
    ],
  },
];

export function eventById(id: string): GameEvent | undefined {
  return GAME_EVENTS.find((e) => e.id === id);
}

/** 这个星区能出现的事件。 */
export function eventsForGalaxy(galaxyId: string): GameEvent[] {
  return GAME_EVENTS.filter((e) => e.galaxyId === null || e.galaxyId === galaxyId);
}

/** 从一组带权重的结果里挑一个。 */
export function rollOutcome(opt: EventOption, roll: number = Math.random()): EventOutcome {
  if (opt.outcome) return opt.outcome;
  const list = opt.outcomes ?? [];
  const total = list.reduce((s, o) => s + o.weight, 0);
  let acc = 0;
  const target = roll * total;
  for (const o of list) {
    acc += o.weight;
    if (target < acc) return o.outcome;
  }
  return list[list.length - 1].outcome;
}
