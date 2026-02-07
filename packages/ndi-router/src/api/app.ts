import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { healthRoutes } from './health.js';
import { channelRoutes } from './channels.js';
import { sourceRoutes } from './sources.js';
import { createWsRoutes } from './ws.js';
import type { createNodeWebSocket } from '@hono/node-ws';

export type WsBroadcast = (data: unknown) => void;

type AppDeps = {
  injectWs: ReturnType<typeof createNodeWebSocket>['injectWebSocket'];
  upgradeWebSocket: ReturnType<typeof createNodeWebSocket>['upgradeWebSocket'];
};

export function createApp(deps: AppDeps): { app: Hono; broadcast: WsBroadcast } {
  const app = new Hono();

  app.use('*', cors());

  app.route('/api', healthRoutes);
  app.route('/api', channelRoutes);
  app.route('/api', sourceRoutes);

  const { wsRoute, broadcast } = createWsRoutes(deps.upgradeWebSocket);
  app.route('', wsRoute);

  return { app, broadcast };
}
