import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import {
  NDI_SOURCE_DISCOVERY_INTERVAL_MS,
  NDI_RECEIVER_POLL_INTERVAL_MS,
  WS_HEARTBEAT_INTERVAL_MS,
} from '@vmcr/shared';
import { loadConfig } from './config.js';
import { initializeNdi, destroyNdi } from './ndi/runtime.js';
import { createFinder, destroyFinder, discoverSources } from './ndi/finder.js';
import {
  createChannel,
  destroyAllChannels,
  getAllChannels,
  routeChannel,
  updateReceiverCount,
} from './ndi/router.js';
import { ChannelStore } from './state/channel-store.js';
import { updateSources, getSource } from './state/source-cache.js';
import { createApp } from './api/app.js';
import type { NdiWsMessage, RoutingChannel } from '@vmcr/shared';

const config = loadConfig();
const store = new ChannelStore(config.persistence.file);

// Step 1: Initialize NDI
console.log('[Startup] Initializing NDI runtime...');
initializeNdi();

// Step 2: Create NDI finder
console.log('[Startup] Creating NDI source finder...');
createFinder();

// Step 3: Create routing channels
console.log('[Startup] Creating routing channels...');
for (let i = 0; i < config.channels.length; i++) {
  const ch = config.channels[i]!;
  const ndiName = `${config.ndi.name_prefix} (${ch.label})`;
  createChannel(ch.id, ndiName, config.ndi.group, ch.label, ch.color);
}

// Step 4: Start HTTP/WS server
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: undefined as never });
const { app, broadcast } = createApp({ injectWs: injectWebSocket, upgradeWebSocket });

const server = serve(
  {
    fetch: app.fetch,
    hostname: config.server.host,
    port: config.server.port,
  },
  (info) => {
    console.log(`[Startup] HTTP/WS server listening on ${info.address}:${info.port}`);
  },
);

injectWebSocket(server);

// Step 5: Restore assignments from state.json
const savedAssignments = store.load();
// Delay restoration to allow first source discovery
setTimeout(() => {
  const sources = discoverSources();
  updateSources(sources);
  console.log(`[Startup] Discovered ${sources.length} NDI sources`);

  for (const [channelId, sourceName] of Object.entries(savedAssignments)) {
    if (!sourceName) continue;
    const source = getSource(sourceName);
    if (source) {
      routeChannel(channelId, source);
      console.log(`[Startup] Restored: ${channelId} -> ${sourceName}`);
    } else {
      console.warn(`[Startup] Source "${sourceName}" not found, skipping restore for ${channelId}`);
    }
  }
}, 2000);

// --- Background jobs ---

function toRoutingChannel(ch: ReturnType<typeof getAllChannels>[number]): RoutingChannel {
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

function persistAssignments(): void {
  const assignments: Record<string, string | null> = {};
  for (const ch of getAllChannels()) {
    assignments[ch.id] = ch.currentSource?.name ?? null;
  }
  store.save(assignments);
}

// Source discovery (every 5s)
const discoveryInterval = setInterval(() => {
  const sources = discoverSources();
  const cached = updateSources(sources);

  const msg: NdiWsMessage = {
    type: 'sources_updated',
    timestamp: new Date().toISOString(),
    sources: cached,
  };
  broadcast(msg);
}, NDI_SOURCE_DISCOVERY_INTERVAL_MS);

// Receiver count poll (every 10s)
const receiverInterval = setInterval(() => {
  for (const ch of getAllChannels()) {
    const count = updateReceiverCount(ch.id);
    const msg: NdiWsMessage = {
      type: 'receiver_count_updated',
      timestamp: new Date().toISOString(),
      channelId: ch.id,
      connectedReceivers: count,
    };
    broadcast(msg);
  }
}, NDI_RECEIVER_POLL_INTERVAL_MS);

// Heartbeat (every 30s)
const heartbeatInterval = setInterval(() => {
  const msg: NdiWsMessage = {
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
  };
  broadcast(msg);
}, WS_HEARTBEAT_INTERVAL_MS);

// --- Hook into channel route handlers for broadcasting + persistence ---

// We wrap the existing fetch to intercept route/clear responses and broadcast
const originalFetch = app.fetch.bind(app);
app.fetch = async (request: Request, ...rest: unknown[]) => {
  const response = await (originalFetch as (req: Request, ...args: unknown[]) => Promise<Response>)(
    request,
    ...rest,
  );

  const url = new URL(request.url);
  const routeMatch = url.pathname.match(/^\/api\/channels\/([^/]+)\/(route|clear)$/);

  if (routeMatch && request.method === 'POST' && response.ok) {
    const channelId = routeMatch[1]!;
    const action = routeMatch[2]!;
    const ch = getAllChannels().find((c) => c.id === channelId);

    if (ch) {
      if (action === 'route') {
        const msg: NdiWsMessage = {
          type: 'channel_routed',
          timestamp: new Date().toISOString(),
          channelId,
          previousSource: null,
          newSource: ch.currentSource?.name ?? '',
          channel: toRoutingChannel(ch),
        };
        broadcast(msg);
      } else {
        const msg: NdiWsMessage = {
          type: 'channel_cleared',
          timestamp: new Date().toISOString(),
          channelId,
          previousSource: null,
          channel: toRoutingChannel(ch),
        };
        broadcast(msg);
      }
      persistAssignments();
    }
  }

  return response;
};

// --- Graceful shutdown ---

function shutdown(): void {
  console.log('\n[Shutdown] Graceful shutdown started...');

  clearInterval(discoveryInterval);
  clearInterval(receiverInterval);
  clearInterval(heartbeatInterval);

  persistAssignments();
  destroyAllChannels();
  destroyFinder();
  destroyNdi();

  console.log('[Shutdown] Complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
