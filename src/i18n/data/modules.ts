/** Issue #11: Chinese translation overlay for module reference data (name + trait
 * label/description), keyed by ModuleDef id then trait id. Same pattern as the
 * story overlays — see i18n/story/index.ts — a missing key falls back to the
 * English original rather than showing blank. Original prose, not sourced. */
export interface ModuleTraitZh {
  label: string;
  description: string;
}

export interface ModuleZh {
  name: string;
  traits: Record<string, ModuleTraitZh>;
}

export const MODULES_ZH: Record<string, ModuleZh> = {
  pulseCannon: {
    name: "脉冲炮",
    traits: {
      crit: { label: "+暴击", description: "更高几率触发暴击。" },
      pierce: { label: "+穿透", description: "无视部分敌方装甲。" },
    },
  },
  arcLance: {
    name: "电弧枪",
    traits: {
      chainArc: { label: "连锁电弧", description: "伤害会跳跃至第二个目标。" },
      pierce: { label: "+穿透", description: "无视部分敌方装甲。" },
    },
  },
  plateBarrier: {
    name: "装甲壁垒",
    traits: {
      hullBonus: { label: "+船体", description: "提升最大船体值。" },
      regen: { label: "再生", description: "每回合恢复少量船体。" },
    },
  },
  reactiveMesh: {
    name: "反应装甲网",
    traits: {
      regen: { label: "再生", description: "每回合恢复少量船体。" },
      shieldBreak: { label: "抗干扰", description: "抵抗模组失效效果。" },
    },
  },
  thrusterArray: {
    name: "推进器阵列",
    traits: {
      evasion: { label: "+闪避", description: "更难被命中。" },
      jumpRange: { label: "+跃迁范围", description: "更快切换交战距离。" },
    },
  },
  vectorDrive: {
    name: "矢量引擎",
    traits: {
      surge: { label: "冲能", description: "自上次开火以来实际移动的距离会为下一次射击充能，获得额外伤害——奖励真正进行走位，而非固守一个位置。" },
      jumpRange: { label: "+跃迁范围", description: "更快切换交战距离。" },
    },
  },
  empBurst: {
    name: "电磁脉冲弹",
    traits: {
      disable: { label: "干扰", description: "有几率使敌方模组失效。" },
      shieldBreak: { label: "破盾", description: "剥离敌方格挡。" },
    },
  },
  salvageDrone: {
    name: "打捞无人机",
    traits: {
      yieldBonus: { label: "+产出", description: "本场战斗额外获得废料/合金。" },
      regen: { label: "野战维修", description: "为舰队恢复少量船体。" },
    },
  },
  railgun: {
    name: "磁轨炮",
    traits: {
      execute: { label: "处决", description: "对船体低于25%的目标造成+50%伤害——用于收尾，而非持续输出。" },
      pierce: { label: "+穿透", description: "无视部分敌方装甲。" },
    },
  },
  flakBattery: {
    name: "防空速射炮",
    traits: {
      aoe: { label: "溅射", description: "同时对其他所有存活敌人造成减免伤害——以单体威力换取群体压制。" },
      crit: { label: "+暴击", description: "更高几率触发暴击。" },
    },
  },
  ablativePlating: {
    name: "烧蚀装甲",
    traits: {
      absorb: { label: "吸收", description: "完全抵消本场战斗受到的第一次打击——常态格挡较弱，换取一次必定无伤的交换。" },
      hullBonus: { label: "+船体", description: "提升最大船体值。" },
    },
  },
  inertialDampers: {
    name: "惯性阻尼器",
    traits: {
      momentum: { label: "动能", description: "本场战斗中，未被命中的时间越长，闪避越高，一旦被命中立刻重置。" },
      evasion: { label: "+闪避", description: "更难被命中。" },
    },
  },
  purgeField: {
    name: "净化力场",
    traits: {
      cleanse: { label: "净化", description: "立即清除腐蚀/剥离效果，将护甲恢复至装备值。" },
      yieldBonus: { label: "+产出", description: "本场战斗额外获得废料/合金。" },
    },
  },
  ionDisruptor: {
    name: "离子干扰器",
    traits: {
      overload: { label: "过载", description: "这件武器每第三次射击都会造成双倍伤害——是一种蓄力节奏，而非固定加成。" },
      crit: { label: "+暴击", description: "更高几率触发暴击。" },
    },
  },
  kineticReflector: {
    name: "动能反射器",
    traits: {
      reflect: { label: "反射", description: "这件装甲格挡的伤害中有一部分会反弹给攻击者——唯一一件会因敌人攻击你而反过来惩罚敌人的模组。" },
      hullBonus: { label: "+船体", description: "提升最大船体值。" },
    },
  },
  displacementCharge: {
    name: "位移充能器",
    traits: {
      displace: { label: "位移", description: "立即将当前目标推至远距离——唯一一件操纵敌方位置而非己方位置的模组。" },
      yieldBonus: { label: "+产出", description: "本场战斗额外获得废料/合金。" },
    },
  },
  twinLinkedCannon: {
    name: "双联装炮",
    traits: {
      volley: { label: "齐射", description: "每次开火发射两发，各自独立判定命中或落空，均针对同一目标——以持续稳定换取单次爆发。" },
      pierce: { label: "+穿透", description: "无视部分敌方装甲。" },
    },
  },
};
