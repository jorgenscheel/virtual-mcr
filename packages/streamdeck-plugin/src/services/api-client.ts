import type {
  ApiResponse,
  Source,
  SourceListResponse,
  SwitchResult,
  OutputStatus,
  OutputId,
} from '@vmcr/shared';
import { API_KEY_HEADER } from '@vmcr/shared';

export class ApiClient {
  constructor(
    public readonly baseUrl: string,
    public readonly apiKey: string,
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

  async listSources(): Promise<ApiResponse<SourceListResponse>> {
    return this.request<SourceListResponse>('/api/sources');
  }

  async getSource(id: string): Promise<ApiResponse<Source>> {
    return this.request<Source>(`/api/sources/${id}`);
  }

  async getOutputs(): Promise<ApiResponse<{ outputs: OutputStatus[] }>> {
    return this.request<{ outputs: OutputStatus[] }>('/api/outputs');
  }

  async getOutput(id: OutputId): Promise<ApiResponse<OutputStatus>> {
    return this.request<OutputStatus>(`/api/outputs/${id}`);
  }

  async switchOutput(outputId: OutputId, sourceId: string): Promise<ApiResponse<SwitchResult>> {
    return this.request<SwitchResult>(`/api/outputs/${outputId}/switch`, {
      method: 'POST',
      body: JSON.stringify({ sourceId }),
    });
  }

  async getThumbnailUrl(sourceId: string): Promise<string> {
    return `${this.baseUrl.replace(/\/$/, '')}/api/sources/${sourceId}/thumbnail`;
  }
}
