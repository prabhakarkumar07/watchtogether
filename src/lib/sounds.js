// Synthesize simple notification sounds using Web Audio API to avoid external assets

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq1, freq2, type = 'sine', duration = 0.1, vol = 0.1) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(freq1, ctx.currentTime);
    if (freq2) {
      osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Ignore audio errors (e.g. if autoplay policy blocks it)
  }
}

export function playJoinSound() {
  playTone(440, 660, 'sine', 0.15, 0.03);
  setTimeout(() => playTone(660, 880, 'sine', 0.2, 0.03), 100);
}

export function playLeaveSound() {
  playTone(880, 660, 'sine', 0.15, 0.03);
  setTimeout(() => playTone(660, 440, 'sine', 0.2, 0.03), 100);
}

export function playMessageSound() {
  playTone(800, 800, 'sine', 0.1, 0.02);
}
