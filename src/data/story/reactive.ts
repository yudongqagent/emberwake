import type { DialogueLine, FactionId, StoryScene } from "../types";
import { repTier } from "../reputation";

/** 会看玩家的剧情。
 *
 * 2026-08-30。docs/story-engagement-analysis.md 里量出来最刺眼的一条:
 *
 * > 40 个场景里,引用玩家状态(船、等级、选择、损失)的地方:**0 处**。
 *
 * 也就是说,一个把船重铸过四次、跟狮心结了盟、把公国得罪光的玩家,和一个刚出新手
 * 村谁也没得罪的玩家,看到的是一模一样的四十场戏。剧情不是"写得不够好",是它根本
 * 不在场——它不知道你是谁,所以你也不觉得那是你的故事。
 *
 * 做法刻意保守:不改任何一句已有台词,只在场景里**插进一句**认得出玩家的话。
 * 原因有两条——
 *
 * 1. 已有台词是中英两套、四十个场景一一对应的,把它们做成条件分支会让每一次改动
 *    都变成一次组合爆炸,而且 story.test.ts 那套一一对应的校验会全部作废。
 * 2. 一句就够。玩家要的不是"整场戏为我重写",是"这游戏记得我干过什么"。
 *
 * 每条插入自带 `when`,第一条为真的胜出;全假就什么都不插——所以"没触发"永远是
 * 安全的降级,不会出现空行或者占位符。 */

export interface StoryContext {
  level: number;
  /** 重铸过几次。0 = 还开着最初那条护卫舰。 */
  ascensions: number;
  hullClassName: string;
  reputation: Partial<Record<FactionId, number>>;
  cinderTrust: number;
  /** 送出去的船——它们会在团战里回来帮你。 */
  alliedShips: number;
  /** 缴获但还没送出去的船。 */
  capturedShips: number;
  /** 玩家主动加的余烬负荷。>0 意味着他在自找麻烦。 */
  voluntaryLoad: number;
  flags: Record<string, boolean>;
}

export function tierOf(ctx: StoryContext, f: FactionId) {
  return repTier(ctx.reputation[f] ?? 0);
}

interface Variant {
  when: (ctx: StoryContext) => boolean;
  en: string;
  zh: string;
}

export interface ReactiveInsert {
  /** 插在第几句之后(0 = 插在第一句之后)。 */
  after: number;
  speaker: { en: string; zh: string };
  variants: Variant[];
}

const CINDER = { en: "The Cinder", zh: "余烬" };
const KADE = { en: "Kade Ren", zh: "陆昭" };
const TIE = { en: "Commodore Tie Heng", zh: "铁衡" };
const LIU = { en: "Liu Yun", zh: "柳芸" };

/** 场景 id -> 插入。
 *
 * 挑场景的标准只有一条:**这时候玩家之间的差别已经足够大**。第一章前两场谁都一样,
 * 插进去只会是废话;而到了血债、山脊、虎鲨这些地方,不同的人已经走出了不同的路。 */
export const REACTIVE_LINES: Record<string, ReactiveInsert[]> = {
  // --- 第一章:差别刚刚开始出现,只认"你有没有主动往火里跳"。
  emberRising: [
    {
      after: 1,
      speaker: CINDER,
      variants: [
        {
          when: (c) => c.voluntaryLoad > 0,
          en: "You've been running her hotter than she asks for. I noticed. I didn't stop you — I want to see how far that goes.",
          zh: "你一直把她烧得比她要求的更旺。我看见了。我没拦你——我想知道那样能走多远。",
        },
        {
          when: (c) => c.level >= 8,
          en: "You've put more hours into her than the crew that built her did. It shows in the way she answers.",
          zh: "你在她身上花的时间，比造她的人还多。她回应你的方式里看得出来。",
        },
      ],
    },
  ],

  // --- 第二章:第一次表态之后,公国的态度已经分岔了。
  bloodDebt: [
    {
      after: 0,
      speaker: TIE,
      variants: [
        {
          when: (c) => tierOf(c, "bauhinia") === "hostile" || tierOf(c, "bauhinia") === "cold",
          en: "Arthaine already has your name on a list, Ren. Whatever you do with this, you're not making it worse.",
          zh: "安氏的名单上早就有你了，陆昭。这件事你怎么做，都不会更糟了。",
        },
        {
          when: (c) => tierOf(c, "bauhinia") === "friendly" || tierOf(c, "bauhinia") === "allied",
          en: "You've been careful with Arthaine so far. This is where careful stops being free.",
          zh: "你到现在对安氏都还算客气。从这里开始，客气是要付钱的。",
        },
      ],
    },
  ],
  hollowFleet: [
    {
      after: 2,
      speaker: CINDER,
      variants: [
        {
          when: (c) => c.ascensions >= 2,
          en: "Two hulls ago you'd have died in this yard. I'm not being sentimental — I ran the numbers on the ship you used to be.",
          zh: "两副骨架之前，你会死在这个船坞里。这不是感慨——我把你从前那条船的数算过了。",
        },
        {
          when: (c) => c.ascensions === 0,
          en: "You're taking a shipbreaker's yard in the hull you started with. That's either conviction or arithmetic you haven't done.",
          zh: "你开着最初那条船来打拆船厂。这要么是信念，要么是你没算过账。",
        },
      ],
    },
  ],
  ridgeAndReach: [
    {
      after: 1,
      speaker: LIU,
      variants: [
        {
          when: (c) => tierOf(c, "lionsheart") === "allied",
          en: "The Concord already flies with you. Half this room thinks that means they own you.",
          zh: "狮心的船已经跟你一起飞了。这屋里有一半人觉得，那等于他们买下了你。",
        },
        {
          when: (c) => tierOf(c, "swanreach") === "allied",
          en: "The Combine already carries your paper. Whatever you decide, they'll price it before you finish saying it.",
          zh: "商会手里已经有你的票据了。你不管决定什么，话没说完他们就已经标好价了。",
        },
        {
          when: (c) => tierOf(c, "lionsheart") === "hostile" || tierOf(c, "swanreach") === "hostile",
          en: "You've already made one of these two an enemy. That's not neutrality, it's a side you took without saying so.",
          zh: "这两家里，有一家已经被你得罪死了。那不是中立，那是你没吭声就选好的边。",
        },
      ],
    },
  ],

  // --- 第三章:虎鲨、缴获、身世。
  tigerSharkGambit: [
    {
      after: 1,
      speaker: KADE,
      variants: [
        {
          when: (c) => c.capturedShips + c.alliedShips >= 3,
          en: "I've taken ships instead of sinking them for a while now. You know what that costs. Say your number.",
          zh: "我有一阵子不击沉船了，改成把它们收下来。你知道那要多少代价。开你的价。",
        },
        {
          when: (c) => tierOf(c, "reavers") === "hostile",
          en: "Your people have been hunting me for months. You don't get to open with 'neither of us matters.'",
          zh: "你的人追杀了我几个月。你没资格拿「我们俩都不算什么」开场。",
        },
      ],
    },
  ],
  /** 这条原来挂在 originTide(第三幕)上——而 cinderTrust 唯一的来源是**第四幕**的
   * 身世揭露,所以在第三幕它必然是 0,这条插入的两个变体一个都到不了,整条永远不触发。
   *
   * 台词本身也说明它属于揭露之后:「自打研究院之后,我告诉你的比告诉任何人的都多」
   * ——在她还瞒着最大那件事的第三幕说这句,是自相矛盾的。挪到揭露的下一幕(最后的
   * 船坞),接在她那句「把低语开进去」后面收尾。 */
  lastShipyard: [
    {
      after: 3,
      speaker: CINDER,
      variants: [
        {
          when: (c) => c.cinderTrust >= 2,
          en: "I've told you more than I've told anyone since the Institute. I'd like the record to show I chose to.",
          zh: "自打研究院之后，我告诉你的比告诉任何人的都多。我希望记录上写清楚：那是我自己要说的。",
        },
        {
          when: (c) => c.cinderTrust <= -1,
          en: "You've stopped asking me things. I've noticed. I'm not going to pretend that doesn't register.",
          zh: "你不再问我事情了。我注意到了。我不打算假装这没什么。",
        },
      ],
    },
  ],

  // --- 第四章:安氏终局。这里的差别最大,因为前面三章的账全在这儿结。
  sirArthurEndgame: [
    {
      after: 1,
      speaker: TIE,
      variants: [
        {
          when: (c) => tierOf(c, "bauhinia") === "hostile",
          en: "Half the Principality wants you dead and the other half wants you useful. Walk in knowing which half is in the room.",
          zh: "公国有一半人想让你死，另一半想让你有用。进门之前先弄清楚屋里坐的是哪一半。",
        },
        {
          when: (c) => tierOf(c, "bauhinia") === "allied" || tierOf(c, "bauhinia") === "friendly",
          en: "They still think you're theirs. That's the only advantage you have in there, and you only get to spend it once.",
          zh: "他们还当你是自己人。那是你在里面唯一的筹码，而且只能花一次。",
        },
      ],
    },
  ],
  whatTheFireRemembers: [
    {
      after: 2,
      speaker: CINDER,
      variants: [
        {
          when: (c) => c.ascensions >= 4,
          en: "Four times you've torn her down to the frame and built her back. I don't know if that makes her the same ship. I've stopped needing it to.",
          zh: "你把她拆到骨架又重建，四次了。我不知道这还算不算同一条船。我已经不需要它算了。",
        },
        {
          when: (c) => c.ascensions <= 1,
          en: "You've barely changed her. Most captains would call that sentiment. I've read enough logs to know it's usually fear.",
          zh: "你几乎没动过她。多数舰长管这叫念旧。日志我读得够多，知道那通常是害怕。",
        },
      ],
    },
  ],

  // --- 第五章:回到疆域,看你在疆域里留下了什么。
  callingTheReach: [
    {
      after: 0,
      speaker: LIU,
      variants: [
        {
          when: (c) => c.alliedShips >= 3,
          en: "Three of the hulls that answered your call, you took at gunpoint and gave away. People notice a man who hands ships back.",
          zh: "响应你号召的船里，有三条是你拿炮口逼下来、又转手送出去的。会把船还回去的人，别人记得住。",
        },
        {
          when: (c) => c.alliedShips === 0,
          en: "You've sunk everything you ever beat. It's a clean way to fight. It's a lonely way to call for help.",
          zh: "你打赢的船，一条不留全沉了。那种打法很干净。用它来求援，就很孤单。",
        },
      ],
    },
  ],
  whatKadeKnows: [
    {
      after: 1,
      speaker: KADE,
      variants: [
        {
          when: (c) => !!c.flags["tigerSharkAlliance"],
          en: "I shook hands with the woman who burned Tiger's Reach. I did it with my eyes open and I'd do it again. Ask me why later.",
          zh: "我跟烧了虎踞湾的那个女人握过手。我是睁着眼睛握的，再来一次我还握。为什么，以后再问我。",
        },
        {
          when: (c) => !!c.flags["act3.tigerSharkGambit.refused"],
          en: "I turned down the only ally who offered before it was fashionable. Everything after that, I paid for myself.",
          zh: "在结盟还没成风气的时候，唯一伸手的人被我拒了。之后每一笔，都是我自己付的。",
        },
      ],
    },
  ],

  // --- 第六章:结账。
  seizingCommand: [
    {
      after: 1,
      speaker: LIU,
      variants: [
        {
          when: (c) =>
            (["bauhinia", "lionsheart", "swanreach", "reavers"] as FactionId[])
              .filter((f) => tierOf(c, f) === "allied").length >= 2,
          en: "Two powers already fly with you and neither will say it out loud. That's not a coalition, that's a debt nobody's called in yet.",
          zh: "已经有两家的船跟你一起飞，而且谁都不肯明说。那不叫联合，那叫还没人来讨的债。",
        },
        {
          when: (c) =>
            (["bauhinia", "lionsheart", "swanreach", "reavers"] as FactionId[])
              .some((f) => tierOf(c, f) === "hostile"),
          en: "One of the four wants you dead, and they still had to vote for you. Enjoy it. It won't last the war.",
          zh: "四家里有一家想让你死，可他们还是得投你。好好享受——这撑不过这场仗。",
        },
      ],
    },
  ],
  civilizationDisqualified: [
    {
      after: 3,
      speaker: CINDER,
      variants: [
        {
          when: (c) => c.ascensions >= 5,
          en: "Whatever the standard was, the Reach's answer is a scrap-grade corvette rebuilt five times by someone who wouldn't stop.",
          zh: "不管那套标准是什么，疆域交上去的答卷，是一条被人重铸了五次、死活不肯停下的废品级护卫舰。",
        },
        {
          when: (c) => c.cinderTrust >= 2,
          en: "And for the record — the part of the answer that was me, I gave freely. That may be the only part that counts.",
          zh: "另外记一笔——这份答卷里属于我的那部分，是我自愿给的。也许只有那部分算数。",
        },
      ],
    },
  ],
};

/** 把认得出玩家的那句插进场景。
 *
 * 从后往前插,这样前面那条的 `after` 下标不会被后面插进去的行挪掉——这类"边插边
 * 改下标"的错很难在测试里看出来,因为结果只是台词插错位置,不会报错。 */
export function applyReactiveLines(
  scene: StoryScene,
  ctx: StoryContext,
  lang: "en" | "zh",
): StoryScene {
  const inserts = REACTIVE_LINES[scene.id];
  if (!inserts || inserts.length === 0) return scene;
  const lines: DialogueLine[] = [...scene.lines];
  const ordered = [...inserts].sort((a, b) => b.after - a.after);
  let changed = false;
  for (const ins of ordered) {
    const v = ins.variants.find((x) => x.when(ctx));
    if (!v) continue;
    const at = Math.min(ins.after + 1, lines.length);
    lines.splice(at, 0, { speaker: ins.speaker[lang], text: v[lang] });
    changed = true;
  }
  return changed ? { ...scene, lines } : scene;
}
