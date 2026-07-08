// Cartoon non-fruit "silly" distractors used at level 2+. Same drawing
// conventions as lib/fruit-illustrations.ts (2.5px #3a2a1f outline, flat
// fills, viewBox 100×100) so they sit consistently next to fruits on the
// choice tiles. Wrong-tap on a silly item is the comedy beat — Dad pulls a
// BLEH face and the reaction line plays.

const STROKE = '#3a2a1f';

export function sillyInner(id: string): string {
  switch (id) {
    case 'sock':
      // Striped tube sock with a folded cuff at the top and a heel kink.
      // Stripes are red, kept flat to read at small sizes.
      return `
        <path d="M40 18 Q40 14 44 14 L62 14 Q66 14 66 18 L66 58 Q66 64 70 70 L82 84 Q86 90 80 92 L56 92 Q50 92 46 86 L36 70 Q32 64 32 58 L32 24 Q32 18 40 18 Z"
              fill="#fff" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
        <!-- cuff band -->
        <path d="M40 18 Q40 14 44 14 L62 14 Q66 14 66 18 L66 28 L40 28 Z"
              fill="#e0e0e0" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
        <!-- horizontal stripes on the leg portion -->
        <rect x="32" y="36" width="34" height="4" fill="#e53935"/>
        <rect x="32" y="46" width="34" height="4" fill="#e53935"/>
        <rect x="32" y="56" width="34" height="4" fill="#e53935"/>
      `;

    case 'flipflop':
      // Flat sandal — sole + Y-strap. Council skeptic flagged that pickle and
      // broccoli go in smoothies (the gag was undermined); replaced with
      // unambiguously-not-food items.
      return `
        <path d="M30 18 Q30 12 40 12 L60 12 Q70 12 70 18 L72 78 Q72 88 60 88 L40 88 Q28 88 28 78 Z"
              fill="#ff8a65" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
        <!-- Y-strap top -->
        <path d="M40 22 Q50 36 60 22" fill="none" stroke="${STROKE}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M50 36 L50 52" fill="none" stroke="${STROKE}" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="50" cy="36" r="3" fill="${STROKE}"/>
        <!-- toe prints / texture -->
        <ellipse cx="40" cy="68" rx="3" ry="4" fill="#d96b4d" opacity="0.5"/>
        <ellipse cx="60" cy="68" rx="3" ry="4" fill="#d96b4d" opacity="0.5"/>
        <ellipse cx="50" cy="78" rx="4" ry="3" fill="#d96b4d" opacity="0.5"/>
      `;

    case 'toothbrush':
      // Handle bottom, bristle head top — unmistakably not-food.
      return `
        <!-- handle -->
        <rect x="44" y="50" width="12" height="40" rx="5" fill="#42a5f5" stroke="${STROKE}" stroke-width="2.5"/>
        <!-- transition neck -->
        <rect x="42" y="42" width="16" height="10" rx="3" fill="#42a5f5" stroke="${STROKE}" stroke-width="2.5"/>
        <!-- bristle head -->
        <rect x="36" y="20" width="28" height="24" rx="4" fill="#fff" stroke="${STROKE}" stroke-width="2.5"/>
        <!-- bristles -->
        <line x1="40" y1="12" x2="40" y2="22" stroke="${STROKE}" stroke-width="1.5"/>
        <line x1="46" y1="10" x2="46" y2="22" stroke="${STROKE}" stroke-width="1.5"/>
        <line x1="52" y1="10" x2="52" y2="22" stroke="${STROKE}" stroke-width="1.5"/>
        <line x1="58" y1="12" x2="58" y2="22" stroke="${STROKE}" stroke-width="1.5"/>
        <!-- handle grip detail -->
        <ellipse cx="50" cy="70" rx="3" ry="2" fill="#1e88e5"/>
      `;

    default:
      return `<circle cx="50" cy="50" r="30" fill="#888" stroke="${STROKE}" stroke-width="2.5"/>`;
  }
}

export function sillySvg(id: string): string {
  return `<svg class="silly silly-${id}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${sillyInner(id)}</svg>`;
}
