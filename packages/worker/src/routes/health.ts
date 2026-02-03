import { Hono } from 'hono';
import type { Env } from '../bindings.js';

const health = new Hono<{ Bindings: Env }>();

health.get('/', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

export { health };
