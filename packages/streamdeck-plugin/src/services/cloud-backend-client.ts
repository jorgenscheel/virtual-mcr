import type { BackendClient, SourceItem, ChannelItem } from './backend-client.js';
import type { ApiResponse, SourceListResponse, OutputStatus, OutputId } from '@vmcr/shared';
import { API_KEY_HEADER, OUTPUT_LABELS, OUTPUT_COLORS } from '@vmcr/shared';

export class CloudBackendClient implements BackendClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private get headers(): Record<string, string> {
    return {
      [API_KEY_HEADER]: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        ...this.headers,
        ...(init?.headers as Record<string, string>),
      },
    });
    return (await response.json()) as ApiResponse<T>;
  }

  async listSources(): Promise<SourceItem[]> {
    const response = await this.request<SourceListResponse>('/api/sources');
    if (!response.success || !response.data) return [];
    return response.data.sources.map((s) => ({ id: s.id, name: s.name }));
  }

  async listChannels(): Promise<ChannelItem[]> {
    const response = await this.request<{ outputs: OutputStatus[] }>('/api/outputs');
    if (!response.success || !response.data) return [];
    return response.data.outputs.map((o) => ({
      id: o.id,
      label: OUTPUT_LABELS[o.id],
      color: OUTPUT_COLORS[o.id],
      currentSource: o.currentSource
        ? { id: o.currentSource.id, name: o.currentSource.name }
        : null,
      status: o.status,
    }));
  }

  async routeChannel(channelId: string, sourceId: string): Promise<boolean> {
    const response = await this.request(`/api/outputs/${channelId}/switch`, {
      method: 'POST',
      body: JSON.stringify({ sourceId }),
    });
    return response.success;
  }

  async clearChannel(_channelId: string): Promise<boolean> {
    // Cloud mode doesn't support clearing outputs
    return false;
  }

  // Expose raw API methods for backward compatibility
  async getOutputs(): Promise<ApiResponse<{ outputs: OutputStatus[] }>> {
    return this.request<{ outputs: OutputStatus[] }>('/api/outputs');
  }

  async switchOutput(outputId: OutputId, sourceId: string) {
    return this.request(`/api/outputs/${outputId}/switch`, {
      method: 'POST',
      body: JSON.stringify({ sourceId }),
    });
  }

  async fetchSources(): Promise<ApiResponse<SourceListResponse>> {
    return this.request<SourceListResponse>('/api/sources');
  }

  get url(): string {
    return this.baseUrl;
  }

  get key(): string {
    return this.apiKey;
  }
}
