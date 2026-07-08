// Inline SVGs for the smoothie scene. Returned as string so they slot
// into innerHTML without extra DOM wiring. CSS classes drive expressions
// and animations — see style.css.
//
// Dad has expression states (neutral, asking, happy) toggled via class on the
// outer <svg>. Blender has a `data-state` attribute (empty / filling / whirring).
// The smoothie glass has a CSS variable `--fill` that animates 0 → 1.

export type DadExpression = 'neutral' | 'asking' | 'happy' | 'bleh' | 'mmm';
export type BlenderState = 'empty' | 'filling' | 'whirring';
export type KidName = 'ezra' | 'ares';

// Simple cartoon kid faces for the who's-playing picker. Both share the same
// drawing conventions as Dad (dark warm-brown outline, flat fills). Ezra is
// taller / older-feeling, Ares is rounder / younger. Both are smiling — this
// is a happy "pick me" screen.
export function kidSvg(name: KidName): string {
  if (name === 'ezra') {
    // Taller kid, brown hair with side-part, blue shirt.
    return `
      <svg class="kid kid-ezra" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" aria-label="Ezra">
        <path d="M20 200 Q20 150 50 145 L110 145 Q140 150 140 200 Z" fill="#3b82c4"/>
        <rect x="65" y="125" width="30" height="22" fill="#f4d1b5"/>
        <circle cx="80" cy="80" r="50" fill="#f4d1b5"/>
        <path d="M35 65 Q60 25 95 35 Q120 45 125 65 Q110 50 80 50 Q50 55 35 65" fill="#5a3a1f"/>
        <path d="M55 55 Q80 50 105 55" fill="none" stroke="#3a2a1f" stroke-width="2" stroke-linecap="round"/>
        <circle cx="65" cy="78" r="3.5" fill="#222"/>
        <circle cx="95" cy="78" r="3.5" fill="#222"/>
        <path d="M65 105 Q80 115 95 105" fill="none" stroke="#a05030" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="55" cy="95" rx="6" ry="4" fill="#ffb3a3" opacity="0.5"/>
        <ellipse cx="105" cy="95" rx="6" ry="4" fill="#ffb3a3" opacity="0.5"/>
      </svg>
    `;
  }
  // Ares: rounder face, lighter hair tuft, green shirt.
  return `
    <svg class="kid kid-ares" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" aria-label="Ares">
      <path d="M25 200 Q25 155 55 150 L105 150 Q135 155 135 200 Z" fill="#5cb85c"/>
      <rect x="68" y="132" width="26" height="20" fill="#f8d8b8"/>
      <circle cx="80" cy="85" r="48" fill="#f8d8b8"/>
      <path d="M45 60 Q60 35 80 38 Q100 35 115 60 Q105 50 80 50 Q55 55 45 60" fill="#c89060"/>
      <circle cx="65" cy="85" r="3.5" fill="#222"/>
      <circle cx="95" cy="85" r="3.5" fill="#222"/>
      <path d="M60 110 Q80 122 100 110" fill="#a05030" stroke="#a05030" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx="55" cy="100" rx="7" ry="5" fill="#ffb3a3" opacity="0.55"/>
      <ellipse cx="105" cy="100" rx="7" ry="5" fill="#ffb3a3" opacity="0.55"/>
    </svg>
  `;
}

export function dadSvg(expression: DadExpression = 'neutral'): string {
  // 200×220 viewBox: head + glasses + beard + apron yoke.
  // Mouth and eyes are drawn with classes the .dad-[state] selectors restyle.
  return `
    <svg class="dad dad-${expression}" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-label="Dad">
      <!-- apron / shoulders -->
      <path class="dad-shirt" d="M30 220 Q30 160 60 150 L140 150 Q170 160 170 220 Z" fill="#e85a8c"/>
      <rect class="dad-apron" x="70" y="150" width="60" height="70" fill="#fff" stroke="#d44" stroke-width="2"/>
      <text class="dad-apron-text" x="100" y="190" text-anchor="middle" font-size="22" fill="#d44">♥</text>
      <!-- neck -->
      <rect x="85" y="130" width="30" height="25" fill="#f4d1b5"/>
      <!-- head -->
      <circle class="dad-head" cx="100" cy="80" r="55" fill="#f4d1b5"/>
      <!-- hair tuft -->
      <path class="dad-hair" d="M55 55 Q75 20 100 30 Q125 20 145 55 Q140 40 100 35 Q60 40 55 55" fill="#3a2a1f"/>
      <!-- beard stubble -->
      <path class="dad-beard" d="M55 95 Q60 130 100 135 Q140 130 145 95 Q135 110 100 110 Q65 110 55 95" fill="#3a2a1f" opacity="0.35"/>
      <!-- glasses -->
      <circle class="dad-lens" cx="80" cy="75" r="13" fill="none" stroke="#222" stroke-width="2.5"/>
      <circle class="dad-lens" cx="120" cy="75" r="13" fill="none" stroke="#222" stroke-width="2.5"/>
      <line x1="93" y1="75" x2="107" y2="75" stroke="#222" stroke-width="2.5"/>
      <!-- eyes (shown for expressions, hidden behind lenses normally) -->
      <circle class="dad-eye dad-eye-l" cx="80" cy="75" r="3" fill="#222"/>
      <circle class="dad-eye dad-eye-r" cx="120" cy="75" r="3" fill="#222"/>
      <!-- eyebrows (raised when asking) -->
      <path class="dad-brow dad-brow-l" d="M67 60 Q80 56 93 60" fill="none" stroke="#3a2a1f" stroke-width="2.5" stroke-linecap="round"/>
      <path class="dad-brow dad-brow-r" d="M107 60 Q120 56 133 60" fill="none" stroke="#3a2a1f" stroke-width="2.5" stroke-linecap="round"/>
      <!-- mouth: variants are CSS-toggled -->
      <g class="dad-mouth-group">
        <path class="dad-mouth-neutral" d="M85 105 Q100 110 115 105" fill="none" stroke="#a05030" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse class="dad-mouth-asking" cx="100" cy="108" rx="8" ry="6" fill="#a05030"/>
        <path class="dad-mouth-happy" d="M80 102 Q100 122 120 102" fill="#a05030" stroke="#a05030" stroke-width="2"/>
        <path class="dad-mouth-bleh" d="M82 108 L118 108 M100 108 L100 120 Q90 122 88 115" fill="none" stroke="#a05030" stroke-width="2.5" stroke-linecap="round"/>
        <path class="dad-mouth-mmm" d="M85 108 Q100 114 115 108" fill="#a05030" stroke="#a05030" stroke-width="3" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

export function blenderSvg(state: BlenderState = 'empty'): string {
  // 160×220 viewBox: lid + jar + contents region + base.
  // The .blender-contents <g> gets children appended for each fruit added.
  return `
    <svg class="blender" data-state="${state}" viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg" aria-label="Blender">
      <!-- lid -->
      <g class="blender-lid">
        <rect x="35" y="20" width="90" height="14" rx="4" fill="#888"/>
        <rect x="50" y="10" width="60" height="12" rx="3" fill="#aaa"/>
      </g>
      <!-- jar (transparent so contents show) -->
      <rect class="blender-jar" x="30" y="34" width="100" height="120" rx="6"
            fill="rgba(255,255,255,0.6)" stroke="#5a8fc8" stroke-width="3"/>
      <!-- measurement marks -->
      <line x1="38" y1="60" x2="50" y2="60" stroke="#5a8fc8" stroke-width="1.5"/>
      <line x1="38" y1="90" x2="50" y2="90" stroke="#5a8fc8" stroke-width="1.5"/>
      <line x1="38" y1="120" x2="50" y2="120" stroke="#5a8fc8" stroke-width="1.5"/>
      <!-- contents (filled at runtime: append <circle> per fruit) -->
      <g class="blender-contents" transform="translate(80, 110)"></g>
      <!-- smoothie fill (revealed during whirring) -->
      <rect class="blender-fill" x="33" y="60" width="94" height="91" fill="#ec7ba8" opacity="0"/>
      <!-- base -->
      <rect x="20" y="154" width="120" height="50" rx="6" fill="#333"/>
      <circle cx="35" cy="180" r="6" fill="#e74c3c"/>
      <rect x="55" y="170" width="80" height="20" rx="3" fill="#444"/>
      <text x="95" y="184" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold">BLEND</text>
    </svg>
  `;
}

export function glassSvg(): string {
  // 120×180 viewBox: glass + smoothie level (CSS var --fill controls height).
  return `
    <svg class="glass" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg" aria-label="Smoothie glass">
      <defs>
        <clipPath id="glass-clip">
          <path d="M25 30 Q25 25 30 25 L90 25 Q95 25 95 30 L88 165 Q88 170 83 170 L37 170 Q32 170 32 165 Z"/>
        </clipPath>
      </defs>
      <!-- smoothie fill (driven by CSS var --fill: 0..1) -->
      <rect class="glass-fill" x="0" y="0" width="120" height="180" fill="#ec7ba8" clip-path="url(#glass-clip)"/>
      <!-- glass outline -->
      <path d="M25 30 Q25 25 30 25 L90 25 Q95 25 95 30 L88 165 Q88 170 83 170 L37 170 Q32 170 32 165 Z"
            fill="none" stroke="#5a8fc8" stroke-width="3"/>
      <!-- straw -->
      <line x1="70" y1="10" x2="85" y2="80" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
      <line x1="70" y1="10" x2="85" y2="80" stroke="#ff6b9d" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
}
