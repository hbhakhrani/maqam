import type { FastifyPluginAsync } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../../cache/audio');
const EVERYAYAH_BASE = 'https://everyayah.com/data/Muhammad_Ayyoub_64kbps';

fs.mkdirSync(CACHE_DIR, { recursive: true });

export const audioRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { surah: string; ayah: string } }>(
    '/api/audio/:surah/:ayah',
    async (req, reply) => {
      const { surah, ayah } = req.params;
      const filename = `${surah.padStart(3, '0')}${ayah.padStart(3, '0')}.mp3`;
      const cachePath = path.join(CACHE_DIR, filename);

      if (!fs.existsSync(cachePath)) {
        const upstream = await fetch(`${EVERYAYAH_BASE}/${filename}`);
        if (!upstream.ok) {
          return reply.status(404).send({ error: 'Audio not found' });
        }
        const buf = Buffer.from(await upstream.arrayBuffer());
        fs.writeFileSync(cachePath, buf);
      }

      reply.header('Content-Type', 'audio/mpeg');
      reply.header('Cache-Control', 'public, max-age=31536000');
      reply.header('Accept-Ranges', 'bytes');
      return reply.send(fs.createReadStream(cachePath));
    }
  );
};
