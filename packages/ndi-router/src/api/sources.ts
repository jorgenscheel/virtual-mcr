import { Hono } from 'hono';
import { getAllSources } from '../state/source-cache.js';

export const sourceRoutes = new Hono();

sourceRoutes.get('/sources', (c) => {
  const sources = getAllSources();
  return c.json({ success: true, data: { sources } });
});
