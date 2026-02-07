import { Hono } from 'hono';
import type { createNodeWebSocket } from '@hono/node-ws';
import type { WSContext } from 'hono/ws';
import type { RoutingChannel } from '@vmcr/shared';
import { getAllChannels } from '../ndi/router.js';
import type { WsBroadcast } from './app.js';

type UpgradeWebSocket = ReturnType<typeof createNodeWebSocket>['upgradeWebSocket'];

const clients = new Set<WSContext>();

export function createWsRoutes(upgradeWebSocket: UpgradeWebSocket): {
  wsRoute: Hono;
  broadcast: WsBroadcast;
} {
  const wsRoute = new Hono();

  wsRoute.get(
    '/ws',
    upgradeWebSocket((_c) => ({
      onOpen(_evt, ws) {
        clients.add(ws);
        console.log(`[WS] Client connected (total: ${clients.size})`);

        // Send initial channels_sync
        const channels = getAllChannels().map((ch) => ({
          id: ch.id,
          label: ch.label,
          color: ch.color,
          ndiName: ch.ndiName,
          group: ch.group,
          currentSource: ch.currentSource,
          connectedReceivers: ch.connectedReceivers,
          status: ch.status,
        })) satisfies RoutingChannel[];

        ws.send(
          JSON.stringify({
            type: 'channels_sync',
            timestamp: new Date().toISOString(),
            channels,
          }),
        );
      },

      onClose(_evt, ws) {
        clients.delete(ws);
        console.log(`[WS] Client disconnected (total: ${clients.size})`);
      },

      onMessage(evt, _ws) {
        // Currently no client->server messages needed
        console.log(`[WS] Received message:`, String(evt.data));
      },
    })),
  );

  const broadcast: WsBroadcast = (data) => {
    const message = JSON.stringify(data);
    for (const client of clients) {
      try {
        client.send(message);
      } catch {
        clients.delete(client);
      }
    }
  };

  return { wsRoute, broadcast };
}
