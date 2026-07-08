// Hand-drawn cartoon fruit SVGs. Used in two places:
//   1. Choice tiles (via fruitSvg) — fills the tile, replaces emoji rendering
//   2. Inside the blender after a correct tap (via fruitInner inside a scaled <g>)
//
// Shared style: 2.5px #3a2a1f outline, flat saturated fills, one white-ish
// highlight per fruit, viewBox 100×100. The dark warm brown stroke matches
// the existing Dad illustration so the scene reads as one drawing.

const STROKE = '#3a2a1f';
const STEM = '#6d4c2c';
const LEAF = '#5cb85c';

// Inner SVG markup only (no <svg> wrapper). Use when the fruit goes into
// an existing SVG (the blender's <g class="blender-contents">) so we can
// apply a transform from outside without nesting <svg> tags.
export function fruitInner(id: string): string {
  switch (id) {
    case 'apple':
      return `
        <circle cx="50" cy="58" r="32" fill="#e53935" stroke="${STROKE}" stroke-width="2.5"/>
        <rect x="48.5" y="22" width="3" height="11" fill="${STEM}" stroke="${STROKE}" stroke-width="1.5"/>
        <ellipse cx="62" cy="24" rx="10" ry="5" fill="${LEAF}" stroke="${STROKE}" stroke-width="1.5" transform="rotate(30 62 24)"/>
        <ellipse cx="38" cy="50" rx="6" ry="11" fill="#fff" opacity="0.4" transform="rotate(-20 38 50)"/>
      `;

    case 'banana':
      return `
        <path d="M28 22 Q18 28 22 48 Q28 70 48 80 Q70 85 82 70 Q78 60 62 58 Q44 54 36 38 Q33 28 28 22 Z"
              fill="#f9d038" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="22" y="16" width="9" height="8" rx="2" fill="${STEM}" stroke="${STROKE}" stroke-width="1.5"/>
        <circle cx="80" cy="70" r="4" fill="#5a3a1f" stroke="${STROKE}" stroke-width="1.5"/>
        <path d="M32 35 Q42 52 60 65" fill="none" stroke="#d4a017" stroke-width="2" opacity="0.55" stroke-linecap="round"/>
      `;

    case 'orange':
      return `
        <circle cx="50" cy="56" r="32" fill="#fb8c00" stroke="${STROKE}" stroke-width="2.5"/>
        <line x1="50" y1="26" x2="50" y2="86" stroke="${STROKE}" stroke-width="1" opacity="0.25"/>
        <path d="M30 38 Q50 56 30 74" fill="none" stroke="${STROKE}" stroke-width="1" opacity="0.25"/>
        <path d="M70 38 Q50 56 70 74" fill="none" stroke="${STROKE}" stroke-width="1" opacity="0.25"/>
        <rect x="48.5" y="20" width="3" height="6" fill="${STEM}"/>
        <ellipse cx="60" cy="22" rx="9" ry="5" fill="${LEAF}" stroke="${STROKE}" stroke-width="1.5" transform="rotate(25 60 22)"/>
        <ellipse cx="36" cy="48" rx="6" ry="10" fill="#fff" opacity="0.35" transform="rotate(-20 36 48)"/>
      `;

    case 'grape':
      return `
        <rect x="48.5" y="20" width="3" height="10" fill="${STEM}" stroke="${STROKE}" stroke-width="1.2"/>
        <path d="M52 24 Q70 18 68 32 Q58 32 52 30 Z" fill="${LEAF}" stroke="${STROKE}" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="50" cy="40" r="11" fill="#7e3f8e" stroke="${STROKE}" stroke-width="2"/>
        <circle cx="36" cy="50" r="11" fill="#7e3f8e" stroke="${STROKE}" stroke-width="2"/>
        <circle cx="64" cy="50" r="11" fill="#7e3f8e" stroke="${STROKE}" stroke-width="2"/>
        <circle cx="44" cy="63" r="11" fill="#7e3f8e" stroke="${STROKE}" stroke-width="2"/>
        <circle cx="56" cy="63" r="11" fill="#7e3f8e" stroke="${STROKE}" stroke-width="2"/>
        <circle cx="50" cy="78" r="10" fill="#7e3f8e" stroke="${STROKE}" stroke-width="2"/>
        <ellipse cx="46" cy="36" rx="3" ry="4" fill="#fff" opacity="0.55"/>
      `;

    case 'strawberry':
      return `
        <path d="M20 38 Q30 28 50 32 Q70 28 80 38 Q82 60 50 86 Q18 60 20 38 Z"
              fill="#e53935" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M28 26 L38 36 L50 22 L62 36 L72 26 L66 40 L50 42 L34 40 Z"
              fill="${LEAF}" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>
        <ellipse cx="34" cy="50" rx="1.6" ry="2.6" fill="#fff3a0"/>
        <ellipse cx="46" cy="50" rx="1.6" ry="2.6" fill="#fff3a0"/>
        <ellipse cx="58" cy="50" rx="1.6" ry="2.6" fill="#fff3a0"/>
        <ellipse cx="40" cy="60" rx="1.6" ry="2.6" fill="#fff3a0"/>
        <ellipse cx="52" cy="60" rx="1.6" ry="2.6" fill="#fff3a0"/>
        <ellipse cx="46" cy="70" rx="1.6" ry="2.6" fill="#fff3a0"/>
        <ellipse cx="56" cy="74" rx="1.6" ry="2.6" fill="#fff3a0"/>
        <ellipse cx="31" cy="46" rx="4" ry="7" fill="#fff" opacity="0.35" transform="rotate(-20 31 46)"/>
      `;

    case 'watermelon':
      return `
        <path d="M14 38 Q50 96 86 38 Z" fill="#2e7d32" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M22 42 Q50 88 78 42 Z" fill="#f5f0e8"/>
        <path d="M28 46 Q50 80 72 46 Z" fill="#ec407a"/>
        <line x1="14" y1="38" x2="86" y2="38" stroke="${STROKE}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="40" cy="55" rx="2" ry="3" fill="#222" transform="rotate(-15 40 55)"/>
        <ellipse cx="56" cy="55" rx="2" ry="3" fill="#222" transform="rotate(15 56 55)"/>
        <ellipse cx="48" cy="68" rx="2" ry="3" fill="#222"/>
        <ellipse cx="38" cy="48" rx="2" ry="3" fill="#222" transform="rotate(-25 38 48)"/>
        <ellipse cx="60" cy="48" rx="2" ry="3" fill="#222" transform="rotate(25 60 48)"/>
      `;

    case 'lemon':
      return `
        <path d="M50 20 Q30 24 26 50 Q30 78 50 82 Q70 78 74 50 Q70 24 50 20 Z"
              fill="#f4d03f" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
        <ellipse cx="50" cy="20" rx="3" ry="3" fill="#f4d03f" stroke="${STROKE}" stroke-width="2"/>
        <ellipse cx="50" cy="82" rx="3" ry="3" fill="#f4d03f" stroke="${STROKE}" stroke-width="2"/>
        <ellipse cx="60" cy="22" rx="9" ry="4.5" fill="${LEAF}" stroke="${STROKE}" stroke-width="1.5" transform="rotate(30 60 22)"/>
        <ellipse cx="38" cy="48" rx="5" ry="9" fill="#fff" opacity="0.4" transform="rotate(-20 38 48)"/>
      `;

    case 'pear':
      return `
        <path d="M50 28 Q42 32 40 46 Q30 60 32 76 Q38 90 50 90 Q62 90 68 76 Q70 60 60 46 Q58 32 50 28 Z"
              fill="#aed581" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="48.5" y="14" width="3" height="15" fill="${STEM}" stroke="${STROKE}" stroke-width="1.5"/>
        <ellipse cx="60" cy="20" rx="8" ry="4" fill="${LEAF}" stroke="${STROKE}" stroke-width="1.5" transform="rotate(35 60 20)"/>
        <ellipse cx="40" cy="58" rx="5" ry="11" fill="#fff" opacity="0.4" transform="rotate(-15 40 58)"/>
      `;

    default:
      return `<circle cx="50" cy="50" r="30" fill="#888" stroke="${STROKE}" stroke-width="2.5"/>`;
  }
}

// Full <svg> wrapper for choice-tile rendering.
export function fruitSvg(id: string): string {
  return `<svg class="fruit fruit-${id}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${fruitInner(id)}</svg>`;
}
