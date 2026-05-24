import { useCallback, useRef } from 'react';
import { PitchDetector } from 'pitchy';
import { useStore } from '../store/useStore';

const CLARITY_THRESHOLD = 0.85;
const MIN_PITCH_HZ = 60;
const MAX_PITCH_HZ = 600;
const FRAME_SIZE = 2048;

export function usePitchDetector() {
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const addLivePitch = useStore((s) => s.addLivePitch);

  const start = useCallback(async (stream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = FRAME_SIZE;
    analyserRef.current = analyser;

    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;
    source.connect(analyser);

    const detector = PitchDetector.forFloat32Array(FRAME_SIZE);
    const inputBuffer = new Float32Array(FRAME_SIZE);
    startTimeRef.current = performance.now();

    let lastPushTime = 0;

    const tick = () => {
      analyser.getFloatTimeDomainData(inputBuffer);
      const [pitch, clarity] = detector.findPitch(inputBuffer, ctx.sampleRate);
      const now = performance.now();

      // Push at ~30fps max
      if (now - lastPushTime > 33) {
        const time = (now - startTimeRef.current) / 1000;
        const voiced =
          clarity >= CLARITY_THRESHOLD &&
          pitch >= MIN_PITCH_HZ &&
          pitch <= MAX_PITCH_HZ;
        addLivePitch({ time, pitch: voiced ? pitch : 0 });
        lastPushTime = now;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [addLivePitch]);

  const stop = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
  }, []);

  return { start, stop };
}
