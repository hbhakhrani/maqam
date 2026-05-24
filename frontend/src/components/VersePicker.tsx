import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Verse } from '../types';

export function VersePicker() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { selectedSurah, setSelectedVerse, setScreen, resetPractice } = useStore();

  useEffect(() => {
    if (!selectedSurah) return;
    setLoading(true);
    fetch(`/api/chapters/${selectedSurah.id}/verses`)
      .then((r) => r.json())
      .then((data) => {
        setVerses(data.verses ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedSurah]);

  const playPreview = (v: Verse) => {
    const [surah, ayah] = v.verse_key.split(':');
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (playingId === v.id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(`/api/audio/${surah}/${ayah}`);
    audioRef.current = audio;
    audio.play();
    setPlayingId(v.id);
    audio.onended = () => setPlayingId(null);
  };

  const handleSelect = (v: Verse) => {
    audioRef.current?.pause();
    setPlayingId(null);
    setSelectedVerse(v);
    resetPractice();
    setScreen('practice');
  };

  if (!selectedSurah) return null;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setScreen('browser')}
          className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition"
        >
          ← Back to surahs
        </button>

        <header className="mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-arabic text-amber-400">{selectedSurah.name_arabic}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{selectedSurah.name_simple}</h2>
              <p className="text-slate-500 text-sm">{selectedSurah.translated_name?.name}</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center text-slate-500 py-20">Loading verses…</div>
        ) : (
          <div className="space-y-2">
            {verses.map((v) => (
              <div
                key={v.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4 hover:border-slate-600 transition"
              >
                <span className="text-slate-600 text-sm font-medium w-6 shrink-0">
                  {v.verse_number}
                </span>

                <p
                  className="font-arabic text-right text-lg leading-loose text-slate-200 flex-1"
                  dir="rtl"
                >
                  {v.text_uthmani}
                </p>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => playPreview(v)}
                    className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition"
                    title="Preview audio"
                  >
                    {playingId === v.id ? (
                      <span className="w-3 h-3 bg-amber-400 rounded-sm" />
                    ) : (
                      <span className="border-l-[10px] border-l-amber-400 border-y-[6px] border-y-transparent ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSelect(v)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-medium rounded-lg transition"
                  >
                    Practice
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
