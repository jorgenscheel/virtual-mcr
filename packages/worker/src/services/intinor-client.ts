import type { OutputId, Source } from '@vmcr/shared';

/**
 * Stub Intinor client for Phase 1.
 * In Phase 3, this will proxy to the actual Intinor Router API
 * via Cloudflare Tunnel to reach the LAN.
 */
export class IntinorClient {
  async switchSource(_outputId: OutputId, _source: Source): Promise<boolean> {
    // Phase 1: no actual Intinor hardware — always succeed
    console.log(`[IntinorClient] Stub: would switch output ${_outputId} to source ${_source.name}`);
    return true;
  }

  async getStatus(): Promise<{ connected: boolean }> {
    return { connected: false };
  }
}
