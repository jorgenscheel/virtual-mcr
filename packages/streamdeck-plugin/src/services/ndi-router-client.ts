import type { BackendClient, SourceItem, ChannelItem } from './backend-client.js';
import type { RoutingChannel, NdiSource, RouteResult } from '@vmcr/shared';

type NdiApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export class NdiRouterClient implements BackendClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<NdiApiResponse<T>> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string>),
      },
    });
    return (await response.json()) as NdiApiResponse<T>;
  }

  async listSources(): Promise<SourceItem[]> {
    const response = await this.request<{ sources: NdiSource[] }>('/api/sources');
    if (!response.success || !response.data) return [];
    return response.data.sources.map((s) => ({ id: s.name, name: s.name }));
  }

  async listChannels(): Promise<ChannelItem[]> {
    const response = await this.request<{ channels: RoutingChannel[] }>('/api/channels');
    if (!response.success || !response.data) return [];
    return response.data.channels.map((ch) => ({
      id: ch.id,
      label: ch.label,
      color: ch.color,
      currentSource: ch.currentSource
        ? { id: ch.currentSource.name, name: ch.currentSource.name }
        : null,
      status: ch.status,
    }));
  }

  async routeChannel(channelId: string, sourceId: string): Promise<boolean> {
    const response = await this.request<RouteResult>(`/api/channels/${channelId}/route`, {
      method: 'POST',
      body: JSON.stringify({ sourceName: sourceId }),
    });
    return response.success;
  }

  async clearChannel(channelId: string): Promise<boolean> {
    const response = await this.request(`/api/channels/${channelId}/clear`, {
      method: 'POST',
    });
    return response.success;
  }

  get url(): string {
    return this.baseUrl;
  }
}
