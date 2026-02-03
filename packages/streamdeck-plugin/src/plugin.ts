import streamDeck, { LogLevel, type JsonObject } from '@elgato/streamdeck';
import { SelectSourceAction } from './actions/select-source.js';
import { OutputStatusAction } from './actions/output-status.js';
import type { WsMessage, OutputStatus } from '@vmcr/shared';
import { ApiClient } from './services/api-client.js';
import { WsClient } from './services/ws-client.js';

type GlobalSettings = JsonObject & {
  workerUrl?: string;
  apiKey?: string;
};

const selectSourceAction = new SelectSourceAction();
const outputStatusAction = new OutputStatusAction();

let apiClient: ApiClient | null = null;
let wsClient: WsClient | null = null;

function handleWsMessage(message: WsMessage): void {
  if (message.type === 'state_sync') {
    outputStatusAction.updateOutputs(message.outputs);
  } else if (message.type === 'output_changed') {
    const output: OutputStatus = {
      id: message.outputId,
      label: message.outputId === 'A' ? 'Output A' : 'Output B',
      currentSource: message.source,
      status: 'active',
    };
    outputStatusAction.updateOutput(message.outputId, output);
  }
}

async function initializeConnection(settings: GlobalSettings): Promise<void> {
  if (!settings.workerUrl || !settings.apiKey) return;

  const workerUrl = settings.workerUrl as string;
  const apiKey = settings.apiKey as string;

  apiClient = new ApiClient(workerUrl, apiKey);
  selectSourceAction.updateApiClient(apiClient);

  try {
    const response = await apiClient.listSources();
    if (response.success && response.data) {
      selectSourceAction.setSources(response.data.sources);
    }
  } catch (err) {
    streamDeck.logger.error('Failed to fetch initial sources:', String(err));
  }

  selectSourceAction.updateWsClient(workerUrl, apiKey);

  if (wsClient) {
    wsClient.disconnect();
  }

  wsClient = new WsClient(workerUrl, apiKey, handleWsMessage);
  wsClient.connect();
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
  if (globalSettings.workerUrl && globalSettings.apiKey) {
    initializeConnection(globalSettings);
  }
});
