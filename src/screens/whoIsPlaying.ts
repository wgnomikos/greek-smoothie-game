import { setProfile, type Profile } from '../lib/storage';
import { kidSvg } from '../lib/illustrations';

export interface WhoIsPlayingOpts {
  onPick: (profile: Profile) => void;
}

// Profile-pick screen. Shown on cold start when no profile is stored, or when
// the user taps "Άλλος" on the home screen to switch kids. Per the council's
// kid-UX critique, gating Ares to L1/L2 prevents the "4yo taps biggest number
// and faceplants on L4" failure mode. Ezra (7) sees the full level picker.
export function renderWhoIsPlaying(root: HTMLElement, opts: WhoIsPlayingOpts): void {
  root.innerHTML = `
    <div class="screen who-screen">
      <h1 class="title">Ποιος παίζει;</h1>
      <p class="subtitle">Who's playing?</p>
      <div class="kid-picker">
        <button class="kid-tile" data-profile="ezra" aria-label="Ezra">
          ${kidSvg('ezra')}
          <div class="kid-name">Ezra</div>
        </button>
        <button class="kid-tile" data-profile="ares" aria-label="Ares">
          ${kidSvg('ares')}
          <div class="kid-name">Άρης</div>
        </button>
      </div>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>('.kid-tile').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const profile = btn.dataset.profile as Profile;
      await setProfile(profile);
      opts.onPick(profile);
    });
  });
}
