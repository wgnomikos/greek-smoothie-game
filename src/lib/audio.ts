// Web Audio for iOS reliability.
// HTMLAudioElement.play() rejects silently outside a user gesture on iOS Safari,
// and a muted ringer switch silences <audio> with no error. Web Audio routes
// through the media channel and only needs the AudioContext resumed once.

let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

// Call from inside a tap/click handler on first interaction.
// Safe to call repeatedly — no-op if already running.
export async function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (c.state === 'suspended') {
    await c.resume();
  }
  // Play a 1-sample silent buffer to fully unlock iOS audio pipeline.
  const silent = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = silent;
  src.connect(c.destination);
  src.start(0);
  // Also warm up speechSynthesis with a silent utterance so iOS PWA grants
  // the first real TTS call when the user taps a silly distractor later.
  // Without this, the BLEH reaction on first install can fail silently
  // because speechSynthesis hasn't seen a user gesture yet.
  try {
    if ('speechSynthesis' in window) {
      const warm = new SpeechSynthesisUtterance(' ');
      warm.volume = 0;
      warm.rate = 1;
      window.speechSynthesis.speak(warm);
    }
  } catch {
    // Older iOS without speechSynthesis — no harm; silly reactions will
    // still be silent but that's the same as before.
  }
}

export function isAudioUnlocked(): boolean {
  return ctx !== null && ctx.state === 'running';
}

export async function preload(url: string): Promise<void> {
  if (buffers.has(url)) return;
  const c = getCtx();
  const resp = await fetch(url);
  const arr = await resp.arrayBuffer();
  const buf = await c.decodeAudioData(arr);
  buffers.set(url, buf);
}

export async function preloadAll(urls: string[]): Promise<void> {
  await Promise.all(urls.map((u) => preload(u).catch(() => undefined)));
}

// Soft two-note chime generated via oscillators. Played on every correct
// answer in place of a voice celebration (which gets grating fast).
// Two ascending sine notes, gentle attack/decay, ~300ms total.
export function playChime(): void {
  const c = getCtx();
  const now = c.currentTime;
  const notes = [523.25, 783.99]; // C5 then G5 (perfect fifth, pleasant rising feel)
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.08;
    const end = start + 0.22;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(end + 0.05);
  });
}

// Smart prompt player: real m4a if it exists in the asset index, TTS otherwise.
// Lets the game ship with partial content — kid hears Will's voice on words
// he's recorded, Melina (iOS TTS) on words he hasn't, no broken playback.
import { speakGreek } from './tts';
import { hasAudio } from './assets';
import { audioUrl } from './assetUrl';

export async function playWord(audioRelative: string, fallbackText: string): Promise<void> {
  if (hasAudio(audioRelative)) {
    return play(audioUrl(audioRelative));
  }
  return speakGreek(fallbackText);
}

export function play(url: string): Promise<void> {
  return new Promise((resolve) => {
    const c = getCtx();
    const buf = buffers.get(url);
    if (!buf) {
      // Not preloaded — load then play. Fail OPEN: a 404 or decode error
      // resolves (silent) rather than leaving the promise pending forever,
      // which would hang any caller that awaits it.
      preload(url)
        .then(() => play(url).then(resolve))
        .catch(() => resolve());
      return;
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.onended = () => resolve();
    src.start(0);
  });
}

// Resolve when `p` settles OR after `ms`, whichever comes first. Used to keep
// gameplay (tile reveal, trial advance) from ever blocking on audio that may
// never resolve — a stuck speechSynthesis utterance or a slow/failed decode.
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);
}
