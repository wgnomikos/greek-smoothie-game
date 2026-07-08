// IndexedDB-backed progress storage via idb-keyval.
// localStorage gets purged on iOS PWAs after ~7 days of inactivity under
// Intelligent Tracking Prevention. IndexedDB combined with a successful
// navigator.storage.persist() call survives.

import { get, set } from 'idb-keyval';

const MASTERY_PREFIX = 'mastery';
const TIMESTAMP_KEY = 'rounds';
const PROFILE_KEY = 'profile';

export type Profile = 'ezra' | 'ares';

export async function getProfile(): Promise<Profile | null> {
  const val = await get<Profile>(PROFILE_KEY);
  return val ?? null;
}

export async function setProfile(profile: Profile): Promise<void> {
  await set(PROFILE_KEY, profile);
}

export async function clearProfile(): Promise<void> {
  await set(PROFILE_KEY, undefined);
}

// Per-trial event log — fixed-size ring buffer so it can't grow forever.
// Stored under EVENTS_KEY. Diagnostic only — read via the ?debug=1 panel
// or by exporting from devtools. No PII; just phrase ids + outcomes.
const EVENTS_KEY = 'events';
const EVENTS_MAX = 500;
const SETTINGS_KEY = 'settings';

export interface Settings {
  showTranslit: boolean;
}

const DEFAULT_SETTINGS: Settings = { showTranslit: true };

export async function getSettings(): Promise<Settings> {
  const val = await get<Settings>(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(val ?? {}) };
}

export async function setSettings(next: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await set(SETTINGS_KEY, { ...current, ...next });
}

export type TrialOutcome = 'correct' | 'wrong-fruit' | 'wrong-modifier' | 'silly';

export interface TrialEvent {
  t: number;             // unix ms
  profile: Profile;
  level: number;
  phraseId: string;
  outcome: TrialOutcome;
  tappedId: string;      // fruit id or silly id
  modifier?: string;
}

export async function logTrial(event: TrialEvent): Promise<void> {
  const existing = (await get<TrialEvent[]>(EVENTS_KEY)) ?? [];
  existing.push(event);
  const trimmed = existing.length > EVENTS_MAX ? existing.slice(-EVENTS_MAX) : existing;
  await set(EVENTS_KEY, trimmed);
}

export async function getTrialEvents(): Promise<TrialEvent[]> {
  return (await get<TrialEvent[]>(EVENTS_KEY)) ?? [];
}

export async function clearTrialEvents(): Promise<void> {
  await set(EVENTS_KEY, []);
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!('storage' in navigator) || !navigator.storage.persist) return false;
  const already = await navigator.storage.persisted();
  if (already) return true;
  return await navigator.storage.persist();
}

export async function getMastery(categoryId: string, wordId: string): Promise<number> {
  const key = `${MASTERY_PREFIX}.${categoryId}.${wordId}`;
  const val = await get<number>(key);
  return val ?? 0;
}

export async function setMastery(
  categoryId: string,
  wordId: string,
  score: number,
): Promise<void> {
  const key = `${MASTERY_PREFIX}.${categoryId}.${wordId}`;
  await set(key, score);
}

export async function logRoundCompletion(): Promise<void> {
  const existing = (await get<number[]>(TIMESTAMP_KEY)) ?? [];
  existing.push(Date.now());
  // Cap to last 1000 rounds so the array doesn't grow unbounded.
  const trimmed = existing.length > 1000 ? existing.slice(-1000) : existing;
  await set(TIMESTAMP_KEY, trimmed);
}

export async function getRoundLog(): Promise<number[]> {
  return (await get<number[]>(TIMESTAMP_KEY)) ?? [];
}
