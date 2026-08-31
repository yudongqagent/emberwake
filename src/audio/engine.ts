import { getSettings, updateSettings } from "../engine/settings";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = getSettings().muted;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = getSettings().muted ? 0 : getSettings().volume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
  updateSettings({ muted: value });
  if (masterGain) masterGain.gain.value = value ? 0 : getSettings().volume;
}

/** Commercial-gap audit #6: a mute toggle is not a volume control. */
export function setVolume(value: number) {
  const v = Math.max(0, Math.min(1, value));
  updateSettings({ volume: v });
  if (masterGain && !muted) masterGain.gain.value = v;
}

export function getVolume(): number {
  return getSettings().volume;
}

export function isMuted() {
  return muted;
}

function envelope(gain: GainNode, ac: AudioContext, attack: number, decay: number, peak: number) {
  const now = ac.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
}

function tone(ac: AudioContext, freq: number, type: OscillatorType, duration: number, peak = 0.6, freqEnd?: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + duration);
  envelope(gain, ac, 0.01, duration, peak);
  osc.connect(gain);
  gain.connect(masterGain!);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.05);
}

function noiseBurst(ac: AudioContext, duration: number, peak = 0.4, filterFreq = 1200) {
  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  envelope(gain, ac, 0.005, duration, peak);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain!);
  src.start();
  src.stop(ac.currentTime + duration + 0.05);
}

type SfxName =
  | "click"
  | "mine"
  | "draw"
  | "laser"
  | "hit"
  | "braced"
  | "evade"
  | "crit"
  | "explosion"
  | "jump"
  | "alarm"
  | "dock"
  | "dialogue"
  | "victory"
  | "defeat"
  | "levelUp";

export function playSfx(name: SfxName) {
  if (muted) return;
  const ac = getCtx();
  if (!ac || !masterGain) return;
  switch (name) {
    case "click":
      tone(ac, 720, "square", 0.05, 0.2);
      break;
    case "dialogue":
      tone(ac, 480, "sine", 0.04, 0.15);
      break;
    case "mine":
      tone(ac, 220, "triangle", 0.12, 0.3, 340);
      break;
    case "draw":
      tone(ac, 300, "sawtooth", 0.25, 0.25, 900);
      tone(ac, 600, "sine", 0.3, 0.2, 1200);
      break;
    case "laser":
      tone(ac, 1100, "sawtooth", 0.14, 0.35, 260);
      break;
    case "hit":
      noiseBurst(ac, 0.12, 0.35, 900);
      break;
    // 2026-08-31(/loop 第 32 轮)。防守端原来只有一个声音:抗冲成功和硬吃一发听着
    // 一模一样,而闪避掉一发**完全没有声音**。
    //
    // 战斗代码自己的注释早就点破了这件事:「正确读出对手意图的奖励是一次"没有
    // 发生",而那感觉上等于什么都没有」——作者为此加了视觉弹字和光环,但音效
    // 那一路没跟上。而第 24 轮之后战斗**要求**主动抗冲(零操作打不赢),这个反馈
    // 就是玩家判断自己按对没按对的唯一即时信号。
    //
    // 搜到的原则是"命中、被挡下、其它结果各要有各自的反馈";那份 DOOM 的研究里,
    // 开声音的玩家得分接近静音的两倍。
    case "braced":
      // 挡下来的一击:闷响打底,上面压一记金属余音——听起来是"接住了",不是"挨了"。
      noiseBurst(ac, 0.09, 0.22, 320);
      tone(ac, 660, "triangle", 0.22, 0.22, 990);
      break;
    case "evade":
      // 擦身而过。刻意做得又短又轻:闪避流派下四分之一以上的攻击都会走这里,
      // 声音重一点就会变成噪音疲劳。
      noiseBurst(ac, 0.07, 0.1, 2400);
      break;
    case "crit":
      // 暴击要能从连续的普通命中里跳出来,否则"打出暴击"这件事只存在于日志里。
      noiseBurst(ac, 0.1, 0.4, 1400);
      tone(ac, 1500, "square", 0.1, 0.18, 2600);
      break;
    case "explosion":
      noiseBurst(ac, 0.5, 0.55, 400);
      tone(ac, 90, "sine", 0.5, 0.4, 40);
      break;
    case "jump":
      tone(ac, 120, "sine", 0.8, 0.3, 900);
      break;
    case "alarm":
      tone(ac, 500, "square", 0.15, 0.25, 500);
      setTimeout(() => tone(ac, 500, "square", 0.15, 0.25, 500), 180);
      break;
    case "dock":
      tone(ac, 400, "triangle", 0.2, 0.25, 200);
      break;
    case "victory":
      [440, 550, 660, 880].forEach((f, i) => setTimeout(() => tone(ac, f, "triangle", 0.25, 0.3), i * 90));
      break;
    case "defeat":
      tone(ac, 220, "sawtooth", 0.6, 0.3, 80);
      break;
    // Issue #1 (2026-08 playtest): a level-up needs its own distinct, bigger sound —
    // reusing "victory" made every level-up feel like just another combat win, not a
    // separate, real power jump worth its own moment.
    case "levelUp":
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(ac, f, "triangle", 0.3, 0.35, f * 1.5), i * 70));
      break;
  }
}
