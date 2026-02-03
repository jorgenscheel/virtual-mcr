import { createMiddleware } from 'hono/factory';
import { API_KEY_HEADER } from '@vmcr/shared';
import type { Env } from '../bindings.js';

export const apiKeyAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const apiKey = c.req.header(API_KEY_HEADER);
  const expectedKey = c.env.API_KEY;

  if (!expectedKey) {
    console.warn('API_KEY secret not configured');
    return c.json({ success: false, error: 'Server misconfigured' }, 500);
  }

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  await next();
});
