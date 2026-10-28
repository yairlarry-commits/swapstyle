// Small synthesized notification sounds (Web Audio, no files needed).

let audioCtx = null;
let masterGain = null;
const VOLUME = 0.7;
let soundEnabled = true;

function getAudio() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = VOLUME * 1.8;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function setSoundEnabled(on) {
  soundEnabled = on;
}

export function isSoundEnabled() {
  return soundEnabled;
}

function tone(freq, start, dur, type = 'sine', vol = 0.5) {
  const ctx = getAudio();
  if (!ctx || !masterGain) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

export function playSound(kind) {
  if (!soundEnabled) return;
  const ctx = getAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  switch (kind) {
    case 'swap-request':
      tone(523, 0, 0.18, 'sine', 0.45);
      tone(659, 0.12, 0.22, 'sine', 0.45);
      break;
    case 'swap-accepted':
      tone(523, 0, 0.25, 'sine', 0.4);
      tone(659, 0.06, 0.25, 'sine', 0.4);
      tone(784, 0.12, 0.3, 'sine', 0.4);
      break;
    case 'swap-declined':
      tone(440, 0, 0.2, 'sine', 0.35);
      tone(330, 0.14, 0.25, 'sine', 0.35);
      break;
    case 'message':
      tone(880, 0, 0.15, 'sine', 0.3);
      break;
    case 'pop':
      tone(600, 0, 0.08, 'sine', 0.25);
      break;
    case 'success':
      tone(523, 0, 0.15, 'sine', 0.4);
      tone(784, 0.1, 0.2, 'sine', 0.4);
      break;
  }
}
