import { useEffect, useRef } from 'react';
import type { PitchFrame } from '../types';

interface Props {
  referencePitch: PitchFrame[];
  referenceDuration: number;
  livePitch: PitchFrame[];
  userPitch: PitchFrame[] | null;
  isRecording: boolean;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  verseKey?: string;
}

const MIN_HZ = 60;
const MAX_HZ = 400;
const TOLERANCE_CENTS = 50;

function hzToY(hz: number, height: number): number {
  const logMin = Math.log2(MIN_HZ);
  const logMax = Math.log2(MAX_HZ);
  const logHz = Math.log2(Math.max(Math.min(hz, MAX_HZ), MIN_HZ));
  return height * (1 - (logHz - logMin) / (logMax - logMin));
}

function timeToX(time: number, duration: number, width: number): number {
  return (time / Math.max(duration, 0.001)) * width;
}

function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, duration: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px Inter, sans-serif';

  const hzMarkers = [80, 100, 130, 160, 200, 250, 320];
  for (const hz of hzMarkers) {
    const y = hzToY(hz, height);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.fillText(`${hz}Hz`, 4, y - 3);
  }

  const secCount = Math.ceil(duration);
  for (let s = 0; s <= secCount; s++) {
    const x = timeToX(s, duration, width);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.fillText(`${s}s`, x + 3, height - 4);
  }
}

function drawToleranceBand(
  ctx: CanvasRenderingContext2D,
  frames: PitchFrame[],
  duration: number,
  width: number,
  height: number
) {
  const voiced = frames.filter((f) => f.pitch >= MIN_HZ);
  if (voiced.length < 2) return;

  ctx.fillStyle = 'rgba(34,197,94,0.12)';
  ctx.beginPath();

  // Upper boundary
  voiced.forEach((f, i) => {
    const x = timeToX(f.time, duration, width);
    const y = hzToY(f.pitch * centsToRatio(TOLERANCE_CENTS), height);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  // Lower boundary (reversed)
  for (let i = voiced.length - 1; i >= 0; i--) {
    const f = voiced[i];
    const x = timeToX(f.time, duration, width);
    const y = hzToY(f.pitch / centsToRatio(TOLERANCE_CENTS), height);
    ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.fill();
}

function drawPitchLine(
  ctx: CanvasRenderingContext2D,
  frames: PitchFrame[],
  duration: number,
  width: number,
  height: number,
  color: string,
  lineWidth = 2
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  let penDown = false;
  for (const f of frames) {
    if (f.pitch < MIN_HZ) {
      penDown = false;
      continue;
    }
    const x = timeToX(f.time, duration, width);
    const y = hzToY(f.pitch, height);
    if (!penDown) {
      ctx.moveTo(x, y);
      penDown = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

export function PitchCanvas({
  referencePitch,
  referenceDuration,
  livePitch,
  userPitch,
  isRecording,
  audioRef,
  verseKey,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const rafRef = useRef<number | null>(null);

  // Draw pitch data and cache as ImageData so the playhead loop can restore it cheaply
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const duration = referenceDuration || 10;

    drawGrid(ctx, w, h, duration);

    if (referencePitch.length > 0) {
      drawToleranceBand(ctx, referencePitch, duration, w, h);
      drawPitchLine(ctx, referencePitch, duration, w, h, '#3b82f6', 2.5);
    }

    const displayUserFrames = userPitch ?? (isRecording ? livePitch : null);
    if (displayUserFrames && displayUserFrames.length > 0) {
      const userDuration = userPitch
        ? referenceDuration
        : (livePitch[livePitch.length - 1]?.time ?? 0);
      const effectiveDuration = userPitch ? referenceDuration : Math.max(userDuration, duration);
      drawPitchLine(ctx, displayUserFrames, effectiveDuration, w, h, '#f97316', 2);
    }

    // Legend
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(w - 160, 12, 14, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Reference', w - 142, 16);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(w - 160, 26, 14, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('You', w - 142, 30);

    // Cache the drawn state so the playhead RAF can restore without full redraw
    imageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [referencePitch, referenceDuration, livePitch, userPitch, isRecording]);

  // Playhead animation — reads audio.currentTime directly, no React state updates
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const canvas = canvasRef.current;

    const drawPlayhead = () => {
      if (!canvas || !imageDataRef.current) return;
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const duration = referenceDuration || 10;

      ctx.putImageData(imageDataRef.current, 0, 0);

      const x = timeToX(audio.currentTime, duration, w);

      // Glow effect — wide faint line behind the sharp one
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 6;
      ctx.setLineDash([]);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Sharp playhead line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Time label
      const label = audio.currentTime.toFixed(1) + 's';
      const labelX = x + 5 > w - 32 ? x - 30 : x + 5;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(label, labelX, 14);
    };

    const tick = () => {
      drawPlayhead();
      if (!audio.paused && !audio.ended) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const onPlay = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    const onPause = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Draw playhead at the paused position
      drawPlayhead();
    };

    const onEnded = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Restore clean canvas (no playhead) when audio finishes
      if (canvas && imageDataRef.current) {
        canvas.getContext('2d')!.putImageData(imageDataRef.current, 0, 0);
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    // Catch the case where audio is already playing when effect runs
    if (!audio.paused) onPlay();

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  // verseKey triggers re-run when a new audio element is assigned for a new verse
  }, [audioRef, referenceDuration, verseKey]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl border border-slate-700"
      style={{ height: '260px', display: 'block' }}
    />
  );
}
