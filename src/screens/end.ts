import { speakGreek } from '../lib/tts';
import { playWord } from '../lib/audio';
import { dadSvg, blenderSvg, glassSvg } from '../lib/illustrations';

export interface EndOpts {
  correctCount: number;
  totalCount: number;
  fruitsAdded: string[];
  onAgain: () => void;
  onHome: () => void;
}

// Curated palette per fruit "family." Council skeptic flagged that RGB-
// averaging the picks gave a muddy brown — visually a disappointment for kids
// who just earned the smoothie. Instead we bucket the picks by family and
// pick a saturated preset based on which family dominated.
const FRUIT_FAMILY: Record<string, 'berry' | 'citrus' | 'tropical' | 'grape' | 'green'> = {
  apple: 'berry',
  strawberry: 'berry',
  watermelon: 'berry',
  orange: 'citrus',
  lemon: 'citrus',
  banana: 'tropical',
  grape: 'grape',
  pear: 'green',
};

const FAMILY_COLOR: Record<string, string> = {
  berry: '#ec407a',     // saturated pink — strawberry/raspberry smoothie
  citrus: '#ffb74d',    // warm orange-yellow
  tropical: '#fff176',  // sunny yellow
  grape: '#9c4dcc',     // rich purple
  green: '#aed581',     // soft green
};

function smoothieColor(fruitIds: string[]): string {
  if (fruitIds.length === 0) return FAMILY_COLOR.berry;
  // Vote by family — whichever family has the most picks wins. Ties broken
  // by hard-coded priority (berry first, then grape, then citrus, tropical,
  // green). This makes the reward feel like a real, recognizable smoothie
  // color even when fruits from multiple families are mixed.
  const counts: Record<string, number> = {};
  for (const id of fruitIds) {
    const fam = FRUIT_FAMILY[id] ?? 'berry';
    counts[fam] = (counts[fam] ?? 0) + 1;
  }
  const priority = ['berry', 'grape', 'citrus', 'tropical', 'green'];
  let winner = priority[0];
  let max = -1;
  for (const fam of priority) {
    if ((counts[fam] ?? 0) > max) {
      max = counts[fam] ?? 0;
      winner = fam;
    }
  }
  return FAMILY_COLOR[winner];
}

export async function renderEnd(root: HTMLElement, opts: EndOpts): Promise<void> {
  const fillColor = smoothieColor(opts.fruitsAdded);
  const allRight = opts.correctCount === opts.totalCount;
  const headline = allRight ? '🎉 Μπράβο!' : `${opts.correctCount}/${opts.totalCount}`;

  // Perfect-round extras — drawn only when the kid clears all 6. Sprinkles
  // are tiny colored confetti dots scattered above the glass; the umbrella
  // is a striped paper umbrella poked into the smoothie. Per kid-UX critic:
  // one visual surprise per ~5 rounds is enough to stop the reward feeling
  // identical every time. Without the extras the screen looks normal —
  // earning the surprise is the point.
  const sprinklesSvg = allRight ? `
    <svg class="sprinkles" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="20" y="30" width="6" height="3" rx="1.5" fill="#ff6b9d" transform="rotate(20 23 31)"/>
      <rect x="40" y="15" width="6" height="3" rx="1.5" fill="#f9d038" transform="rotate(-30 43 16)"/>
      <rect x="62" y="40" width="6" height="3" rx="1.5" fill="#7e3f8e" transform="rotate(15 65 41)"/>
      <rect x="85" y="10" width="6" height="3" rx="1.5" fill="#5cb85c" transform="rotate(-10 88 11)"/>
      <rect x="108" y="35" width="6" height="3" rx="1.5" fill="#ff8a65" transform="rotate(40 111 36)"/>
      <rect x="130" y="18" width="6" height="3" rx="1.5" fill="#42a5f5" transform="rotate(-20 133 19)"/>
      <rect x="152" y="42" width="6" height="3" rx="1.5" fill="#ec407a" transform="rotate(25 155 43)"/>
      <rect x="174" y="22" width="6" height="3" rx="1.5" fill="#fb8c00" transform="rotate(-15 177 23)"/>
    </svg>
  ` : '';

  const umbrellaSvg = allRight ? `
    <svg class="umbrella" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="30" y1="20" x2="30" y2="78" stroke="#3a2a1f" stroke-width="2"/>
      <path d="M6 22 Q30 0 54 22 Z" fill="#ff6b9d" stroke="#3a2a1f" stroke-width="1.5"/>
      <path d="M14 22 Q30 8 30 22 Z" fill="#fff" opacity="0.7"/>
      <path d="M30 22 Q46 8 46 22 Z" fill="#fff" opacity="0.4"/>
      <circle cx="30" cy="22" r="3" fill="#3a2a1f"/>
    </svg>
  ` : '';

  root.innerHTML = `
    <div class="screen end-screen ${allRight ? 'perfect' : ''}">
      <div class="end-scene">
        <div class="dad-wrap end-dad" id="end-dad">${dadSvg('happy')}</div>
        <div class="blender-wrap end-blender" id="end-blender">${blenderSvg('whirring')}</div>
        <div class="glass-wrap end-glass" id="end-glass">
          ${sprinklesSvg}
          ${umbrellaSvg}
          ${glassSvg()}
        </div>
      </div>
      <div class="end-headline">${headline}</div>
      <div class="end-buttons">
        <button class="big-button" id="again">Ξανά!</button>
        <button class="big-button secondary" id="home">Σπίτι</button>
      </div>
    </div>
  `;

  const glassFill = root.querySelector<SVGRectElement>('.glass-fill');
  if (glassFill) {
    glassFill.style.fill = fillColor;
  }
  const blenderFill = root.querySelector<SVGRectElement>('.blender-fill');
  if (blenderFill) {
    blenderFill.style.fill = fillColor;
  }
  const dadEndEl = root.querySelector<HTMLElement>('#end-dad');

  // Trigger the reward animation sequence on next frame so the CSS transition
  // catches the state change.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const blender = root.querySelector<HTMLElement>('.blender');
      if (blender) blender.classList.add('whirring');
      const glassWrap = root.querySelector<HTMLElement>('.end-glass');
      // Delay the pour until the whirr has had ~1.2s to play.
      setTimeout(() => {
        if (glassWrap) glassWrap.classList.add('pouring');
      }, 1200);
      // After the pour, swap Dad to MMM face (the sip reaction). Persists
      // until the user clicks again/home; on perfect rounds, sprinkles fall
      // around the glass as a small ta-da.
      setTimeout(() => {
        if (dadEndEl) dadEndEl.innerHTML = dadSvg('mmm');
      }, 2700);
    });
  });

  // Voice celebration — recorded if it exists, TTS otherwise.
  if (allRight) {
    playWord('feedback/mmm.m4a', 'Μμμ! Τέλεια!');
  } else {
    speakGreek('Καλή προσπάθεια!');
  }

  root.querySelector<HTMLButtonElement>('#again')!.addEventListener('click', opts.onAgain);
  root.querySelector<HTMLButtonElement>('#home')!.addEventListener('click', opts.onHome);
}
