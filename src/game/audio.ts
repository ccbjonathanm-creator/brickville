let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

export function playPlace() {
  tone(720, 0.04, 0.035, "square");
  tone(980, 0.05, 0.02, "square", 0.03);
}

export function playErase() {
  tone(240, 0.08, 0.03, "sawtooth");
}

export function playExpand() {
  tone(520, 0.06, 0.03, "triangle");
  tone(780, 0.08, 0.025, "triangle", 0.05);
}

export function playDenied() {
  tone(160, 0.09, 0.04, "square");
}

function tone(
  freq: number,
  dur: number,
  gain: number,
  type: OscillatorType,
  delay = 0,
) {
  const audio = ac();
  if (!audio) return;
  const t = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
