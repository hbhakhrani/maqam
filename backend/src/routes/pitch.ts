import type { FastifyPluginAsync } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { decodeAudio } from '../services/audioDecoder.js';
import { extractPitchFrames, scorePitch } from '../services/pitchExtractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PITCH_CACHE_DIR = path.join(__dirname, '../../cache/pitch');
const AUDIO_CACHE_DIR = path.join(__dirname, '../../cache/audio');
const EVERYAYAH_BASE = 'https://everyayah.com/data/Muhammad_Ayyoub_64kbps';

fs.mkdirSync(PITCH_CACHE_DIR, { recursive: true });
fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

async function getReferencePitch(surah: string, ayah: string) {
  const key = `${surah.padStart(3, '0')}${ayah.padStart(3, '0')}`;
  const cachePath = path.join(PITCH_CACHE_DIR, `${key}.json`);

  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  }

  // Fetch and decode reference audio
  const audioCachePath = path.join(AUDIO_CACHE_DIR, `${key}.mp3`);
  let mp3Buf: Buffer;

  if (fs.existsSync(audioCachePath)) {
    mp3Buf = fs.readFileSync(audioCachePath);
  } else {
    const res = await fetch(`${EVERYAYAH_BASE}/${key}.mp3`);
    if (!res.ok) throw new Error('Audio not found');
    mp3Buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(audioCachePath, mp3Buf);
  }

  const { samples, sampleRate } = await decodeAudio(mp3Buf);
  const frames = extractPitchFrames(samples, sampleRate);
  const duration = samples.length / sampleRate;

  const result = { frames, duration };
  fs.writeFileSync(cachePath, JSON.stringify(result));
  return result;
}

export const pitchRoutes: FastifyPluginAsync = async (app) => {
  // GET reference pitch (pre-computed + cached)
  app.get<{ Params: { surah: string; ayah: string } }>(
    '/api/pitch/reference/:surah/:ayah',
    async (req, reply) => {
      const { surah, ayah } = req.params;
      try {
        const data = await getReferencePitch(surah, ayah);
        reply.header('Cache-Control', 'public, max-age=86400');
        return data;
      } catch (err) {
        app.log.error(err);
        return reply.status(500).send({ error: 'Failed to extract reference pitch' });
      }
    }
  );

  // POST user recording → pitch + score
  app.post('/api/pitch/analyze', async (req, reply) => {
    let audioBuf: Buffer | undefined;
    let surah = '1';
    let ayah = '1';

    // Drain each part inline — saving the part ref and reading later deadlocks the stream
    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'audio') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        audioBuf = Buffer.concat(chunks);
      } else if (part.type === 'field') {
        if (part.fieldname === 'surah') surah = part.value as string;
        if (part.fieldname === 'ayah') ayah = part.value as string;
      }
    }

    if (!audioBuf) {
      return reply.status(400).send({ error: 'No audio file' });
    }

    try {
      const [userDecoded, refData] = await Promise.all([
        decodeAudio(audioBuf),
        getReferencePitch(surah, ayah),
      ]);

      const userPitch = extractPitchFrames(userDecoded.samples, userDecoded.sampleRate);
      const score = scorePitch(userPitch, refData.frames, refData.duration);

      return { userPitch, score };
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Analysis failed' });
    }
  });
};
