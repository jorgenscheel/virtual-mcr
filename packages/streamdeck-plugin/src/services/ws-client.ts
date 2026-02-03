import type { WsMessage } from '@vmcr/shared';
import { WS_RECONNECT_DELAY_MS, WS_MAX_RECONNECT_DELAY_MS } from '@vmcr/shared';

export class WsClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = WS_RECONNECT_DELAY_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  constructor(
    public readonly url: string,
    public readonly apiKey: string,
    private onMessage: (message: WsMessage) => void,
  ) {}

  connect(): void {
    if (this.ws) return;
    this.intentionalClose = false;

    const wsUrl = this.url
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:')
      .replace(/\/$/, '');

    try {
      this.ws = new WebSocket(`${wsUrl}/ws?apiKey=${encodeURIComponent(this.apiKey)}`);

      this.ws.onopen = () => {
        console.log('[WsClient] Connected');
        this.reconnectDelay = WS_RECONNECT_DELAY_MS;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(String(event.data)) as WsMessage;
          this.onMessage(message);
        } catch (err) {
          console.error('[WsClient] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WsClient] Disconnected');
        this.ws = null;
        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('[WsClient] Error:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.error('[WsClient] Failed to connect:', err);
      this.ws = null;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;
    if (this.reconnectTimer) return;

    console.log(`[WsClient] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, WS_MAX_RECONNECT_DELAY_MS);
  }
}
