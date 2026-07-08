// Runtime content loader. This is what makes manifest edits "come in
// immediately," the same way meals-hub fetches its data files at runtime
// instead of baking them into the code bundle.
//
// Flow (fail-open, mirrors meals-hub loadFile):
//   1. Network: fetch the manifest from raw.githubusercontent.com, cache-busted.
//      Edit src/data/manifest.json, push it, and the next app open picks it up
//      with NO Vite rebuild and NO waiting on the Pages deploy.
//   2. Cache: last-good manifest from a prior successful fetch (offline / on
//      the plane / GitHub blip).
//   3. Bundled: the build-time snapshot imported below. Always valid, never
//      empty, so the app can never fail to boot.
//
// What this does NOT make instant: a genuinely NEW fruit needs a new inline
// SVG in fruit-illustrations.ts, which is code and still needs a build. New
// PHRASES using existing fruits are pure manifest data and are instant.

import bundledManifest from '../data/manifest.json';
import type { Manifest } from './types';
import { get, set } from 'idb-keyval';

// Single source of truth is src/data/manifest.json on main. The bundled copy
// above and this raw URL are the same file; the bundle just lags to the last
// build, which is fine because it is only the offline floor.
const RAW_URL =
  'https://raw.githubusercontent.com/wgnomikos/greek-smoothie-game/main/src/data/manifest.json';
const CACHE_KEY = 'manifest:last-good';

export type ManifestSource = 'network' | 'cache' | 'bundled';

export interface ManifestLoad {
  manifest: Manifest;
  source: ManifestSource;
  fetchedAt: string | null;
  error: string | null;
}

function isValidManifest(m: unknown): m is Manifest {
  const x = m as Manifest;
  return (
    !!x &&
    Array.isArray(x.phrases) &&
    x.phrases.length > 0 &&
    Array.isArray(x.fruits) &&
    x.fruits.length > 0 &&
    Array.isArray(x.silly)
  );
}

export async function loadManifest(): Promise<ManifestLoad> {
  // 1. Network
  try {
    const res = await fetch(`${RAW_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!isValidManifest(data)) throw new Error('fetched manifest failed validation');
    await set(CACHE_KEY, data).catch(() => {});
    return { manifest: data, source: 'network', fetchedAt: new Date().toISOString(), error: null };
  } catch (netErr) {
    // 2. Cache
    try {
      const cached = await get(CACHE_KEY);
      if (isValidManifest(cached)) {
        return { manifest: cached, source: 'cache', fetchedAt: null, error: String(netErr) };
      }
    } catch {
      // fall through to bundled
    }
    // 3. Bundled
    return {
      manifest: bundledManifest as Manifest,
      source: 'bundled',
      fetchedAt: null,
      error: String(netErr),
    };
  }
}
