import { getTrialEvents, clearTrialEvents, type TrialEvent } from '../lib/storage';
import { getGreekVoiceInfo } from '../lib/tts';
import type { ManifestLoad } from '../lib/content';

// Hidden diagnostics view — shown when the URL has ?debug=1. Lets you
// peek at every trial outcome since IndexedDB last cleared. Per-phrase
// accuracy makes it obvious which phrases the kid struggles on so you can
// re-record / rephrase / drop.

interface PhraseAccuracy {
  phraseId: string;
  attempts: number;
  correct: number;
  wrongFruit: number;
  wrongModifier: number;
  silly: number;
}

function summarize(events: TrialEvent[]): PhraseAccuracy[] {
  const byPhrase = new Map<string, PhraseAccuracy>();
  for (const e of events) {
    if (!byPhrase.has(e.phraseId)) {
      byPhrase.set(e.phraseId, {
        phraseId: e.phraseId,
        attempts: 0,
        correct: 0,
        wrongFruit: 0,
        wrongModifier: 0,
        silly: 0,
      });
    }
    const a = byPhrase.get(e.phraseId)!;
    a.attempts++;
    if (e.outcome === 'correct') a.correct++;
    else if (e.outcome === 'wrong-fruit') a.wrongFruit++;
    else if (e.outcome === 'wrong-modifier') a.wrongModifier++;
    else if (e.outcome === 'silly') a.silly++;
  }
  return [...byPhrase.values()].sort((a, b) => a.correct / a.attempts - b.correct / b.attempts);
}

export async function renderDebug(root: HTMLElement, load?: ManifestLoad): Promise<void> {
  const contentLine = load
    ? (() => {
        const ok = load.source === 'network';
        const bg = ok ? '#2a7d4f' : '#b8860b';
        const label =
          load.source === 'network'
            ? `live (fetched ${load.fetchedAt?.slice(11, 19) ?? ''} UTC)`
            : load.source === 'cache'
              ? 'cached (offline, showing last good)'
              : 'bundled (offline, no cache yet)';
        return `<div style="font-size:14px; color:#fff; background:${bg}; padding:8px 12px; border-radius:8px;">
            Content: <strong>${label}</strong> · ${load.manifest.phrases.length} phrases, ${load.manifest.fruits.length} fruits
            ${load.error && !ok ? `<br><span style="font-size:12px; opacity:.85;">${load.error}</span>` : ''}
          </div>`;
      })()
    : '';
  const voice = await getGreekVoiceInfo();
  const voiceLine = voice
    ? `<div style="font-size:14px; color:#2a7d4f;">TTS voice: <strong>${voice.name}</strong> (${voice.lang}) ✓</div>`
    : `<div style="font-size:14px; color:#fff; background:#c0392b; padding:8px 12px; border-radius:8px;">
         ⚠️ No Greek (el) voice on this device. Phrases will play in a NON-GREEK voice.
         On iPad: Settings › Accessibility › Spoken Content › Voices › Greek, download one.
       </div>`;
  const events = await getTrialEvents();
  const summary = summarize(events);
  const totalCorrect = events.filter((e) => e.outcome === 'correct').length;
  const accuracy = events.length ? Math.round((100 * totalCorrect) / events.length) : 0;

  const rows = summary
    .map((s) => {
      const acc = Math.round((100 * s.correct) / s.attempts);
      const flag = acc < 50 ? '⚠️' : acc < 80 ? '·' : '✓';
      return `<tr>
        <td>${flag}</td>
        <td><code>${s.phraseId}</code></td>
        <td>${s.attempts}</td>
        <td>${s.correct}</td>
        <td>${s.wrongFruit}</td>
        <td>${s.wrongModifier}</td>
        <td>${s.silly}</td>
        <td>${acc}%</td>
      </tr>`;
    })
    .join('');

  root.innerHTML = `
    <div class="screen debug-screen" style="text-align:left; padding: 24px; gap: 16px; justify-content:flex-start; overflow-y:auto;">
      <h1 style="font-size:28px; margin:0; color:#e85a8c;">Debug · session log</h1>
      ${contentLine}
      ${voiceLine}
      <div style="font-size:14px; color:#666;">
        ${events.length} events recorded · overall accuracy ${accuracy}%
        · <a href="?" style="color:#e85a8c;">exit debug</a>
        · <button id="clear-events" style="margin-left:8px; padding:4px 10px; border:1px solid #ddd; border-radius:6px; background:white; cursor:pointer;">clear log</button>
      </div>
      <table style="border-collapse:collapse; font-size:13px; font-family: monospace;">
        <thead>
          <tr style="border-bottom: 1px solid #ddd;">
            <th></th>
            <th style="text-align:left; padding:4px 8px;">phrase</th>
            <th style="text-align:right; padding:4px 8px;">N</th>
            <th style="text-align:right; padding:4px 8px;">✓</th>
            <th style="text-align:right; padding:4px 8px;">wrong-fruit</th>
            <th style="text-align:right; padding:4px 8px;">wrong-mod</th>
            <th style="text-align:right; padding:4px 8px;">silly</th>
            <th style="text-align:right; padding:4px 8px;">acc</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="8" style="padding:12px; color:#888;">No events yet. Play some rounds to populate.</td></tr>`}</tbody>
      </table>
      <details style="font-size:12px; font-family:monospace; color:#666;">
        <summary>Raw events (${events.length})</summary>
        <pre style="overflow:auto; max-height: 400px; background:#f8f8f8; padding:8px; border-radius:6px;">${JSON.stringify(events, null, 2)}</pre>
      </details>
    </div>
  `;

  root.querySelector<HTMLButtonElement>('#clear-events')?.addEventListener('click', async () => {
    if (confirm('Clear all logged events? (mastery scores are not affected)')) {
      await clearTrialEvents();
      renderDebug(root);
    }
  });
}
