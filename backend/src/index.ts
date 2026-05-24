import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { chaptersRoutes } from './routes/chapters.js';
import { audioRoutes } from './routes/audio.js';
import { pitchRoutes } from './routes/pitch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '3001', 10);

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

await app.register(chaptersRoutes);
await app.register(audioRoutes);
await app.register(pitchRoutes);

// In production serve the built frontend; dev relies on Vite's own server
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  await app.register(fastifyStatic, { root: frontendDist, prefix: '/' });
  // SPA fallback — unknown paths serve index.html
  app.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'));
}

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Maqam running on :${PORT}`);
});
