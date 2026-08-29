/** Procedural music.
 *
 * Commercial-gap audit #2: the game had 12 synthesized blips and no music at all.
 * Audio is not decoration in this category — a large share of what people call
 * "juice" is sound, and the soundtracks of the games this project is measured
 * against are a substantial part of why their loops are described as addictive.
 *
 * Written rather than recorded, because the target is a *free browser game* at a
 * paid-release quality bar: a downloaded soundtrack would be several megabytes
 * before the first frame. This is a few kilobytes of code that starts instantly,
 * never repeats exactly, and follows the game's state.
 *
 * Three moods, crossfaded rather than cut, because a hard switch on every screen
 * change would be worse than silence:
 *
 *   drift  — the star map. Slow, wide, mostly space.
 *   combat — driving pulse, a semitone darker.
 *   rift   — unstable: detuned, wandering, no comfortable root.
 */

import { getSettings } from "../engine/settings";

export type Mood = "drift" | "combat" | "rift" | "silent";

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let current: Mood = "silent";
let timer: number | null = null;
let step = 0;

/** A natural-minor scale in semitones. Minor because the fiction is a salvage
 * war fought by one ship, and because it keeps the three moods relatives of each
 * other rather than unrelated pieces. */
const SCALE = [0, 2, 3, 5, 7, 8, 10];

const MOODS: Record<Exclude<Mood, "silent">, {
  root: number; bpm: number; density: number; detune: number; padGain: number;
}> = {
  drift: { root: 45, bpm: 64, density: 0.34, detune: 0, padGain: 0.12 },
  combat: { root: 43, bpm: 104, density: 0.62, detune: 4, padGain: 0.09 },
  rift: { root: 44, bpm: 82, density: 0.48, detune: 22, padGain: 0.14 },
};

function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    bus = ctx.createGain();
    bus.gain.value = 0;
    // Music sits well under the effects; it should be noticed on its absence,
    // not competed with.
    bus.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One plucked voice. Triangle for body, lowpassed so nothing is shrill. */
function pluck(at: number, hz: number, gain: number, detuneCents: number) {
  if (!ctx || !bus) return;
  const osc = ctx.createOscillator();
  const filt = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = hz;
  osc.detune.value = detuneCents;
  filt.type = "lowpass";
  filt.frequency.value = 1500;
  filt.Q.value = 0.6;
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(gain, at + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + 1.5);
  osc.connect(filt).connect(amp).connect(bus);
  osc.start(at);
  osc.stop(at + 1.6);
}

/** A slow sustained pad, retriggered every few bars, that gives the loop its
 * floor. Two oscillators a fifth apart, one detuned. */
function pad(at: number, hz: number, gain: number, detuneCents: number, dur: number) {
  if (!ctx || !bus) return;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(gain, at + 1.4);
  amp.gain.linearRampToValueAtTime(0, at + dur);
  amp.connect(bus);
  for (const [mult, cents] of [[1, 0], [1.5, detuneCents]] as const) {
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    o.type = "sine";
    o.frequency.value = hz * mult;
    o.detune.value = cents;
    f.type = "lowpass";
    f.frequency.value = 700;
    o.connect(f).connect(amp);
    o.start(at);
    o.stop(at + dur + 0.1);
  }
}

function schedule() {
  if (!ctx || current === "silent") return;
  const cfg = MOODS[current as Exclude<Mood, "silent">];
  const beat = 60 / cfg.bpm;
  const now = ctx.currentTime + 0.06;

  // Melody: a walk through the scale rather than a fixed phrase, so the loop
  // never repeats exactly and never wanders out of key.
  if (Math.random() < cfg.density) {
    const degree = SCALE[Math.floor(Math.random() * SCALE.length)];
    const octave = Math.random() < 0.25 ? 12 : 0;
    pluck(now, midiToHz(cfg.root + 24 + degree + octave), 0.055, cfg.detune);
  }
  // A low root every four steps keeps a pulse without a drum kit.
  if (step % 4 === 0) {
    pluck(now, midiToHz(cfg.root), 0.07, 0);
  }
  // Pad every sixteen.
  if (step % 16 === 0) {
    const degree = SCALE[Math.floor(Math.random() * 3) * 2];
    pad(now, midiToHz(cfg.root + 12 + degree), cfg.padGain, cfg.detune, beat * 16);
  }
  step++;
  timer = window.setTimeout(schedule, beat * 1000);
}

/** Switches mood with a crossfade. Safe to call every render — a repeat of the
 * current mood is a no-op. */
export function setMood(mood: Mood) {
  if (mood === current) return;
  const ac = ensure();
  if (!ac || !bus) return;
  current = mood;

  if (timer !== null) { clearTimeout(timer); timer = null; }

  const target = mood === "silent" ? 0 : (getSettings().muted ? 0 : getSettings().volume * 0.5);
  bus.gain.cancelScheduledValues(ac.currentTime);
  bus.gain.setValueAtTime(bus.gain.value, ac.currentTime);
  bus.gain.linearRampToValueAtTime(target, ac.currentTime + 1.6);

  if (mood !== "silent") {
    step = 0;
    schedule();
  }
}

/** Re-reads volume/mute after a settings change. */
export function refreshMusicVolume() {
  if (!ctx || !bus) return;
  const target = current === "silent" ? 0 : (getSettings().muted ? 0 : getSettings().volume * 0.5);
  bus.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.25);
}

export function currentMood(): Mood {
  return current;
}
