import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { usePitchDetector } from '../hooks/usePitchDetector';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { PitchCanvas } from './PitchCanvas';
import { RecordButton } from './RecordButton';
import { ScoreCard } from './ScoreCard';

export function PracticeScreen() {
  const {
    selectedSurah, selectedVerse,
    referencePitch, referenceDuration,
    livePitch, userPitch, score,
    recordingMode, isRecording, isAnalyzing,
    setScreen, setReferencePitch,
    setRecordingMode, setIsRecording, setIsAnalyzing,
    clearLivePitch, setUserResults,
  } = useStore();

  const [refLoading, setRefLoading] = useState(false);
  const [isRefPlaying, setIsRefPlaying] = useState(false);
  const refAudioRef = useRef<HTMLAudioElement | null>(null);
  const pitchDetector = usePitchDetector();
  const recorder = useAudioRecorder();

  const [surah, ayah] = (selectedVerse?.verse_key ?? '1:1').split(':');

  // Create one audio element per verse and wire up play/pause state
  useEffect(() => {
    const audio = new Audio(`/api/audio/${surah}/${ayah}`);
    refAudioRef.current = audio;
    setIsRefPlaying(false);

    const onPlay = () => setIsRefPlaying(true);
    const onPause = () => setIsRefPlaying(false);
    const onEnded = () => setIsRefPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [surah, ayah]);

  // Load reference pitch curve
  useEffect(() => {
    if (!selectedVerse) return;
    setRefLoading(true);
    clearLivePitch();

    fetch(`/api/pitch/reference/${surah}/${ayah}`)
      .then((r) => r.json())
      .then((data) => {
        setReferencePitch(data.frames, data.duration);
        setRefLoading(false);
      })
      .catch(() => setRefLoading(false));
  }, [selectedVerse, surah, ayah, setReferencePitch, clearLivePitch]);

  const toggleReference = () => {
    const audio = refAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const handleRecord = useCallback(async () => {
    clearLivePitch();
    const stream = await recorder.start();

    if (recordingMode === 'karaoke') {
      const audio = refAudioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    }

    await pitchDetector.start(stream);
    setIsRecording(true);
  }, [recorder, recordingMode, pitchDetector, clearLivePitch, setIsRecording]);

  const handleStop = useCallback(async () => {
    setIsRecording(false);
    pitchDetector.stop();

    if (recordingMode === 'karaoke') {
      refAudioRef.current?.pause();
    }

    setIsAnalyzing(true);
    const blob = await recorder.stop();

    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    form.append('surah', surah);
    form.append('ayah', ayah);

    try {
      const res = await fetch('/api/pitch/analyze', { method: 'POST', body: form });
      const data = await res.json();
      if (data.userPitch && data.score) {
        setUserResults(data.userPitch, data.score);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [recorder, pitchDetector, recordingMode, surah, ayah, setIsRecording, setIsAnalyzing, setUserResults]);

  if (!selectedSurah || !selectedVerse) return null;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setScreen('verses')}
            className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition"
          >
            ← {selectedSurah.name_simple}
          </button>
          <span className="text-slate-500 text-sm">
            Ayah {selectedVerse.verse_number}
          </span>
        </div>

        {/* Arabic text */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <p
            className="font-arabic text-2xl leading-loose text-white"
            dir="rtl"
          >
            {selectedVerse.text_uthmani}
          </p>
          <p className="text-slate-500 text-xs mt-3">
            {selectedSurah.name_simple} · Ayah {selectedVerse.verse_number}
          </p>
        </div>

        {/* Pitch canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Pitch Graph</span>
            <div className="flex items-center gap-3">
              {refLoading && (
                <span className="text-slate-600 text-xs">Extracting reference pitch…</span>
              )}
              {isAnalyzing && (
                <span className="text-amber-400 text-xs animate-pulse">Analyzing your recording…</span>
              )}
              <button
                onClick={toggleReference}
                disabled={isRecording || refLoading}
                className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition text-white flex items-center gap-1.5"
              >
                {isRefPlaying ? (
                  <>
                    <span className="flex gap-0.5">
                      <span className="w-[3px] h-3 bg-white rounded-sm inline-block" />
                      <span className="w-[3px] h-3 bg-white rounded-sm inline-block" />
                    </span>
                    Pause
                  </>
                ) : (
                  <>
                    <span className="border-l-[8px] border-l-white border-y-[5px] border-y-transparent inline-block" />
                    Play Reference
                  </>
                )}
              </button>
            </div>
          </div>

          <PitchCanvas
            referencePitch={referencePitch}
            referenceDuration={referenceDuration}
            livePitch={livePitch}
            userPitch={userPitch}
            isRecording={isRecording}
            audioRef={refAudioRef}
            verseKey={selectedVerse.verse_key}
          />
        </div>

        {/* Record controls */}
        <RecordButton
          isRecording={isRecording}
          isAnalyzing={isAnalyzing}
          mode={recordingMode}
          onToggleMode={() =>
            setRecordingMode(recordingMode === 'silent' ? 'karaoke' : 'silent')
          }
          onRecord={handleRecord}
          onStop={handleStop}
          disabled={refLoading || referencePitch.length === 0}
        />

        {/* Score card */}
        {score && !isRecording && <ScoreCard score={score} />}
      </div>
    </div>
  );
}
