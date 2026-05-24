import type { RecordingMode } from '../types';

interface Props {
  isRecording: boolean;
  isAnalyzing: boolean;
  mode: RecordingMode;
  onToggleMode: () => void;
  onRecord: () => void;
  onStop: () => void;
  disabled: boolean;
}

export function RecordButton({
  isRecording,
  isAnalyzing,
  mode,
  onToggleMode,
  onRecord,
  onStop,
  disabled,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full p-1">
        <button
          onClick={() => mode !== 'silent' && onToggleMode()}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            mode === 'silent'
              ? 'bg-amber-500 text-slate-900'
              : 'text-slate-400 hover:text-white'
          }`}
          disabled={isRecording || isAnalyzing}
        >
          Silent
        </button>
        <button
          onClick={() => mode !== 'karaoke' && onToggleMode()}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            mode === 'karaoke'
              ? 'bg-amber-500 text-slate-900'
              : 'text-slate-400 hover:text-white'
          }`}
          disabled={isRecording || isAnalyzing}
        >
          Karaoke
        </button>
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          onClick={isRecording ? onStop : onRecord}
          disabled={disabled || isAnalyzing}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isRecording
              ? 'bg-red-500 hover:bg-red-400 scale-110'
              : 'bg-amber-500 hover:bg-amber-400'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            <span className="w-5 h-5 bg-white rounded-sm" />
          ) : (
            <span className="w-5 h-5 bg-white rounded-full" />
          )}
        </button>
        <span className="text-xs text-slate-500 mt-1">
          {isAnalyzing
            ? 'Analyzing...'
            : isRecording
            ? 'Stop'
            : 'Record'}
        </span>
      </div>

      {mode === 'karaoke' && !isRecording && (
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Karaoke: reference audio plays while you record. Use headphones to avoid feedback.
        </p>
      )}
      {mode === 'silent' && !isRecording && (
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Silent: listen to the reference first, then record in silence.
        </p>
      )}
    </div>
  );
}
