import streamDeck, {
  SingletonAction,
  type KeyDownEvent,
  type WillAppearEvent,
  type WillDisappearEvent,
  type DidReceiveSettingsEvent,
  type SendToPluginEvent,
  type JsonValue,
  type JsonObject,
} from '@elgato/streamdeck';
import type { OutputId, OutputStatus } from '@vmcr/shared';
import type { BackendClient, SourceItem, ChannelItem } from '../services/backend-client.js';
import { CloudBackendClient } from '../services/cloud-backend-client.js';
import { WsClient } from '../services/ws-client.js';
import { renderSourceButton, renderSourceButtonDynamic } from '../utils/image-renderer.js';

type SelectSourceSettings = JsonObject & {
  sourceId?: string;
  outputId?: string;
  channelId?: string;
};

type SelectSourceGlobalSettings = {
  backendMode?: 'cloud' | 'ndi-router';
  workerUrl?: string;
  apiKey?: string;
  routerUrl?: string;
};

type TrackedAction = {
  actionId: string;
  settings: SelectSourceSettings;
  setImage: (image: string) => Promise<void>;
  setTitle: (title: string) => Promise<void>;
  showAlert: () => Promise<void>;
  showOk: () => Promise<void>;
};

export class SelectSourceAction extends SingletonAction<SelectSourceSettings> {
  private tracked = new Map<string, TrackedAction>();
  private sourcesMap = new Map<string, SourceItem>();
  private outputsMap = new Map<string, OutputStatus>();
  private channelsMap = new Map<string, ChannelItem>();
  private backendClient: BackendClient | null = null;
  private wsClient: WsClient | null = null;

  private ensureWsClient(globalSettings: SelectSourceGlobalSettings): void {
    if (!globalSettings.workerUrl || !globalSettings.apiKey) return;

    if (
      this.wsClient &&
      this.wsClient.url === globalSettings.workerUrl &&
      this.wsClient.apiKey === globalSettings.apiKey
    ) {
      return;
    }

    if (this.wsClient) {
      this.wsClient.disconnect();
    }

    this.wsClient = new WsClient(globalSettings.workerUrl, globalSettings.apiKey, (message) => {
      if (message.type === 'state_sync') {
        for (const output of message.outputs) {
          this.outputsMap.set(output.id, output);
        }
        this.updateAllButtons();
      } else if (message.type === 'output_changed') {
        const existing = this.outputsMap.get(message.outputId);
        if (existing) {
          existing.currentSource = message.source;
          existing.status = 'active';
        }
        this.updateAllButtons();
      }
    });

    this.wsClient.connect();
  }

  override async onWillAppear(ev: WillAppearEvent<SelectSourceSettings>): Promise<void> {
    const settings = ev.payload.settings;
    const act = ev.action;
    this.tracked.set(ev.action.id, {
      actionId: ev.action.id,
      settings,
      setImage: (img) => act.setImage(img),
      setTitle: (title) => act.setTitle(title),
      showAlert: () => act.showAlert(),
      showOk: () =>
        'showOk' in act
          ? (act as { showOk(): Promise<void> }).showOk()
          : act.showAlert(),
    });

    await this.renderButton(ev.action.id);
  }

  override async onWillDisappear(ev: WillDisappearEvent<SelectSourceSettings>): Promise<void> {
    this.tracked.delete(ev.action.id);
  }

  override async onKeyDown(ev: KeyDownEvent<SelectSourceSettings>): Promise<void> {
    const settings = ev.payload.settings;
    const sourceId = settings.sourceId as string | undefined;
    const channelId = (settings.channelId ?? settings.outputId) as string | undefined;

    if (!sourceId || !channelId) {
      await ev.action.showAlert();
      return;
    }

    if (!this.backendClient) {
      await ev.action.showAlert();
      return;
    }

    try {
      const ok = await this.backendClient.routeChannel(channelId, sourceId);
      if (ok) {
        await ev.action.showOk();
      } else {
        await ev.action.showAlert();
      }
    } catch {
      await ev.action.showAlert();
    }
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<SelectSourceSettings>,
  ): Promise<void> {
    const t = this.tracked.get(ev.action.id);
    if (t) {
      t.settings = ev.payload.settings;
    }
    await this.renderButton(ev.action.id);
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SelectSourceSettings>,
  ): Promise<void> {
    const payload = ev.payload as Record<string, unknown>;

    if (payload.command === 'getSources') {
      streamDeck.logger.info('getSources command received');
      if (this.backendClient) {
        try {
          streamDeck.logger.info('Calling backendClient.listSources()...');
          const sources = await this.backendClient.listSources();
          streamDeck.logger.info(`Got ${sources.length} sources, sending to PI`);
          await streamDeck.ui.current?.sendToPropertyInspector({
            event: 'sourcesLoaded',
            sources: sources.map((s) => ({
              id: s.id,
              name: s.name,
            })),
          });
          streamDeck.logger.info('Sources sent to PI');
        } catch (err) {
          streamDeck.logger.error('Failed to load sources:', String(err));
          await streamDeck.ui.current?.sendToPropertyInspector({
            event: 'sourcesLoaded',
            sources: [],
            error: 'Failed to load sources',
          });
        }
      } else {
        streamDeck.logger.warn('getSources called but backendClient is null');
      }
    }

    if (payload.command === 'getChannels') {
      streamDeck.logger.info('getChannels command received');
      if (this.backendClient) {
        try {
          streamDeck.logger.info('Calling backendClient.listChannels()...');
          const channels = await this.backendClient.listChannels();
          streamDeck.logger.info(`Got ${channels.length} channels, sending to PI`);
          await streamDeck.ui.current?.sendToPropertyInspector({
            event: 'channelsLoaded',
            channels: channels.map((ch) => ({
              id: ch.id,
              label: ch.label,
              color: ch.color,
            })),
          });
          streamDeck.logger.info('Channels sent to PI');
        } catch (err) {
          streamDeck.logger.error('Failed to load channels:', String(err));
          await streamDeck.ui.current?.sendToPropertyInspector({
            event: 'channelsLoaded',
            channels: [],
            error: 'Failed to load channels',
          });
        }
      } else {
        streamDeck.logger.warn('getChannels called but backendClient is null');
      }
    }

    if (payload.command === 'setGlobalSettings') {
      const backendMode = (payload.backendMode as string) ?? 'cloud';

      if (backendMode === 'ndi-router') {
        const routerUrl = payload.routerUrl as string;
        if (routerUrl) {
          const { NdiRouterClient } = await import('../services/ndi-router-client.js');
          this.backendClient = new NdiRouterClient(routerUrl);
        }
      } else {
        const workerUrl = payload.workerUrl as string;
        const apiKey = payload.apiKey as string;
        if (workerUrl && apiKey) {
          this.backendClient = new CloudBackendClient(workerUrl, apiKey);
          this.ensureWsClient({ workerUrl, apiKey });
        }
      }
    }
  }

  private async renderButton(actionId: string): Promise<void> {
    const t = this.tracked.get(actionId);
    if (!t) return;

    const { settings } = t;
    const sourceId = settings.sourceId as string | undefined;
    const channelId = (settings.channelId ?? settings.outputId) as string | undefined;

    if (!sourceId || !channelId) {
      await t.setTitle('No Source');
      return;
    }

    const source = this.sourcesMap.get(sourceId);
    const channel = this.channelsMap.get(channelId);

    if (channel) {
      // NDI router mode: dynamic channel
      const isActive = channel.currentSource?.id === sourceId;
      const svg = renderSourceButtonDynamic({
        name: source?.name || sourceId,
        channelLabel: channel.label,
        channelColor: channel.color,
        isActive,
      });
      await t.setImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      await t.setTitle('');
    } else {
      // Cloud mode: fixed outputs A/B
      const outputId = channelId as OutputId;
      const output = this.outputsMap.get(outputId);
      const isActive = output?.currentSource?.id === sourceId;
      const svg = renderSourceButton({
        name: source?.name || 'Loading...',
        outputId,
        isActive,
      });
      await t.setImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      await t.setTitle('');
    }
  }

  private updateAllButtons(): void {
    for (const actionId of this.tracked.keys()) {
      this.renderButton(actionId);
    }
  }

  updateBackendClient(client: BackendClient): void {
    this.backendClient = client;
  }

  updateWsClient(workerUrl: string, apiKey: string): void {
    this.ensureWsClient({ workerUrl, apiKey });
  }

  setSources(sourceList: SourceItem[]): void {
    this.sourcesMap.clear();
    for (const source of sourceList) {
      this.sourcesMap.set(source.id, source);
    }
    this.updateAllButtons();
  }

  updateChannels(channels: ChannelItem[]): void {
    this.channelsMap.clear();
    for (const ch of channels) {
      this.channelsMap.set(ch.id, ch);
    }
    this.updateAllButtons();
  }

  updateChannel(channelId: string, channel: ChannelItem): void {
    this.channelsMap.set(channelId, channel);
    this.updateAllButtons();
  }
}
