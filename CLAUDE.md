# Greek Smoothie Game: Claude Session Rules

A Greek listening-comprehension PWA for Will's kids. This file is the routing
contract for every future Claude session in this repo. It exists so work here
runs on the standard runtime and scripts, with no frontier-model dependence.

## Model routing

- Default runtime is Opus. Nothing in this repo requires a stronger model. If a
  session happens to be on a frontier model, behave identically.
- Sonnet subagents are allowed ONLY for mechanical fan-out (data entry from the
  locked templates, batch SVG variants, screenshot-verify loops) and ONLY when
  Will opts in for that run. Their output must pass `npm run verify` like
  everyone else's.
- Never delegate verification to a model. Verification is `npm run verify`,
  exit code 0, fail-closed. Done means the gate passes, not that output looks
  right.

## Greek language (hard rule)

- NO model ever freestyles Greek. New phrases come only from the locked carrier
  patterns already in `src/data/manifest.json` via slot-fill with approved
  nouns.
- Anything novel (a new carrier pattern, new grammar, a new modifier) is
  written up as a PROPOSAL for Will, a heritage speaker, to approve before it
  enters the manifest. Present Greek + transliteration + English gloss.
- Transliteration uses `h` never `ch` (ahladi, Ohi). Object nouns take
  indefinite articles (ena/mia) per the established phrase patterns.

## Content updates go live immediately (meals-hub model)

- The app fetches `src/data/manifest.json` at RUNTIME from raw.githubusercontent.com
  (main branch), cache-busted, on every open. See `src/lib/content.ts`. Fallback
  chain is network then IndexedDB last-good then the bundled build-time copy, so
  the app can never fail to boot.
- To add or edit PHRASES (using existing fruits): edit `src/data/manifest.json`,
  run `npm run verify` (the Greek lint gate travels with the content), commit,
  and push. The kids' iPads pick it up on the next open with NO Vite rebuild and
  NO waiting on the Pages deploy. This is the whole point: content is a pure-data
  push a delegated Opus/Sonnet session (or a script) can do behind the gate.
- What is NOT instant: a genuinely NEW fruit needs a new inline SVG in
  `src/lib/fruit-illustrations.ts`, which is code and still needs a build + deploy.
  Recorded audio (m4a) is a static asset served from Pages, so it needs the deploy
  to land, but a new phrase referencing a not-yet-recorded m4a just uses TTS until
  then.
- The `?debug=1` panel shows whether content loaded live/cached/bundled and the
  phrase count, so "did my update land?" is answerable at a glance.

## Workflow

- Work from one `WORKPLAN.md` card per session when cards exist. Read the card
  and this file; do not re-read project history to start.
- Observation gate: no new gameplay features while `OBSERVED_SESSIONS.md`
  (local-only, gitignored) has no dated entry for the affected kid profile.
  Ship-and-observe beats build-on-spec; this repo has been burned by the
  reverse.
- Ares regression rule: every change ships behind the profile check. L1/L2 for
  the younger profile must be identical before and after.
- Numeric thresholds (mastery, streaks, accuracy cutoffs) come from WORKPLAN
  cards, never improvised.

## Approvals and privacy

- Pushing to GitHub, deploying, or anything externally visible needs Will's
  fresh explicit approval EVERY time. `git commit` locally is fine.
- `OBSERVED_SESSIONS.md` is a behavioral log of the kids. It is gitignored and
  must never be committed, pasted into issues, or uploaded anywhere.
- Kid names stay out of repo metadata (PWA manifest description, README,
  package.json). In-app profile labels are Will's call, not yours.

## Style

- No em dashes or en dashes in UI strings, docs, or code comments you write.
- Kid-facing text is warm, playful, never corporate. Greek with transliteration
  where the UI already does that.
- Match the existing code style: vanilla TS, inline SVG illustrations, no new
  frameworks or dependencies without a WORKPLAN card saying so.
