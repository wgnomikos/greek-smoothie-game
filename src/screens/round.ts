import type { Phrase, PhraseModifier, Fruit, SillyItem, Manifest } from '../lib/types';
import { playChime, playWord, withTimeout } from '../lib/audio';
import { speakGreek } from '../lib/tts';
import { hasImage } from '../lib/assets';
import { imageUrl } from '../lib/assetUrl';
import { getMastery, setMastery, logRoundCompletion, logTrial, getProfile, getSettings, type Profile } from '../lib/storage';
import { dadSvg, blenderSvg, type DadExpression } from '../lib/illustrations';
import { fruitInner, fruitSvg } from '../lib/fruit-illustrations';
import { sillySvg } from '../lib/silly-illustrations';

// A choice tile holds either a fruit (optionally modifier-styled at L4) or a
// silly distractor. At L4 the modifier participates in the tile selection —
// e.g., "Θέλω ένα μεγάλο μήλο" renders a big-apple tile alongside a small-apple
// tile, forcing the kid to use the modifier word to choose. The tap handler
// checks both fruit id AND modifier for L4 trials.
type Choice =
  | { kind: 'fruit'; data: Fruit; modifier?: PhraseModifier }
  | { kind: 'silly'; data: SillyItem };

// For L4, given the target modifier, return the modifier we use on the
// "same fruit, wrong modifier" distractor. big↔small are inverses; lots is
// contrasted against undefined (a single fruit).
function oppositeModifier(m: PhraseModifier): PhraseModifier | undefined {
  if (m === 'big') return 'small';
  if (m === 'small') return 'big';
  return undefined; // lots → single
}

const PHRASES_PER_ROUND = 6;
const CATEGORY_ID = 'smoothie';

export interface RoundOpts {
  manifest: Manifest;
  level: 1 | 2 | 3 | 4;
  // cleanCount = trials solved with no wrong tap; totalCount = trials in the
  // round; celebrate = earned the top-tier end screen (umbrella + sprinkles).
  onComplete: (cleanCount: number, totalCount: number, fruitsAdded: string[], celebrate: boolean) => void;
  onAbort: () => void;
}

// A round earns the celebration (umbrella + sprinkles + "Μπράβο!") when total
// wrong taps across the round are at or below this. Deliberately LENIENT: a
// binary zero-wrong bar would make the reward almost unreachable for a
// 4-year-old, which is worse than the always-reward bug it replaces. This is a
// tunable to revisit after watching the kids play, not a fixed design choice.
// Silly-distractor taps are the comedy beat and do NOT count as wrong taps.
const PERFECT_MAX_MISFIRES = 1;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cap on the weight ratio between best- and worst-mastered phrases. Council
// pedagogy critic flagged that the uncapped weighting (maxScore - score + 1)
// makes one stuck phrase appear ~6x more often than mastered ones, creating
// a frustration loop where the kid keeps hitting their hardest phrase. Cap
// at 3:1 — still preferentially re-tests weak phrases but stops them from
// dominating the round.
const MASTERY_WEIGHT_CAP = 3;

// Same mastery-weighted sampler as v0 round.ts — phrases with lower mastery
// get more reps. Lifted shape, just operates on phrases instead of words.
async function samplePhraseOrder(phrases: Phrase[]): Promise<Phrase[]> {
  const scores = await Promise.all(
    phrases.map((p) => getMastery(CATEGORY_ID, p.id)),
  );
  const maxScore = Math.max(...scores, 1);
  const weights = scores.map((s) => Math.min(maxScore - s + 1, MASTERY_WEIGHT_CAP));
  const pool: Phrase[] = [];
  phrases.forEach((p, i) => {
    for (let j = 0; j < weights[i]; j++) pool.push(p);
  });
  const seen = new Set<string>();
  const result: Phrase[] = [];
  for (const p of shuffle(pool)) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    result.push(p);
    if (result.length >= PHRASES_PER_ROUND) break;
  }
  while (result.length < PHRASES_PER_ROUND) {
    for (const p of shuffle(phrases)) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
        if (result.length >= PHRASES_PER_ROUND) break;
      }
    }
    if (seen.size === phrases.length) break;
  }
  return result;
}

// Probability a silly distractor (sock/flipflop/toothbrush) shows up on a
// trial. Council kid-UX: at 100% the gag dies by round 3 because Ezra learns
// to always ignore the silly tile. Keep it surprising. L1 gets a lower rate
// because L1 is the comfort layer and adding silly there also fixes the
// skeptic's "kids solve L1 by elimination without parsing Greek" gap —
// occasionally the kid must actually parse the noun to avoid the sock.
const SILLY_PROB_L1 = 0.25;
const SILLY_PROB_HIGHER = 0.45;

// Build the choice list for a trial.
// L1: 3 tiles — target + 2 fruit distractors. No silly.
// L2: 3 tiles — target + 1 fruit + maybe 1 silly (else 2 fruits).
// L3: 4 tiles — both targets + 1 fruit + maybe 1 silly (else 2 fruits).
// L4: 3 tiles — target (correct modifier) + same fruit (opposite modifier)
//     + 1 distractor fruit (correct modifier). Forces modifier discrimination.
function buildChoices(
  manifest: Manifest,
  targetFruits: Fruit[],
  level: number,
  modifier?: PhraseModifier,
): Choice[] {
  // L4 special case — modifier-discrimination tiles, no silly distractors
  // (the kid has enough cognitive load just parsing μεγάλο/μικρό/πολλά).
  if (level === 4 && modifier && targetFruits.length === 1) {
    const target = targetFruits[0];
    const opp = oppositeModifier(modifier);
    const otherFruits = shuffle(manifest.fruits.filter((f) => f.id !== target.id));
    const distractorFruit = otherFruits[0];
    const choices: Choice[] = [
      { kind: 'fruit', data: target, modifier },
      { kind: 'fruit', data: target, modifier: opp },
      { kind: 'fruit', data: distractorFruit, modifier },
    ];
    return shuffle(choices);
  }

  const sillyAllowed = level >= 1 && manifest.silly.length > 0;
  const sillyProb = level === 1 ? SILLY_PROB_L1 : SILLY_PROB_HIGHER;
  const includeSilly = sillyAllowed && Math.random() < sillyProb;
  const isMulti = targetFruits.length > 1;
  const totalTiles = isMulti ? 4 : 3;
  const numFruitTargets = targetFruits.length;
  const numSilly = includeSilly ? 1 : 0;
  const numFruitDistractors = totalTiles - numFruitTargets - numSilly;
  const targetIds = new Set(targetFruits.map((f) => f.id));
  const distractorPool = manifest.fruits.filter((f) => !targetIds.has(f.id));
  const fruitDistractors = shuffle(distractorPool).slice(0, numFruitDistractors);
  const choices: Choice[] = [
    ...targetFruits.map((f): Choice => ({ kind: 'fruit', data: f })),
    ...fruitDistractors.map((f): Choice => ({ kind: 'fruit', data: f })),
  ];
  if (includeSilly) {
    const silly = shuffle(manifest.silly)[0];
    choices.push({ kind: 'silly', data: silly });
  }
  return shuffle(choices);
}


export async function renderRound(root: HTMLElement, opts: RoundOpts): Promise<void> {
  const phrasesForLevel = opts.manifest.phrases.filter((p) => p.level === opts.level);
  const order = await samplePhraseOrder(phrasesForLevel);
  const sessionProfile = (await getProfile()) ?? ('ezra' as Profile);
  const settings = await getSettings();
  let trial = 0;
  let cleanTrials = 0;   // trials solved with no wrong tap
  let roundMisfires = 0; // total wrong-fruit / wrong-modifier taps this round
  const fruitsAdded: string[] = [];

  function emitTrialEvent(
    phraseId: string,
    outcome: 'correct' | 'wrong-fruit' | 'wrong-modifier' | 'silly',
    tappedId: string,
    modifier?: string,
  ): void {
    // Fire-and-forget; failure to log shouldn't break gameplay.
    logTrial({
      t: Date.now(),
      profile: sessionProfile,
      level: opts.level,
      phraseId,
      outcome,
      tappedId,
      modifier,
    }).catch(() => undefined);
  }

  // Build the persistent scene shell ONCE. Dad + blender + glass stay across
  // trials; we update child elements (prompt, choices, dad expression) per trial.
  root.innerHTML = `
    <div class="screen round-screen">
      <button class="round-exit" id="round-exit" aria-label="Back to home">✕</button>
      <div class="progress-dots" id="dots"></div>
      <div class="scene">
        <div class="dad-wrap" id="dad-wrap">${dadSvg('asking')}</div>
        <div class="blender-wrap" id="blender-wrap">${blenderSvg('empty')}</div>
      </div>
      <button class="play-button" id="play" aria-label="Play the phrase">▶</button>
      <div class="audio-hint audio-hint-off" id="audio-hint">🔇 Πάτα ▶ για ήχο<span>turn up the volume and check the iPad silent switch</span></div>
      <div class="prompt-phrase hidden" id="prompt">
        <div class="prompt-el" id="prompt-el"></div>
        <div class="prompt-translit" id="prompt-translit"></div>
      </div>
      <div class="choice-grid" id="choices"></div>
    </div>
  `;

  root.querySelector<HTMLButtonElement>('#round-exit')!
    .addEventListener('click', () => opts.onAbort());

  const dotsEl = root.querySelector<HTMLElement>('#dots')!;
  const dadWrap = root.querySelector<HTMLElement>('#dad-wrap')!;
  const blenderWrap = root.querySelector<HTMLElement>('#blender-wrap')!;
  const playBtn = root.querySelector<HTMLButtonElement>('#play')!;
  const audioHint = root.querySelector<HTMLElement>('#audio-hint')!;
  const promptBox = root.querySelector<HTMLElement>('#prompt')!;
  const promptElText = root.querySelector<HTMLElement>('#prompt-el')!;
  const promptTranslit = root.querySelector<HTMLElement>('#prompt-translit')!;
  const choicesEl = root.querySelector<HTMLElement>('#choices')!;

  function setDad(expression: DadExpression): void {
    dadWrap.innerHTML = dadSvg(expression);
  }

  function setAudioHint(show: boolean): void {
    audioHint.classList.toggle('audio-hint-off', !show);
  }

  // L4 modifier vocabulary — controls both the fly-clone end scale and the
  // blender-contents fruit size so "big watermelon" looks visibly bigger
  // inside the jar than "small grape".
  type Modifier = 'big' | 'small' | 'lots' | undefined;
  const FLY_END_SCALE: Record<string, number> = { big: 0.45, small: 0.14, lots: 0.18, default: 0.25 };
  const BLENDER_SCALE: Record<string, number> = { big: 0.34, small: 0.12, lots: 0.16, default: 0.22 };

  function addFruitToBlender(fruitId: string, modifier?: Modifier): void {
    // Two-level group structure: outer <g> holds the SVG positioning
    // transform (translate to scatter spot, scale down, recenter), inner <g>
    // holds the CSS plop animation class. Without this split, the CSS
    // `transform: scale()` from the keyframe overrides the SVG transform
    // attribute on the same element and the fruit lands outside the jar.
    //
    // Fruit's own viewBox is 100×100 centered at (50,50). SVG transforms
    // apply right-to-left: first recenter (translate -50,-50), then scale
    // down, then move to the scattered spot.
    const contentsGroup = blenderWrap.querySelector('.blender-contents');
    if (!contentsGroup) return;
    const existing = contentsGroup.children.length;
    const angle = existing * 1.7;
    const radius = 6 + (existing % 3) * 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius - existing * 4;
    const scale = BLENDER_SCALE[modifier ?? 'default'] ?? BLENDER_SCALE.default;
    const positioner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    positioner.setAttribute('transform', `translate(${x.toFixed(2)}, ${y.toFixed(2)}) scale(${scale}) translate(-50, -50)`);
    const animator = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    animator.classList.add('blender-fruit', 'blender-fruit-enter');
    animator.innerHTML = fruitInner(fruitId);
    positioner.appendChild(animator);
    contentsGroup.appendChild(positioner);
  }

  async function flyOne(tileEl: HTMLElement, fruitId: string, modifier?: Modifier, extraDelay = 0): Promise<void> {
    // FLIP-style fly: clone the tile, position-absolute it where it was,
    // then transform it toward the blender. After the animation, drop the
    // clone and add a fruit SVG inside the blender.
    const tileRect = tileEl.getBoundingClientRect();
    const blenderRect = blenderWrap.getBoundingClientRect();
    const startX = tileRect.left + tileRect.width / 2;
    const startY = tileRect.top + tileRect.height / 2;
    // Scatter the end target slightly for "lots" so the 5 flights don't all
    // pile into the same spot.
    const jitterX = modifier === 'lots' ? (Math.random() - 0.5) * 60 : 0;
    const jitterY = modifier === 'lots' ? (Math.random() - 0.5) * 30 : 0;
    const endX = blenderRect.left + blenderRect.width / 2 + jitterX;
    const endY = blenderRect.top + blenderRect.height * 0.55 + jitterY;
    const dx = endX - startX;
    const dy = endY - startY;
    const endScale = FLY_END_SCALE[modifier ?? 'default'] ?? FLY_END_SCALE.default;

    const clone = tileEl.cloneNode(true) as HTMLElement;
    clone.classList.add('flying');
    clone.style.position = 'fixed';
    clone.style.left = `${tileRect.left}px`;
    clone.style.top = `${tileRect.top}px`;
    clone.style.width = `${tileRect.width}px`;
    clone.style.height = `${tileRect.height}px`;
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '100';
    document.body.appendChild(clone);

    if (extraDelay > 0) {
      await new Promise((r) => setTimeout(r, extraDelay));
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    clone.style.transition = 'transform 600ms cubic-bezier(0.5, -0.3, 0.4, 1.1), opacity 600ms';
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(${endScale}) rotate(${(Math.random() - 0.5) * 360}deg)`;
    clone.style.opacity = '0.4';

    await new Promise((r) => setTimeout(r, 620));
    clone.remove();
    addFruitToBlender(fruitId, modifier);
  }

  async function flyFruitToBlender(tileEl: HTMLElement, fruitId: string, modifier?: Modifier): Promise<void> {
    // "lots" launches 5 staggered clones — same fruit, different scatter
    // endpoints, 80ms apart so the kid sees a flurry of fruit dropping in.
    if (modifier === 'lots') {
      const flights = [0, 1, 2, 3, 4].map((i) =>
        flyOne(tileEl, fruitId, 'lots', i * 80),
      );
      await Promise.all(flights);
      return;
    }
    return flyOne(tileEl, fruitId, modifier);
  }

  function updateDots(): void {
    dotsEl.innerHTML = order
      .map((_, i) => {
        const cls = i < trial ? 'dot done' : i === trial ? 'dot current' : 'dot';
        return `<span class="${cls}"></span>`;
      })
      .join('');
  }

  async function showTrial(): Promise<void> {
    const phrase = order[trial];
    const targetFruits = phrase.answers
      .map((id) => opts.manifest.fruits.find((f) => f.id === id))
      .filter((f): f is Fruit => f !== undefined);
    // Track which targets the kid still needs to tap. Order-doesn't-matter
    // for L3 — both fruits required, either order accepted. Keeps it forgiving
    // for kids who are still parsing the new "X και Y" construction.
    const remainingTargets = new Set(targetFruits.map((f) => f.id));
    const mastery = await getMastery(CATEGORY_ID, phrase.id);
    let wrongStreak = 0;
    let trialMisfire = false; // any wrong tap this trial → not a clean solve

    const choices = buildChoices(opts.manifest, targetFruits, opts.level, phrase.modifier);

    updateDots();
    promptElText.textContent = phrase.el;
    // Immersion mode: hide the transliteration entirely when settings say so.
    // Greek text always reveals as the reward; translit is the optional
    // training wheel for Will/Elana to read along.
    promptTranslit.textContent = settings.showTranslit ? phrase.translit : '';
    promptTranslit.style.display = settings.showTranslit ? '' : 'none';
    promptBox.classList.add('hidden');
    promptBox.classList.remove('revealed');
    setAudioHint(false);
    setDad('asking');

    // L1 audio-gate: hide the choice tiles until the kid has heard the phrase
    // at least once. Prevents the "elimination by image" failure mode the
    // pedagogy critic flagged — kid has to engage with the audio before they
    // see fruit options to pick from. Tiles unhide on first prompt playback.
    const useAudioGate = opts.level === 1;
    if (useAudioGate) {
      choicesEl.classList.add('hidden-gate');
    } else {
      choicesEl.classList.remove('hidden-gate');
    }

    choicesEl.dataset.count = String(choices.length);
    choicesEl.innerHTML = choices
      .map((c) => {
        if (c.kind === 'fruit') {
          // Modifier-styling on the tile itself (L4 only) — `size-big` enlarges
          // the rendered fruit, `size-small` shrinks, `size-lots` renders 3
          // copies in a small grid. Default (no modifier) renders one fruit
          // at the normal tile size.
          const sizeClass = c.modifier ? ` size-${c.modifier}` : '';
          // For lots: render 3 small fruit SVGs in a grid; otherwise 1.
          const inner = c.modifier === 'lots'
            ? `${fruitSvg(c.data.id)}${fruitSvg(c.data.id)}${fruitSvg(c.data.id)}`
            : (hasImage(c.data.image)
              ? `<img class="choice-image" src="${imageUrl(c.data.image)}" alt="${c.data.translit}">`
              : fruitSvg(c.data.id));
          const modifierAttr = c.modifier ? ` data-modifier="${c.modifier}"` : '';
          return `
            <button class="choice-tile" data-id="${c.data.id}" data-kind="fruit"${modifierAttr} aria-label="${c.data.translit}">
              <div class="choice-fruit${sizeClass}">${inner}</div>
            </button>
          `;
        }
        return `
          <button class="choice-tile" data-id="${c.data.id}" data-kind="silly" aria-label="${c.data.translit}">
            <div class="choice-fruit">${sillySvg(c.data.id)}</div>
          </button>
        `;
      })
      .join('');

    // Reveal tiles after the first prompt playback (L1 audio gate). For
    // L2-L4 the tiles are always visible — gate's only purpose is to
    // discourage image-elimination at the easiest level.
    const playAndReveal = async () => {
      // 6s backstop is long enough for any phrase to finish (so the gate still
      // reveals AFTER the audio, as intended) but still catches a true hang.
      // 1.5s was shorter than the L1 phrase, which defeated the gate.
      const spoke = await withTimeout(playWord(phrase.audio, phrase.el), 6000);
      if (useAudioGate) {
        choicesEl.classList.remove('hidden-gate');
      }
      // spoke === false (silent/failed) or undefined (timed out) → the kid
      // likely heard nothing. Surface a listen hint so a muted iPad doesn't
      // turn L1 into an unwinnable, soundless trial. A working replay clears it.
      setAudioHint(spoke === false || spoke === undefined);
    };
    playBtn.onclick = playAndReveal;
    // Auto-play once on trial start.
    playAndReveal();

    async function advance(): Promise<void> {
      trial++;
      if (trial >= order.length) {
        await logRoundCompletion();
        opts.onComplete(cleanTrials, order.length, fruitsAdded, roundMisfires <= PERFECT_MAX_MISFIRES);
      } else {
        showTrial();
      }
    }

    choicesEl.querySelectorAll<HTMLButtonElement>('.choice-tile').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tappedId = btn.dataset.id!;
        const tappedKind = btn.dataset.kind!;
        const tappedModifier = (btn.dataset.modifier as PhraseModifier | undefined) ?? undefined;
        // At L4 the modifier participates in the match — tapping the same fruit
        // with the WRONG modifier (e.g. small-apple when the prompt was μεγάλο)
        // is a wrong tap, not a correct one. At L1-L3 there's no modifier on
        // the tiles so this check is automatically satisfied.
        const modifierMatches = phrase.modifier
          ? tappedModifier === phrase.modifier
          : true;
        if (tappedKind === 'fruit' && remainingTargets.has(tappedId) && modifierMatches) {
          emitTrialEvent(phrase.id, 'correct', tappedId, phrase.modifier);
          const tappedFruit = targetFruits.find((f) => f.id === tappedId)!;
          btn.classList.add('correct');
          btn.setAttribute('disabled', 'true');
          remainingTargets.delete(tappedId);
          const isLastTarget = remainingTargets.size === 0;
          if (isLastTarget) {
            // Final tap of the trial — reveal phrase text + bump mastery + advance.
            // Lock the whole grid first: during the ~1.2s win animation an
            // excited kid tapping other tiles would otherwise register as wrong
            // taps and could strip the earned celebration from a clean round.
            choicesEl.querySelectorAll<HTMLButtonElement>('.choice-tile')
              .forEach((t) => t.setAttribute('disabled', 'true'));
            setAudioHint(false);
            promptBox.classList.remove('hidden');
            promptBox.classList.add('revealed');
            setDad('happy');
            playChime();
            await flyFruitToBlender(btn, tappedId, phrase.modifier);
            // Fire-and-forget the spoken fruit name: the chime + animation
            // already signal "correct," so progression must not wait on audio.
            void playWord(tappedFruit.audio, tappedFruit.el);
            // For "lots" record the fruit 5x so the end-screen smoothie color
            // reflects the multi-copy effect.
            const copies = phrase.modifier === 'lots' ? 5 : 1;
            for (let i = 0; i < copies; i++) fruitsAdded.push(tappedId);
            if (!trialMisfire) cleanTrials++;
            await setMastery(CATEGORY_ID, phrase.id, mastery + 1);
            await new Promise((r) => setTimeout(r, 600));
            await advance();
          } else {
            // Mid-trial correct tap (L3 only): fly into blender, brief
            // chime + fruit name reinforcement, but no reveal yet — kid still
            // needs to find the remaining target.
            playChime();
            await flyFruitToBlender(btn, tappedId, phrase.modifier);
            void playWord(tappedFruit.audio, tappedFruit.el);
            fruitsAdded.push(tappedId);
            // Tiny pause then keep listening for the second tap.
          }
        } else if (tappedKind === 'silly') {
          emitTrialEvent(phrase.id, 'silly', tappedId);
          // Comedy beat — Dad pulls a face, reaction line plays, no penalty.
          // Find the matching silly item to get its reaction copy.
          const silly = opts.manifest.silly.find((s) => s.id === tappedId);
          btn.classList.add('shake');
          setDad('bleh');
          if (silly) {
            // Fire-and-forget so a stuck utterance can't block the reset below.
            void speakGreek(silly.reactionEl);
          }
          setTimeout(() => {
            btn.classList.remove('shake');
            setDad('asking');
            playWord(phrase.audio, phrase.el);
          }, 700);
        } else {
          // Wrong fruit (real penalty path, same as v0.1).
          // Distinguish wrong-fruit-id from wrong-modifier-on-correct-fruit
          // for logging — the latter is a more informative pedagogical signal.
          const wrongKind = tappedKind === 'fruit' && remainingTargets.has(tappedId) && !modifierMatches
            ? 'wrong-modifier'
            : 'wrong-fruit';
          emitTrialEvent(phrase.id, wrongKind, tappedId, tappedModifier);
          btn.classList.add('shake');
          wrongStreak++;
          roundMisfires++;
          trialMisfire = true;
          if (wrongStreak >= 2 && mastery > 0) {
            await setMastery(CATEGORY_ID, phrase.id, mastery - 1);
          }
          // After the second consecutive wrong, dim non-target tiles and
          // pulse the remaining target(s) for ~1.5s so the kid can complete
          // the trial without an infinite shake-loop. Council "escape hatch"
          // — pedagogical assist that doesn't change the underlying mastery
          // bookkeeping (already decremented above on the second wrong).
          if (wrongStreak >= 2) {
            choicesEl.querySelectorAll<HTMLButtonElement>('.choice-tile').forEach((tile) => {
              const tileId = tile.dataset.id!;
              if (remainingTargets.has(tileId)) {
                tile.classList.add('assist-pulse');
              } else {
                tile.classList.add('assist-dim');
              }
            });
            setTimeout(() => {
              choicesEl.querySelectorAll<HTMLButtonElement>('.choice-tile').forEach((tile) => {
                tile.classList.remove('assist-pulse', 'assist-dim');
              });
            }, 1500);
          }
          setTimeout(() => {
            btn.classList.remove('shake');
            playWord(phrase.audio, phrase.el);
          }, 450);
        }
      });
    });
  }

  showTrial();
}
