import {
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
  type DidReceiveSettingsEvent,
  type JsonObject,
} from '@elgato/streamdeck';
import type { OutputId, OutputStatus } from '@vmcr/shared';
import { OUTPUT_LABELS } from '@vmcr/shared';
import { renderStatusButton, renderStatusButtonDynamic } from '../utils/image-renderer.js';
import type { ChannelItem } from '../services/backend-client.js';

type OutputStatusSettings = JsonObject & {
  outputId?: string;
  channelId?: string;
};

type TrackedStatusAction = {
  actionId: string;
  settings: OutputStatusSettings;
  setImage: (image: string) => Promise<void>;
  setTitle: (title: string) => Promise<void>;
};

export class OutputStatusAction extends SingletonAction<OutputStatusSettings> {
  private tracked = new Map<string, TrackedStatusAction>();
  private outputsMap = new Map<string, OutputStatus>();
  private channelsMap = new Map<string, ChannelItem>();

  override async onWillAppear(ev: WillAppearEvent<OutputStatusSettings>): Promise<void> {
    this.tracked.set(ev.action.id, {
      actionId: ev.action.id,
      settings: ev.payload.settings,
      setImage: (img) => ev.action.setImage(img),
      setTitle: (title) => ev.action.setTitle(title),
    });

    await this.renderButton(ev.action.id);
  }

  override async onWillDisappear(ev: WillDisappearEvent<OutputStatusSettings>): Promise<void> {
    this.tracked.delete(ev.action.id);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<OutputStatusSettings>,
  ): Promise<void> {
    const t = this.tracked.get(ev.action.id);
    if (t) {
      t.settings = ev.payload.settings;
    }
    await this.renderButton(ev.action.id);
  }

  // Cloud mode methods
  updateFromCloud(outputList: OutputStatus[]): void {
    for (const output of outputList) {
      this.outputsMap.set(output.id, output);
    }
    this.updateAllButtons();
  }

  updateOutputCloud(outputId: OutputId, output: OutputStatus): void {
    this.outputsMap.set(outputId, output);
    this.updateAllButtons();
  }

  // NDI Router mode methods
  updateFromNdiRouter(channels: ChannelItem[]): void {
    this.channelsMap.clear();
    for (const ch of channels) {
      this.channelsMap.set(ch.id, ch);
    }
    this.updateAllButtons();
  }

  updateChannelNdi(channelId: string, channel: ChannelItem): void {
    this.channelsMap.set(channelId, channel);
    this.updateAllButtons();
  }

  // Legacy compatibility
  updateOutputs(outputList: OutputStatus[]): void {
    this.updateFromCloud(outputList);
  }

  updateOutput(outputId: OutputId, output: OutputStatus): void {
    this.updateOutputCloud(outputId, output);
  }

  private async renderButton(actionId: string): Promise<void> {
    const t = this.tracked.get(actionId);
    if (!t) return;

    const { settings } = t;
    const channelId = settings.channelId as string | undefined;
    const outputId = settings.outputId as string | undefined;

    // NDI Router mode: use channelId
    if (channelId) {
      const channel = this.channelsMap.get(channelId);
      const sourceName = channel?.currentSource?.name || 'No Source';
      const svg = renderStatusButtonDynamic({
        channelLabel: channel?.label || channelId,
        channelColor: channel?.color || '#666',
        sourceName,
        status: (channel?.status as 'routed' | 'idle' | 'error') || 'idle',
      });
      await t.setImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      await t.setTitle('');
      return;
    }

    // Cloud mode: use outputId
    if (!outputId) {
      await t.setTitle('No Output');
      return;
    }

    const output = this.outputsMap.get(outputId);
    const sourceName = output?.currentSource?.name || 'No Source';
    const label = OUTPUT_LABELS[outputId as OutputId];

    const svg = renderStatusButton({
      outputId: outputId as OutputId,
      label,
      sourceName,
      status: output?.status || 'idle',
    });

    await t.setImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    await t.setTitle('');
  }

  private updateAllButtons(): void {
    for (const actionId of this.tracked.keys()) {
      this.renderButton(actionId);
    }
  }
}
