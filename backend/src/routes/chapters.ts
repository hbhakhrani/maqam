import type { FastifyPluginAsync } from 'fastify';

const QURAN_API = 'https://api.quran.com/api/v4';

export const chaptersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/chapters', async (_req, reply) => {
    const res = await fetch(`${QURAN_API}/chapters?language=en`);
    if (!res.ok) return reply.status(502).send({ error: 'Upstream error' });
    const data = await res.json();
    reply.header('Cache-Control', 'public, max-age=86400');
    return data;
  });

  app.get<{ Params: { id: string } }>('/api/chapters/:id/verses', async (req, reply) => {
    const { id } = req.params;
    const res = await fetch(
      `${QURAN_API}/verses/by_chapter/${id}?language=en&fields=text_uthmani,verse_key&per_page=300`
    );
    if (!res.ok) return reply.status(502).send({ error: 'Upstream error' });
    const data = await res.json();
    reply.header('Cache-Control', 'public, max-age=86400');
    return data;
  });
};
