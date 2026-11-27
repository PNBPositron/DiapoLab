import { useSettings, type TransitionSoundStyle } from "@/store/settings";

let sharedCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => undefined);
  }
  return sharedCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.45);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Soft pink-ish filtered noise for a natural airy whoosh
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
  }
  noiseBuffer = buffer;
  return buffer;
}

function playWhoosh(ctx: AudioContext, isThreeD = false) {
  const now = ctx.currentTime;
  const dur = isThreeD ? 0.34 : 0.24;

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.setValueAtTime(1.4, now);
  filter.frequency.setValueAtTime(220, now);
  filter.frequency.exponentialRampToValueAtTime(isThreeD ? 1180 : 960, now + dur * 0.42);
  filter.frequency.exponentialRampToValueAtTime(320, now + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(isThreeD ? 0.095 : 0.075, now + dur * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  src.stop(now + dur + 0.02);

  if (isThreeD) {
    // Subtle warm harmonic shimmer underneath 3D transitions
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.18);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(0.018, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }
}

function playClick(ctx: AudioContext) {
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(920, now);
  osc.frequency.exponentialRampToValueAtTime(290, now + 0.032);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.065, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

function playGlitchSound(ctx: AudioContext) {
  const now = ctx.currentTime;
  const dur = 0.19;

  // Short high-passed digital static burst
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const hp = ctx.createBiquadFilter();
  hp.type = "bandpass";
  hp.frequency.setValueAtTime(1850, now);
  hp.frequency.exponentialRampToValueAtTime(3400, now + 0.06);
  hp.frequency.exponentialRampToValueAtTime(780, now + dur);
  hp.Q.setValueAtTime(2.6, now);

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.0001, now);
  nGain.gain.linearRampToValueAtTime(0.055, now + 0.015);
  nGain.gain.exponentialRampToValueAtTime(0.008, now + 0.08);
  nGain.gain.linearRampToValueAtTime(0.042, now + 0.11);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  src.connect(hp);
  hp.connect(nGain);
  nGain.connect(ctx.destination);
  src.start(now);
  src.stop(now + dur + 0.02);

  // Subtle FM-like bit chirp
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.setValueAtTime(1140, now + 0.045);
  osc.frequency.setValueAtTime(360, now + 0.095);
  oGain.gain.setValueAtTime(0.0001, now);
  oGain.gain.linearRampToValueAtTime(0.018, now + 0.01);
  oGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  osc.connect(oGain);
  oGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Play a short, subtle synthesized transition audio effect when enabled in settings.
 * Pass `force = true` to preview the sound even when toggling/testing in settings.
 */
export function playTransitionSound(
  options: {
    style?: TransitionSoundStyle;
    isThreeD?: boolean;
    isGlitch?: boolean;
    force?: boolean;
  } = {},
) {
  try {
    const state = useSettings.getState();
    if (!options.force && !state.transitionSound) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const style = options.style ?? state.transitionSoundStyle ?? "whoosh";
    if (options.isGlitch && style !== "click") {
      playGlitchSound(ctx);
    } else if (style === "click") {
      playClick(ctx);
    } else {
      playWhoosh(ctx, options.isThreeD);
    }
  } catch {
    /* Web Audio unavailable or blocked by autoplay policy — stay silent */
  }
}
