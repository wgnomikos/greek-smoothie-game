import './style.css';
import { registerSW } from 'virtual:pwa-register';
import manifestData from './data/manifest.json';
import type { Manifest, PhraseLevel } from './lib/types';
import { renderHome } from './screens/home';
import { renderRound } from './screens/round';
import { renderEnd } from './screens/end';
import { renderWhoIsPlaying } from './screens/whoIsPlaying';
import { renderDebug } from './screens/debug';
import { getProfile, clearProfile, type Profile } from './lib/storage';

registerSW({ immediate: true });

const manifest = manifestData as Manifest;
const app = document.getElementById('app')!;

let currentLevel: PhraseLevel = 1;
let currentProfile: Profile = 'ezra';

function goWhoIsPlaying(): void {
  renderWhoIsPlaying(app, {
    onPick: (profile) => {
      currentProfile = profile;
      goHome();
    },
  });
}

function goHome(): void {
  renderHome(app, {
    profile: currentProfile,
    onStart: (level) => {
      currentLevel = level;
      goRound();
    },
    onSwitchProfile: async () => {
      await clearProfile();
      goWhoIsPlaying();
    },
  }).catch((err) => console.error('Home render failed:', err));
}

function goRound(): void {
  renderRound(app, {
    manifest,
    level: currentLevel,
    onComplete: (correctCount, fruitsAdded) => goEnd(correctCount, fruitsAdded),
    onAbort: () => goHome(),
  }).catch((err) => {
    console.error('Round failed:', err);
    goHome();
  });
}

function goEnd(correctCount: number, fruitsAdded: string[]): void {
  renderEnd(app, {
    correctCount,
    totalCount: 6,
    fruitsAdded,
    onAgain: () => goRound(),
    onHome: () => goHome(),
  });
}

// Cold start: if a profile is already stored, skip straight to home;
// otherwise show the who's-playing picker. Debug panel via ?debug=1 query
// param shows per-phrase accuracy + raw event log — useful for "is this
// working?" diagnosis without sitting next to the kid.
(async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') === '1') {
    renderDebug(app);
    return;
  }
  const stored = await getProfile();
  if (stored) {
    currentProfile = stored;
    goHome();
  } else {
    goWhoIsPlaying();
  }
})();
