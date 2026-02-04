import {
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
  type DidReceiveSettingsEvent,
  type JsonObject,
} from '@elgato/streamdeck';
import type { OutputId, OutputStatus } from '@vmcr/shared';
import { OUTPUT_LABELS } from '@vmcr/shared';
import { renderStatusButton } from '../utils/image-renderer.js';

type OutputStatusSettings = JsonObject & {
  outputId?: string;
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

  updateOutputs(outputList: OutputStatus[]): void {
    for (const output of outputList) {
      this.outputsMap.set(output.id, output);
    }
    this.updateAllButtons();
  }

  updateOutput(outputId: OutputId, output: OutputStatus): void {
    this.outputsMap.set(outputId, output);
    this.updateAllButtons();
  }

  private async renderButton(actionId: string): Promise<void> {
    const t = this.tracked.get(actionId);
    if (!t) return;

    const { settings } = t;

    if (!settings.outputId) {
      await t.setTitle('No Output');
      return;
    }

    const outputId = settings.outputId as OutputId;
    const output = this.outputsMap.get(outputId);
    const sourceName = output?.currentSource?.name || 'No Source';
    const label = OUTPUT_LABELS[outputId];

    const svg = renderStatusButton({
      outputId,
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
