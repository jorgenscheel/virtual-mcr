import { createMiddleware } from 'hono/factory';
import type { Env } from '../bindings.js';

export const requestLogger = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`${method} ${path} ${status} ${duration}ms`);
});
