// Web Speech API wrapper for placeholder Greek voice.
// Replaced by file-based audio in lib/voice.ts when m4a recordings exist.
//
// iOS Safari notes:
//   - speechSynthesis works on iOS 7+ but the voice list is async; we wait for it.
//   - Greek voice (Melina, lang=el-GR) ships with iOS by default.
//   - First .speak() must be inside a user gesture, same as Web Audio.

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const existing = speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };
    // Fallback if onvoiceschanged never fires (some browsers).
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1000);
  });
  return voicesReady;
}

async function pickGreekVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  const greek = voices.find((v) => v.lang.startsWith('el'));
  return greek ?? null;
}

// Diagnostic: which voice will actually speak the phrases. The debug panel
// surfaces this because a silent fallback to a non-Greek voice mangles the
// input model the kids learn from.
export async function getGreekVoiceInfo(): Promise<{ name: string; lang: string } | null> {
  const voice = await pickGreekVoice();
  return voice ? { name: voice.name, lang: voice.lang } : null;
}

// Resolves to TRUE only if the utterance actually started speaking. On iOS a
// standalone PWA can fail to produce sound (or the ringer switch mutes it)
// while events still resolve; callers use the boolean to show a "tap play"
// hint so a silent phrase never leaves the kid stuck.
export async function speakGreek(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    speechSynthesis.cancel(); // stop anything in-flight
    pickGreekVoice().then((voice) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'el-GR';
      if (voice) utter.voice = voice;
      utter.rate = 0.85; // slightly slow for kids
      utter.pitch = 1.0;
      let started = false;
      utter.onstart = () => { started = true; };
      utter.onend = () => resolve(started);
      utter.onerror = () => resolve(false);
      speechSynthesis.speak(utter);
    });
  });
}

export async function speakBravo(): Promise<boolean> {
  return speakGreek('Μπράβο!');
}
