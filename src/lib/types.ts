// Phrase = the spoken prompt. Kid hears it and taps the fruit(s) named in it.
// `answers` is an ordered list of fruit IDs: length 1 for L1/L2/L4, length 2 for L3.
// `modifier` only meaningful on L4 — drives the fly-in animation size/count.
export type PhraseLevel = 1 | 2 | 3 | 4;
export type PhraseModifier = 'big' | 'small' | 'lots';

export interface Phrase {
  id: string;
  level: PhraseLevel;
  el: string;
  translit: string;
  en: string;
  audio: string;
  answers: string[];
  modifier?: PhraseModifier;
}

// Fruit = a tappable choice tile. Reuses v0 IDs so images copy 1:1.
export interface Fruit {
  id: string;
  el: string;
  translit: string;
  image: string;
  audio: string;
  emoji: string;
}

// SillyItem = a non-fruit distractor (sock, pickle, broccoli) used from L2+.
// Wrong-tap triggers `reaction_audio` and a "BLEH" Dad face.
export interface SillyItem {
  id: string;
  el: string;
  translit: string;
  emoji: string;
  reactionEl: string;
  reactionTranslit: string;
  reactionAudio: string;
}

export interface Manifest {
  phrases: Phrase[];
  fruits: Fruit[];
  silly: SillyItem[];
}
