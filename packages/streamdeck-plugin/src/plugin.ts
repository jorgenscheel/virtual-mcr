import streamDeck, { LogLevel, type JsonObject } from '@elgato/streamdeck';
import { SelectSourceAction } from './actions/select-source.js';
import { OutputStatusAction } from './actions/output-status.js';
import type { WsMessage, NdiWsMessage, OutputStatus } from '@vmcr/shared';
import { CloudBackendClient } from './services/cloud-backend-client.js';
import { NdiRouterClient } from './services/ndi-router-client.js';
import { WsClient } from './services/ws-client.js';

type GlobalSettings = JsonObject & {
  backendMode?: 'cloud' | 'ndi-router';
  workerUrl?: string;
  apiKey?: string;
  routerUrl?: string;
};

const selectSourceAction = new SelectSourceAction();
const outputStatusAction = new OutputStatusAction();

let wsClient: WsClient | null = null;

function handleCloudWsMessage(message: WsMessage): void {
  if (message.type === 'state_sync') {
    outputStatusAction.updateFromCloud(message.outputs);
  } else if (message.type === 'output_changed') {
    const output: OutputStatus = {
      id: message.outputId,
      label: message.outputId === 'A' ? 'Output A' : 'Output B',
      currentSource: message.source,
      status: 'active',
    };
    outputStatusAction.updateOutputCloud(message.outputId, output);
  }
}

function handleNdiWsMessage(message: NdiWsMessage): void {
  if (message.type === 'channels_sync') {
    const channels = message.channels.map((ch) => ({
      id: ch.id,
      label: ch.label,
      color: ch.color,
      currentSource: ch.currentSource
        ? { id: ch.currentSource.name, name: ch.currentSource.name }
        : null,
      status: ch.status,
    }));
    outputStatusAction.updateFromNdiRouter(channels);
    selectSourceAction.updateChannels(channels);
  } else if (message.type === 'channel_routed' || message.type === 'channel_cleared') {
    const ch = message.channel;
    const channelItem = {
      id: ch.id,
      label: ch.label,
      color: ch.color,
      currentSource: ch.currentSource
        ? { id: ch.currentSource.name, name: ch.currentSource.name }
        : null,
      status: ch.status,
    };
    outputStatusAction.updateChannelNdi(ch.id, channelItem);
    selectSourceAction.updateChannel(ch.id, channelItem);
  } else if (message.type === 'sources_updated') {
    selectSourceAction.setSources(message.sources.map((s) => ({ id: s.name, name: s.name })));
  }
}

async function initializeConnection(settings: GlobalSettings): Promise<void> {
  const mode = settings.backendMode ?? 'cloud';

  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }

  if (mode === 'ndi-router') {
    if (!settings.routerUrl) return;
    const routerUrl = settings.routerUrl as string;

    const client = new NdiRouterClient(routerUrl);
    selectSourceAction.updateBackendClient(client);

    try {
      const sources = await client.listSources();
      selectSourceAction.setSources(sources);
      const channels = await client.listChannels();
      selectSourceAction.updateChannels(channels);
      outputStatusAction.updateFromNdiRouter(channels);
    } catch (err) {
      streamDeck.logger.error('Failed to fetch initial data from NDI router:', String(err));
    }

    wsClient = new WsClient(routerUrl, '', (raw) => {
      handleNdiWsMessage(raw as unknown as NdiWsMessage);
    });
    wsClient.connect();
  } else {
    if (!settings.workerUrl || !settings.apiKey) return;
    const workerUrl = settings.workerUrl as string;
    const apiKey = settings.apiKey as string;

    const client = new CloudBackendClient(workerUrl, apiKey);
    selectSourceAction.updateBackendClient(client);

    try {
      const sources = await client.listSources();
      selectSourceAction.setSources(sources);
    } catch (err) {
      streamDeck.logger.error('Failed to fetch initial sources:', String(err));
    }

    selectSourceAction.updateWsClient(workerUrl, apiKey);

    wsClient = new WsClient(workerUrl, apiKey, handleCloudWsMessage);
    wsClient.connect();
  }
}

streamDeck.actions.registerAction(selectSourceAction);
streamDeck.actions.registerAction(outputStatusAction);

streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
  initializeConnection(ev.settings);
});

streamDeck.connect().then(async () => {
  streamDeck.logger.setLevel(LogLevel.DEBUG);
  streamDeck.logger.info('Virtual MCR plugin connected');

  const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  const mode = globalSettings.backendMode ?? 'cloud';

  if (mode === 'ndi-router' && globalSettings.routerUrl) {
    initializeConnection(globalSettings);
  } else if (mode === 'cloud' && globalSettings.workerUrl && globalSettings.apiKey) {
    initializeConnection(globalSettings);
  }
});
