import './style.css';
import { registerSW } from 'virtual:pwa-register';
import type { Manifest, PhraseLevel } from './lib/types';
import { loadManifest } from './lib/content';
import { renderHome } from './screens/home';
import { renderRound } from './screens/round';
import { renderEnd } from './screens/end';
import { renderWhoIsPlaying } from './screens/whoIsPlaying';
import { renderDebug } from './screens/debug';
import { getProfile, clearProfile, type Profile } from './lib/storage';

registerSW({ immediate: true });

// Loaded at runtime, not bundled, so manifest edits go live without a rebuild.
// See src/lib/content.ts. Assigned in the boot IIFE before any round renders.
let manifest: Manifest;
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
    onComplete: (cleanCount, totalCount, fruitsAdded, celebrate) =>
      goEnd(cleanCount, totalCount, fruitsAdded, celebrate),
    onAbort: () => goHome(),
  }).catch((err) => {
    console.error('Round failed:', err);
    goHome();
  });
}

function goEnd(cleanCount: number, totalCount: number, fruitsAdded: string[], celebrate: boolean): void {
  renderEnd(app, {
    correctCount: cleanCount,
    totalCount,
    celebrate,
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

  // Fetch content first. loadManifest never rejects (network → cache →
  // bundled), so manifest is always a valid, non-empty Manifest here.
  const load = await loadManifest();
  manifest = load.manifest;
  if (load.source !== 'network') {
    console.warn(`manifest loaded from ${load.source} fallback`, load.error);
  }

  if (params.get('debug') === '1') {
    renderDebug(app, load);
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
