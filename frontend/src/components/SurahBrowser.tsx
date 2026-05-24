import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Surah } from '../types';

export function SurahBrowser() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { setSelectedSurah, setScreen } = useStore();

  useEffect(() => {
    fetch('/api/chapters')
      .then((r) => r.json())
      .then((data) => {
        setSurahs(data.chapters ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = surahs.filter(
    (s) =>
      s.name_simple.toLowerCase().includes(query.toLowerCase()) ||
      s.translated_name?.name?.toLowerCase().includes(query.toLowerCase()) ||
      String(s.id).includes(query)
  );

  const handleSelect = (s: Surah) => {
    setSelectedSurah(s);
    setScreen('verses');
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-amber-400 font-arabic mb-1">مقام</h1>
        <p className="text-slate-400 text-sm">Quranic Recitation Trainer · Qari Muhammad Ayyoub</p>
      </header>

      <div className="max-w-4xl mx-auto">
        <input
          type="text"
          placeholder="Search surah by name or number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full mb-6 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
        />

        {loading ? (
          <div className="text-center text-slate-500 py-20">Loading surahs…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-slate-500 font-medium">{s.id}</span>
                  <span className="text-xs text-slate-600">{s.verses_count}v</span>
                </div>
                <p className="text-white font-medium text-sm group-hover:text-amber-400 transition-colors">
                  {s.name_simple}
                </p>
                <p className="text-slate-500 text-xs truncate">{s.translated_name?.name}</p>
                <p className="text-amber-500/70 text-right font-arabic text-lg mt-1">
                  {s.name_arabic}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
