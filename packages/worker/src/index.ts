import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './bindings.js';
import { apiKeyAuth } from './middleware/auth.js';
import { sources } from './routes/sources.js';
import { outputs } from './routes/outputs.js';
import { health } from './routes/health.js';
import { OutputService } from './services/output-service.js';
import { SourceService } from './services/source-service.js';

export { MatrixState } from './durable-objects/matrix-state.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// Health check — no auth
app.route('/api/health', health);

// WebSocket upgrade — auth via query param since WS can't set headers easily
app.get('/ws', async (c) => {
  const apiKey = c.req.query('apiKey') || c.req.header('X-API-Key');
  if (!apiKey || apiKey !== c.env.API_KEY) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const service = new OutputService(c.env);
  return service.connectWebSocket(c.req.raw);
});

// All /api routes require auth
app.use('/api/*', apiKeyAuth);

app.route('/api/sources', sources);
app.route('/api/outputs', outputs);

// R2 thumbnail routes (nested under sources)
app.get('/api/sources/:id/thumbnail', async (c) => {
  const sourceId = c.req.param('id');
  const object = await c.env.THUMBNAILS.get(`thumbnails/${sourceId}`);

  if (!object) {
    return c.json({ success: false, error: 'Thumbnail not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('ETag', object.httpEtag);

  return new Response(object.body, { headers });
});

app.put('/api/sources/:id/thumbnail', async (c) => {
  const sourceId = c.req.param('id');

  // Verify source exists
  const sourceService = new SourceService(c.env.DB);
  const source = await sourceService.getById(sourceId);
  if (!source) {
    return c.json({ success: false, error: 'Source not found' }, 404);
  }

  const contentType = c.req.header('Content-Type') || 'image/png';
  const body = await c.req.arrayBuffer();

  await c.env.THUMBNAILS.put(`thumbnails/${sourceId}`, body, {
    httpMetadata: { contentType },
  });

  await sourceService.setThumbnailFlag(sourceId, true);

  return c.json({ success: true, data: { sourceId, contentType } });
});

// 404 catch-all
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default app;
