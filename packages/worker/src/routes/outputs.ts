import { Hono } from 'hono';
import type { Env } from '../bindings.js';
import { OutputService } from '../services/output-service.js';
import { SourceService } from '../services/source-service.js';

const outputs = new Hono<{ Bindings: Env }>();

outputs.get('/', async (c) => {
  const service = new OutputService(c.env);
  const response = await service.getOutputs();
  const data = await response.json();
  return c.json(data);
});

outputs.get('/:id', async (c) => {
  const outputId = c.req.param('id');
  if (outputId !== 'A' && outputId !== 'B') {
    return c.json({ success: false, error: 'Invalid output ID. Must be A or B.' }, 400);
  }

  const service = new OutputService(c.env);
  const response = await service.getOutput(outputId);
  const data = await response.json();
  return c.json(data);
});

outputs.post('/:id/switch', async (c) => {
  const outputId = c.req.param('id');
  if (outputId !== 'A' && outputId !== 'B') {
    return c.json({ success: false, error: 'Invalid output ID. Must be A or B.' }, 400);
  }

  const body = await c.req.json<{ sourceId: string }>();
  if (!body.sourceId) {
    return c.json({ success: false, error: 'Missing required field: sourceId' }, 400);
  }

  // Fetch the full source to pass to DO (for state sync)
  const sourceService = new SourceService(c.env.DB);
  const source = await sourceService.getById(body.sourceId);
  if (!source) {
    return c.json({ success: false, error: 'Source not found' }, 404);
  }

  const outputService = new OutputService(c.env);
  const response = await outputService.switchOutput(outputId, {
    sourceId: body.sourceId,
    source,
  });
  const data = await response.json();
  return c.json(data);
});

export { outputs };
