// Utility to synthesize domino game sound effects using Web Audio API
// This avoids network delay and ensures 100% offline-ready sounds

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume context if suspended (browser autoplay policy)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a wooden/plastic domino clack sound
 */
export function playTileSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Primary clack oscillator (main body)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(950, now);
  osc1.frequency.exponentialRampToValueAtTime(120, now + 0.08);

  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  // High-pitched click oscillator (impact transient)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(2400, now);
  osc2.frequency.exponentialRampToValueAtTime(800, now + 0.03);

  gain2.gain.setValueAtTime(0.2, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  // Start & Stop
  osc1.start(now);
  osc1.stop(now + 0.09);

  osc2.start(now);
  osc2.stop(now + 0.04);
}

/**
 * Plays a card/tile sliding draw sound
 */
export function playDrawSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  // Sine sliding from lower pitch to slightly higher, resembling pulling a tile
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(450, now + 0.16);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

  // Bandpass filter to make it sound more like friction/paper sliding
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 1.0;

  // Re-route connection through filter
  osc.disconnect();
  osc.connect(filter);
  filter.connect(gain);

  osc.start(now);
  osc.stop(now + 0.17);
}
