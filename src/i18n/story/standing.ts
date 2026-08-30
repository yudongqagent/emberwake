import type { StoryScene } from "../../data/types";

/** 因为你的立场才会发生的戏 —— 中文文本。 */
export const STANDING_SCENES_ZH: Record<string, Partial<Pick<StoryScene, "lines" | "choices" | "chapter" | "chapterTitle">>> = {
  standingConcordTrust: {
    chapter: "铁门星域",
    chapterTitle: "铁衡没说的那句",
    lines: [
      { speaker: "", text: "他没有呼叫你。他在航道口一直等到你自己过去——这本身就是一句话。" },
      { speaker: "铁衡", text: "协约投票通过跟你一起飞。我弃权了。" },
      { speaker: "陆昭", text: "这几个月你一直跟我一起飞。" },
      { speaker: "铁衡", text: "所以我才弃权。投了票，就成了政策。等他们哪天改主意，政策就是他们躲的地方。" },
      { speaker: "铁衡", text: "所以这句话我不靠投票说:深域外面不管是什么，我都会在航道上。不是因为协约决定了。是因为我决定了。" },
      { speaker: "余烬", text: "把这句记下来。不是为了档案——是为了你自己。这种话没人说第二遍。" },
    ],
  },
  standingConcordBroken: {
    chapter: "铁门星域",
    chapterTitle: "航道关了",
    lines: [
      { speaker: "", text: "航道口满员，炮口跟着你转。铁衡还是一个人走了出来。" },
      { speaker: "铁衡", text: "这条航道我跟你决斗过一次。我输得心服口服，本来打算一直输下去。" },
      { speaker: "陆昭", text: "把后面的话说完。" },
      { speaker: "铁衡", text: "我三批人死在你炮下。我可以扛着这笔账，也可以扛着这个指挥权。两个一起扛不动。" },
      { speaker: "铁衡", text: "下次你从这儿过，带舰队来。我不会第二次一个人出来见你。" },
      { speaker: "余烬", text: "他是空着手走出来跟你说这句的。不管你把他变成了什么，他还是那个会这么干的人。" },
    ],
  },
  standingCombineLedger: {
    chapter: "子午集市",
    chapterTitle: "另一页账",
    lines: [
      { speaker: "", text: "柳芸把整层楼清空了。桌上只有一份档案，而且不是你的。" },
      { speaker: "柳芸", text: "这是我弟弟的。他在漂流市跑打捞。虫群吃掉外环的时候，他正好靠在港里。" },
      { speaker: "陆昭", text: "你从没提过他。" },
      { speaker: "柳芸", text: "因为我是个给东西定价的人，舰长，而这件事我一直定不出价来。所以我改成给你兜底。那比悲伤便宜，而且好歹算做了点什么。" },
      { speaker: "柳芸", text: "你接着往外飞，我接着付钱。整件事就这么简单，我们俩谁都别给它套漂亮话。" },
    ],
  },
  standingCombineCalled: {
    chapter: "子午集市",
    chapterTitle: "这笔账该结了",
    lines: [
      { speaker: "", text: "集市不拦你。它只是把你想进的每一个房间，都标到你进不起。" },
      { speaker: "柳芸", text: "我给你估低过一次价。这十四个月我一直在改那个数。" },
      { speaker: "陆昭", text: "那就当着我的面改。" },
      { speaker: "柳芸", text: "你从挂联合体旗的船上抢走的每一条，背后都有一家人在报损，而每一份我都签了字。我的账本上你的签名，比我自己的还多。" },
      { speaker: "柳芸", text: "我不会派人杀你。我会让你在所有地方、永远地贵下去。市场就是干这个用的。" },
    ],
  },
  standingArthaineDisowned: {
    chapter: "洋紫荆本星",
    chapterTitle: "老头子的条件",
    lines: [
      { speaker: "", text: "本家没有传唤你。一艘不带武装的单船并到你的航向上，一直等到你回话。" },
      { speaker: "安鹤龄", text: "你让我丢了两个席位、一份航运特许，还有一个再也不跟我说话的孙女。" },
      { speaker: "陆昭", text: "是你出钱让掠夺者烧了那座锚地。我只是把它摊开给人看。" },
      { speaker: "安鹤龄", text: "是。我说的「丢了」就是这个意思，舰长。我没有在跟你争这笔账——我是在告诉你，这笔账我算过了。" },
      { speaker: "安鹤龄", text: "本家不会原谅这件事。但本家不是这条船上的这个人，而这个人接下来要告诉你，公国对暗影线知道些什么。说完，我们两清。" },
      { speaker: "余烬", text: "他是一个人来的。四十年的记录里，这个人从来没有一个人来过。" },
    ],
  },
  standingReaverOath: {
    chapter: "空壳船坞",
    chapterTitle: "族群欠的账",
    lines: [
      { speaker: "", text: "船坞又转起来了。不是修好了——是住上人了，而在掠夺者那里，这两个是同一个词。" },
      { speaker: "虎鲨", text: "我的人问我，为什么我们要给一个被我烧过锚地的人卖命。" },
      { speaker: "陆昭", text: "你怎么回的。" },
      { speaker: "虎鲨", text: "我说我烧那座锚地是因为我们在饿死，换一次我还烧；而你明知道这些，还是握了我的手。他们听懂了后半句。他们是掠夺者。从来没人握过他们的手。" },
      { speaker: "虎鲨", text: "我们不发誓。但这个船坞对你一直开着，而冲你来的东西，得先从这儿过。" },
    ],
  },
};
