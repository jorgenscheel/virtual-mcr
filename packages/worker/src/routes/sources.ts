import { Hono } from 'hono';
import type { Env } from '../bindings.js';
import { SourceService } from '../services/source-service.js';

const sources = new Hono<{ Bindings: Env }>();

sources.get('/', async (c) => {
  const service = new SourceService(c.env.DB);
  const list = await service.list();
  return c.json({ success: true, data: { sources: list } });
});

sources.get('/:id', async (c) => {
  const service = new SourceService(c.env.DB);
  const source = await service.getById(c.req.param('id'));
  if (!source) {
    return c.json({ success: false, error: 'Source not found' }, 404);
  }
  return c.json({ success: true, data: source });
});

sources.post('/', async (c) => {
  const body = await c.req.json();

  if (!body.name || !body.protocol || !body.connection) {
    return c.json(
      { success: false, error: 'Missing required fields: name, protocol, connection' },
      400,
    );
  }

  const service = new SourceService(c.env.DB);
  const id = crypto.randomUUID();
  const source = await service.create(id, body);
  return c.json({ success: true, data: source }, 201);
});

sources.put('/:id', async (c) => {
  const service = new SourceService(c.env.DB);
  const body = await c.req.json();
  const source = await service.update(c.req.param('id'), body);

  if (!source) {
    return c.json({ success: false, error: 'Source not found' }, 404);
  }

  return c.json({ success: true, data: source });
});

sources.delete('/:id', async (c) => {
  const service = new SourceService(c.env.DB);
  const deleted = await service.delete(c.req.param('id'));

  if (!deleted) {
    return c.json({ success: false, error: 'Source not found' }, 404);
  }

  return c.json({ success: true });
});

export { sources };
