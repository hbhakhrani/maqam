import type { ScoreResult } from '../types';

interface Props {
  score: ScoreResult;
}

function grade(pct: number): { letter: string; color: string } {
  if (pct >= 90) return { letter: 'A', color: 'text-emerald-400' };
  if (pct >= 75) return { letter: 'B', color: 'text-blue-400' };
  if (pct >= 60) return { letter: 'C', color: 'text-amber-400' };
  if (pct >= 45) return { letter: 'D', color: 'text-orange-400' };
  return { letter: 'F', color: 'text-red-400' };
}

export function ScoreCard({ score }: Props) {
  const { letter, color } = grade(score.overall);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-300 font-medium">Result</h3>
        <span className={`text-4xl font-bold ${color}`}>{letter}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Pitch match</span>
          <span className="text-white font-medium">{score.overall}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
            style={{ width: `${score.overall}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Frames in tune</p>
          <p className="text-white font-medium">
            {score.scoredFrames} / {score.totalFrames}
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Avg deviation</p>
          <p className="text-white font-medium">{score.avgDeviationCents} cents</p>
        </div>
      </div>

      <p className="text-slate-500 text-xs">
        Tolerance: ±50 cents · Blue = reference · Orange = you
      </p>
    </div>
  );
}
