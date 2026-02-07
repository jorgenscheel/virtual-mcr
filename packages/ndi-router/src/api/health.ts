import { Hono } from 'hono';
import { isNdiInitialized } from '../ndi/runtime.js';
import { getAllChannels } from '../ndi/router.js';

export const healthRoutes = new Hono();

healthRoutes.get('/health', (c) => {
  const channels = getAllChannels();
  return c.json({
    status: 'ok',
    ndiInitialized: isNdiInitialized(),
    channelCount: channels.length,
    routedCount: channels.filter((ch) => ch.status === 'routed').length,
    timestamp: new Date().toISOString(),
  });
});
