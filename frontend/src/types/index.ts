export interface PitchFrame {
  time: number;
  pitch: number; // Hz, 0 = unvoiced
}

export interface ScoreResult {
  overall: number;
  totalFrames: number;
  scoredFrames: number;
  avgDeviationCents: number;
}

export interface Surah {
  id: number;
  name_arabic: string;
  name_simple: string;
  translated_name: { name: string };
  verses_count: number;
  revelation_place: string;
}

export interface Verse {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
}

export type RecordingMode = 'karaoke' | 'silent';
export type Screen = 'browser' | 'verses' | 'practice';
