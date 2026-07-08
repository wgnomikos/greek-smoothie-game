import { unlockAudio } from '../lib/audio';
import { requestPersistentStorage, getTrialEvents, getSettings, setSettings, type Profile } from '../lib/storage';
import { dadSvg, kidSvg } from '../lib/illustrations';
import { fruitSvg } from '../lib/fruit-illustrations';
import type { PhraseLevel } from '../lib/types';

export interface HomeOpts {
  profile: Profile;
  onStart: (level: PhraseLevel) => void;
  onSwitchProfile: () => void;
}

// "This week" stats panel — surfaces session-log data Will would otherwise
// need ?debug=1 to see. Per-profile so it doesn't double-count across kids.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function renderStatsForProfile(profile: Profile): Promise<string> {
  const events = await getTrialEvents();
  const cutoff = Date.now() - WEEK_MS;
  const mine = events.filter((e) => e.profile === profile && e.t >= cutoff);
  if (mine.length === 0) {
    return ''; // no banner first week — avoid empty-state noise
  }
  const correct = mine.filter((e) => e.outcome === 'correct').length;
  const accuracy = Math.round((100 * correct) / mine.length);
  // Round count = number of distinct round-completion timestamps in last
  // week. We don't log rounds separately so approximate via trial count / 6.
  const rounds = Math.max(1, Math.round(mine.length / 6));
  // Find the phrase with the worst accuracy (min 2 attempts to be meaningful)
  const byPhrase = new Map<string, { n: number; c: number }>();
  for (const e of mine) {
    const cur = byPhrase.get(e.phraseId) ?? { n: 0, c: 0 };
    cur.n++;
    if (e.outcome === 'correct') cur.c++;
    byPhrase.set(e.phraseId, cur);
  }
  let worst: string | null = null;
  let worstAcc = 1.1;
  for (const [id, s] of byPhrase) {
    if (s.n < 2) continue;
    const acc = s.c / s.n;
    if (acc < worstAcc) {
      worstAcc = acc;
      worst = id;
    }
  }
  const trickyLine = worst && worstAcc < 0.8
    ? `<div class="stats-tricky">Δύσκολο: <code>${worst}</code> (${Math.round(worstAcc * 100)}%)</div>`
    : '';
  return `
    <div class="stats-panel" aria-label="Stats for this week">
      <div class="stats-row">
        <span class="stats-num">${rounds}</span>
        <span class="stats-label">${rounds === 1 ? 'γύρος' : 'γύροι'}</span>
        <span class="stats-sep">·</span>
        <span class="stats-num">${accuracy}%</span>
        <span class="stats-label">σωστά</span>
      </div>
      ${trickyLine}
    </div>
  `;
}

let unlocked = false;

// Levels each kid sees. Ares (4) is gated to L1/L2 so he can't faceplant on
// the harder phrases; L3/L4 still render but visibly dimmed so he can see
// there's more game waiting for him.
const ALLOWED_LEVELS: Record<Profile, PhraseLevel[]> = {
  ezra: [1, 2, 3, 4],
  ares: [1, 2],
};

// Picture-based level previews so pre-readers can navigate. Each level
// gets a visual cue keyed to its game shape:
//   L1: one fruit (single-fruit imperative)
//   L2: a different fruit (mixed carriers, single fruit, novelty)
//   L3: two fruits side by side (two-fruit requests)
//   L4: a big fruit + a small fruit (modifier discrimination)
function levelPreview(level: PhraseLevel): string {
  switch (level) {
    case 1: return `<span class="lvl-fruit">${fruitSvg('apple')}</span>`;
    case 2: return `<span class="lvl-fruit">${fruitSvg('banana')}</span>`;
    case 3:
      return `<span class="lvl-fruit small">${fruitSvg('strawberry')}</span>
              <span class="lvl-fruit small">${fruitSvg('lemon')}</span>`;
    case 4:
      return `<span class="lvl-fruit tiny">${fruitSvg('grape')}</span>
              <span class="lvl-fruit big">${fruitSvg('grape')}</span>`;
  }
}

const LEVEL_HINT: Record<PhraseLevel, string> = {
  1: 'Βάλε…',
  2: 'Θέλω…',
  3: '…και…',
  4: 'μεγάλο…',
};

export async function renderHome(root: HTMLElement, opts: HomeOpts): Promise<void> {
  const statsHtml = await renderStatsForProfile(opts.profile);
  const settings = await getSettings();
  const allowed = new Set<PhraseLevel>(ALLOWED_LEVELS[opts.profile]);
  const levelButtons = ([1, 2, 3, 4] as PhraseLevel[])
    .map((lvl) => {
      const isAllowed = allowed.has(lvl);
      const lockedClass = isAllowed ? '' : ' locked';
      const lockedNote = isAllowed ? '' : `<span class="locked-note">για μεγάλους</span>`;
      const disabledAttr = isAllowed ? '' : 'disabled aria-disabled="true"';
      return `
        <button class="big-button level-btn${lockedClass}" data-level="${lvl}" ${disabledAttr}>
          <span class="level-label">${lvl}</span>
          <span class="level-preview">${levelPreview(lvl)}</span>
          <span class="level-hint">${LEVEL_HINT[lvl]}</span>
          ${lockedNote}
        </button>
      `;
    })
    .join('');

  root.innerHTML = `
    <div class="screen home-screen">
      <button class="profile-chip" id="switch-profile" aria-label="Switch player">
        <span class="profile-chip-icon">${kidSvg(opts.profile)}</span>
        <span class="profile-chip-text">${opts.profile === 'ezra' ? 'Ezra' : 'Άρης'}</span>
        <span class="profile-chip-swap">↺</span>
      </button>
      <button class="settings-gear" id="settings-toggle" aria-label="Settings">⚙</button>
      <div class="settings-panel hidden" id="settings-panel">
        <label class="settings-row">
          <input type="checkbox" id="translit-toggle" ${settings.showTranslit ? 'checked' : ''}/>
          <span>Show transliteration on reveal</span>
        </label>
        <p class="settings-hint">Off = full immersion. The kid only sees Greek characters when the phrase reveals.</p>
      </div>
      <h1 class="title">Smoothie!</h1>
      <p class="subtitle">Τι θέλεις στο σμούθι σου;</p>
      ${statsHtml}
      <div class="home-dad">${dadSvg('happy')}</div>
      <div class="level-picker">${levelButtons}</div>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('.level-btn:not(.locked)').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!unlocked) {
        await unlockAudio();
        await requestPersistentStorage();
        unlocked = true;
      }
      const level = Number(btn.dataset.level) as PhraseLevel;
      opts.onStart(level);
    });
  });

  root.querySelector<HTMLButtonElement>('#switch-profile')!
    .addEventListener('click', () => opts.onSwitchProfile());

  const settingsToggle = root.querySelector<HTMLButtonElement>('#settings-toggle')!;
  const settingsPanel = root.querySelector<HTMLElement>('#settings-panel')!;
  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });
  root.querySelector<HTMLInputElement>('#translit-toggle')!
    .addEventListener('change', async (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      await setSettings({ showTranslit: checked });
    });
}
