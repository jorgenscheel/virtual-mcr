import { Hono } from 'hono';
import type { RoutingChannel, RouteRequest, RouteResult } from '@vmcr/shared';
import { getAllChannels, getChannel, routeChannel, clearChannel } from '../ndi/router.js';
import { getSource } from '../state/source-cache.js';

export const channelRoutes = new Hono();

function toRoutingChannel(ch: ReturnType<typeof getChannel>): RoutingChannel | null {
  if (!ch) return null;
  return {
    id: ch.id,
    label: ch.label,
    color: ch.color,
    ndiName: ch.ndiName,
    group: ch.group,
    currentSource: ch.currentSource,
    connectedReceivers: ch.connectedReceivers,
    status: ch.status,
  };
}

channelRoutes.get('/channels', (c) => {
  const channels = getAllChannels().map(toRoutingChannel);
  return c.json({ success: true, data: { channels } });
});

channelRoutes.get('/channels/:id', (c) => {
  const id = c.req.param('id');
  const ch = getChannel(id);
  if (!ch) {
    return c.json({ success: false, error: 'Channel not found' }, 404);
  }
  return c.json({ success: true, data: toRoutingChannel(ch) });
});

channelRoutes.post('/channels/:id/route', async (c) => {
  const id = c.req.param('id');
  const ch = getChannel(id);
  if (!ch) {
    return c.json({ success: false, error: 'Channel not found' }, 404);
  }

  const body = await c.req.json<RouteRequest>();
  if (!body.sourceName) {
    return c.json({ success: false, error: 'sourceName is required' }, 400);
  }

  const source = getSource(body.sourceName);
  if (!source) {
    return c.json({ success: false, error: `Source "${body.sourceName}" not found` }, 404);
  }

  const previousSource = ch.currentSource?.name ?? null;
  const ok = routeChannel(id, source);

  if (!ok) {
    return c.json({ success: false, error: 'Routing failed' }, 500);
  }

  const result: RouteResult = {
    success: true,
    channelId: id,
    previousSource,
    newSource: body.sourceName,
    routedAt: new Date().toISOString(),
  };

  // Broadcast will be handled by the caller via event emitter or direct call
  return c.json({ success: true, data: result });
});

channelRoutes.post('/channels/:id/clear', (c) => {
  const id = c.req.param('id');
  const ch = getChannel(id);
  if (!ch) {
    return c.json({ success: false, error: 'Channel not found' }, 404);
  }

  const previousSource = ch.currentSource?.name ?? null;
  const ok = clearChannel(id);

  if (!ok) {
    return c.json({ success: false, error: 'Clear failed' }, 500);
  }

  return c.json({
    success: true,
    data: { channelId: id, previousSource, clearedAt: new Date().toISOString() },
  });
});
