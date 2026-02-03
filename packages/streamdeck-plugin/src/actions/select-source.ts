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
import type { OutputId, Source, OutputStatus } from '@vmcr/shared';
import { ApiClient } from '../services/api-client.js';
import { WsClient } from '../services/ws-client.js';
import { renderSourceButton } from '../utils/image-renderer.js';

type SelectSourceSettings = JsonObject & {
  sourceId?: string;
  outputId?: string;
};

interface SelectSourceGlobalSettings {
  workerUrl?: string;
  apiKey?: string;
}

interface TrackedAction {
  actionId: string;
  settings: SelectSourceSettings;
  setImage: (image: string) => Promise<void>;
  setTitle: (title: string) => Promise<void>;
  showAlert: () => Promise<void>;
  showOk: () => Promise<void>;
}

export class SelectSourceAction extends SingletonAction<SelectSourceSettings> {
  private tracked = new Map<string, TrackedAction>();
  private sourcesMap = new Map<string, Source>();
  private outputsMap = new Map<string, OutputStatus>();
  private apiClient: ApiClient | null = null;
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
      showOk: () => ('showOk' in act ? (act as { showOk(): Promise<void> }).showOk() : act.showAlert()),
    });

    await this.renderButton(ev.action.id);
  }

  override async onWillDisappear(ev: WillDisappearEvent<SelectSourceSettings>): Promise<void> {
    this.tracked.delete(ev.action.id);
  }

  override async onKeyDown(ev: KeyDownEvent<SelectSourceSettings>): Promise<void> {
    const settings = ev.payload.settings;

    if (!settings.sourceId || !settings.outputId) {
      await ev.action.showAlert();
      return;
    }

    if (!this.apiClient) {
      await ev.action.showAlert();
      return;
    }

    try {
      const result = await this.apiClient.switchOutput(
        settings.outputId as OutputId,
        settings.sourceId as string,
      );
      if (result.success) {
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
      if (this.apiClient) {
        try {
          const response = await this.apiClient.listSources();
          if (response.success && response.data) {
            await streamDeck.ui.current?.sendToPropertyInspector({
              event: 'sourcesLoaded',
              sources: response.data.sources.map((s) => ({
                id: s.id,
                name: s.name,
                protocol: s.protocol,
              })),
            });
          }
        } catch {
          await streamDeck.ui.current?.sendToPropertyInspector({
            event: 'sourcesLoaded',
            sources: [],
            error: 'Failed to load sources',
          });
        }
      }
    }

    if (payload.command === 'setGlobalSettings') {
      const workerUrl = payload.workerUrl as string;
      const apiKey = payload.apiKey as string;

      if (workerUrl && apiKey) {
        this.apiClient = new ApiClient(workerUrl, apiKey);
        this.ensureWsClient({ workerUrl, apiKey });
      }
    }
  }

  private async renderButton(actionId: string): Promise<void> {
    const t = this.tracked.get(actionId);
    if (!t) return;

    const { settings } = t;

    if (!settings.sourceId || !settings.outputId) {
      await t.setTitle('No Source');
      return;
    }

    const sourceId = settings.sourceId as string;
    const outputId = settings.outputId as OutputId;
    const source = this.sourcesMap.get(sourceId);
    const output = this.outputsMap.get(outputId);
    const isActive = output?.currentSource?.id === sourceId;

    const svg = renderSourceButton({
      name: source?.name || 'Loading...',
      outputId,
      isActive,
      thumbnailBase64: undefined,
    });

    await t.setImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    await t.setTitle('');
  }

  private updateAllButtons(): void {
    for (const actionId of this.tracked.keys()) {
      this.renderButton(actionId);
    }
  }

  updateApiClient(client: ApiClient): void {
    this.apiClient = client;
  }

  updateWsClient(workerUrl: string, apiKey: string): void {
    this.ensureWsClient({ workerUrl, apiKey });
  }

  setSources(sourceList: Source[]): void {
    this.sourcesMap.clear();
    for (const source of sourceList) {
      this.sourcesMap.set(source.id, source);
    }
    this.updateAllButtons();
  }
}
