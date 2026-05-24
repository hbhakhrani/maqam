import { create } from 'zustand';
import type { PitchFrame, RecordingMode, ScoreResult, Screen, Surah, Verse } from '../types';

interface MaqamStore {
  screen: Screen;
  selectedSurah: Surah | null;
  selectedVerse: Verse | null;

  referencePitch: PitchFrame[];
  referenceDuration: number;
  livePitch: PitchFrame[];
  userPitch: PitchFrame[] | null;
  score: ScoreResult | null;

  recordingMode: RecordingMode;
  isRecording: boolean;
  isAnalyzing: boolean;

  setScreen: (s: Screen) => void;
  setSelectedSurah: (s: Surah) => void;
  setSelectedVerse: (v: Verse) => void;
  setReferencePitch: (frames: PitchFrame[], duration: number) => void;
  addLivePitch: (frame: PitchFrame) => void;
  clearLivePitch: () => void;
  setUserResults: (pitch: PitchFrame[], score: ScoreResult) => void;
  setRecordingMode: (m: RecordingMode) => void;
  setIsRecording: (v: boolean) => void;
  setIsAnalyzing: (v: boolean) => void;
  resetPractice: () => void;
}

export const useStore = create<MaqamStore>((set) => ({
  screen: 'browser',
  selectedSurah: null,
  selectedVerse: null,
  referencePitch: [],
  referenceDuration: 0,
  livePitch: [],
  userPitch: null,
  score: null,
  recordingMode: 'silent',
  isRecording: false,
  isAnalyzing: false,

  setScreen: (screen) => set({ screen }),
  setSelectedSurah: (selectedSurah) => set({ selectedSurah }),
  setSelectedVerse: (selectedVerse) => set({ selectedVerse }),
  setReferencePitch: (referencePitch, referenceDuration) =>
    set({ referencePitch, referenceDuration }),
  addLivePitch: (frame) =>
    set((s) => ({ livePitch: [...s.livePitch, frame] })),
  clearLivePitch: () => set({ livePitch: [], userPitch: null, score: null }),
  setUserResults: (userPitch, score) => set({ userPitch, score, isAnalyzing: false }),
  setRecordingMode: (recordingMode) => set({ recordingMode }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  resetPractice: () =>
    set({ livePitch: [], userPitch: null, score: null, isAnalyzing: false }),
}));
